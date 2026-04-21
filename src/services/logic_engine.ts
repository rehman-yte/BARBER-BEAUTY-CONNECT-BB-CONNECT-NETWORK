import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  setDoc, 
  onSnapshot, 
  orderBy, 
  limit, 
  Timestamp 
} from 'firebase/firestore';

/**
 * Interfaces for Data Structures
 */
export interface SettlementInfo {
  totalAmount: number;
  status: 'PENDING (ESCROW)' | 'READY FOR PAYOUT';
  payoutUpi: string;
  cycleEnd: string;
}

export interface WorkerInsight {
  workerId: string;
  workerName: string;
  workerImage?: string;
  earnings: number;
  bookingCount: number;
  todayTotal: number;
}

export interface FinancialSummary {
  confirmedAmount: number;
  escrowAmount: number;
  nextPayoutTime: string;
  timeRemaining: string;
}

/**
 * PARTNER / SHOP SERVICES
 */

// Fetch all partners (Production Firebase)
export const getShops = async (): Promise<any[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'partners'));
    return querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data() as any;
      return { 
        id: docSnapshot.id, 
        ...data,
        brandName: data.brand_name || data.brandName,
        ownerName: data.owner_name || data.ownerName,
        mobile: data.mobile_number || data.mobile,
        adminApproved: data.adminApproved || data.status === 'approved' || data.status === 'active'
      };
    });
  } catch (err) {
    console.error('Firestore getShops failure:', err);
    throw err;
  }
};

/**
 * ROADMAP COMPLIANT DATA FETCHERS
 */

// getPendingPartners: For Admin Verification Queue
export const getPendingPartners = async (): Promise<any[]> => {
  try {
    const q = query(collection(db, 'partners'), where('status', '==', 'pending'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (err) {
    console.error("getPendingPartners error:", err);
    // Fallback if index is missing: filter in memory
    const all = await getShops();
    return all.filter(s => s.status === 'pending' || !s.adminApproved);
  }
};

// getApprovedPartners: For Customer Explore Page
export const getApprovedPartners = async (category?: string): Promise<any[]> => {
  try {
    let q = query(collection(db, 'partners'), where('status', '==', 'approved'));
    if (category) {
      q = query(collection(db, 'partners'), where('status', '==', 'approved'), where('category', '==', category));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data() as any;
      return { 
        id: docSnapshot.id, 
        ...data,
        brandName: data.brand_name || data.brandName,
        ownerName: data.owner_name || data.ownerName,
        mobile: data.mobile_number || data.mobile,
        adminApproved: data.adminApproved || data.status === 'approved' || data.status === 'active'
      };
    });
  } catch (err) {
    console.error("getApprovedPartners error:", err);
    // Fallback if index/composite index is missing: filter in memory
    const all = await getShops();
    return all.filter(shop => {
      const isApproved = shop.status === 'approved' || shop.adminApproved === true;
      if (!isApproved) return false;
      if (category && shop.category !== category) return false;
      return true;
    });
  }
};

// Legacy alias for compatibility
export const getApprovedShops = getApprovedPartners;

// Add a new shop (Production Firebase)
export const addShop = async (shopData: any) => {
  try {
    const docId = shopData.id || (shopData.mobile ? String(shopData.mobile) : undefined);
    const payload = {
      ...shopData,
      adminApproved: false,
      status: 'pending',
      createdAt: Timestamp.now()
    };

    if (docId) {
      await setDoc(doc(db, 'partners', docId), payload);
      return { id: docId, ...payload };
    } else {
      const docRef = await addDoc(collection(db, 'partners'), payload);
      return { id: docRef.id, ...payload };
    }
  } catch (err) {
    console.error('Firestore addShop production failure:', err);
    throw err;
  }
};

// Update shop details (Production Firebase)
export const updateShop = async (id: string, updates: any) => {
  try {
    const docRef = doc(db, 'partners', id);
    await updateDoc(docRef, updates);
    return true;
  } catch (err) {
    console.error('Firestore updateShop production failure:', err);
    throw err;
  }
};

// Fetch a single shop by ID (Production Firebase)
export const getShopById = async (id: string): Promise<any> => {
  try {
    const docRef = doc(db, 'partners', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data() as any;
    return {
      id: docSnap.id,
      ...data,
      brandName: data.brand_name || data.brandName,
      ownerName: data.owner_name || data.ownerName,
      mobile: data.mobile_number || data.mobile,
      upiId: data.upi_id || data.upiId,
      workerQuantity: data.worker_quantity || data.workerQuantity,
      status: data.status || 'pending',
      adminApproved: data.adminApproved || data.status === 'approved'
    };
  } catch (err) {
    console.error('Firestore getShopById production failure:', err);
    throw err;
  }
};

/**
 * BOOKING SERVICES
 */

// Fetch bookings (filtered by user if ID provided)
export const getBookings = async (userId?: string): Promise<any[]> => {
  try {
    const q = query(collection(db, 'bookings'));
    const querySnapshot = await getDocs(q);
    const allBookings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (userId) {
      return allBookings.filter((b: any) => b.customerId === userId || b.shopId === userId);
    }
    return allBookings;
  } catch (err) {
    console.error('Firestore getBookings failure:', err);
    throw err;
  }
};

// Add a new booking
export const addBooking = async (booking: any) => {
  try {
    const newBooking = {
      ...booking,
      createdAt: new Date().toISOString(),
      status: 'Pending'
    };
    const docRef = await addDoc(collection(db, 'bookings'), newBooking);
    return { id: docRef.id, ...newBooking };
  } catch (err) {
    console.error('Firestore addBooking failure:', err);
    throw err;
  }
};

// Update booking status or details
export const updateBooking = async (bookingId: string, updates: any) => {
  try {
    const docRef = doc(db, 'bookings', bookingId);
    await updateDoc(docRef, updates);
    return true;
  } catch (err) {
    console.error('Firestore updateBooking failure:', err);
    throw err;
  }
};

// Legacy status update helper
export const updateBookingStatus = async (bookingId: string, newStatus: string) => {
  return updateBooking(bookingId, { status: newStatus });
};

/**
 * SETTINGS & NOTIFICATIONS
 */

export const getSettings = async (): Promise<any> => {
  try {
    const docRef = doc(db, 'settings', 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data();
    return { platformFee: 10, broadcasts: [] };
  } catch (err) {
    console.error('Firestore getSettings failure:', err);
    throw err;
  }
};

export const updateSettings = async (updates: any) => {
  try {
    const docRef = doc(db, 'settings', 'global');
    await updateDoc(docRef, updates);
    return true;
  } catch (err) {
    console.error('Firestore updateSettings failure:', err);
    throw err;
  }
};

export const sendNotification = async (message: string, target: 'all' | 'customers' | 'partners' = 'all') => {
  try {
    const payload = {
      message,
      target,
      timestamp: new Date().toISOString(),
      createdAt: Timestamp.now(),
      type: 'GLOBAL BROADCAST'
    };
    await addDoc(collection(db, 'notifications'), payload);
    return true;
  } catch (err) {
    console.error('Firestore sendNotification failure:', err);
    throw err;
  }
};

export const subscribeToNotifications = (target: string, callback: (notifs: any[]) => void) => {
  const q = query(
    collection(db, 'notifications'),
    where('target', 'in', ['all', target]),
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (err) => {
    console.error('Firestore notification sync error:', err);
    callback([]); // Return empty list on snapshot error
  });
};

/**
 * ANALYTICS & LOGIC CALCULATIONS
 */

export const getFinancialSummary = (partnerId: string, allBookings: any[]): FinancialSummary => {
  const now = Date.now();
  const twelveHours = 12 * 60 * 60 * 1000;
  
  const confirmed = allBookings.filter(b => 
    b.shopId === partnerId && 
    ['Confirmed', 'Accepted', 'settlement_due'].includes(b.status)
  );

  const confirmedAmount = confirmed.reduce((sum, b) => sum + (b.price || 0), 0);
  const escrowAmount = allBookings
    .filter(b => b.shopId === partnerId && b.status === 'payment_held')
    .reduce((sum, b) => sum + (b.price || 0), 0);

  return {
    confirmedAmount,
    escrowAmount,
    nextPayoutTime: new Date(now + twelveHours).toISOString(),
    timeRemaining: "12h 00m"
  };
};

export const calculateSettlements = (partnerId: string, allBookings: any[], upiId: string): SettlementInfo[] => {
  const partnerBookings = allBookings.filter(b => b.shopId === partnerId);
  if (partnerBookings.length === 0) return [];

  return [{
    totalAmount: partnerBookings.reduce((sum, b) => sum + (b.price || 0), 0),
    status: 'READY FOR PAYOUT',
    payoutUpi: upiId,
    cycleEnd: new Date().toISOString()
  }];
};

export const getWorkerInsights = (partnerId: string, allBookings: any[], shopWorkers: any[]): WorkerInsight[] => {
  return (shopWorkers || []).map(worker => {
    const workerBookings = allBookings.filter(b => b.shopId === partnerId && b.workerName === worker.name);
    return {
      workerId: worker.name,
      workerName: worker.name,
      workerImage: worker.image,
      earnings: workerBookings.reduce((sum, b) => sum + (b.price || 0), 0),
      bookingCount: workerBookings.length,
      todayTotal: 0
    };
  });
};

export const getGrowthPercentage = (partnerId: string, allBookings: any[]): string => {
  return "+12.5%"; // Mock growth calculation
};

export const calculateWaitTime = (partnerId: string, allBookings: any[]): number => {
  const active = allBookings.filter(b => b.shopId === partnerId && b.status === 'Accepted');
  return active.length * 20; // 20 mins per active booking
};
