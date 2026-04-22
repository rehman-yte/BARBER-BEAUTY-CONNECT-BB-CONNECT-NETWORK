
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  getShops, 
  getBookings, 
  updateBookingStatus, 
  updateShop,
  getShopById,
  calculateSettlements, 
  getWorkerInsights, 
  calculateWaitTime,
  getFinancialSummary,
  getGrowthPercentage,
  SettlementInfo,
  WorkerInsight,
  FinancialSummary
} from '../services/logic_engine';

import { PersistenceService, StorageManager } from '../services/PersistenceService';

interface Service {
  name: string;
  price: number;
}

const PartnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'Intelligence' | 'Requests' | 'Portfolio' | 'Registry'>('Intelligence');
  const [requests, setRequests] = useState<any[]>(PersistenceService.load('partner_requests') || []);
  const [services, setServices] = useState<Service[]>(PersistenceService.load('partner_services') || []);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [profileData, setProfileData] = useState<any>(PersistenceService.load('partner_profile'));
  const [hasInitialFetched, setHasInitialFetched] = useState(false);
  
  const [settlements, setSettlements] = useState<SettlementInfo[]>(PersistenceService.load('partner_settlements') || []);
  const [workerInsights, setWorkerInsights] = useState<WorkerInsight[]>(PersistenceService.load('partner_worker_insights') || []);
  const [waitTime, setWaitTime] = useState(PersistenceService.load('partner_wait_time') || 0);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(PersistenceService.load('partner_financial_summary'));
  const [growthPercentage, setGrowthPercentage] = useState(PersistenceService.load('partner_growth') || '0%');
  
  const prevRequestCount = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // High-volume "Heavy Sound" notification
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 1.0;
  }, []);

  useEffect(() => {
    if (user && user.role !== 'partner') {
      navigate('/customer-dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      if (!user?.uid) return;

      try {
        // Query the 'partners' collection directly for this specific partner
        const myShop = await getShopById(user.uid);
        
        if (myShop) {
          setProfileData(myShop);
          // Cache an optimized version
          const optimizedProfile = StorageManager.optimizeData(myShop);
          PersistenceService.save('partner_profile', optimizedProfile);

          if (!hasInitialFetched) {
            setServices(myShop.services || []);
            PersistenceService.save('partner_services', myShop.services || []);
            setHasInitialFetched(true);
          }

          const allBookings = await getBookings();
          const myBookings = allBookings.filter((b: any) => b.shopId === myShop.id);
          
          // Heavy Sound Notification logic
          if (hasInitialFetched && myBookings.length > prevRequestCount.current) {
            audioRef.current?.play().catch(e => console.log("Audio play blocked", e));
          }
          prevRequestCount.current = myBookings.length;
          
          setRequests(myBookings);
          PersistenceService.save('partner_requests', myBookings);

          // Fetch Logic Engine Data
          const s = calculateSettlements(myShop.id, allBookings, myShop.upiId);
          const wi = getWorkerInsights(myShop.id, allBookings, myShop.workers || []);
          const wt = calculateWaitTime(myShop.id, allBookings);
          const fs = getFinancialSummary(myShop.id, allBookings);
          const gp = getGrowthPercentage(myShop.id, allBookings);

          setSettlements(s);
          setWorkerInsights(wi);
          setWaitTime(wt);
          setFinancialSummary(fs);
          setGrowthPercentage(gp);

          PersistenceService.save('partner_settlements', s);
          PersistenceService.save('partner_worker_insights', wi);
          PersistenceService.save('partner_wait_time', wt);
          PersistenceService.save('partner_financial_summary', fs);
          PersistenceService.save('partner_growth', gp);
        } else {
          console.warn("Registry profile missing for current partner. Check collection: [partners]");
          // If a partner document does not exist yet for this UID, they must onboard
          navigate('/onboarding', { replace: true });
        }
      } catch (err) {
        console.error("Dashboard Sync Error:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, [user, hasInitialFetched]);

  useEffect(() => {
    const handleSettingsUpdate = async () => {
      const allShops = await getShops();
      const myShop = allShops.find((s: any) => s.id === user?.uid || s.mobile === user?.email);
      if (myShop) {
        setProfileData(myShop);
      }
    };

    window.addEventListener('bb_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('bb_settings_updated', handleSettingsUpdate);
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
    if (!user || !profileData) return;
    setIsSaving(true);
    try {
      await updateShop(profileData.id, { services });
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.debug("Registry sync bypassed (offline mode):", err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleShopStatus = async () => {
    if (!user || !profileData || isStatusUpdating) return;
    
    const newStatus = profileData.shopStatus === 'open' ? 'closed' : 'open';
    setIsStatusUpdating(true);
    
    try {
      await updateShop(profileData.id, { shopStatus: newStatus });
      setProfileData((prev: any) => ({ ...prev, shopStatus: newStatus }));
      // Trigger a local event to refresh data immediately if needed
      window.dispatchEvent(new CustomEvent('bb_settings_updated'));
    } catch (err) {
      console.debug("Status update bypassed (offline mode):", err);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleAccept = async (id: string) => {
    await updateBookingStatus(id, 'Accepted');
    const allBookings = await getBookings();
    setRequests(allBookings.filter((b: any) => b.shopId === (profileData?.id || user?.uid)));
  };

  const handleReject = async (id: string) => {
    await updateBookingStatus(id, 'Cancelled');
    const allBookings = await getBookings();
    setRequests(allBookings.filter((b: any) => b.shopId === (profileData?.id || user?.uid)));
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toDateString();
    return new Date(dateStr).toDateString() === today;
  };

  const isFuture = (dateStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const bookingDate = new Date(dateStr);
    bookingDate.setHours(0,0,0,0);
    return bookingDate.getTime() > today.getTime();
  };

  const activeRequestsCount = requests.filter(r => 
    (r.status === 'Accepted' || r.status === 'Confirmed') && 
    isToday(r.createdAt)
  ).length;

  const isVerified = profileData?.isApproved === true || profileData?.adminApproved === true || profileData?.status === 'approved' || user?.status === 'active';

  return (
    <div className="flex min-h-screen bg-gray-50/30">
      {/* PARTNER SIDEBAR */}
      <aside className="w-[18rem] bg-charcoal text-white flex-shrink-0 hidden xl:flex flex-col border-r border-white/5 pt-[1rem]">
        <div className="px-[2rem] mb-[3rem]">
          <p className="text-[0.5625rem] font-bold text-gray-500 uppercase tracking-[0.3em] mb-[1.5rem]">Management Console</p>
          <nav className="space-y-[0.75rem]">
            {[
              { id: 'Intelligence', label: 'Intelligence Overview', icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              )},
              { id: 'Requests', label: 'Booking Registry', icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              )},
              { id: 'Portfolio', label: 'Service Portfolio', icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              )},
              { id: 'Registry', label: 'Business Identity', icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              )},
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-[1rem] px-[1.25rem] py-[1rem] rounded-2xl text-[0.6875rem] font-bold uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-bbBlue text-white shadow-lg shadow-bbBlue/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-[2rem] border-t border-white/5">
          <p className="text-[0.5625rem] font-bold text-gray-500 uppercase tracking-[0.3em] mb-[1.25rem]">Expansion Portal</p>
          <button 
            onClick={() => navigate('/shop')}
            className="w-full flex items-center justify-between group px-[1.25rem] py-[1.25rem] bg-gold/10 border border-gold/20 rounded-2xl text-gold hover:bg-gold/20 transition-all"
          >
            <div className="flex items-center gap-[0.75rem]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              <span className="text-[0.625rem] font-bold uppercase tracking-[0.2em]">Premium Essentials</span>
            </div>
            <svg className="w-3 h-3 transform transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </aside>

      <div className="flex-grow pt-[1rem] pb-[5rem] overflow-y-auto h-screen custom-scrollbar">
        <div className="max-w-[1200px] mx-auto px-[5%]">
        
        {/* OFFLINE BANNER */}
        {profileData?.isActive === false && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-[2rem] bg-red-500 text-white p-[1.5rem] rounded-2xl flex items-center justify-between shadow-lg shadow-red-500/20"
          >
            <div className="flex items-center gap-[1rem]">
              <div className="w-[2.5rem] h-[2.5rem] bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              </div>
              <div>
                <p className="text-[0.75rem] font-bold uppercase tracking-widest">Shop is Offline</p>
                <p className="text-[0.5625rem] opacity-80 font-medium uppercase tracking-widest">Your profile is currently hidden from the customer network.</p>
              </div>
            </div>
            <span className="text-[0.5rem] font-bold bg-white/20 px-[0.75rem] py-[0.25rem] rounded-full uppercase">Private Mode</span>
          </motion.div>
        )}

        {/* Verification Alert */}
        {!isVerified && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-[2rem] bg-blue-50 border border-bbBlue/20 p-[1.5rem] rounded-[2rem] flex items-center justify-between gap-[1.5rem]"
          >
             <div className="flex items-center gap-[1.25rem]">
                <div className="w-[3rem] h-[3rem] bg-white rounded-full flex items-center justify-center text-bbBlue shadow-sm">
                   <svg className="w-[1.5rem] h-[1.5rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div>
                   <p className="text-[0.6875rem] font-bold text-bbBlue uppercase tracking-widest mb-[0.25rem]">Status: {isVerified ? 'Approved' : 'Pending Verification'}</p>
                   <p className="text-[0.625rem] text-gray-500 font-medium uppercase tracking-widest leading-relaxed">
                     {isVerified ? 'Your professional hub is now visible to the public network.' : 'Your professional hub will be visible to the public network once verified by an administrator.'}
                   </p>
                </div>
             </div>
             <span className="hidden md:block text-[0.5625rem] font-bold text-bbBlue uppercase bg-white px-[1rem] py-[0.5rem] rounded-full border border-bbBlue/10">Registry Admission Under Review</span>
          </motion.div>
        )}

        {/* Header Section */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-[2rem] mb-[4rem] bg-charcoal p-[2.5rem] md:p-[3.5rem] rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
           <div className="relative z-10">
             <div className="flex items-center gap-[1rem] mb-[1rem]">
                <span className="text-[0.5625rem] font-bold bg-gold/20 text-gold px-[1rem] py-[0.375rem] rounded-full border border-gold/30 uppercase tracking-[0.3em]">{profileData?.category || 'Professional'}</span>
                <span className={`text-[0.5625rem] font-bold px-[1rem] py-[0.375rem] rounded-full border uppercase tracking-[0.3em] ${isVerified ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-bbBlue/20 text-bbBlue border-bbBlue/30'}`}>
                   {isVerified ? 'Approved' : 'Pending Review'}
                </span>
             </div>
             <h1 className="text-[2rem] md:text-[2.5rem] font-serif font-bold tracking-tight mb-[0.5rem] uppercase">
                Partner Business Manager: {profileData?.brandName || profileData?.brand_name || 'Restoring...'}
              </h1>
             <div className="flex flex-col md:flex-row gap-[1.5rem] md:items-center mt-[1.5rem]">
               <p className="text-[0.625rem] text-gray-500 font-bold uppercase tracking-[0.4em]">Global ID: {user?.uid}</p>
               
               {/* Shop Status Toggle */}
               <div className="flex items-center gap-[1rem] bg-white/5 px-[1.25rem] py-[0.75rem] rounded-2xl border border-white/10">
                 <div className="flex items-center gap-[0.75rem]">
                   <div className={`w-[0.625rem] h-[0.625rem] rounded-full animate-pulse ${profileData?.shopStatus === 'open' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                   <span className="text-[0.625rem] font-bold uppercase tracking-widest text-gray-300">Shop Status: <span className={profileData?.shopStatus === 'open' ? 'text-green-400' : 'text-red-400'}>{profileData?.shopStatus || 'closed'}</span></span>
                 </div>
                 <button 
                   onClick={toggleShopStatus}
                   disabled={isStatusUpdating}
                   className={`relative w-[3rem] h-[1.5rem] rounded-full transition-colors duration-300 focus:outline-none ${profileData?.shopStatus === 'open' ? 'bg-green-500/40' : 'bg-gray-600'}`}
                 >
                   <div className={`absolute top-[0.1875rem] left-[0.1875rem] w-[1.125rem] h-[1.125rem] bg-white rounded-full transition-transform duration-300 shadow-sm ${profileData?.shopStatus === 'open' ? 'translate-x-[1.5rem]' : 'translate-x-0'}`}></div>
                 </button>
               </div>
             </div>
           </div>
           
             <div className="flex flex-wrap gap-[1.5rem] md:gap-[3rem] z-10">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-[1.5rem] rounded-2xl text-center min-w-[8rem]">
                   <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest mb-[0.5rem]">Shop Analytics</p>
                   <p className="text-[1.5rem] font-serif font-bold text-white">
                     {growthPercentage}
                   </p>
                   <p className="text-[0.5rem] text-emerald-400 font-bold uppercase mt-[0.25rem]">Growth %</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-[1.5rem] rounded-2xl text-center min-w-[8rem]">
                   <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest mb-[0.5rem]">Active Requests</p>
                   <p className="text-[1.5rem] font-serif font-bold text-bbBlue">{activeRequestsCount}</p>
                   <p className="text-[0.5rem] text-bbBlue font-bold uppercase mt-[0.25rem]">Live Queue</p>
                </div>
             </div>

           <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-bbBlue/10 to-transparent"></div>
        </header>

        {/* Dashboard Navigation */}
        <div className="flex gap-[2.5rem] border-b border-gray-100 mb-[3rem] overflow-x-auto scrollbar-hide">
          {['Intelligence', 'Requests', 'Portfolio', 'Registry'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-[1.25rem] text-[0.6875rem] font-bold uppercase tracking-[0.3em] transition-all relative whitespace-nowrap ${
                activeTab === tab ? 'text-bbBlue' : 'text-gray-300 hover:text-charcoal'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div layoutId="partnerTabLine" className="absolute bottom-0 left-0 right-0 h-[0.375rem] bg-bbBlue rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'Intelligence' && (
            <motion.div key="intel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-[3rem]">
               
               {/* SETTLEMENTS & PAYOUTS */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-[2rem]">
                  <div className="lg:col-span-2 bg-gray-50/50 p-[2.5rem] rounded-[3rem] border border-gray-100">
                     <div className="flex justify-between items-center mb-[2rem]">
                        <h3 className="text-[1.25rem] font-serif font-bold text-charcoal uppercase tracking-tight">12-Hour Settlement Cycles</h3>
                        <div className="flex flex-col items-end">
                           <span className="text-[0.5625rem] font-bold text-bbBlue uppercase bg-bbBlue/5 px-3 py-1 rounded-full mb-1">Automated Escrow</span>
                           <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Next Payout Cycle: <span className="text-bbBlue">{financialSummary?.timeRemaining || '--'}</span></p>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-[1.5rem] mb-[2rem]">
                        <div className="bg-white p-[1.5rem] rounded-2xl border border-green-100 shadow-sm">
                           <p className="text-[0.5rem] font-bold text-green-500 uppercase tracking-widest mb-[0.5rem]">Confirmed (Settlement Due)</p>
                           <p className="text-[1.5rem] font-serif font-bold text-charcoal">₹{profileData?.accountantAI?.confirmedAmount || 0}</p>
                        </div>
                        <div className="bg-white p-[1.5rem] rounded-2xl border border-gray-100 shadow-sm">
                           <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-[0.5rem]">Held (Escrow)</p>
                           <p className="text-[1.5rem] font-serif font-bold text-charcoal">₹{profileData?.accountantAI?.escrowAmount || 0}</p>
                        </div>
                     </div>

                     <div className="space-y-[1rem]">
                        {settlements.length > 0 ? settlements.map((s, i) => (
                          <div key={i} className="flex justify-between items-center p-[1.25rem] bg-white rounded-2xl border border-gray-50 shadow-sm">
                             <div>
                                <p className="text-[0.5rem] font-bold text-gray-300 uppercase tracking-widest">Cycle Ending</p>
                                <p className="text-[0.75rem] font-bold text-charcoal">{new Date(s.cycleEnd).toLocaleString()}</p>
                             </div>
                             <div className="text-right">
                                <p className="text-[0.5rem] font-bold text-gray-300 uppercase tracking-widest">Amount</p>
                                <p className="text-[1rem] font-serif font-bold text-bbBlue">₹{s.totalAmount}</p>
                                <p className={`text-[0.5rem] font-bold uppercase tracking-tighter ${s.status === 'READY FOR PAYOUT' ? 'text-green-500' : 'text-orange-500'}`}>
                                  {s.status}
                                </p>
                             </div>
                          </div>
                        )) : (
                          <div className="py-[3rem] text-center bg-white/50 rounded-2xl border border-dashed border-gray-100">
                             <p className="text-[0.625rem] font-bold text-gray-300 uppercase tracking-widest">No settlements processed yet</p>
                          </div>
                        )}
                     </div>
                  </div>

                  <div className="bg-charcoal p-[2.5rem] rounded-[3rem] text-white shadow-xl">
                     <h3 className="text-[1rem] font-serif font-bold mb-[2rem] uppercase tracking-tight">Worker Insights</h3>
                     <div className="space-y-[1.5rem]">
                        {workerInsights.map((w, i) => (
                          <div key={i} className="border-b border-white/10 pb-[1rem] last:border-0 flex items-center gap-[1rem]">
                             <div className="w-[3rem] h-[3rem] rounded-full overflow-hidden border border-white/10 bg-white/5 flex-shrink-0">
                                {w.workerImage ? (
                                  <img src={w.workerImage} alt={w.workerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[0.75rem] font-bold text-gray-500">
                                     {w.workerName.charAt(0)}
                                  </div>
                                )}
                             </div>
                             <div className="flex-grow">
                                <div className="flex justify-between items-center mb-[0.25rem]">
                                   <p className="text-[0.75rem] font-bold uppercase tracking-widest">{w.workerName}</p>
                                   <p className="text-[0.875rem] font-serif font-bold text-bbBlue">₹{w.earnings}</p>
                                </div>
                                <div className="flex justify-between items-center">
                                   <p className="text-[0.5625rem] text-gray-400 uppercase tracking-widest">{w.bookingCount} Bookings</p>
                                   <p className="text-[0.5625rem] text-emerald-400 font-bold uppercase">Today: ₹{w.todayTotal}</p>
                                </div>
                             </div>
                          </div>
                        ))}
                        {workerInsights.length === 0 && (
                          <p className="text-[0.625rem] text-gray-500 uppercase tracking-widest text-center py-[2rem]">No worker data available</p>
                        )}
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'Portfolio' && (
            <motion.div key="portfolio" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-[3rem]">
               {/* SERVICE MANAGEMENT HUB */}
               <div className="bg-gray-50/50 p-[2.5rem] md:p-[3.5rem] rounded-[3.5rem] border border-gray-100 shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-[1.5rem] mb-[3rem]">
                     <div>
                        <h2 className="text-[1.875rem] font-serif font-bold text-charcoal mb-[0.5rem] uppercase tracking-tight">Professional Service Hub</h2>
                        <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-[0.3em]">Configure and Persistent Registry Storage</p>
                     </div>
                     <button 
                        onClick={handleSaveServices}
                        disabled={isSaving}
                        className="bg-bbBlue text-white px-[2.5rem] py-[1rem] rounded-2xl font-bold uppercase text-[0.625rem] tracking-widest shadow-xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98] disabled:opacity-50"
                     >
                        {isSaving ? 'Syncing...' : 'Save Permanently'}
                     </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-[3rem]">
                     {/* Add New Service */}
                     <div className="bg-white p-[2rem] rounded-[2.5rem] border border-gray-100 shadow-inner space-y-[1.5rem]">
                        <h3 className="text-[0.6875rem] font-bold text-charcoal uppercase tracking-[0.2em] border-b border-gray-50 pb-[1rem]">Add Network Entry</h3>
                        <div className="space-y-[1rem]">
                           <div className="flex flex-col gap-[0.5rem]">
                              <label className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest ml-[0.25rem]">Service Designation</label>
                              <input 
                                 value={newServiceName} 
                                 onChange={(e) => setNewServiceName(e.target.value)} 
                                 placeholder="e.g. Master Fade & Groom" 
                                 className="w-full px-[1.5rem] py-[1rem] bg-gray-50 border border-gray-100 rounded-xl text-[0.875rem] focus:border-bbBlue outline-none" 
                              />
                           </div>
                           <div className="flex flex-col gap-[0.5rem]">
                              <label className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest ml-[0.25rem]">Price Asset (INR)</label>
                              <input 
                                 type="number" 
                                 value={newServicePrice} 
                                 onChange={(e) => setNewServicePrice(e.target.value)} 
                                 placeholder="500" 
                                 className="w-full px-[1.5rem] py-[1rem] bg-gray-50 border border-gray-100 rounded-xl text-[0.875rem] focus:border-bbBlue outline-none font-mono" 
                              />
                           </div>
                           <button 
                              onClick={handleAddService}
                              className="w-full py-[1rem] border-2 border-dashed border-gray-100 rounded-2xl text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest hover:border-bbBlue hover:text-bbBlue transition-all"
                           >
                              Append to List
                           </button>
                        </div>
                     </div>

                      {/* Active Services List */}
                     <div className="space-y-[1rem]">
                        <h3 className="text-[0.6875rem] font-bold text-charcoal uppercase tracking-[0.2em] border-b border-gray-50 pb-[1rem] px-[0.5rem]">Registry Portfolio</h3>
                        <div className="max-h-[18.75rem] overflow-y-auto pr-[0.5rem] custom-scrollbar space-y-[0.75rem]">
                           {services.length > 0 ? (
                             services.map((s, idx) => (
                               <div key={idx} className="flex justify-between items-center p-[1.25rem] bg-white border border-gray-50 rounded-2xl shadow-sm group">
                                  <div className="flex items-center gap-[0.75rem]">
                                     <span className="text-[0.875rem] font-bold text-charcoal uppercase tracking-tight">{s.name}</span>
                                     <span className="text-gray-300">—</span>
                                     <span className="text-[0.875rem] font-mono font-bold text-bbBlue">₹{s.price}</span>
                                  </div>
                                  <button onClick={() => handleRemoveService(idx)} className="text-gray-200 hover:text-red-500 transition-colors p-[0.5rem]">
                                     <svg className="w-[1rem] h-[1rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </button>
                               </div>
                             ))
                           ) : (
                             <div className="py-[5rem] text-center bg-white/50 rounded-3xl border border-dashed border-gray-100">
                                <p className="text-[0.625rem] font-bold text-gray-300 uppercase tracking-[0.3em]">Portfolio Empty</p>
                             </div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'Requests' && (
            <motion.div key="req" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-[1.5rem]">
              <div className="flex justify-between items-center mb-[2.5rem]">
                 <h2 className="text-[1.5rem] font-serif font-bold text-charcoal uppercase tracking-tight">Persistent Request Registry <span className="text-bbBlue ml-[0.5rem]">({requests.length})</span></h2>
                 <p className="text-[0.5625rem] font-bold text-red-500 uppercase tracking-[0.2em] animate-pulse">Live Network Monitoring</p>
              </div>

              <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-[2rem] py-[1.25rem] text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">Customer</th>
                        <th className="px-[2rem] py-[1.25rem] text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">Service Item</th>
                        <th className="px-[2rem] py-[1.25rem] text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">Price (INR)</th>
                        <th className="px-[2rem] py-[1.25rem] text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">Slot Time</th>
                        <th className="px-[2rem] py-[1.25rem] text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="px-[2rem] py-[1.25rem] text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.length > 0 ? (
                        requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(req => (
                          <tr key={req.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                            <td className="px-[2rem] py-[1.5rem]">
                              <p className="text-[0.875rem] font-bold text-charcoal leading-none mb-1">{req.customerName}</p>
                              <p className="text-[0.625rem] font-mono text-gray-400">{req.customerMobile || 'Verified Client'}</p>
                            </td>
                            <td className="px-[2rem] py-[1.5rem] text-[0.75rem] font-bold text-bbBlue uppercase">{req.serviceName}</td>
                            <td className="px-[2rem] py-[1.5rem] text-[0.875rem] font-serif font-bold text-charcoal">₹{req.price || '--'}</td>
                            <td className="px-[2rem] py-[1.5rem]">
                              <div className="flex flex-col gap-1">
                                <span className="text-[0.6875rem] font-bold text-charcoal uppercase">{new Date(req.createdAt).toLocaleDateString()}</span>
                                <span className="text-[0.5625rem] font-medium text-gray-400">{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </td>
                            <td className="px-[2rem] py-[1.5rem]">
                              <span className={`text-[0.5625rem] font-bold px-[0.75rem] py-[0.25rem] rounded-full uppercase tracking-tighter ${
                                req.status === 'payment_held' ? 'bg-orange-100 text-orange-600' : 
                                req.status === 'Accepted' ? 'bg-green-100 text-green-600' :
                                req.status === 'Confirmed' ? 'bg-green-100 text-green-600' : 
                                req.status === 'Cancelled' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {req.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-[2rem] py-[1.5rem] text-right">
                              {req.status === 'payment_held' && (
                                <div className="flex justify-end gap-[0.5rem]">
                                  <button 
                                    onClick={() => handleAccept(req.id)}
                                    className="bg-emerald-500 text-white px-[1rem] py-[0.5rem] rounded-lg text-[0.5625rem] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95"
                                  >
                                    Accept
                                  </button>
                                  <button 
                                    onClick={() => handleReject(req.id)}
                                    className="bg-red-500 text-white px-[1rem] py-[0.5rem] rounded-lg text-[0.5625rem] font-bold uppercase tracking-widest hover:bg-red-600 transition-all active:scale-95"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-[10rem] text-center">
                            <p className="text-[0.625rem] font-bold text-gray-300 uppercase tracking-[0.5em]">No requests in database</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-50">
                  {requests.length > 0 ? (
                    requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(req => (
                      <div key={req.id} className="p-[1.5rem] space-y-[1rem]">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[0.875rem] font-bold text-charcoal">{req.customerName}</p>
                            <p className="text-[0.75rem] font-mono text-gray-500">{req.customerMobile || '9876543210'}</p>
                          </div>
                          <span className={`text-[0.5rem] font-bold px-[0.75rem] py-[0.25rem] rounded-full uppercase tracking-tighter ${
                            req.status === 'payment_held' ? 'bg-orange-100 text-orange-600' : 
                            req.status === 'Accepted' ? 'bg-green-100 text-green-600' :
                            req.status === 'Confirmed' ? 'bg-green-100 text-green-600' : 
                            req.status === 'Cancelled' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {req.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[0.625rem] font-bold text-bbBlue uppercase mb-1">{req.serviceName}</p>
                            <div className="flex flex-col gap-0.5">
                              <p className="text-[0.5625rem] text-gray-400 font-medium uppercase">{new Date(req.createdAt).toLocaleDateString()}</p>
                              <p className="text-[0.5rem] text-gray-300 font-mono tracking-widest">{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[0.875rem] font-serif font-bold text-charcoal">₹{req.price || '--'}</p>
                             <p className="text-[0.5rem] font-bold text-gray-300 uppercase tracking-widest">Price (INR)</p>
                          </div>
                          {req.status === 'payment_held' && (
                            <div className="flex gap-[0.5rem]">
                              <button 
                                onClick={() => handleAccept(req.id)}
                                className="bg-emerald-500 text-white px-[0.75rem] py-[0.375rem] rounded-lg text-[0.5rem] font-bold uppercase tracking-widest"
                              >
                                Accept
                              </button>
                              <button 
                                onClick={() => handleReject(req.id)}
                                className="bg-red-500 text-white px-[0.75rem] py-[0.375rem] rounded-lg text-[0.5rem] font-bold uppercase tracking-widest"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-[5rem] text-center">
                      <p className="text-[0.625rem] font-bold text-gray-300 uppercase tracking-[0.5em]">No requests</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Registry' && (
            <motion.div key="reg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-[46.875rem] mx-auto space-y-[3rem]">
               <div className="bg-gray-50 p-[3rem] rounded-[3rem] border border-gray-100 shadow-sm">
                  <h3 className="text-[1.25rem] font-serif font-bold text-charcoal mb-[2rem] border-b border-gray-200 pb-[1rem] uppercase tracking-tight">Professional Identity Registry</h3>
                  <div className="space-y-[2rem]">
                    <div className="grid grid-cols-2 gap-[2rem]">
                       <div>
                          <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest mb-[0.25rem]">Owner Name</p>
                          <p className="text-[0.875rem] font-bold text-charcoal uppercase">{profileData?.ownerName || user?.name}</p>
                       </div>
                       <div>
                          <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest mb-[0.25rem]">Verification Status</p>
                          <p className={`text-[0.875rem] font-bold uppercase ${isVerified ? 'text-green-500' : 'text-bbBlue'}`}>
                            {isVerified ? 'Verified' : 'Pending Review'}
                          </p>
                       </div>
                    </div>
                    <div>
                       <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest mb-[0.5rem]">Merchant Settlement Endpoint</p>
                       <div className="relative">
                          <input 
                            type="text" 
                            readOnly 
                            value={profileData?.upiId || 'Not Configured'} 
                            className="w-full px-[1.5rem] py-[1rem] bg-gray-100 border border-gray-200 rounded-xl text-[0.875rem] font-mono font-bold text-charcoal opacity-70 outline-none cursor-not-allowed"
                          />
                          <span className="absolute right-[1rem] top-1/2 -translate-y-1/2 text-[0.5rem] font-bold text-gray-400 uppercase">Read Only</span>
                       </div>
                    </div>
                    <div>
                       <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest mb-[0.25rem]">Network Token ID (Reference Only)</p>
                       <p className="text-[0.875rem] font-mono font-bold text-bbBlue uppercase">{profileData?.tokenId || 'BB-XXXX'}</p>
                    </div>
                    <div>
                       <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest mb-[0.25rem]">Global ID (Non-Transferable)</p>
                       <p className="text-[0.875rem] font-mono font-bold text-bbBlue break-all opacity-50">{user?.uid}</p>
                    </div>
                  </div>
               </div>
               <div className="text-center bg-bbBlue/5 p-[2rem] rounded-[2rem] border border-bbBlue/10">
                  <p className="text-[0.625rem] font-bold text-bbBlue uppercase tracking-[0.4em] mb-[1rem]">Membership Integrity Warning</p>
                  <p className="text-[0.5625rem] text-gray-500 uppercase tracking-widest leading-relaxed">Registry data is permanent and synced with the Global Escrow Engine. Any changes to service designations are logged and updated live on the explore network.</p>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </div>
  );
};

export default PartnerDashboard;
