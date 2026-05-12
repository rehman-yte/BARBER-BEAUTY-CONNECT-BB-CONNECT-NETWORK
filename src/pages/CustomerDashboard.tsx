import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getBookings, submitRating } from '../services/logic_engine';
import RatingModal from '../components/RatingModal';

import { PersistenceService } from '../services/PersistenceService';

const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>(PersistenceService.load('customer_bookings') || []);
  const [loading, setLoading] = useState(!PersistenceService.load('customer_bookings'));
  const [activeTab, setActiveTab] = useState<'approved' | 'pending' | 'failed'>('approved');
  const [pendingRatingBooking, setPendingRatingBooking] = useState<any>(null);

  // CRITICAL REDIRECT: Ensure partners never land on Customer Dashboard
  useEffect(() => {
    if (user && user.role === 'partner') {
      console.log("[SECURITY] Partner detected on Customer Hub. Redirecting to Terminal...");
      navigate(user.onboardingComplete ? '/partner-dashboard' : '/onboarding', { replace: true });
    }
  }, [user, navigate]);

  // Visual Shield: If role is partner, don't even render the UI below
  if (user?.role === 'partner') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center">
        <div className="w-16 h-16 border-4 border-bbBlue border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-[0.5em]">Synchronizing Partner Terminal...</h2>
      </div>
    );
  }

  useEffect(() => {
    if (!user) return;

    const fetchBookings = async () => {
      try {
        const data = await getBookings(user.uid);
        setBookings(data);
        setLoading(false);
        PersistenceService.save('customer_bookings', data);
        
        // Priority: Check for completed bookings that need rating
        const needsRating = data.find((b: any) => b.status === 'completed' && !b.rated);
        if (needsRating) {
          setPendingRatingBooking(needsRating);
        }

        // AUTO-REFUND LOGIC: Check for expired held payments
        // This logic should ideally be on the server, but keeping it here for now as requested
        // However, we can't easily update localStorage anymore, so we'll just log it
        // or we could implement a server-side auto-refund endpoint later
        data.forEach((booking: any) => {
          if (booking.status === 'payment_held' && booking.expiryTime < Date.now()) {
            console.warn(`Booking ${booking.id} has expired. Auto-refund should be triggered.`);
          }
        });
      } catch (error) {
        console.debug('Background fetch throttled (bypass mode active):', error);
      }
    };

    fetchBookings();
    const interval = setInterval(fetchBookings, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'pending') return b.status === 'payment_held';
    if (activeTab === 'failed') return b.status === 'rejected' || b.status === 'failed' || b.status === 'Cancelled' || b.status === 'cancelled' || b.paymentStatus === 'failed' || b.paymentStatus === 'abandoned';
    return b.status === 'approved' || b.status === 'confirmed';
  });

  const handleRatingSubmit = async (rating: number, comment: string) => {
    if (!pendingRatingBooking) return;
    try {
      await submitRating(pendingRatingBooking.id, pendingRatingBooking.partnerId || pendingRatingBooking.shopId, rating, comment);
      setPendingRatingBooking(null);
      // Data will refresh on next interval
    } catch (error) {
      console.error("Failed to submit rating:", error);
    }
  };

  const stats = {
    approved: bookings.filter(b => b.status === 'approved' || b.status === 'confirmed').length,
    pending: bookings.filter(b => b.status === 'payment_held').length,
    failed: bookings.filter(b => b.status === 'rejected' || b.status === 'failed' || b.status === 'Cancelled' || b.status === 'cancelled' || b.paymentStatus === 'failed' || b.paymentStatus === 'abandoned').length,
  };

  // Sync with actual details
  const displayName = user?.name || 'Valued User';
  const photoURL = user?.photoURL;

  return (
    <div className="pt-[8rem] pb-[5rem] bg-white min-h-screen">
      <div className="max-w-[1440px] mx-auto px-[5%]">
        {/* 1. HEADER / IDENTITY */}
        <header className="mb-[4rem] flex flex-col md:flex-row items-center gap-[2.5rem] bg-gray-50/50 p-[2.5rem] rounded-[3rem] border border-gray-100 shadow-sm">
           <div className="relative">
             <div className="w-[8rem] h-[8rem] rounded-full overflow-hidden border-4 border-white shadow-xl bg-white">
               {photoURL ? (
                 <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full bg-bbBlue flex items-center justify-center text-white text-[2.5rem] font-serif font-bold">
                   {displayName?.[0] || 'U'}
                 </div>
               )}
             </div>
             <div className="absolute bottom-[0.25rem] right-[0.25rem] w-[2rem] h-[2rem] bg-green-500 border-4 border-white rounded-full shadow-lg flex items-center justify-center">
                <svg className="w-[0.75rem] h-[0.75rem] text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
             </div>
           </div>
           
           <div className="text-center md:text-left flex-grow">
              <h1 className="text-[2.5rem] md:text-[3.125rem] font-serif font-bold text-charcoal mb-[0.75rem] tracking-tight">Welcome, {displayName}</h1>
              <div className="flex flex-col md:flex-row md:items-center gap-[1rem] mt-[0.5rem]">
                <p className="text-[0.5625rem] font-mono font-bold text-gray-400 uppercase tracking-widest">
                  Customer Token ID: <span className="text-bbBlue select-all">{user?.uid}</span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-[1rem] mt-[2rem] justify-center md:justify-start">
                 <Link 
                    to="/customer/explore"
                    className="bg-bbBlue text-white px-[1.5rem] py-[0.75rem] rounded-full font-bold shadow-lg shadow-bbBlue/20 hover:bg-blue-600 transition-all uppercase text-[0.625rem] tracking-widest text-center active:scale-95"
                  >
                    Find a Salon
                 </Link>
                 <button 
                    onClick={() => window.scrollTo({ top: 500, behavior: 'smooth' })}
                    className="bg-transparent border border-charcoal text-charcoal px-[1.5rem] py-[0.75rem] rounded-full font-bold hover:bg-charcoal hover:text-white transition-all uppercase text-[0.625rem] tracking-widest text-center active:scale-95"
                  >
                    My Bookings
                 </button>
              </div>
           </div>

           <div className="hidden lg:flex items-center gap-[2.5rem] bg-white p-[2rem] rounded-[2rem] border border-gray-100 shadow-inner">
              <div className="text-center">
                 <p className="text-[0.5rem] font-bold text-gray-300 uppercase tracking-widest mb-[0.25rem]">Total Bookings</p>
                 <p className="text-[1.875rem] font-serif font-bold text-bbBlue">{bookings.length}</p>
              </div>
           </div>
        </header>

        {/* 2. ESCROW & STATUS TABS */}
        <div className="flex border-b border-gray-100 mb-[3rem] overflow-x-auto scrollbar-hide bg-white sticky top-[5rem] z-20 py-[0.5rem]">
          {[
            { key: 'approved', label: 'Confirmed', count: stats.approved, color: 'text-green-600', activeBg: 'bg-green-600' },
            { key: 'pending', label: 'Held (Escrow)', count: stats.pending, color: 'text-bbBlue', activeBg: 'bg-bbBlue' },
            { key: 'failed', label: 'Refunded/Failed', count: stats.failed, color: 'text-red-500', activeBg: 'bg-red-500' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`relative px-[3rem] py-[1.5rem] text-[0.6875rem] font-bold uppercase tracking-[0.25em] transition-all whitespace-nowrap flex items-center gap-[1rem] ${
                activeTab === tab.key ? tab.color : 'text-gray-300 hover:text-charcoal'
              }`}
            >
              {tab.label}
              <span className={`text-[0.5625rem] px-[0.625rem] py-[0.125rem] rounded-md font-sans ${activeTab === tab.key ? tab.activeBg + ' text-white' : 'bg-gray-100 text-gray-400'}`}>
                {tab.count}
              </span>
              {activeTab === tab.key && (
                <motion.div layoutId="activeTabLine" className={`absolute bottom-0 left-0 right-0 h-[0.375rem] ${tab.activeBg} rounded-t-full`} />
              )}
            </button>
          ))}
        </div>

        {/* 3. LISTING AREA */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-[2.5rem]">
           <AnimatePresence mode="wait">
             {loading ? (
                <div className="col-span-full py-[10rem] flex flex-col items-center justify-center gap-[1.5rem]">
                   <div className="w-[3rem] h-[3rem] border-4 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-[0.4em]">Connecting to Registry...</p>
                </div>
             ) : filteredBookings.length > 0 ? (
               filteredBookings.map((booking) => (
                <motion.div 
                  key={booking.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white border border-gray-100 p-[2.5rem] rounded-[3rem] shadow-sm hover:shadow-2xl transition-all duration-700 group relative overflow-hidden flex flex-col"
                >
                   {/* Status Indicator Bar */}
                   <div className={`absolute top-0 left-0 w-full h-[0.375rem] ${
                     booking.status === 'payment_held' ? 'bg-bbBlue animate-pulse' : 
                     booking.status === 'confirmed' ? 'bg-green-500' : 
                     (booking.status === 'failed' || booking.status === 'rejected' || booking.status === 'Cancelled' || booking.status === 'cancelled') ? 'bg-red-500' : 'bg-gray-300'
                   }`}></div>

                   <div className="flex justify-between items-start mb-[2.5rem]">
                      <div className={`w-[4rem] h-[4rem] rounded-2xl flex items-center justify-center border shadow-sm transition-all ${
                        booking.status === 'payment_held' ? 'bg-blue-50 border-blue-100 text-bbBlue' : 
                        booking.status === 'confirmed' ? 'bg-green-50 border-green-100 text-green-500' : 'bg-red-50 border-red-100 text-red-500'
                      }`}>
                         <svg className="w-[2rem] h-[2rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           {booking.status === 'payment_held' ? (
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                           ) : (
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                           )}
                         </svg>
                      </div>
                      <p className="text-[0.5625rem] font-bold text-gray-300 uppercase tracking-widest">
                        {(booking.status === 'Cancelled' || booking.status === 'cancelled') ? 'ABND-' : 'TRX-'}{booking.transactionId?.slice(-6)}
                      </p>
                   </div>

                   <div className="flex-grow">
                     <h3 className="text-[1.5rem] font-serif font-bold text-charcoal mb-[0.5rem] tracking-tight">{booking.shopName || 'Studio Partner'}</h3>
                     <p className="text-[0.625rem] font-bold text-bbBlue uppercase tracking-[0.25em] mb-[2.5rem]">
                       {booking.status === 'payment_held' ? 'Pending Partner Approval' : booking.serviceName}
                     </p>

                     <div className="grid grid-cols-2 gap-[2rem] pt-[2rem] border-t border-gray-50 mb-[2rem]">
                        <div>
                           <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-[0.5rem]">Reserved Time</p>
                           <p className="text-[0.6875rem] font-bold text-charcoal uppercase tracking-tighter">{booking.date}</p>
                           <p className="text-[0.625rem] text-gray-400 font-medium">{booking.time}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-[0.5rem]">Payment Status</p>
                           <p className={`text-[0.6875rem] font-bold uppercase tracking-widest ${
                             booking.paymentStatus === 'refunded' || booking.paymentStatus === 'abandoned' ? 'text-red-500' : 'text-bbBlue'
                           }`}>
                             {booking.paymentStatus === 'success' && booking.status === 'payment_held' ? 'HELD IN ESCROW' : booking.paymentStatus?.toUpperCase() || 'VOID'}
                           </p>
                        </div>
                     </div>
                   </div>

                   {(booking.message || booking.statusReason) && (
                     <div className="mt-auto p-[1.5rem] bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-[0.5rem] flex items-center gap-[0.5rem]">
                          <span className="w-[0.375rem] h-[0.375rem] rounded-full bg-bbBlue"></span>
                          Platform Note
                        </p>
                        <p className="text-[0.6875rem] text-gray-600 italic font-medium leading-relaxed">"{booking.message || booking.statusReason}"</p>
                     </div>
                   )}
                </motion.div>
               ))
             ) : (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="col-span-full py-[12rem] flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-[4rem] bg-gray-50/20"
                >
                   <div className="w-[6rem] h-[6rem] bg-white rounded-full flex items-center justify-center mb-[2rem] shadow-xl border border-gray-100">
                      <svg className="w-[2.5rem] h-[2.5rem] text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                   </div>
                   <h4 className="text-[0.6875rem] font-bold text-gray-400 uppercase tracking-[0.5em] mb-[1rem]">No Records Found</h4>
                   <p className="text-[0.625rem] text-gray-300 font-medium uppercase tracking-[0.2em] max-w-[20rem] text-center leading-relaxed">Transactions appear here after secure payment initiation.</p>
                </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {pendingRatingBooking && (
          <RatingModal 
            booking={pendingRatingBooking}
            onSubmit={handleRatingSubmit}
            onClose={() => setPendingRatingBooking(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomerDashboard;