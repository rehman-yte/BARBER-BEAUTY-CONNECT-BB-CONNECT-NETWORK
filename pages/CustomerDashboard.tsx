import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase/firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'approved' | 'rejected' | 'failed'>('approved');

  useEffect(() => {
    // Rely on the user object from AuthContext
    if (!user || !db) return;

    const q = query(
      collection(db, 'bookings'),
      where('customerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(data);
      setLoading(false);
    }, (err) => {
      console.error("Dashboard Fetch Error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Logic: Approved (status==='approved'), Rejected (status==='rejected'), Failed (paymentStatus==='failed')
  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'failed') return b.paymentStatus === 'failed';
    return b.status === activeTab;
  });

  const stats = {
    approved: bookings.filter(b => b.status === 'approved').length,
    rejected: bookings.filter(b => b.status === 'rejected').length,
    failed: bookings.filter(b => b.paymentStatus === 'failed').length,
  };

  const currentUser = auth.currentUser;

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* 1. HEADER / IDENTITY */}
        <header className="mb-16 flex flex-col md:flex-row items-center gap-10 bg-gray-50/50 p-10 rounded-[3rem] border border-gray-100 shadow-sm">
           <div className="relative">
             <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white">
               {currentUser?.photoURL ? (
                 <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full bg-bbBlue flex items-center justify-center text-white text-4xl font-serif font-bold">
                   {user?.name?.[0] || 'U'}
                 </div>
               )}
             </div>
             <div className="absolute bottom-1 right-1 w-8 h-8 bg-green-500 border-4 border-white rounded-full shadow-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
             </div>
           </div>
           
           <div className="text-center md:text-left flex-grow">
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal mb-3 tracking-tight">{user?.name}</h1>
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

        {/* 2. LOGIC BASED TABS */}
        <div className="flex border-b border-gray-100 mb-12 overflow-x-auto scrollbar-hide bg-white sticky top-20 z-20 py-2">
          {[
            { key: 'approved', label: 'Approved Slots', count: stats.approved, color: 'text-green-600', activeBg: 'bg-green-600' },
            { key: 'rejected', label: 'Rejected Slots', count: stats.rejected, color: 'text-red-500', activeBg: 'bg-red-500' },
            { key: 'failed', label: 'Payment Failures', count: stats.failed, color: 'text-orange-500', activeBg: 'bg-orange-500' }
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

        {/* 3. STATUS LISTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
           <AnimatePresence mode="wait">
             {loading ? (
                <div className="col-span-full py-40 flex flex-col items-center justify-center gap-6">
                   <div className="w-12 h-12 border-4 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Syncing Encrypted Directory...</p>
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
                   <div className="flex justify-between items-start mb-10">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-sm transition-all group-hover:rotate-6 ${
                        activeTab === 'approved' ? 'bg-green-50 border-green-100 text-green-500' : 
                        activeTab === 'rejected' ? 'bg-red-50 border-red-100 text-red-500' : 'bg-orange-50 border-orange-100 text-orange-500'
                      }`}>
                         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                         </svg>
                      </div>
                      <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">BBCN-REF: {booking.id.slice(-8).toUpperCase()}</p>
                   </div>

                   <div className="flex-grow">
                     <h3 className="text-2xl font-serif font-bold text-charcoal mb-2 tracking-tight">{booking.shopName || 'Studio Partner'}</h3>
                     <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.25em] mb-10">{booking.serviceName || 'Premium Service'}</p>

                     <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-50 mb-8">
                        <div>
                           <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-2">Reserved Time</p>
                           <p className="text-[11px] font-bold text-charcoal uppercase tracking-tighter">{booking.date}</p>
                           <p className="text-[10px] text-gray-400 font-medium">{booking.time}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-2">Settlement</p>
                           <p className="text-2xl font-serif font-bold text-charcoal">${booking.price || '0.00'}</p>
                        </div>
                     </div>
                   </div>

                   {booking.statusReason && (
                     <div className="mt-auto p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-bbBlue"></span>
                          Platform Note
                        </p>
                        <p className="text-[11px] text-gray-600 italic font-medium leading-relaxed">"{booking.statusReason}"</p>
                     </div>
                   )}
                </motion.div>
               ))
             ) : (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="col-span-full py-48 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-[4rem] bg-gray-50/20"
                >
                   <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl border border-gray-50">
                      <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                   </div>
                   <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5em] mb-4">Registry Empty</h4>
                   <p className="text-[10px] text-gray-300 font-medium uppercase tracking-[0.2em] max-w-xs text-center leading-relaxed">No bookings currently logged for this status. Explore our premium partners to secure your next appointment.</p>
                </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;