import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase/firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'approved' | 'pending' | 'failed'>('approved');

  useEffect(() => {
    if (!user || !db) return;

    const q = query(
      collection(db, 'bookings'),
      where('customerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(data);
      setLoading(false);
      
      // AUTO-REFUND LOGIC: Check for expired held payments
      data.forEach(async (booking) => {
        if (booking.status === 'payment_held' && booking.expiryTime < Date.now()) {
          const bookingRef = doc(db, 'bookings', booking.id);
          await updateDoc(bookingRef, {
            status: 'failed',
            statusReason: 'Partner Response Timeout: Auto-Refund Triggered',
            paymentStatus: 'refunded'
          });
        }
      });
    }, (err) => {
      console.error("Dashboard Fetch Error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'pending') return b.status === 'payment_held';
    if (activeTab === 'failed') return b.status === 'rejected' || b.status === 'failed' || b.status === 'Cancelled' || b.status === 'cancelled' || b.paymentStatus === 'failed' || b.paymentStatus === 'abandoned';
    return b.status === 'approved' || b.status === 'confirmed';
  });

  const stats = {
    approved: bookings.filter(b => b.status === 'approved' || b.status === 'confirmed').length,
    pending: bookings.filter(b => b.status === 'payment_held').length,
    failed: bookings.filter(b => b.status === 'rejected' || b.status === 'failed' || b.status === 'Cancelled' || b.status === 'cancelled' || b.paymentStatus === 'failed' || b.paymentStatus === 'abandoned').length,
  };

  // Sync with actual Google Auth details
  const currentUser = auth.currentUser;
  const displayName = currentUser?.displayName || user?.name || 'Network Member';
  const photoURL = currentUser?.photoURL || (user as any)?.photoURL;

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* 1. HEADER / IDENTITY */}
        <header className="mb-16 flex flex-col md:flex-row items-center gap-10 bg-gray-50/50 p-10 rounded-[3rem] border border-gray-100 shadow-sm">
           <div className="relative">
             <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white">
               {photoURL ? (
                 <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full bg-bbBlue flex items-center justify-center text-white text-4xl font-serif font-bold">
                   {displayName?.[0] || 'U'}
                 </div>
               )}
             </div>
             <div className="absolute bottom-1 right-1 w-8 h-8 bg-green-500 border-4 border-white rounded-full shadow-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
             </div>
           </div>
           
           <div className="text-center md:text-left flex-grow">
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal mb-3 tracking-tight">Welcome, {displayName}</h1>
              <div className="flex flex-col md:flex-row md:items-center gap-4 mt-2">
                <span className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.3em] bg-white px-5 py-2 rounded-full border border-bbBlue/20 shadow-sm inline-block">Official Network Member</span>
                <p className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest">
                  Customer Token ID: <span className="text-bbBlue select-all">{user?.uid}</span>
                </p>
              </div>
           </div>

           <div className="hidden lg:flex items-center gap-10 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-inner">
              <div className="text-center">
                 <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest mb-1">Total Bookings</p>
                 <p className="text-3xl font-serif font-bold text-bbBlue">{bookings.length}</p>
              </div>
           </div>
        </header>

        {/* 2. ESCROW & STATUS TABS */}
        <div className="flex border-b border-gray-100 mb-12 overflow-x-auto scrollbar-hide bg-white sticky top-20 z-20 py-2">
          {[
            { key: 'approved', label: 'Confirmed', count: stats.approved, color: 'text-green-600', activeBg: 'bg-green-600' },
            { key: 'pending', label: 'Held (Escrow)', count: stats.pending, color: 'text-bbBlue', activeBg: 'bg-bbBlue' },
            { key: 'failed', label: 'Refunded/Failed', count: stats.failed, color: 'text-red-500', activeBg: 'bg-red-500' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`relative px-12 py-6 text-[11px] font-bold uppercase tracking-[0.25em] transition-all whitespace-nowrap flex items-center gap-4 ${
                activeTab === tab.key ? tab.color : 'text-gray-300 hover:text-charcoal'
              }`}
            >
              {tab.label}
              <span className={`text-[9px] px-2.5 py-0.5 rounded-md font-sans ${activeTab === tab.key ? tab.activeBg + ' text-white' : 'bg-gray-100 text-gray-400'}`}>
                {tab.count}
              </span>
              {activeTab === tab.key && (
                <motion.div layoutId="activeTabLine" className={`absolute bottom-0 left-0 right-0 h-1.5 ${tab.activeBg} rounded-t-full`} />
              )}
            </button>
          ))}
        </div>

        {/* 3. LISTING AREA */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
           <AnimatePresence mode="wait">
             {loading ? (
                <div className="col-span-full py-40 flex flex-col items-center justify-center gap-6">
                   <div className="w-12 h-12 border-4 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Connecting to Registry...</p>
                </div>
             ) : filteredBookings.length > 0 ? (
               filteredBookings.map((booking) => (
                <motion.div 
                  key={booking.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white border border-gray-100 p-10 rounded-[3rem] shadow-sm hover:shadow-2xl transition-all duration-700 group relative overflow-hidden flex flex-col"
                >
                   {/* Status Indicator Bar */}
                   <div className={`absolute top-0 left-0 w-full h-1.5 ${
                     booking.status === 'payment_held' ? 'bg-bbBlue animate-pulse' : 
                     booking.status === 'confirmed' ? 'bg-green-500' : 
                     (booking.status === 'failed' || booking.status === 'rejected' || booking.status === 'Cancelled' || booking.status === 'cancelled') ? 'bg-red-500' : 'bg-gray-300'
                   }`}></div>

                   <div className="flex justify-between items-start mb-10">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-sm transition-all ${
                        booking.status === 'payment_held' ? 'bg-blue-50 border-blue-100 text-bbBlue' : 
                        booking.status === 'confirmed' ? 'bg-green-50 border-green-100 text-green-500' : 'bg-red-50 border-red-100 text-red-500'
                      }`}>
                         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           {booking.status === 'payment_held' ? (
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                           ) : (
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                           )}
                         </svg>
                      </div>
                      <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">
                        {(booking.status === 'Cancelled' || booking.status === 'cancelled') ? 'ABND-' : 'TRX-'}{booking.transactionId?.slice(-6)}
                      </p>
                   </div>

                   <div className="flex-grow">
                     <h3 className="text-2xl font-serif font-bold text-charcoal mb-2 tracking-tight">{booking.shopName || 'Studio Partner'}</h3>
                     <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.25em] mb-10">
                       {booking.status === 'payment_held' ? 'Pending Partner Approval' : booking.serviceName}
                     </p>

                     <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-50 mb-8">
                        <div>
                           <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-2">Reserved Time</p>
                           <p className="text-[11px] font-bold text-charcoal uppercase tracking-tighter">{booking.date}</p>
                           <p className="text-[10px] text-gray-400 font-medium">{booking.time}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-2">Payment Status</p>
                           <p className={`text-[11px] font-bold uppercase tracking-widest ${
                             booking.paymentStatus === 'refunded' || booking.paymentStatus === 'abandoned' ? 'text-red-500' : 'text-bbBlue'
                           }`}>
                             {booking.paymentStatus === 'success' && booking.status === 'payment_held' ? 'HELD IN ESCROW' : booking.paymentStatus?.toUpperCase() || 'VOID'}
                           </p>
                        </div>
                     </div>
                   </div>

                   {(booking.message || booking.statusReason) && (
                     <div className="mt-auto p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-bbBlue"></span>
                          Platform Note
                        </p>
                        <p className="text-[11px] text-gray-600 italic font-medium leading-relaxed">"{booking.message || booking.statusReason}"</p>
                     </div>
                   )}
                </motion.div>
               ))
             ) : (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="col-span-full py-48 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-[4rem] bg-gray-50/20"
                >
                   <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl border border-gray-100">
                      <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                   </div>
                   <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5em] mb-4">No Records Found</h4>
                   <p className="text-[10px] text-gray-300 font-medium uppercase tracking-[0.2em] max-w-xs text-center leading-relaxed">Transactions appear here after secure payment initiation.</p>
                </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;