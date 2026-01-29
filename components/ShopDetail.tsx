
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const ShopDetail: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shopData, setShopData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchShop = async () => {
      if (!db || !id) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'partners', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setShopData({ id: docSnap.id, ...data });
          if (data.services && data.services.length > 0) {
            setSelectedService(data.services[0]);
          }
        } else {
          navigate('/explore');
        }
      } catch (err) {
        console.error("Error fetching shop:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchShop();
  }, [id, navigate]);

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const generateSlots = () => {
    const slots = [];
    for (let h = 8; h <= 21; h++) {
      slots.push(`${h}:00`);
      slots.push(`${h}:30`);
    }
    slots.push(`22:00`);
    return slots;
  };
  const allSlots = generateSlots();

  const isSlotDisabled = (slot: string) => {
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    if (!isToday) return false;
    const [hour, min] = slot.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hour, min, 0, 0);
    return new Date() > slotTime;
  };

  const handleBooking = () => {
    if (!selectedSlot) return;
    setShowPayment(true);
  };

  const handleAbandonment = async () => {
    if (!user || !db || isProcessing || !shopData) {
      setShowPayment(false);
      return;
    }

    const transactionId = `ABND-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const abandonPayload = {
      customerId: user.uid,
      customerName: user.name,
      shopId: id,
      shopName: shopData.name,
      serviceName: selectedService.name,
      price: selectedService.price,
      date: selectedDate.toDateString(),
      time: selectedSlot,
      status: 'Cancelled',
      message: 'Payment Cancel ❌, Slot Not Booked',
      statusReason: 'Payment Cancel ❌, Slot Not Booked',
      paymentStatus: 'abandoned',
      transactionId: transactionId,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'bookings'), abandonPayload);
    } catch (err) {
      console.error("Abandonment log failed:", err);
    }
    
    setShowPayment(false);
    navigate('/customer-dashboard');
  };

  const handleUPILink = (app: string) => {
    if (!shopData) return;
    const merchantUpi = shopData.upiId || "bbconnect@upi";
    const amount = selectedService.price.toFixed(2);
    const txnNote = `BBCN ${selectedService.name} - ${shopData.name}`;
    const upiParams = `pa=${merchantUpi}&pn=${encodeURIComponent(shopData.name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(txnNote)}`;
    
    let targetUrl = `upi://pay?${upiParams}`;

    if (app === 'GPay') {
      targetUrl = `intent://pay?${upiParams}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
    } else if (app === 'PhonePe') {
      targetUrl = `intent://pay?${upiParams}#Intent;scheme=upi;package=com.phonepe.app;end`;
    } else if (app === 'Paytm') {
      targetUrl = `intent://pay?${upiParams}#Intent;scheme=upi;package=net.one97.paytm;end`;
    }
    
    window.location.href = targetUrl;
  };

  const handleConfirmPayment = async (method: string) => {
    if (!user || !db || !shopData) return;
    setIsProcessing(true);

    const transactionId = `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const bookingPayload = {
      customerId: user.uid,
      customerName: user.name,
      shopId: id,
      shopName: shopData.name,
      serviceName: selectedService.name,
      price: selectedService.price,
      date: selectedDate.toDateString(),
      time: selectedSlot,
      status: 'payment_held', 
      paymentStatus: 'success',
      paymentMethod: method,
      transactionId: transactionId,
      createdAt: serverTimestamp(),
      expiryTime: Date.now() + 5 * 60 * 1000, 
    };

    try {
      await addDoc(collection(db, 'bookings'), bookingPayload);
      setTimeout(() => {
        setIsProcessing(false);
        setShowPayment(false);
        navigate('/customer-dashboard');
      }, 1500);
    } catch (err) {
      console.error("Firestore Error:", err);
      setIsProcessing(false);
      alert("Connection failed. Registry update pending.");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!shopData) return null;

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
        
        {/* LEFT: Info & Gallery */}
        <div className="space-y-12">
          <header>
            <h1 className="text-5xl font-serif font-bold text-bbBlue-deep mb-4">{shopData.name}</h1>
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center font-bold text-charcoal">
                 {shopData.owner?.[0] || 'M'}
               </div>
               <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Master Professional</p>
                  <p className="text-sm font-bold text-charcoal">{shopData.owner}</p>
               </div>
            </div>
          </header>

          <div className="grid grid-cols-3 gap-4">
             {(shopData.images || []).map((url: string, i: number) => (
                <div key={i} className="aspect-square rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all">
                   <img src={url} className="w-full h-full object-cover" />
                </div>
             ))}
          </div>

          <div className="space-y-6">
             <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal">Available Services</h3>
             <div className="space-y-3">
                {(shopData.services || []).map((s: any, i: number) => (
                   <button 
                      key={i}
                      onClick={() => setSelectedService(s)}
                      className={`w-full flex justify-between items-center p-5 rounded-2xl border transition-all ${
                        selectedService?.name === s.name ? 'border-bbBlue bg-bbBlue/5 shadow-inner' : 'border-gray-100 hover:border-bbBlue/30'
                      }`}
                   >
                      <span className="text-sm font-bold text-charcoal">{s.name}</span>
                      <span className="text-sm font-serif font-bold text-bbBlue">${s.price}</span>
                   </button>
                ))}
             </div>
          </div>
        </div>

        {/* RIGHT: Booking Engine */}
        <div className="space-y-10">
          <div className="p-8 md:p-12 border border-gray-100 rounded-[3rem] shadow-sm bg-gray-50/30">
             <h2 className="text-2xl font-serif font-bold text-bbBlue-deep mb-8 text-center uppercase tracking-tight">Schedule Your Slot</h2>
             
             <div className="space-y-4 mb-10">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Select Date</p>
                <div className="flex justify-between overflow-x-auto gap-3 pb-2 scrollbar-hide">
                   {dates.map((date, i) => {
                      const isActive = date.toDateString() === selectedDate.toDateString();
                      return (
                         <button 
                            key={i}
                            onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                            className={`flex-none w-14 py-4 rounded-2xl flex flex-col items-center gap-1 transition-all ${
                               isActive ? 'bg-bbBlue text-white shadow-xl shadow-bbBlue/20' : 'bg-white border border-gray-100 text-charcoal hover:border-bbBlue/50'
                            }`}
                         >
                            <span className="text-[8px] font-bold uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                            <span className="text-lg font-bold">{date.getDate()}</span>
                         </button>
                      );
                   })}
                </div>
             </div>

             <div className="space-y-6">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Select Time</p>
                <div className="grid grid-cols-4 gap-3">
                   {allSlots.map((slot) => {
                      const disabled = isSlotDisabled(slot);
                      const isSelected = selectedSlot === slot;
                      return (
                         <button
                            key={slot}
                            disabled={disabled}
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-3.5 rounded-xl text-[10px] font-bold tracking-widest transition-all ${
                               isSelected ? 'bg-bbBlue text-white shadow-lg' : 
                               disabled ? 'bg-gray-100 text-gray-300 cursor-not-allowed opacity-50' : 
                               'bg-white border border-gray-100 text-charcoal hover:border-bbBlue hover:text-bbBlue'
                            }`}
                         >
                            {slot}
                         </button>
                      );
                   })}
                </div>
             </div>

             <div className="mt-12 pt-10 border-t border-gray-100 flex flex-col items-center gap-6">
                <div className="text-center">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Due</p>
                   <p className="text-3xl font-serif font-bold text-bbBlue-deep">${selectedService?.price || 0}.00</p>
                </div>
                <button 
                   onClick={handleBooking}
                   disabled={!selectedSlot}
                   className="w-full py-5 bg-bbBlue text-white rounded-2xl font-bold uppercase text-xs tracking-[0.3em] shadow-2xl shadow-bbBlue/30 hover:bg-blue-600 disabled:bg-gray-200 disabled:shadow-none transition-all"
                >
                   Continue to Payment
                </button>
             </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
         {showPayment && (
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 z-[1000] bg-charcoal/60 backdrop-blur-md flex items-center justify-center p-6"
            >
               <motion.div 
                  initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
                  className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl relative"
               >
                  <button onClick={handleAbandonment} className="absolute top-6 right-6 text-gray-400 hover:text-charcoal z-10">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>

                  <div className="bg-[#1D2B44] p-10 text-white">
                     <div className="flex justify-between items-center mb-6">
                        <span className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-60">Escrow Secure</span>
                     </div>
                     <p className="text-xl font-serif font-bold mb-1">{shopData.name}</p>
                     <p className="text-3xl font-serif font-bold">${selectedService?.price || 0}.00</p>
                  </div>
                  
                  <div className="p-10 space-y-8">
                     <div className="flex flex-col items-center gap-4">
                        <div className="w-40 h-40 bg-gray-50 border border-gray-100 rounded-3xl flex items-center justify-center p-6 shadow-inner">
                           <div className="w-full h-full bg-[url('https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BB_CONNECT_PAYMENT')] bg-center bg-no-repeat bg-contain opacity-70"></div>
                        </div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center">Scan QR or select an app below</p>
                     </div>

                     <div className="grid grid-cols-2 gap-3">
                        {['GPay', 'PhonePe', 'Paytm', 'Other UPI'].map(app => (
                           <button 
                             key={app} 
                             onClick={() => handleUPILink(app)}
                             className="py-4 border border-gray-100 rounded-2xl text-[10px] font-bold text-charcoal hover:border-bbBlue hover:bg-bbBlue/5 transition-all active:scale-[0.97]"
                           >
                             {app}
                           </button>
                        ))}
                     </div>

                     <button 
                        onClick={() => handleConfirmPayment('UPI_DEEP_LINK')}
                        disabled={isProcessing}
                        className="w-full py-5 bg-[#2358E1] text-white rounded-2xl font-bold uppercase text-[10px] tracking-[0.25em] flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
                     >
                        {isProcessing ? 'Securing Funds...' : 'Confirm and Hold Payment'}
                     </button>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
};

export default ShopDetail;
