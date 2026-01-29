
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  updateDoc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

interface Service {
  name: string;
  price: number;
}

const PartnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'Intelligence' | 'Requests' | 'Registry'>('Intelligence');
  const [requests, setRequests] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    if (!user || !db) return;

    // Fetch Profile & Services
    const partnerRef = doc(db, 'partners_registry', user.uid);
    const unsubProfile = onSnapshot(partnerRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfileData(data);
        setServices(data.services || []);
      }
    });

    // Real-time Booking Requests
    const q = query(collection(db, 'bookings'), where('shopId', '==', user.uid));
    const unsubBookings = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    return () => {
      unsubProfile();
      unsubBookings();
    };
  }, [user]);

  const handleAddService = () => {
    if (!newServiceName || !newServicePrice) return;
    const newService: Service = {
      name: newServiceName,
      price: parseFloat(newServicePrice)
    };
    setServices(prev => [...prev, newService]);
    setNewServiceName('');
    setNewServicePrice('');
  };

  const handleRemoveService = (index: number) => {
    setServices(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveServices = async () => {
    if (!user || !db) return;
    setIsSaving(true);
    try {
      const partnerRef = doc(db, 'partners_registry', user.uid);
      await updateDoc(partnerRef, {
        services: services
      });
    } catch (err) {
      console.error("Registry sync failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeRequests = requests.filter(r => r.status === 'payment_held');
  const isVerified = profileData?.isVerified === true;

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Verification Alert */}
        {!isVerified && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-blue-50 border border-bbBlue/20 p-6 rounded-[2rem] flex items-center justify-between gap-6"
          >
             <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-bbBlue shadow-sm">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div>
                   <p className="text-[11px] font-bold text-bbBlue uppercase tracking-widest mb-1">Status: Pending Verification</p>
                   <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest leading-relaxed">Your professional hub will be visible to the public network once verified by an administrator.</p>
                </div>
             </div>
             <span className="hidden md:block text-[9px] font-bold text-bbBlue uppercase bg-white px-4 py-2 rounded-full border border-bbBlue/10">Registry Admission Under Review</span>
          </motion.div>
        )}

        {/* Header Section */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16 bg-charcoal p-10 md:p-14 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
           <div className="relative z-10">
             <div className="flex items-center gap-4 mb-4">
                <span className="text-[9px] font-bold bg-gold/20 text-gold px-4 py-1.5 rounded-full border border-gold/30 uppercase tracking-[0.3em]">{profileData?.category || 'Professional'}</span>
                <span className={`text-[9px] font-bold px-4 py-1.5 rounded-full border uppercase tracking-[0.3em] ${isVerified ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-bbBlue/20 text-bbBlue border-bbBlue/30'}`}>
                   {isVerified ? 'Registry Verified' : 'Registry Pending'}
                </span>
             </div>
             <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-2 uppercase">{profileData?.brandName || user?.name}</h1>
             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.4em]">Registry Token: {user?.uid}</p>
           </div>
           
           <div className="flex gap-12 z-10">
              <div className="text-center">
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Portfolio Items</p>
                 <p className="text-3xl font-serif font-bold text-white">{services.length}</p>
              </div>
              <div className="text-center">
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Queue Size</p>
                 <p className="text-3xl font-serif font-bold text-bbBlue">{activeRequests.length}</p>
              </div>
           </div>

           <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-bbBlue/10 to-transparent"></div>
        </header>

        {/* Dashboard Navigation */}
        <div className="flex gap-10 border-b border-gray-100 mb-12 overflow-x-auto scrollbar-hide">
          {['Intelligence', 'Requests', 'Registry'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-5 text-[11px] font-bold uppercase tracking-[0.3em] transition-all relative whitespace-nowrap ${
                activeTab === tab ? 'text-bbBlue' : 'text-gray-300 hover:text-charcoal'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div layoutId="partnerTabLine" className="absolute bottom-0 left-0 right-0 h-1.5 bg-bbBlue rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'Intelligence' && (
            <motion.div key="intel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
               {/* SERVICE MANAGEMENT HUB */}
               <div className="bg-gray-50/50 p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                     <div>
                        <h2 className="text-3xl font-serif font-bold text-charcoal mb-2 uppercase tracking-tight">Professional Service Hub</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Configure and Persistent Registry Storage</p>
                     </div>
                     <button 
                        onClick={handleSaveServices}
                        disabled={isSaving}
                        className="bg-bbBlue text-white px-10 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98] disabled:opacity-50"
                     >
                        {isSaving ? 'Syncing...' : 'Save Permanently'}
                     </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                     {/* Add New Service */}
                     <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-inner space-y-6">
                        <h3 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] border-b border-gray-50 pb-4">Add Network Entry</h3>
                        <div className="space-y-4">
                           <div className="flex flex-col gap-2">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Service Designation</label>
                              <input 
                                 value={newServiceName} 
                                 onChange={(e) => setNewServiceName(e.target.value)} 
                                 placeholder="e.g. Master Fade & Groom" 
                                 className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:border-bbBlue outline-none" 
                              />
                           </div>
                           <div className="flex flex-col gap-2">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Price Asset (INR)</label>
                              <input 
                                 type="number" 
                                 value={newServicePrice} 
                                 onChange={(e) => setNewServicePrice(e.target.value)} 
                                 placeholder="500" 
                                 className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:border-bbBlue outline-none font-mono" 
                              />
                           </div>
                           <button 
                              onClick={handleAddService}
                              className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:border-bbBlue hover:text-bbBlue transition-all"
                           >
                              Append to List
                           </button>
                        </div>
                     </div>

                     {/* Active Services List */}
                     <div className="space-y-4">
                        <h3 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] border-b border-gray-50 pb-4 px-2">Registry Portfolio</h3>
                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                           {services.length > 0 ? (
                             services.map((s, idx) => (
                               <div key={idx} className="flex justify-between items-center p-5 bg-white border border-gray-50 rounded-2xl shadow-sm group">
                                  <div className="flex flex-col">
                                     <span className="text-sm font-bold text-charcoal uppercase tracking-tight">{s.name}</span>
                                     <span className="text-[10px] font-mono font-bold text-bbBlue">₹{s.price}</span>
                                  </div>
                                  <button onClick={() => handleRemoveService(idx)} className="text-gray-200 hover:text-red-500 transition-colors p-2">
                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </button>
                               </div>
                             ))
                           ) : (
                             <div className="py-20 text-center bg-white/50 rounded-3xl border border-dashed border-gray-100">
                                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em]">Portfolio Empty</p>
                             </div>
                           )}
                        </div>
                     </div>
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
               <div className="bg-gray-50 p-12 rounded-[3rem] border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-serif font-bold text-charcoal mb-8 border-b border-gray-200 pb-4 uppercase tracking-tight">Professional Identity Registry</h3>
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                       <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Owner Name</p>
                          <p className="text-sm font-bold text-charcoal uppercase">{profileData?.ownerName || user?.name}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Registry Category</p>
                          <p className="text-sm font-bold text-bbBlue uppercase">{profileData?.category || 'Standard'}</p>
                       </div>
                    </div>
                    <div>
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Merchant Settlement Endpoint</p>
                       <p className="text-sm font-mono font-bold text-charcoal opacity-70">{profileData?.upiId || 'Not Configured'}</p>
                    </div>
                    <div>
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Global ID (Non-Transferable)</p>
                       <p className="text-sm font-mono font-bold text-bbBlue break-all">{user?.uid}</p>
                    </div>
                  </div>
               </div>
               <div className="text-center bg-bbBlue/5 p-8 rounded-[2rem] border border-bbBlue/10">
                  <p className="text-[10px] font-bold text-bbBlue uppercase tracking-[0.4em] mb-4">Membership Integrity Warning</p>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest leading-relaxed">Registry data is permanent and synced with the Global Escrow Engine. Any changes to service designations are logged and updated live on the explore network.</p>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PartnerDashboard;
