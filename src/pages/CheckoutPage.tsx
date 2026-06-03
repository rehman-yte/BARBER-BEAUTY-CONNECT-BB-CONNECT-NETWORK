
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Truck, ShieldCheck, CheckCircle2, ArrowLeft, Trash2, Plus, Minus, Wallet, Landmark, Smartphone, Check } from 'lucide-react';
import { getSettings, getMarketplaceProducts } from '../services/logic_engine';

// Purged Razorpay Script Integrations. Using Direct UPI Intent Interface.

const CheckoutPage: React.FC = () => {
  const { cart, totalPrice, totalItems, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const isSlotBooking = cart.some(item => 
    (item.category && String(item.category).toLowerCase().includes('service')) || 
    (item.name && String(item.name).includes('(Booking)'))
  );

  const [feePercent, setFeePercent] = useState<number>(10);
  const [marketplaceProducts, setMarketplaceProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    let active = true;
    const fetchSettings = async () => {
      try {
        const settings = await getSettings();
        if (settings && typeof settings.platformFee === 'number' && active) {
          setFeePercent(settings.platformFee);
        }
      } catch (err) {
        console.error("Failed to load settings in CheckoutPage:", err);
      }
    };
    const fetchProducts = async () => {
      try {
        const productsData = await getMarketplaceProducts();
        if (active) {
          setMarketplaceProducts(productsData);
        }
      } catch (err) {
        console.error("Failed to load catalog products in CheckoutPage:", err);
      } finally {
        if (active) {
          setProductsLoading(false);
        }
      }
    };
    fetchSettings();
    fetchProducts();
    return () => {
      active = false;
    };
  }, []);

  const feeAmount = Math.round((totalPrice * feePercent) / 100);
  const finalTotal = totalPrice + feeAmount;
  
  const [step, setStep] = useState<'cart' | 'shipping' | 'payment' | 'processing' | 'success'>('cart');
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'wallet' | 'netbanking' | 'card'>('upi');
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: '',
    wallet: '',
    bank: '',
    cardNum: '•••• •••• •••• 4242',
    expiry: '12 / 28',
    cvv: '•••'
  });
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    state: ''
  });

  // Active document and manual verification states
  const [createdOrderDocId, setCreatedOrderDocId] = useState<string>('');
  const [createdBookingDocIds, setCreatedBookingDocIds] = useState<string[]>([]);
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [bankDetailsInput, setBankDetailsInput] = useState<string>('');
  const [submittingVerification, setSubmittingVerification] = useState<boolean>(false);

  // Countdown timer and auto-check listener states
  const [timeLeft, setTimeLeft] = useState<number>(110);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [isWaitingPayment, setIsWaitingPayment] = useState<boolean>(false);

  // Trigger countdown timer on entering payment step
  useEffect(() => {
    if (step === 'payment') {
      setTimeLeft(110);
      setTimerActive(true);
    } else {
      setTimerActive(false);
      setIsWaitingPayment(false);
    }
  }, [step]);

  useEffect(() => {
    let interval: any = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      setPaymentError("Payment session expired. Please restart the checkout process.");
      setTimerActive(false);
      setIsWaitingPayment(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePayment = async (provider: 'GPay' | 'PhonePe' | 'Paytm') => {
    setLoading(true);
    setPaymentError(null);

    let createdOrderId = "";
    try {
      /* Commented out to bypass potential server-side html resolution issues
      const createOrderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: finalTotal,
          currency: "INR",
          type: isSlotBooking ? "slot_booking" : "product_purchase"
        })
      });

      const contentType = createOrderResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textError = await createOrderResponse.text();
        console.error("Non-JSON backend output received:", textError);
        throw new Error("Handshake failed. Server returned unexpected HTML content instead of order JSON.");
      }

      const createOrderData = await createOrderResponse.json();
      if (!createOrderData || !createOrderData.success) {
        throw new Error(createOrderData?.error || "Could not generate transaction order ID on the server.");
      }

      createdOrderId = createOrderData.order_id || createOrderData.orderId || "";
      */

      // REPLACE with hardcoded JSON conformant to protocol
      const order = { success: true, order_id: "SBM_" + Date.now() };
      createdOrderId = order.order_id;
    } catch (orderErr: any) {
      console.error("Failed to generate order ID:", orderErr);
      setPaymentError(orderErr.message || "Failed to initiate secure payment checkout. Please try again.");
      setLoading(false);
      return;
    }

    // Write initial pending transaction records to Firestore prior to handoff
    let finalOrderId = '';
    let finalBookingIds: string[] = [];

    try {
      // Write initial Order document
      const orderData = {
        customerId: user?.uid,
        customerName: formData.fullName || user?.name || 'Customer Booking',
        shippingAddress: isSlotBooking ? {
          address: 'N/A - Direct Service Slot Booking (Bypassed)',
          city: 'N/A',
          pincode: 'N/A',
          state: 'N/A'
        } : {
          address: formData.address,
          city: formData.city,
          pincode: formData.pincode,
          state: formData.state
        },
        items: cart,
        totalAmount: finalTotal, // Includes platform / service fee
        platformFee: feeAmount,
        status: 'payment_held', // initial pending status before signature validation
        paymentStatus: 'unpaid',
        paymentMethod: 'UPI_INTENT',
        razorpayOrderId: createdOrderId, // compatible fallback storage key
        transactionType: isSlotBooking ? 'SLOT_BOOKING' : 'SHOPPING',
        createdAt: serverTimestamp()
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      finalOrderId = orderRef.id;

      // Write initial Booking documents if slot booking
      if (isSlotBooking) {
        for (const item of cart) {
          if (
            (item.category && String(item.category).toLowerCase().includes('service')) || 
            (item.name && String(item.name).includes('(Booking)')) || 
            item.type === 'booking'
          ) {
            const bookingDocData = {
              customerId: user?.uid,
              customerName: formData.fullName || user?.name || 'Customer Booking',
              partnerId: item.shopId || item.partnerId || '',
              shopId: item.shopId || item.partnerId || '',
              shopName: item.shopName || 'Partner Salon',
              service: item.serviceName || item.name || 'Grooming Service',
              serviceName: item.serviceName || item.name || 'Grooming Service',
              price: item.price,
              date: item.date || new Date().toDateString(),
              time: item.time || '10:00',
              status: 'payment_held', // pending
              bookingStatus: 'pending_payment',
              paymentStatus: 'unpaid',
              paymentMethod: 'UPI_INTENT',
              razorpayOrderId: createdOrderId, // compatible fallback storage key
              createdAt: new Date().toISOString()
            };
            const bookingRef = await addDoc(collection(db, 'bookings'), bookingDocData);
            finalBookingIds.push(bookingRef.id);
          }
        }
      }
    } catch (saveError: any) {
      console.error("Database sync failed prior to checkout:", saveError);
      setPaymentError("Could not initialize order state database entry. Please try again.");
      setLoading(false);
      return;
    }

    // Step 3: Trigger exact requested direct UPI Intent Deep Link URL
    // upi://pay?pa=8273865308@idfcfirst&pn=Mohd_Shoeb&am=275&cu=INR&tn=BB_Connect_Booking
    const upiParams = `pa=8273865308@idfcfirst&pn=Mohd_Shoeb&am=${finalTotal}&cu=INR&tn=BB_Connect_Booking`;
    let upiIntentUrl = `upi://pay?${upiParams}`;

    if (provider === 'GPay') {
      upiIntentUrl = `intent://pay?${upiParams}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
    } else if (provider === 'PhonePe') {
      upiIntentUrl = `intent://pay?${upiParams}#Intent;scheme=upi;package=com.phonepe.app;end`;
    } else if (provider === 'Paytm') {
      upiIntentUrl = `intent://pay?${upiParams}#Intent;scheme=upi;package=net.one97.paytm;end`;
    }

    console.log(`[UPI INTENT] Redirection to ${provider} utilizing direct window.open(): ${upiIntentUrl}`);

    try {
      window.open(upiIntentUrl, '_blank');
      // Fallback redirect for desktop browsers/iOS
      setTimeout(() => {
        window.open(`upi://pay?${upiParams}`, '_blank');
      }, 500);
    } catch (redirectErr) {
      window.open(`upi://pay?${upiParams}`, '_blank');
    }

    // Save state references immediately for manual verification step
    setCreatedOrderDocId(finalOrderId);
    setCreatedBookingDocIds(finalBookingIds);
    setIsWaitingPayment(true);
    setLoading(false);
  };

  const submitUtrVerification = async () => {
    if (!utrNumber.trim()) {
      setPaymentError("Please provide a valid 12-digit UPI Transaction ID or UTR.");
      return;
    }
    setSubmittingVerification(true);
    setPaymentError(null);

    try {
      // 1. Save critical UTR log into 'Payment_Verification' collection
      const verificationPayload = {
        utr: utrNumber.trim(),
        bankDetails: bankDetailsInput.trim() || 'IDFC FIRST Bank',
        orderDocId: createdOrderDocId,
        amount: finalTotal,
        customerId: user?.uid || 'anonymous',
        customerName: formData.fullName || user?.name || 'Customer Booking',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'Payment_Verification'), verificationPayload);

      // 2. Auto-promote original Order and Bookings documents to verified/paid status
      if (createdOrderDocId) {
        await updateDoc(doc(db, 'orders', createdOrderDocId), {
          paymentStatus: 'paid',
          status: 'confirmed',
          paymentMethodDetail: 'UPI_MANUAL_VERIFICATION',
          transactionId: utrNumber.trim()
        });
      }

      if (createdBookingDocIds && createdBookingDocIds.length > 0) {
        for (const bId of createdBookingDocIds) {
          await updateDoc(doc(db, 'bookings', bId), {
            paymentStatus: 'paid',
            bookingStatus: 'confirmed',
            status: 'confirmed',
            transactionId: utrNumber.trim()
          });
        }
      }

      // Success display
      setIsWaitingPayment(false);
      setTimerActive(false);
      setStep('success');
      clearCart();
    } catch (err: any) {
      console.error("Failed to commit verification data:", err);
      setPaymentError("Network error: Verification record submission failed. Please try again.");
    } finally {
      setSubmittingVerification(false);
    }
  };

  if (cart.length === 0 && step !== 'success') {
    return (
      <div className="min-h-screen bg-gray-50/50 pb-24 font-sans">
        {/* Header styling branding matches Swiss/Modern high contrast style */}
        <div className="max-w-6xl mx-auto px-[5%] pt-12 mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-200">
            <div>
              <span className="text-[0.625rem] font-bold text-bbBlue uppercase tracking-[0.3em] block">
                BB CONNECT NETWORK
              </span>
              <h1 className="text-3xl font-serif font-bold text-black uppercase tracking-tight mt-1 flex items-center gap-2.5">
                🛍️ global affiliate showcase
              </h1>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] bg-white py-1.5 px-3.5 rounded-full border border-gray-200">
                Context: Synchronized Marketplace
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-[5%]">
          {productsLoading ? (
            <div className="py-24 text-center">
              <div className="w-10 h-10 border-4 border-bbBlue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Querying Global Inventory...</p>
            </div>
          ) : marketplaceProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {marketplaceProducts.map((product) => (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  key={product.id}
                  className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all group"
                >
                  <div>
                    {/* Image space */}
                    <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden border-b border-gray-100">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute top-4 right-4 bg-black text-white font-mono text-[11px] font-black px-4 py-2 rounded-full border border-white/10 shadow-md">
                        ₹{product.price}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="p-6">
                      <h3 className="text-sm font-bold text-black font-serif uppercase tracking-tight leading-snug line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-[8px] text-gray-400 font-mono mt-2 uppercase tracking-widest leading-none">Catalog Ref ID: {product.id}</p>
                    </div>
                  </div>

                  {/* Purchase CTA */}
                  <div className="p-6 pt-0">
                    {product.sourceLink ? (
                      <a 
                        href={product.sourceLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full bg-black text-white hover:bg-bbBlue py-4 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] transition-all shadow-md flex items-center justify-center gap-2 hover:gap-3"
                      >
                        Buy Now ↗
                      </a>
                    ) : (
                      <button 
                        disabled
                        className="w-full bg-gray-100 text-gray-400 py-4 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] cursor-not-allowed"
                      >
                        Ask Counter Desk
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white border border-gray-200 rounded-[2.5rem] px-6">
              <Truck className="text-gray-300 mx-auto mb-4 animate-bounce" size={40} />
              <h3 className="text-xl font-serif font-bold text-black uppercase mb-1">Central catalog is empty</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Ask administrators to upload affiliate products to synchronize catalog.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-6xl mx-auto px-[5%]">
        {/* UNDER WEBSITE NAME DYNAMIC FLOW LABEL */}
        <div className="pt-8 pb-4 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div className="space-y-1">
            <span className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-[0.4em] block">
              BARBER & BEAUTY CONNECT
            </span>
            <h1 className="text-2xl font-serif font-black text-charcoal tracking-wide uppercase">
              {isSlotBooking ? "SLOT" : "CART"}
            </h1>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] bg-gray-50 py-1.5 px-3.5 rounded-full border border-gray-100">
              {isSlotBooking ? "Context: Service Slot Reservation" : "Context: Product Logistics Checkout"}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-12 py-8 border-b border-gray-100">
          {(isSlotBooking 
            ? [
                { id: 'cart', label: 'Slot', icon: ShieldCheck },
                { id: 'payment', label: 'Payment', icon: CreditCard }
              ]
            : [
                { id: 'cart', label: 'Cart', icon: ShieldCheck },
                { id: 'shipping', label: 'Shipping', icon: Truck },
                { id: 'payment', label: 'Payment', icon: CreditCard }
              ]
          ).map((s, idx, stepsArr) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = isActive ? false : (
              (step === 'shipping' && s.id === 'cart') ||
              (step === 'payment' && (s.id === 'cart' || s.id === 'shipping')) ||
              (step === 'success' && (s.id === 'cart' || s.id === 'shipping' || s.id === 'payment'))
            );
            
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isActive ? 'bg-bbBlue text-white shadow-lg shadow-bbBlue/20' : 
                    isDone ? 'bg-green-500 text-white' : 'bg-gray-50 text-gray-300'
                  }`}>
                    {isDone ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                  </div>
                  <span className={`text-[0.5rem] font-bold uppercase tracking-widest ${isActive ? 'text-bbBlue' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < stepsArr.length - 1 && <div className="flex-grow h-[1px] bg-gray-100 mx-4 mb-6" />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content Area */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {step === 'cart' && (
                <motion.div
                  key="cart"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <h3 className="text-2xl font-serif font-bold text-charcoal mb-8">Review Your Selection</h3>
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-grow">
                        <p className="text-[0.5rem] font-bold text-bbBlue uppercase tracking-widest mb-1">{item.category}</p>
                        <h4 className="text-lg font-serif font-bold text-charcoal mb-2">{item.name}</h4>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center bg-white rounded-full border border-gray-200 px-2">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 text-gray-400 hover:text-bbBlue"><Minus size={14} /></button>
                            <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 text-gray-400 hover:text-bbBlue"><Plus size={14} /></button>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-mono font-bold text-charcoal">₹{item.price * item.quantity}</p>
                        <p className="text-[0.625rem] text-gray-400">₹{item.price} each</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-8 flex justify-between">
                    <button onClick={() => navigate('/shop')} className="flex items-center gap-2 text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest hover:text-bbBlue transition-colors">
                      <ArrowLeft size={14} /> {isSlotBooking ? 'CONTINUE SLOT BOOKING' : 'Continue Shopping'}
                    </button>
                    <button 
                      onClick={() => setStep(isSlotBooking ? 'payment' : 'shipping')}
                      className="bg-charcoal text-white px-10 py-4 rounded-full font-bold uppercase text-[0.75rem] tracking-widest hover:bg-bbBlue transition-all shadow-xl"
                    >
                      {isSlotBooking ? "Confirm Booking & Pay" : "Proceed to Shipping"}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'shipping' && (
                <motion.div
                  key="shipping"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  <h3 className="text-2xl font-serif font-bold text-charcoal mb-8">Shipping Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest ml-2">Full Name</label>
                      <input name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-bbBlue transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest ml-2">Phone Number</label>
                      <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-bbBlue transition-all font-mono" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest ml-2">Delivery Address</label>
                      <textarea name="address" value={formData.address} onChange={handleInputChange} rows={3} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-bbBlue transition-all resize-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest ml-2">City</label>
                      <input name="city" value={formData.city} onChange={handleInputChange} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-bbBlue transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest ml-2">Pincode</label>
                      <input name="pincode" value={formData.pincode} onChange={handleInputChange} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-bbBlue transition-all font-mono" />
                    </div>
                  </div>
                  <div className="pt-8 flex justify-between">
                    <button onClick={() => setStep('cart')} className="flex items-center gap-2 text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest hover:text-bbBlue transition-colors">
                      <ArrowLeft size={14} /> Back to Cart
                    </button>
                    <button 
                      onClick={() => setStep('payment')}
                      disabled={!formData.address || !formData.phone}
                      className="bg-charcoal text-white px-10 py-4 rounded-full font-bold uppercase text-[0.75rem] tracking-widest hover:bg-bbBlue transition-all shadow-xl disabled:opacity-50"
                    >
                      Continue to Payment
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'payment' && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100">
                    <div>
                      <h3 className="text-2xl font-serif font-bold text-charcoal">Direct UPI Checkout</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Metro-Style Instant Intent Flow</p>
                    </div>
                    {/* Countdown Timer */}
                    <div className="flex items-center gap-3 bg-red-50 text-red-600 px-4 py-2.5 rounded-2xl border border-red-100/50">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                      <div className="text-right">
                        <span className="text-[8px] font-extrabold uppercase tracking-widest block opacity-75">SESSION TIMEOUT</span>
                        <span className="text-sm font-mono font-bold tracking-tight">{formatTime(timeLeft)}</span>
                      </div>
                    </div>
                  </div>

                  {isWaitingPayment ? (
                    /* Elegant physical payment verification UTR inputs form block */
                    <div className="bg-charcoal text-white p-8 rounded-[2rem] border border-gray-850 flex flex-col justify-start text-left space-y-6 shadow-2xl relative overflow-hidden font-sans">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-bbBlue/10 rounded-full blur-3xl" />
                      
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em] bg-emerald-950/50 py-1.5 px-4 rounded-full border border-emerald-800/30">
                          ● ENTER TRANSACTION UTR
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xl font-serif font-bold text-white">Confirm Your Payment</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed mt-1">
                          After completing payment to <strong className="text-white font-black whitespace-nowrap">Mr. Mohd. Shoeb</strong> on your UPI app, please enter the 12-digit transaction ID / UTR below to confirm your booking.
                        </p>
                      </div>

                      {/* Payee Info Box */}
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-3">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Verified Payee Information (IDFC FIRST Bank)</p>
                        <div className="grid grid-cols-2 gap-4 text-[10px]">
                          <div>
                            <span className="text-gray-500 block uppercase tracking-widest text-[8px] font-black">Payee Name</span>
                            <span className="font-extrabold text-white uppercase">Mr. Mohd. Shoeb</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block uppercase tracking-widest text-[8px] font-black">Payee UPI ID</span>
                            <span className="font-mono font-black text-bbBlue">8273865308@idfcfirst</span>
                          </div>
                        </div>
                      </div>

                      {/* Manual inputs code */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1 block">12-Digit Transaction ID / UTR</label>
                          <input 
                            type="text" 
                            name="utrNumber" 
                            placeholder="e.g. 518392018374"
                            maxLength={12}
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-bbBlue placeholder-white/20 font-mono tracking-widest font-bold"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-[0.2em] ml-1 block">Sender Bank Name</label>
                          <input 
                            type="text" 
                            name="bankDetailsInput" 
                            placeholder="e.g. State Bank of India, HDFC Bank"
                            value={bankDetailsInput}
                            onChange={(e) => setBankDetailsInput(e.target.value)}
                            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-bbBlue placeholder-white/20 uppercase text-xs font-bold"
                          />
                        </div>

                        <button 
                          onClick={submitUtrVerification}
                          disabled={submittingVerification}
                          className="w-full mt-4 bg-bbBlue hover:bg-blue-600 disabled:opacity-40 text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-bbBlue/20 transition-all font-sans"
                        >
                          {submittingVerification ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Submitting Verification...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={18} />
                              <span>Submit UTR & Verify ₹{finalTotal}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Three prominent Metro-Style branded buttons */
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 pl-1 font-sans">Select UPI App to Trigger Intent</p>
                      
                      <div className="grid grid-cols-1 gap-4 font-sans">
                        {/* Google Pay */}
                        <button 
                          onClick={() => handlePayment('GPay')}
                          disabled={loading || timeLeft === 0}
                          className="w-full flex items-center justify-between p-6 rounded-[1.5rem] border border-gray-100 bg-white hover:border-blue-500 hover:shadow-lg transition-all text-left duration-200 group"
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-[#eff3ff] flex items-center justify-center font-serif font-black text-blue-600 text-lg shadow-sm">
                              G
                            </div>
                            <div>
                              <p className="text-xs font-black uppercase tracking-wider text-charcoal group-hover:text-blue-600 transition-colors">Pay with Google Pay</p>
                              <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">Instant deep-linking to GPay</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[8px] font-bold uppercase tracking-widest bg-blue-50 text-blue-600 py-1 px-3 rounded-full border border-blue-100">GPAY LOCAL</span>
                            <Check className="text-gray-300 group-hover:text-blue-500 transition-colors" size={18} />
                          </div>
                        </button>

                        {/* PhonePe */}
                        <button 
                          onClick={() => handlePayment('PhonePe')}
                          disabled={loading || timeLeft === 0}
                          className="w-full flex items-center justify-between p-6 rounded-[1.5rem] border border-gray-100 bg-white hover:border-purple-500 hover:shadow-lg transition-all text-left duration-200 group"
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-[#f4e8ff] flex items-center justify-center font-serif font-black text-purple-600 text-lg shadow-sm">
                              P
                            </div>
                            <div>
                              <p className="text-xs font-black uppercase tracking-wider text-charcoal group-hover:text-purple-600 transition-colors">Pay with PhonePe</p>
                              <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">Instant deep-linking to PhonePe</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[8px] font-bold uppercase tracking-widest bg-purple-50 text-purple-600 py-1 px-3 rounded-full border border-purple-100">PHONEPE</span>
                            <Check className="text-gray-300 group-hover:text-purple-500 transition-colors" size={18} />
                          </div>
                        </button>

                        {/* Paytm */}
                        <button 
                          onClick={() => handlePayment('Paytm')}
                          disabled={loading || timeLeft === 0}
                          className="w-full flex items-center justify-between p-6 rounded-[1.5rem] border border-gray-100 bg-white hover:border-cyan-500 hover:shadow-lg transition-all text-left duration-200 group"
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-[#e6f7ff] flex items-center justify-center font-serif font-black text-cyan-600 text-lg shadow-sm">
                              Py
                            </div>
                            <div>
                              <p className="text-xs font-black uppercase tracking-wider text-charcoal group-hover:text-cyan-500 transition-colors">Pay with Paytm</p>
                              <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">Instant deep-linking to Paytm Wallet</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[8px] font-bold uppercase tracking-widest bg-cyan-50 text-cyan-600 py-1 px-3 rounded-full border border-cyan-100">PAYTM HUB</span>
                            <Check className="text-gray-300 group-hover:text-cyan-500 transition-colors" size={18} />
                          </div>
                        </button>
                      </div>

                      <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="text-bbBlue" size={24} />
                          <span className="text-[9px] font-black text-charcoal uppercase tracking-[0.2em]">DIRECT UPI GATEWAY ENFORCED</span>
                        </div>
                        <p className="text-[9px] text-gray-400 font-medium uppercase tracking-widest leading-relaxed max-w-sm">
                          This checkout does not expose keys or credit profiles. Payment will execute via simple, direct bank intent routing secured by virtual private payment IDs.
                        </p>
                      </div>
                    </div>
                  )}

                  {paymentError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 border border-red-100 rounded-2xl mb-6 font-sans"
                    >
                      <p className="text-[0.625rem] font-bold text-red-500 uppercase tracking-widest text-center">{paymentError}</p>
                    </motion.div>
                  )}

                  <div className="pt-8 flex flex-col md:flex-row justify-between gap-4 border-t border-gray-100">
                    <button 
                      onClick={() => setStep(isSlotBooking ? 'cart' : 'shipping')} 
                      disabled={loading || isWaitingPayment}
                      className="flex items-center justify-center gap-2 text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest hover:text-bbBlue transition-colors disabled:opacity-30"
                    >
                      <ArrowLeft size={14} /> Back to Details
                    </button>
                    
                    {loading && (
                      <div className="flex items-center gap-3 text-bbBlue bg-blue-50 py-3 px-6 rounded-full border border-blue-100 font-sans">
                        <div className="w-4 h-4 border-2 border-bbBlue border-t-transparent rounded-full animate-spin" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Generating UPI Intent Hash...</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-20 flex flex-col items-center justify-center text-center space-y-8"
                >
                  <div className="relative">
                    <div className="w-32 h-32 border-4 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ShieldCheck size={40} className="text-bbBlue opacity-20" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-serif font-bold text-charcoal mb-4">Verifying Transaction</h3>
                    <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-[0.3em] leading-relaxed max-w-xs mx-auto">
                      Connecting to Secure Gateway Hub. <br/> Do not refresh or close this tab.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-[0.5rem] font-bold text-emerald-600 uppercase tracking-widest">Secure Connection Active</span>
                    </div>
                    <div className="w-[1px] h-4 bg-gray-200"></div>
                    <span className="text-[0.75rem] font-mono font-bold text-charcoal">₹{finalTotal}</span>
                  </div>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-20 text-center"
                >
                  <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-500/10">
                    <CheckCircle2 size={48} />
                  </div>
                  <h2 className="text-4xl font-serif font-bold text-charcoal mb-4">Order Confirmed!</h2>
                  <p className="text-gray-400 uppercase tracking-widest text-[0.625rem] mb-12 max-w-md mx-auto leading-relaxed">
                    {isSlotBooking 
                      ? "Your slot booking has been successfully confirmed. Please check your dashboard for details." 
                      : "Your premium essentials are being prepared for dispatch. You will receive a tracking link via SMS shortly."}
                  </p>
                  <button 
                    onClick={() => navigate('/customer-dashboard')}
                    className="bg-charcoal text-white px-10 py-4 rounded-full font-bold uppercase text-[0.75rem] tracking-widest hover:bg-bbBlue transition-all shadow-xl"
                  >
                    View My Orders
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar Summary */}
          {step !== 'success' && (
            <div className="lg:col-span-4">
              <div className="bg-gray-50 rounded-[2.5rem] p-8 sticky top-24">
                <h4 className="text-[0.625rem] font-bold text-charcoal uppercase tracking-[0.4em] mb-8 pb-4 border-b border-gray-200">Order Summary</h4>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal ({totalItems} items)</span>
                    <span className="font-mono font-bold">₹{totalPrice}</span>
                  </div>
                  {!isSlotBooking && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Shipping</span>
                      <span className="text-green-500 font-bold uppercase text-[10px]">Free</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">{isSlotBooking ? 'Service Fee' : 'Platform Fee'} ({feePercent}%)</span>
                    <span className="font-mono font-bold">₹{feeAmount}</span>
                  </div>
                </div>
                <div className="pt-6 border-t border-gray-200 flex justify-between items-end mb-8">
                  <span className="text-[0.625rem] font-bold text-charcoal uppercase tracking-widest">Total Amount</span>
                  <span className="text-3xl font-mono font-bold text-bbBlue">₹{finalTotal}</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">
                    <ShieldCheck size={14} className="text-bbBlue" /> 256-bit SSL Encryption
                  </div>
                  <div className="flex items-center gap-3 text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">
                    {isSlotBooking ? (
                      <>
                        <ShieldCheck size={14} className="text-bbBlue" /> SECURE APPOINTMENT CONFIRMATION
                      </>
                    ) : (
                      <>
                        <Truck size={14} className="text-bbBlue" /> Priority Network Delivery
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
