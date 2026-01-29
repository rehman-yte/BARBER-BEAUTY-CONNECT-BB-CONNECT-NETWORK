
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const PartnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'Intelligence' | 'Requests' | 'Registry'>('Intelligence');
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !db) return;
    const q = query(collection(db, 'bookings'), where('shopId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  const activeRequests = requests.filter(r => r.status === 'payment_held');

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16 bg-charcoal p-10 md:p-14 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
           <div className="relative z-10">
             <div className="flex items-center gap-4 mb-4">
                <span className="text-[9px] font-bold bg-gold/20 text-gold px-4 py-1.5 rounded-full border border-gold/30 uppercase tracking-[0.3em]">Verified Partner</span>
                <span className="text-[9px] font-bold bg-bbBlue/20 text-bbBlue px-4 py-1.5 rounded-full border border-bbBlue/30 uppercase tracking-[0.3em]">Premium Network</span>
             </div>
             <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-2">{user?.name}</h1>
             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.4em]">Professional Partner ID: {user?.uid.slice(-8).toUpperCase()}</p>
           </div>
           
           <div className="flex gap-12 z-10">
              <div className="text-center">
                 <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Weekly Views</p>
                 <p className="text-3xl font-serif font-bold text-white">1.2K</p>
              </div>
              <div className="text-center">
                 <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Est. Revenue</p>
                 <p className="text-3xl font-serif font-bold text-gold">$4,820</p>
              </div>
           </div>

           {/* Decorative Background Element */}
           <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-bbBlue/10 to-transparent"></div>
        </header>

        {/* Dashboard Navigation */}
        <div className="flex gap-8 border-b border-gray-100 mb-12">
          {['Intelligence', 'Requests', 'Registry'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-4 text-[11px] font-bold uppercase tracking-[0.3em] transition-all relative ${
                activeTab === tab ? 'text-bbBlue' : 'text-gray-300 hover:text-charcoal'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div layoutId="partnerTabLine" className="absolute bottom-0 left-0 right-0 h-1 bg-bbBlue" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'Intelligence' && (
            <motion.div key="intel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="p-10 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">Performance Growth</h4>
                  <div className="h-40 flex items-end gap-3 px-4">
                     {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                       <div key={i} className="flex-1 bg-bbBlue/20 rounded-t-lg transition-all hover:bg-bbBlue" style={{ height: `${h}%` }}></div>
                     ))}
                  </div>
               </div>
               <div className="md:col-span-2 p-10 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm flex flex-col justify-center">
                  <h4 className="text-2xl font-serif font-bold text-charcoal mb-4">Storefront Intelligence</h4>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-lg mb-8">Your profile has been seen by 84 new potential clients in the last 24 hours. The most requested service is currently the "Executive Haircut".</p>
                  <div className="flex gap-4">
                    <button className="px-8 py-4 bg-charcoal text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-bbBlue transition-all">Update Menu</button>
                    <button className="px-8 py-4 border border-gray-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all">View Analytics</button>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'Requests' && (
            <motion.div key="req" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-center mb-10">
                 <h2 className="text-2xl font-serif font-bold text-charcoal uppercase tracking-tight">Active Requests <span className="text-bbBlue ml-2">({activeRequests.length})</span></h2>
                 <p className="text-[9px] font-bold text-red-500 uppercase tracking-[0.2em] animate-pulse">5-Minute Response Protocol Active</p>
              </div>

              {activeRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {activeRequests.map(req => (
                    <div key={req.id} className="bg-white border-2 border-bbBlue/10 p-10 rounded-[3rem] relative overflow-hidden group hover:border-bbBlue/30 transition-all">
                       <div className="flex justify-between items-start mb-8">
                          <div>
                             <p className="text-[9px] font-bold text-bbBlue uppercase tracking-widest mb-1">New Appointment Request</p>
                             <h3 className="text-xl font-serif font-bold text-charcoal">{req.customerName}</h3>
                          </div>
                          <div className="text-right">
                             <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Time Remaining</p>
                             <p className="text-sm font-bold text-bbBlue font-mono">04:32</p>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-8 mb-10">
                          <div>
                             <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Service</p>
                             <p className="text-xs font-bold text-charcoal uppercase">{req.serviceName}</p>
                          </div>
                          <div>
                             <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Schedule</p>
                             <p className="text-xs font-bold text-charcoal uppercase">{req.date} @ {req.time}</p>
                          </div>
                       </div>
                       <div className="flex gap-4">
                          <button className="flex-1 py-4 bg-bbBlue text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-bbBlue-deep transition-all">Accept Request</button>
                          <button className="flex-1 py-4 border border-red-100 text-red-500 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all">Decline</button>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-40 border-2 border-dashed border-gray-100 rounded-[4rem] text-center">
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.5em]">No active requests in queue</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'Registry' && (
            <motion.div key="reg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-12">
               <div className="bg-gray-50 p-12 rounded-[3rem] border border-gray-100">
                  <h3 className="text-xl font-serif font-bold text-charcoal mb-8 border-b border-gray-200 pb-4 uppercase tracking-tight">Professional Identity</h3>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                       <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Owner Name</p>
                          <p className="text-sm font-bold text-charcoal">{user?.name}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Brand Status</p>
                          <p className="text-sm font-bold text-green-600 uppercase">Verified Member</p>
                       </div>
                    </div>
                    <div>
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Global ID Registry</p>
                       <p className="text-sm font-mono font-bold text-bbBlue">{user?.uid}</p>
                    </div>
                  </div>
               </div>
               <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.4em] mb-4">Membership is Permanent</p>
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest">Updates to services and pricing can be made via the Intelligence tab.</p>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PartnerDashboard;
