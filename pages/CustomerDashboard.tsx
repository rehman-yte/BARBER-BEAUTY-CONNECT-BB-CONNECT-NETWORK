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
    if (!user || !db) return;

    // Fetch bookings for the logged-in customer
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

  // Logic for filtering bookings into the 3 specified sections
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
        {/* 1. HEADER / IDENTITY (STRICT CONTROL: AVATAR & UID) */}
        <header className="mb-16 flex flex-col md:flex-row items-center gap-10 bg-gray-50/40 p-10 rounded-[3.5rem] border border-gray-100 shadow-sm">
           <div className="relative">
             <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white">
               {currentUser?.photoURL ? (
                 <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full bg-bbBlue flex items-center justify-center text-white text-4xl font-serif font-bold">
                   {user?.name?.[0] || 'U'}
                 </div>
               )}
             </div>
             <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 border-4 border-white rounded-full shadow-lg"></div>
           </div>
           
           <div className="text-center md:text-left flex-grow">
              <h1 className="text-3xl md:text-5xl font-serif font-bold text-charcoal mb-2 tracking-tight">{user?.name}</h1>
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 mt-3">
                <span className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.3em] bg-bbBlue/5 px-4 py-1.5 rounded-full border border-bbBlue/10 inline-block shadow-sm">Official Member</span>
                <p className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-[0.1em]">Customer Token ID: <span className="text-charcoal-light select-all">{user?.uid}</span></p>
              </div>
           </div>

           <div className="hidden lg:flex items-center gap-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-inner">
              <div className="text-center">
                 <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest mb-1">Lifetime Appointments</p>
                 <p className="text-2xl font-serif font-bold text-bbBlue">{bookings.length}</p>
              </div>
           </div>
        </header>

        {/* 2. SECTION TABS (LOGIC BASED) */}
        <div className="flex border-b border-gray-100 mb-12 overflow-x-auto scrollbar-hide bg-white sticky top-20 z-10 py-2">
          {[
            { key: 'approved', label: 'Approved Slots', count: stats.approved, color: 'text-green-600', activeBg: 'bg-green-600' },
            { key: 'rejected', label: 'Rejected Slots', count: stats.rejected, color: 'text-red-600', activeBg: 'bg-red-600' },
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

        {/* 3. LIST CONTENT */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
           <AnimatePresence mode="wait">
             {loading ? (
                <div className="col-span-full py-32 flex flex-col items-center justify-center gap-4">
                   <div className="w-10 h-10 border-3 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Securing Connection...</p>
                </div>
             ) : filteredBookings.length > 0 ? (
               filteredBookings.map((booking) => (
                <motion.div 
                  key={booking.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white border border-gray-100 p-10 rounded-[3rem] shadow-sm hover:shadow-2xl transition-all duration-700 group relative overflow-hidden flex flex-col h-full"
                >
                   {/* Visual Accent */}
                   <div className={`absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 rounded-full opacity-5 group-hover:opacity-10 transition-opacity ${
                     activeTab === 'approved' ? 'bg-green-500' : 
                     activeTab === 'rejected' ? 'bg-red-500' : 'bg-orange-500'
                   }`}></div>

                   <div className="flex justify-between items-start mb-8">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm transition-all group-hover:scale-110 ${
                        activeTab === 'approved' ? 'bg-green-50/50 border-green-100' : 
                        activeTab === 'rejected' ? 'bg-red-50/50 border-red-100' : 'bg-orange-50/50 border-orange-100'
                      }`}>
                         <svg className={`w-7 h-7 ${
                           activeTab === 'approved' ? 'text-green-500' : 
                           activeTab === 'rejected' ? 'text-red-500' : 'text-orange-500'
                         }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                         </svg>
                      </div>
                      <span className="text-[8px] font-bold text-gray-300 uppercase tracking-[0.3em]">REF: {booking.id.slice(0, 8).toUpperCase()}</span>
                   </div>

                   <div className="flex-grow">
                     <h3 className="text-2xl font-serif font-bold text-charcoal mb-2 tracking-tight">{booking.shopName || 'Premium Studio'}</h3>
                     <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.2em] mb-8">{booking.serviceName || 'Standard Service'}</p>

                     <div className="grid grid-cols-2 gap-6 pt-8 border-t border-gray-50 mb-6">
                        <div>
                           <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Schedule</p>
                           <p className="text-[11px] font-bold text-charcoal uppercase tracking-tighter">{booking.date}</p>
                           <p className="text-[10px] text-gray-400 font-medium">{booking.time}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Transaction</p>
                           <p className="text-xl font-serif font-bold text-charcoal">${booking.price || '0.00'}</p>
                        </div>
                     </div>
                   </div>

                   {booking.statusReason && (
                     <div className="mt-auto p-5 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          Platform Memo
                        </p>
                        <p className="text-[11px] text-gray-600 italic font-medium leading-relaxed">"{booking.statusReason}"</p>
                     </div>
                   )}
                </motion.div>
               ))
             ) : (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="col-span-full py-40 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-[4rem] bg-gray-50/10"
                >
                   <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl border border-gray-50">
                      <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                   </div>
                   <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5em] mb-4">Directory Clear</h4>
                   <p className="text-[10px] text-gray-300 font-medium uppercase tracking-widest">No activity recorded for this status segment.</p>
                </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;