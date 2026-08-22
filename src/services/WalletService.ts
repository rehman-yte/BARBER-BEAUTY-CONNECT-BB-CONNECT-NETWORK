import { db } from '../lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  serverTimestamp, 
  runTransaction, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';

export interface WalletTransaction {
  id?: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  status: 'CREDIT' | 'DEBIT';
  description: string;
  bookingId?: string;
  orderId?: string;
  reason?: string;
  createdAt: any;
}

export class WalletService {
  /**
   * Real-time subscription to Customer's Wallet Balance and Transaction Ledger
   */
  static subscribeCustomerWallet(
    customerId: string, 
    onUpdate: (balance: number, transactions: WalletTransaction[]) => void
  ): () => void {
    if (!customerId) return () => {};

    const userDocRef = doc(db, 'users', customerId);
    const txQuery = query(
      collection(db, 'users', customerId, 'wallet_transactions'),
      orderBy('createdAt', 'desc')
    );

    let currentBalance = 0;
    let currentTransactions: WalletTransaction[] = [];

    const unsubUser = onSnapshot(userDocRef, (userSnap) => {
      if (userSnap.exists()) {
        const data = userSnap.data();
        currentBalance = Number(data.walletBalance || 0);
      } else {
        currentBalance = 0;
      }
      onUpdate(currentBalance, currentTransactions);
    }, (err) => {
      console.warn('[WalletService] user wallet snapshot notice:', err);
    });

    const unsubTx = onSnapshot(txQuery, (txSnap) => {
      const txs: WalletTransaction[] = [];
      txSnap.forEach((d) => {
        txs.push({ id: d.id, ...(d.data() as any) });
      });
      currentTransactions = txs;
      onUpdate(currentBalance, currentTransactions);
    }, (err) => {
      console.warn('[WalletService] wallet transactions snapshot notice:', err);
    });

    return () => {
      unsubUser();
      unsubTx();
    };
  }

  /**
   * Fetch current wallet balance directly once
   */
  static async getWalletBalance(customerId: string): Promise<number> {
    if (!customerId) return 0;
    try {
      const userSnap = await getDoc(doc(db, 'users', customerId));
      if (userSnap.exists()) {
        return Number(userSnap.data()?.walletBalance || 0);
      }
      return 0;
    } catch (e) {
      console.error('[WalletService] getWalletBalance error:', e);
      return 0;
    }
  }

  /**
   * AUTO-CREDIT TRIGGER:
   * When a booking status is updated to 'CANCELLED', 'REJECTED_BY_PARTNER', or 'TIMEOUT' (or failed),
   * auto-increment customer's walletBalance by the exact service amount and record ledger entry in users/{customerId}/wallet_transactions
   */
  static async creditWalletForCancelledBooking(
    customerId: string, 
    booking: any, 
    reason: string = 'Booking Cancelled / Rejected / Timeout'
  ): Promise<{ success: boolean; newBalance?: number }> {
    if (!customerId || !booking || !booking.id) {
      return { success: false };
    }

    // Amount extraction
    const amount = Number(booking.amountPaid || booking.price || booking.amount || 0);
    if (amount <= 0) {
      console.warn('[WalletService] Skipping zero amount refund for booking:', booking.id);
      return { success: false };
    }

    const bookingRef = doc(db, 'bookings', booking.id);
    const userRef = doc(db, 'users', customerId);

    try {
      const result = await runTransaction(db, async (transaction) => {
        const bookingDoc = await transaction.get(bookingRef);
        if (!bookingDoc.exists()) {
          throw new Error(`Booking ${booking.id} does not exist`);
        }

        const bData = bookingDoc.data();
        // IDEMPOTENCY / ATOMIC LOCK: If refundStatus is already 'PROCESSED' or previously credited, EXIT IMMEDIATELY
        if (
          bData.refundStatus === 'PROCESSED' ||
          bData.refund_status === 'PROCESSED' ||
          bData.status === 'CANCELLED_REFUNDED' ||
          bData.wallet_credited === true ||
          bData.walletCredited === true
        ) {
          console.log(`[WalletService] Idempotency check: Booking ${booking.id} refund already processed. Exiting immediately.`);
          return { alreadyCredited: true, balance: 0 };
        }

        const userDoc = await transaction.get(userRef);
        let currentBalance = 0;
        if (userDoc.exists()) {
          currentBalance = Number(userDoc.data().walletBalance || 0);
        }

        const newBalance = currentBalance + amount;

        // 1. Update user's walletBalance by exact original paid amount
        transaction.set(userRef, {
          walletBalance: newBalance,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // 2. Mark booking document with refundStatus = "PROCESSED" and status = "CANCELLED_REFUNDED"
        transaction.update(bookingRef, {
          refundStatus: 'PROCESSED',
          status: 'CANCELLED_REFUNDED',
          bookingStatus: 'CANCELLED_REFUNDED',
          wallet_credited: true,
          walletCredited: true,
          refund_status: 'PROCESSED',
          refund_timeframe: 'Instant (Credited to BB Connect Wallet)',
          statusReason: reason,
          failure_reason: reason,
          refundProcessedAt: serverTimestamp()
        });

        return { alreadyCredited: false, newBalance };
      });

      if (!result.alreadyCredited) {
        // 3. Record ledger entry in users/{customerId}/wallet_transactions
        await addDoc(collection(db, 'users', customerId, 'wallet_transactions'), {
          amount: amount,
          type: 'CREDIT',
          status: 'CREDIT',
          description: `Refund: ${booking.serviceName || booking.service || 'Service Booking'} (${booking.partnerBrandName || booking.shopName || 'Partner'})`,
          bookingId: booking.id,
          reason: reason,
          createdAt: serverTimestamp()
        });

        console.log(`[WalletService] Successfully credited ₹${amount} to wallet for user ${customerId}`);
        return { success: true, newBalance: result.newBalance };
      }

      return { success: true };
    } catch (err) {
      console.error('[WalletService] creditWalletForCancelledBooking error:', err);
      return { success: false };
    }
  }

  /**
   * CHECKOUT PAYMENT VIA WALLET:
   * Deducts exact service price from wallet, records DEBIT ledger entry, and creates booking directly without gateway
   */
  static async payViaWallet(
    customerId: string,
    customerName: string,
    cartItems: any[],
    servicePrice: number,
    platformFee: number = 0
  ): Promise<{ success: boolean; bookingIds: string[]; orderId: string }> {
    if (!customerId) throw new Error('Customer must be authenticated');
    if (servicePrice <= 0) throw new Error('Invalid payment amount');

    const totalToDeduct = servicePrice + platformFee;
    const userRef = doc(db, 'users', customerId);

    // 1. Run transaction to atomically verify and deduct walletBalance
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error('User account not found');
      }

      const currentBalance = Number(userDoc.data().walletBalance || 0);
      if (currentBalance < totalToDeduct) {
        throw new Error(`Insufficient wallet balance. Available: ₹${currentBalance}, Required: ₹${totalToDeduct}`);
      }

      const remainingBalance = currentBalance - totalToDeduct;

      transaction.update(userRef, {
        walletBalance: remainingBalance,
        updatedAt: serverTimestamp()
      });
    });

    const isSlotBooking = cartItems.some(item => 
      (item.category && String(item.category).toLowerCase().includes('service')) || 
      (item.name && String(item.name).includes('(Booking)')) ||
      item.type === 'booking'
    );

    const generatedTxId = 'WALLET_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substring(2, 6).toUpperCase();

    // 2. Create Order Document
    const orderRef = await addDoc(collection(db, 'orders'), {
      customerId: customerId,
      customerName: customerName,
      items: cartItems,
      totalAmount: totalToDeduct,
      platformFee: platformFee,
      status: 'payment_held',
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'BB_CONNECT_WALLET',
      paymentMethodDetail: 'WALLET_BALANCE_DEBIT',
      transactionId: generatedTxId,
      transactionType: isSlotBooking ? 'SLOT_BOOKING' : 'SHOPPING',
      createdAt: serverTimestamp()
    });

    const finalBookingIds: string[] = [];

    // 3. Create Booking Documents
    if (isSlotBooking) {
      for (const item of cartItems) {
        const bookingDocData = {
          customer_id: customerId,
          customerId: customerId,
          customerName: customerName,
          payment_type: 'wallet',
          routing_strategy: 'instant_split_gateway',
          admin_fee_ratio: 0.05,
          partner_settlement_ratio: 0.95,
          partnerId: item.shopId || item.partnerId || '',
          shopId: item.shopId || item.partnerId || '',
          shopName: item.shopName || item.partnerBrandName || 'Partner Studio',
          partnerBrandName: item.shopName || item.partnerBrandName || 'Partner Studio',
          service: item.serviceName || item.name || 'Grooming Service',
          serviceName: item.serviceName || item.name || 'Grooming Service',
          price: Number(item.price) || servicePrice,
          amountPaid: Number(item.price) || servicePrice,
          amount: Number(item.price) || servicePrice,
          date: item.date || new Date().toDateString(),
          selectedDate: item.date || item.selectedDate || new Date().toDateString(),
          time: item.time || '10:00',
          selectedSlot: item.time || item.selectedSlot || '10:00',
          status: 'pending',
          bookingStatus: 'pending',
          paymentStatus: 'SUCCESS',
          payment_status: 'paid',
          paymentMethod: 'BB_CONNECT_WALLET',
          partner_accepted: false,
          partner_rejected: false,
          heldAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          timestamp: serverTimestamp(),
          transactionId: generatedTxId
        };

        const bookingRef = await addDoc(collection(db, 'bookings'), bookingDocData);
        finalBookingIds.push(bookingRef.id);
      }
    }

    // 4. Record DEBIT ledger entry in users/{customerId}/wallet_transactions
    await addDoc(collection(db, 'users', customerId, 'wallet_transactions'), {
      amount: totalToDeduct,
      type: 'DEBIT',
      status: 'DEBIT',
      description: isSlotBooking 
        ? `Booking Payment: ${cartItems[0]?.serviceName || cartItems[0]?.name || 'Service'} (${cartItems[0]?.shopName || 'Partner'})` 
        : `Order Payment for ${cartItems.length} items`,
      bookingId: finalBookingIds[0] || null,
      orderId: orderRef.id,
      transactionId: generatedTxId,
      createdAt: serverTimestamp()
    });

    return {
      success: true,
      bookingIds: finalBookingIds,
      orderId: orderRef.id
    };
  }
}
