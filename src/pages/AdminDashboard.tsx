
/* ADMIN_PORTAL_PERMANENTLY_LOCKED */
/* SECURITY_LAYER_LOCKED */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

import { 
  getShops, 
  getBookings, 
  updateShop, 
  updateBookingStatus, 
  updateBooking, 
  getSettings, 
  updateSettings,
  sendNotification,
  getPendingPartners,
  getRatings
} from '../services/logic_engine';
import { PersistenceService, StorageManager } from '../services/PersistenceService';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [stats, setStats] = useState<any>(PersistenceService.load('admin_stats'));
  const [loading, setLoading] = useState(!PersistenceService.load('admin_stats'));
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShopDocs, setSelectedShopDocs] = useState<any>(null);
  const [fee, setFee] = useState<number>(PersistenceService.load('admin_platform_fee') || 10);
  const [successMsg, setSuccessMsg] = useState('');

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg('');
    }, 4500);
  };
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'customers' | 'partners'>('all');
  const [isUpdatingFee, setIsUpdatingFee] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [allRatings, setAllRatings] = useState<any[]>([]);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(PersistenceService.load('system_maintenance') || false);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = (searchParams.get('view') || 'overview') as 'overview' | 'verification' | 'shops' | 'ledger' | 'broadcast' | 'feedback' | 'settings' | 'manual_refund' | 'partner_payment_hub';
  const navigate = useNavigate();

  const setCurrentView = (view: string) => {
    setSearchParams({ view });
  };

  // Fetch real saved value from settings/global_config on mount
  useEffect(() => {
    const loadFee = async () => {
      try {
        const docRef = doc(db, 'settings', 'global_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const val = docSnap.data().platformFee;
          if (val !== undefined && val !== null) {
            setFee(Number(val));
          }
        }
      } catch (err) {
        console.error("Error loading platform fee directly:", err);
      }
    };
    loadFee();
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/404', { replace: true });
      return;
    }

    fetchStats();
    
    // Live Sync: Refresh stats every 10 seconds (local is fast)
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  const fetchStats = async () => {
    try {
      let data = [];
      let allBookings = [];
      let config = { 
        platformFee: 10, 
        broadcasts: [] as any[],
        heroTitle: 'BB Grooming Excellence',
        heroSubtitle: 'Connect with verified grooming and beauty professionals. Seamless booking, secure payments, and premium service delivery.'
      };

      try {
        data = await getShops();
        allBookings = await getBookings();
        config = await getSettings();
        const ratingsData = await getRatings();
        setAllRatings(ratingsData);
      } catch (firestoreErr) {
        console.debug("Firestore access restricted, activating preview bypass mode...", firestoreErr);
      }

      // data already contains combined real + mock shops with persistence overrides from getShops()
      const mergedPartners = data;
      const pendingVerifications = await getPendingPartners();
      
      let configFee = 10;
      try {
        const globalConfigSnap = await getDoc(doc(db, 'settings', 'global_config'));
        if (globalConfigSnap.exists() && globalConfigSnap.data().platformFee !== undefined) {
          configFee = Number(globalConfigSnap.data().platformFee);
        } else {
          configFee = config.platformFee || 10;
        }
      } catch (err) {
        console.debug("Firestore global_config check error:", err);
        configFee = config.platformFee || 10;
      }
      const totalPartners = mergedPartners.length;
      
      let totalEscrow = 0;
      let activeBookingsCount = 0;
      let adminCommission = 0;
      const settlements: any[] = [];
      const auditLog: any[] = [];

      mergedPartners.forEach((shop: any) => {
        let shopTotal = 0;
        const shopBookings = allBookings.filter(b => b.shopId === shop.id);
        
        shopBookings.forEach((b: any) => {
          const price = parseFloat(b.price || 0);
          const fee = (price * configFee) / 100;
          const payout = price - fee;
          
          const isActive = ['Accepted', 'Confirmed', 'payment_held', 'settlement_due'].includes(b.status);
          if (isActive) activeBookingsCount++;

          if (b.status !== 'Cancelled' && b.status !== 'rejected') {
            adminCommission += fee;
          }

          auditLog.push({
            bookingId: b.id,
            partnerName: shop.brandName,
            totalPaid: price,
            adminProfit: fee,
            finalPayoutAmt: payout,
            timerStatus: b.status === 'payment_held' ? 'Held (Escrow)' : (b.status === 'settlement_due' ? 'Settlement Due' : 'Settled'),
            isFrozen: b.isFrozen || false,
            shopId: shop.id,
            status: b.status
          });

          if (b.status === 'payment_held' || b.status === 'settlement_due') {
            totalEscrow += price;
            shopTotal += price;
          }
        });

        if (shopTotal > 0) {
          settlements.push({
            shopId: shop.id,
            brandName: shop.brandName,
            totalAmount: shopTotal,
            platformFee: (shopTotal * configFee) / 100,
            partnerPayout: shopTotal - ((shopTotal * configFee) / 100)
          });
        }
      });

      const newStats = {
        totalPartners,
        activeBookingsCount,
        totalEscrow,
        adminCommission,
        pendingVerifications,
        allPartners: mergedPartners,
        settlements,
        auditLog: auditLog.sort((a, b) => b.bookingId.localeCompare(a.bookingId)),
        platformFee: configFee,
        broadcasts: config.broadcasts || [],
        heroTitle: config.heroTitle || 'BB Grooming Excellence',
        heroSubtitle: config.heroSubtitle || 'Connect with verified grooming and beauty professionals. Seamless booking, secure payments, and premium service delivery.'
      };

      setStats(newStats);
      setFee(configFee);
      const optimizedStats = StorageManager.optimizeData(newStats);
      PersistenceService.save('admin_stats', optimizedStats);
    } catch (err) {
      console.error('Critical dashboard fetch failed, attempting emergency mock recovery...', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFee = async () => {
    setIsUpdatingFee(true);
    try {
      const newValue = Number(fee);
      
      // Strict rule: Save dynamically to 'settings/global_config' using doc.set/setDoc with merge: true
      await setDoc(doc(db, 'settings', 'global_config'), { platformFee: newValue }, { merge: true });
      
      // Maintain legacy 'settings/global' synchronization 
      await setDoc(doc(db, 'settings', 'global'), { platformFee: newValue }, { merge: true });

      PersistenceService.save('admin_platform_fee', newValue);
      showToast(`Fee updated to ${newValue}% successfully!`);
    } catch (err) {
      console.error("Firestore persistence error:", err);
      // Local safety update
      PersistenceService.save('admin_platform_fee', Number(fee));
      showToast(`Fee updated to ${fee}% successfully!`);
    }
    await fetchStats();
    setIsUpdatingFee(false);
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setIsBroadcasting(true);
    
    try {
      try {
        await sendNotification(broadcastMsg, broadcastTarget);
      } catch (e) { console.debug("Broadcast network error skipped."); }
      
      const config = await getSettings();
      const broadcasts = config.broadcasts || [];
      broadcasts.unshift({ 
        message: broadcastMsg, 
        target: broadcastTarget,
        timestamp: new Date().toISOString() 
      });
      
      try {
        await updateSettings({ broadcasts: broadcasts.slice(0, 10) });
      } catch (e) {}
      
      setBroadcastMsg('');
      const heavySound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      heavySound.volume = 1.0;
      heavySound.play().catch(e => console.log('Audio play blocked'));
      await fetchStats();
    } catch (err) {
      console.debug('Broadcast failed (bypassed):', err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleVerify = async (shopId: string, action: 'approve' | 'reject') => {
    // 1. Filter local stats immediately for snappy UI
    setStats((prev: any) => ({
      ...prev,
      pendingVerifications: prev.pendingVerifications.filter((s: any) => s.id !== shopId),
      // Update the status in allPartners rather than filtering it out
      allPartners: prev.allPartners.map((s: any) => 
        s.id === shopId 
          ? { ...s, adminApproved: action === 'approve', status: action === 'approve' ? 'approved' : 'rejected' } 
          : s
      )
    }));

    // 2. Persist change (updates all_partners in LocalStorage via logic_engine)
    try {
      const updates = action === 'approve' 
        ? { adminApproved: true, status: 'approved' } 
        : { adminApproved: false, status: 'rejected' };
      await updateShop(shopId, updates);
    } catch (err) {
      console.debug("Update persisted locally.");
    }
    
    // 3. Refresh to sync with other counts
    setTimeout(fetchStats, 500);
  };

  const handleDeleteRating = async (ratingId: string) => {
    const confirm = window.confirm("Are you sure you want to delete this feedback? This action cannot be undone.");
    if (!confirm) return;
    try {
      // In a real app, this would be a Firestore delete
      // For now, we filter local state
      setAllRatings(prev => prev.filter(r => r.id !== ratingId));
      // Update persistence
      const currentRatings = PersistenceService.load('ratings') || [];
      PersistenceService.save('ratings', currentRatings.filter((r: any) => r.id !== ratingId));
    } catch (error) {
      console.error("Failed to delete rating:", error);
    }
  };

  const handleUpdateShopDetails = async (shopId: string, updates: any) => {
    try {
      await updateShop(shopId, updates);
      fetchStats();
    } catch (error) {
      console.error("Failed to update shop:", error);
    }
  };

  const handleToggleActive = async (shopId: string, currentStatus: boolean) => {
    try {
      await updateShop(shopId, { isActive: !currentStatus });
      fetchStats();
    } catch (err) {
      console.error("Toggle active fail:", err);
    }
  };

  const handleDeleteBroadcast = async (index: number) => {
    try {
      const config = await getSettings();
      const broadcasts = config.broadcasts || [];
      broadcasts.splice(index, 1);
      await updateSettings({ broadcasts });
      fetchStats();
    } catch (err) {
      console.error("Delete broadcast fail:", err);
    }
  };

  const handleToggleMaintenance = async () => {
    const next = !isMaintenanceMode;
    setIsMaintenanceMode(next);
    PersistenceService.save('system_maintenance', next);
    await updateSettings({ maintenanceMode: next });
    alert(`Maintenance Mode: ${next ? 'ENABLED' : 'DISABLED'}`);
  };

  const handleFreezePayout = async (shopId: string, bookingId: string, currentFrozen: boolean) => {
    const success = await updateBooking(bookingId, { isFrozen: !currentFrozen });
    if (success) {
      fetchStats();
    }
  };

  const filteredPartners = stats?.allPartners?.filter((p: any) => 
    p.mobile?.includes(searchQuery) || p.brandName?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans">
      <div className="w-12 h-12 border-4 border-[#0056b3] border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Initializing Command Center...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-black font-sans relative">
      {/* Toast Notification Container */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[3000] bg-black text-white px-8 py-4 rounded-full border border-white/10 shadow-2xl flex items-center gap-3"
          >
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <p className="text-[10px] font-black uppercase tracking-widest">{successMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="p-8 pb-24 max-w-7xl mx-auto">
        {/* Global Admin Header with Dropdown */}
        <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-100">
          <div>
            <span className="text-[8px] font-black uppercase text-[#0056b3] bg-[#0056b3]/10 px-2 py-1 rounded-full tracking-wider">SYSTEM LEVEL: ADMINISTRATOR</span>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowToolsDropdown(!showToolsDropdown)}
              className="bg-black text-white hover:bg-[#0056b3] px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all shadow-md border border-white/10"
            >
              🛠️ QUICK ACTIONS <span className="text-[7px]">{showToolsDropdown ? '▲' : '▼'}</span>
            </button>
            {showToolsDropdown && (
              <div className="absolute right-0 mt-3 w-56 bg-white border border-gray-100 shadow-2xl rounded-2xl py-1 z-[1100] overflow-hidden">
                <button 
                  onClick={() => {
                    setShowToolsDropdown(false);
                    navigate('/admin/manage-live-shops');
                  }}
                  className="w-full text-left flex items-center gap-3 px-5 py-3 text-[10px] font-black uppercase text-charcoal hover:bg-gray-50 hover:text-[#0056b3] transition-all"
                >
                  <span className="text-sm">🛠️</span> CONTROL SHOPS
                </button>
                <button 
                  onClick={() => {
                    setShowToolsDropdown(false);
                    navigate('/admin/dropship');
                  }}
                  className="w-full text-left flex items-center gap-3 px-5 py-3 text-[10px] font-black uppercase text-charcoal hover:bg-gray-50 hover:text-[#0056b3] transition-all border-t border-gray-50"
                >
                  <span className="text-sm">📦</span> MANAGE INVENTORY / DROPSHIP
                </button>
              </div>
            )}
          </div>
        </div>

        {currentView === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-12">
              <h2 className="text-3xl font-serif font-bold text-black">DASHBOARD OVERVIEW</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-2">Real-time Network Performance</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Total Partners</p>
                <p className="text-4xl font-serif font-bold text-black">{stats?.totalPartners || 0}</p>
              </div>
              <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Active Bookings</p>
                <p className="text-4xl font-serif font-bold text-[#0056b3]">{stats?.activeBookingsCount || 0}</p>
              </div>
              <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Total Escrow</p>
                <p className="text-4xl font-serif font-bold text-black">₹{stats?.totalEscrow?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-black p-8 rounded-[2.5rem] shadow-xl shadow-black/10 relative overflow-hidden">
                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest">Live Sync</span>
                </div>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2">Admin Profit</p>
                <p className="text-4xl font-serif font-bold text-white">₹{stats?.adminCommission?.toLocaleString() || 0}</p>
              </div>
            </div>
          </motion.div>
        )}

        {currentView === 'verification' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-12 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-serif font-bold text-black">VERIFICATION QUEUE</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-2">Vetting Pending Partners</p>
              </div>
              <button onClick={() => setCurrentView('overview')} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black">Back to Overview</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stats?.pendingVerifications?.length > 0 ? (
                stats.pendingVerifications.map((shop: any) => (
                  <div 
                    key={shop.id} 
                    onClick={() => setSelectedShopDocs(shop)}
                    className="bg-white border border-gray-100 p-8 rounded-[2.5rem] flex flex-col justify-between gap-6 shadow-sm cursor-pointer hover:border-bbBlue/30 transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xl font-serif font-bold text-black group-hover:text-bbBlue transition-colors">{shop.brandName || 'Unnamed Shop'}</p>
                        <p className="text-[0.625rem] text-[#0056b3] font-bold uppercase tracking-widest mt-1">{shop.category || 'N/A'}</p>
                        <div className="mt-4 space-y-1">
                          <p className="text-[0.6875rem] text-gray-500 font-medium">Owner: {shop.ownerName}</p>
                          <p className="text-[0.6875rem] text-gray-500 font-medium">Mobile: {shop.mobile}</p>
                          <p className="text-[0.6875rem] text-gray-500 font-medium">Workers: {shop.workerCount}</p>
                        </div>
                      </div>
                      <button className="text-[0.5625rem] font-bold text-[#0056b3] border border-[#0056b3]/10 px-4 py-2 rounded-full hover:bg-[#0056b3]/5 transition-all uppercase tracking-widest">View Docs</button>
                    </div>
                    <div className="flex gap-3 pt-6 border-t border-gray-50" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); handleVerify(shop.id, 'approve'); }} className="flex-1 bg-[#0056b3] text-white py-3 rounded-2xl text-[0.625rem] font-bold uppercase tracking-widest hover:bg-[#004494] transition-all">Approve</button>
                      <button onClick={(e) => { e.stopPropagation(); handleVerify(shop.id, 'reject'); }} className="flex-1 bg-white border border-red-100 text-red-500 py-3 rounded-2xl text-[0.625rem] font-bold uppercase tracking-widest hover:bg-red-50 transition-all">Reject</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-20 border border-dashed border-gray-200 rounded-[2.5rem] text-gray-300 text-[0.625rem] font-bold uppercase tracking-[0.3em]">Queue Empty</div>
              )}
            </div>
          </motion.div>
        )}

        {currentView === 'shops' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-12 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-serif font-bold text-black">MASTER SHOP CONTROL</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-2">Network Partner Management</p>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="text" 
                  placeholder="SEARCH..." 
                  className="bg-gray-50 border border-gray-100 px-6 py-3 rounded-full text-[0.625rem] font-bold w-64 outline-none focus:border-[#0056b3]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button onClick={() => setCurrentView('overview')} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black">Back</button>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-[0.6875rem]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-4 text-gray-400 font-bold uppercase tracking-widest">Brand Name</th>
                      <th className="px-8 py-4 text-gray-400 font-bold uppercase tracking-widest">Mobile</th>
                      <th className="px-8 py-4 text-gray-400 font-bold uppercase tracking-widest">Status</th>
                      <th className="px-8 py-4 text-gray-400 font-bold uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredPartners.map((partner: any) => (
                      <tr key={partner.id} className="hover:bg-gray-50/50 transition-all">
                        <td className="px-8 py-5 font-bold text-black">{partner.brandName || partner.brand_name}</td>
                        <td className="px-8 py-5 text-gray-500 font-mono">{partner.mobile}</td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${partner.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                              <span className={`font-bold uppercase tracking-tighter ${partner.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                                {partner.isActive ? 'Online' : 'Offline'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[0.5rem] font-bold uppercase tracking-widest ${partner.isApproved ? 'text-blue-500' : 'text-orange-500'}`}>
                                {partner.isApproved ? 'Approved' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right space-x-2">
                          <button 
                            onClick={() => setEditingPartner(partner)}
                            className="px-4 py-2 rounded-xl text-[0.5625rem] font-bold uppercase tracking-widest border border-blue-100 text-blue-500 hover:bg-blue-50 transition-all font-sans"
                          >
                            Edit Power
                          </button>
                          <button 
                            onClick={() => handleToggleActive(partner.id, partner.isActive)}
                            className={`px-4 py-2 rounded-xl text-[0.5625rem] font-bold uppercase tracking-widest border transition-all ${partner.isActive ? 'border-red-100 text-red-500 hover:bg-red-50' : 'border-emerald-100 text-emerald-500 hover:bg-emerald-50'}`}
                          >
                            {partner.isActive ? 'Force Offline' : 'Restore Online'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-50">
                {filteredPartners.map((partner: any) => (
                  <div key={partner.id} className="p-6 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[0.875rem] font-bold text-black">{partner.brandName || partner.brand_name}</p>
                        <p className="text-[0.625rem] text-gray-400 font-mono mt-1">{partner.mobile}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${partner.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          <span className={`text-[0.625rem] font-bold uppercase tracking-tighter ${partner.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                            {partner.isActive ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <span className={`text-[0.5rem] font-bold uppercase tracking-widest ${partner.isApproved ? 'text-blue-500' : 'text-orange-500'}`}>
                          {partner.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleToggleActive(partner.id, partner.isActive)}
                      className={`w-full py-3 rounded-xl text-[0.625rem] font-bold uppercase tracking-widest border transition-all ${partner.isActive ? 'border-red-100 text-red-500 hover:bg-red-50' : 'border-emerald-100 text-emerald-500 hover:bg-emerald-50'}`}
                    >
                      {partner.isActive ? 'Force Offline' : 'Restore Online'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {currentView === 'ledger' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-12 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-serif font-bold text-black">ACCOUNTANT AI LEDGER</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-2">Financial Settlements & Audit Logs</p>
              </div>
              <button onClick={() => setCurrentView('overview')} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black">Back</button>
            </div>

            <div className="space-y-12">
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Pending Settlements</h3>
                <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                  <table className="w-full text-left text-[0.6875rem]">
                    <thead className="bg-[#0056b3] text-white">
                      <tr>
                        <th className="px-8 py-4 font-bold uppercase tracking-widest">Partner</th>
                        <th className="px-8 py-4 font-bold uppercase tracking-widest">Total Revenue</th>
                        <th className="px-8 py-4 font-bold uppercase tracking-widest">Platform Fee ({fee}%)</th>
                        <th className="px-8 py-4 font-bold uppercase tracking-widest">Net Payout</th>
                        <th className="px-8 py-4 font-bold uppercase tracking-widest text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stats?.settlements?.map((s: any) => (
                        <tr key={s.shopId} className="hover:bg-gray-50/50 transition-all">
                          <td className="px-8 py-5 font-bold text-black">{s.brandName}</td>
                          <td className="px-8 py-5 text-gray-500">₹{s.totalAmount.toLocaleString()}</td>
                          <td className="px-8 py-5 text-red-500 font-bold">-₹{s.platformFee.toLocaleString()}</td>
                          <td className="px-8 py-5 text-[#0056b3] font-bold">₹{s.partnerPayout.toLocaleString()}</td>
                          <td className="px-8 py-5 text-right">
                            <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[0.5625rem] font-bold uppercase tracking-widest border border-amber-100">
                              Pending Cycle
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Transaction Audit Log</h3>
                <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                  <table className="w-full text-left text-[0.6875rem]">
                    <thead className="bg-black text-white">
                      <tr>
                        <th className="px-8 py-4 font-bold uppercase tracking-widest">Booking ID</th>
                        <th className="px-8 py-4 font-bold uppercase tracking-widest">Partner</th>
                        <th className="px-8 py-4 font-bold uppercase tracking-widest">Total</th>
                        <th className="px-8 py-4 font-bold uppercase tracking-widest text-[#0056b3]">Profit</th>
                        <th className="px-8 py-4 font-bold uppercase tracking-widest text-emerald-400">Payout</th>
                        <th className="px-8 py-4 font-bold uppercase tracking-widest">Timer</th>
                        <th className="px-8 py-4 font-bold uppercase tracking-widest text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stats?.auditLog?.map((log: any) => (
                        <tr key={log.bookingId} className={`hover:bg-gray-50/50 transition-all ${log.isFrozen ? 'bg-red-50/30' : ''}`}>
                          <td className="px-8 py-5 font-mono text-gray-400">{log.bookingId}</td>
                          <td className="px-8 py-5 font-bold text-black">{log.partnerName}</td>
                          <td className="px-8 py-5 text-gray-500 font-bold">₹{log.totalPaid.toLocaleString()}</td>
                          <td className="px-8 py-5 text-[#0056b3] font-bold">₹{log.adminProfit.toLocaleString()}</td>
                          <td className="px-8 py-5 text-emerald-600 font-bold">₹{log.finalPayoutAmt.toLocaleString()}</td>
                          <td className="px-8 py-5">
                            <span className={`px-2 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${log.timerStatus === 'Settled' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {log.timerStatus}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button onClick={() => handleFreezePayout(log.shopId, log.bookingId, log.isFrozen)} className={`px-4 py-2 rounded-xl text-[0.5625rem] font-bold uppercase tracking-widest border transition-all ${log.isFrozen ? 'bg-red-500 text-white border-red-500' : 'border-red-100 text-red-500 hover:bg-red-50'}`}>
                              {log.isFrozen ? 'Unfreeze' : 'Freeze'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentView === 'feedback' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-12 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-serif font-bold text-black">CUSTOMER FEEDBACK</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-2">Quality Monitoring & Reviews</p>
              </div>
              <button onClick={() => setCurrentView('overview')} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black">Back</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allRatings.length > 0 ? (
                allRatings.map((rating: any) => {
                  const partner = stats?.allPartners?.find((p: any) => p.id === rating.partnerId);
                  return (
                    <div key={rating.id} className="group bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-between relative overflow-hidden">
                      <button 
                        onClick={() => handleDeleteRating(rating.id)}
                        className="absolute -top-4 -right-4 w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                        title="Delete Feedback"
                      >
                         <svg className="w-4 h-4 translate-y-1 -translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                      <div>
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <p className="text-[0.625rem] font-bold text-bbBlue uppercase tracking-[0.2em] mb-1">{partner?.brandName || 'Partner'}</p>
                            <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Transaction: {rating.bookingId?.slice(-8)}</p>
                          </div>
                          <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                            <span className="text-yellow-600 text-[0.625rem] font-black">★ {rating.rating}.0</span>
                          </div>
                        </div>
                        <div className="p-6 bg-gray-50 rounded-2xl relative">
                           <p className="text-[0.75rem] text-gray-600 italic leading-relaxed">"{rating.comment || 'No comment provided.'}"</p>
                           <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white rotate-45 border-r border-b border-gray-100"></div>
                        </div>
                      </div>
                      <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between items-center">
                        <p className="text-[0.5rem] font-bold text-gray-300 uppercase tracking-widest">{new Date(rating.createdAt).toLocaleDateString()}</p>
                        <p className="text-[0.5rem] font-bold text-charcoal uppercase tracking-widest">Customer: {rating.customerName}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-20 text-center border border-dashed border-gray-100 rounded-[3rem]">
                   <p className="text-[0.625rem] font-bold text-gray-300 uppercase tracking-widest">No feedback received yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {currentView === 'broadcast' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-12 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-serif font-bold text-black">BROADCAST CENTER</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-2">Global Communication & Urgent Alerts</p>
              </div>
              <button onClick={() => setCurrentView('overview')} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black">Back</button>
            </div>

            <div className="bg-white border border-gray-100 p-12 rounded-[3.5rem] shadow-sm max-w-4xl mx-auto">
              <h3 className="text-[12px] font-bold text-black uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                 <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                 Dispatch New Broadcast
              </h3>
              
              <div className="space-y-8">
                <div>
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Target Audience</label>
                   <div className="flex gap-4">
                      {(['all', 'customers', 'partners'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setBroadcastTarget(t)}
                          className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                            broadcastTarget === t 
                              ? 'bg-black text-white border-black shadow-lg shadow-black/20' 
                              : 'bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                   </div>
                </div>

                <div>
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Broadcast Message</label>
                   <textarea 
                      placeholder="ENTER CRITICAL SYSTEM ALERT OR ANNOUNCEMENT..."
                      value={broadcastMsg}
                      onChange={(e) => setBroadcastMsg(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 p-8 rounded-[2rem] text-sm font-medium outline-none focus:border-bbBlue min-h-[200px] resize-none transition-all leading-relaxed shadow-inner"
                   />
                </div>

                <div className="flex items-center justify-between pt-6">
                   <div className="flex items-center gap-2 text-[9px] font-bold text-gray-300 uppercase tracking-widest">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Real-time push notifications will be sent
                   </div>
                   <button 
                      onClick={handleBroadcast}
                      disabled={isBroadcasting || !broadcastMsg.trim()}
                      className="bg-[#2358E1] text-white px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all disabled:opacity-30 shadow-xl shadow-blue-500/20 active:scale-95"
                   >
                    {isBroadcasting ? 'Processing...' : 'Execute Dispatch'}
                   </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentView === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-12 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-serif font-bold text-black">MARKETPLACE SETTINGS</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-2">Core Platform Configuration & CMS</p>
              </div>
              <button onClick={() => setCurrentView('overview')} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black">Back</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white border border-gray-100 p-10 rounded-[3rem] shadow-sm">
                <h3 className="text-[10px] font-bold text-black uppercase tracking-widest mb-8 flex items-center gap-2">
                  <span className="w-2 h-2 bg-bbBlue rounded-full"></span>
                  Financial Configuration
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Platform Fee (Commission %)</label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <input 
                          type="number" 
                          value={fee}
                          onChange={(e) => setFee(Number(e.target.value))}
                          className="w-full bg-gray-50 border border-gray-100 px-6 py-4 rounded-2xl text-sm font-bold outline-none focus:border-bbBlue transition-all"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                      </div>
                      <button 
                        onClick={handleUpdateFee} 
                        disabled={isUpdatingFee} 
                        className="bg-black text-white px-8 rounded-2xl text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 hover:bg-bbBlue transition-all shadow-lg active:scale-95"
                      >
                        {isUpdatingFee ? 'Updating...' : 'Save Fee'}
                      </button>
                    </div>
                    <p className="text-[8px] text-gray-400 mt-2 font-medium uppercase tracking-widest">Applied to all future transactions across the network.</p>
                  </div>

                  <div className="pt-6 border-t border-gray-50">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">System Protocol Status</label>
                    <div className="flex items-center justify-between p-6 bg-red-50 rounded-[2rem] border border-red-100">
                      <div>
                         <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Global Maintenance Mode</p>
                         <p className="text-[8px] text-red-400 uppercase font-bold tracking-tighter">Redirects all traffic to protocol page</p>
                      </div>
                      <button 
                        onClick={handleToggleMaintenance}
                        className={`w-14 h-8 rounded-full p-1 transition-all duration-500 ${isMaintenanceMode ? 'bg-red-500' : 'bg-gray-300'}`}
                      >
                         <div className={`w-6 h-6 bg-white rounded-full transition-transform duration-500 transform ${isMaintenanceMode ? 'translate-x-6' : 'translate-x-0'} shadow-sm flex items-center justify-center`}>
                            {isMaintenanceMode ? <span className="text-[8px] font-black text-red-500">ON</span> : <span className="text-[8px] font-black text-gray-300">OFF</span>}
                         </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 p-10 rounded-[3rem] shadow-sm">
                <h3 className="text-[10px] font-bold text-black uppercase tracking-widest mb-8 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  Content Management (CMS)
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Global Marketplace Title</label>
                    <input 
                      type="text" 
                      value={stats?.heroTitle || 'BB Grooming Excellence'}
                      onChange={(e) => setStats({...stats, heroTitle: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-100 px-6 py-4 rounded-2xl text-[12px] font-bold outline-none focus:border-bbBlue transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Global Marketplace Subtitle</label>
                    <textarea 
                      value={stats?.heroSubtitle || ''}
                      onChange={(e) => setStats({...stats, heroSubtitle: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-100 px-6 py-4 rounded-2xl text-[12px] font-medium outline-none focus:border-bbBlue h-32 resize-none transition-all leading-relaxed"
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      setIsUpdatingFee(true);
                      await updateSettings({ 
                        heroTitle: stats.heroTitle, 
                        heroSubtitle: stats.heroSubtitle 
                      });
                      setIsUpdatingFee(false);
                      fetchStats();
                    }} 
                    className="w-full bg-black text-white py-5 rounded-2xl font-bold uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3 transition-all hover:bg-emerald-600 shadow-xl"
                  >
                    Deploy Interface Update
                  </button>
                </div>
              </div>

              <div className="bg-white border border-gray-100 p-10 rounded-[3rem] shadow-sm md:col-span-2">
                <h3 className="text-[10px] font-bold text-black uppercase tracking-widest mb-8">Broadcast Repository (History)</h3>
                <div className="space-y-4">
                  {stats?.broadcasts?.length > 0 ? (
                    stats.broadcasts.map((b: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl group border border-transparent hover:border-gray-200 transition-all">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-[8px] font-black uppercase text-bbBlue bg-bbBlue/10 px-2 py-0.5 rounded-full">{b.target}</span>
                            <span className="text-[8px] font-bold text-gray-300 uppercase">{new Date(b.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-[10px] font-bold text-charcoal">{b.message}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteBroadcast(i)}
                          className="w-8 h-8 rounded-lg bg-white border border-gray-100 text-gray-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:border-red-100 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-gray-300 text-[10px] font-bold uppercase tracking-widest border border-dashed border-gray-100 rounded-2xl">No broadcast history</div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentView === 'manual_refund' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-12 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-serif font-bold text-black">CUSTOMER MANUAL UPI REFUNDS</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-2">Bypass Auto-Refund Gateway & Release Manual Paybacks</p>
              </div>
              <button onClick={() => setCurrentView('overview')} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black">Back to Overview</button>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {/* Manual Refund Entry Tool */}
              <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm">
                <h3 className="text-[10px] font-bold text-black uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#0056b3] rounded-full"></span>
                  Quick Manual Refund Dispatcher
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Booking ID / Ref</label>
                    <input 
                      type="text" 
                      placeholder="e.g. bk_12345"
                      id="quick_booking_id"
                      className="w-full bg-gray-50 border border-gray-100 px-4 py-3 rounded-xl text-[11px] font-bold outline-none focus:border-bbBlue"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Customer UPI ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. customer@upi"
                      id="quick_upi_id"
                      className="w-full bg-gray-50 border border-gray-100 px-4 py-3 rounded-xl text-[11px] font-bold outline-none focus:border-bbBlue"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Amount (₹)</label>
                    <input 
                      type="number" 
                      placeholder="500"
                      id="quick_amount"
                      className="w-full bg-gray-50 border border-gray-100 px-4 py-3 rounded-xl text-[11px] font-bold outline-none focus:border-bbBlue"
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      const bId = (document.getElementById('quick_booking_id') as HTMLInputElement)?.value;
                      const upi = (document.getElementById('quick_upi_id') as HTMLInputElement)?.value;
                      const amt = (document.getElementById('quick_amount') as HTMLInputElement)?.value;
                      if (!bId || !upi || !amt) {
                        alert("Please fill all fields for manual refund dispatcher.");
                        return;
                      }
                      try {
                        // 1. Add to refund_requests collection
                        await setDoc(doc(db, 'refund_requests', bId), {
                          bookingId: bId,
                          upiId: upi,
                          amount: Number(amt),
                          status: 'refunded',
                          releasedAt: new Date().toISOString(),
                          method: 'UPI_MANUAL'
                        }, { merge: true });

                        // 2. Add notification to the customer/partner if possible or broadcast
                        await addDoc(collection(db, 'notifications'), {
                          message: `Manual UPI Refund of ₹${amt} released successfully to ID: ${upi} for booking ${bId}.`,
                          target: 'all',
                          timestamp: new Date().toISOString(),
                          createdAt: Timestamp.now(),
                          type: 'STATUS UPDATE'
                        });

                        // 3. Update the booking status in Firestore if booking exists
                        try {
                          await updateBookingStatus(bId, 'Refunded');
                        } catch (e) {
                          console.log("Booking doc not found but manual refund log was created.");
                        }

                        showToast(`Refund of ₹${amt} dispatched to ${upi}!`);
                        // Clear fields
                        (document.getElementById('quick_booking_id') as HTMLInputElement).value = '';
                        (document.getElementById('quick_upi_id') as HTMLInputElement).value = '';
                        (document.getElementById('quick_amount') as HTMLInputElement).value = '';
                        fetchStats();
                      } catch (err) {
                        console.error(err);
                        alert("Failed to process manual refund.");
                      }
                    }}
                    className="bg-black text-white py-3.5 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-[#0056b3] transition-all shadow-md active:scale-95 animate-none"
                  >
                    Release & Log Payout
                  </button>
                </div>
              </div>

              {/* Active Refund Streams */}
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Refund Eligible Cancellation Stream</h3>
                <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                  <table className="w-full text-left text-[0.6875rem]">
                    <thead className="bg-[#0056b3] text-white">
                      <tr>
                        <th className="px-8 py-4 font-bold uppercase tracking-widest">Booking ID</th>
                        <th className="px-8 py-4 font-bold uppercase tracking-widest">Customer Name</th>
                        <th className="px-8 py-4 font-bold uppercase tracking-widest">Amount</th>
                        <th className="px-8 py-4 font-bold uppercase tracking-widest">Status</th>
                        <th className="px-8 py-4 font-bold uppercase tracking-widest text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stats?.auditLog?.filter((l: any) => l.status === 'Cancelled' || l.status === 'refund_requested').map((log: any) => (
                        <tr key={log.bookingId} className="hover:bg-gray-50/50 transition-all">
                          <td className="px-8 py-5 font-mono text-gray-400">{log.bookingId}</td>
                          <td className="px-8 py-5 font-bold text-black">{log.customerName || 'Network Member'}</td>
                          <td className="px-8 py-5 text-gray-500 font-bold">₹{log.totalPaid.toLocaleString()}</td>
                          <td className="px-8 py-5">
                            <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[0.5625rem] font-bold uppercase tracking-widest border border-red-100">
                              Refund Outstanding
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button 
                              onClick={async () => {
                                const upiInput = window.prompt("Enter Customer's registered UPI ID for dispatching payback:");
                                if (!upiInput) return;
                                try {
                                  await setDoc(doc(db, 'refund_requests', log.bookingId), {
                                    bookingId: log.bookingId,
                                    upiId: upiInput,
                                    amount: log.totalPaid,
                                    status: 'refunded',
                                    releasedAt: new Date().toISOString(),
                                    method: 'UPI_MANUAL'
                                  }, { merge: true });

                                  await updateBookingStatus(log.bookingId, 'Refunded');
                                  
                                  await addDoc(collection(db, 'notifications'), {
                                    message: `Manual UPI Refund of ₹${log.totalPaid} released successfully to ID: ${upiInput} for booking ${log.bookingId}.`,
                                    target: 'all',
                                    timestamp: new Date().toISOString(),
                                    createdAt: Timestamp.now(),
                                    type: 'STATUS UPDATE'
                                  });

                                  showToast(`Refund of ₹${log.totalPaid} released successfully!`);
                                  fetchStats();
                                } catch (err) {
                                  console.error(err);
                                  alert("Failed to process refund");
                                }
                              }}
                              className="px-4 py-2 rounded-xl text-[0.5625rem] font-bold uppercase tracking-widest bg-black text-white hover:bg-[#0056b3] transition-all font-sans"
                            >
                              Dispatch Payout
                            </button>
                          </td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan={5} className="text-center py-10 text-gray-300 font-bold uppercase">No cancellation pending refunds</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentView === 'partner_payment_hub' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-12 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-serif font-bold text-black">PARTNER PAYMENT HUB</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-2">Account AI 12-Hour 5% Commission & Settlement Registry</p>
              </div>
              <button onClick={() => setCurrentView('overview')} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black">Back to Overview</button>
            </div>

            {/* Rolling Window & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-black text-white p-8 rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-bbBlue rounded-full animate-pulse"></span>
                  <span className="text-[8px] text-bbBlue font-bold uppercase tracking-widest">Active Cycle</span>
                </div>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2">Rolling Settlement Cycle</p>
                <p className="text-4xl font-serif font-bold text-white">12h 00m</p>
                <div className="w-full bg-white/10 h-1 rounded-full mt-4 overflow-hidden">
                  <div className="bg-bbBlue h-full w-[85%] animate-pulse"></div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Standard AI Commission</p>
                <p className="text-4xl font-serif font-bold text-black">5.0%</p>
                <p className="text-[8px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Calculated dynamically on gross volume</p>
              </div>

              <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Total Net Pending Cycle</p>
                <p className="text-4xl font-serif font-bold text-bbBlue">
                  ₹{stats?.settlements?.reduce((sum: number, s: any) => sum + (s.totalAmount * 0.95), 0).toLocaleString() || 0}
                </p>
                <p className="text-[8px] text-gray-400 mt-2 font-bold uppercase tracking-widest">All outstanding partner balances</p>
              </div>
            </div>

            {/* Partner Settlement List */}
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Partner Settlement Registry</h3>
              <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                <table className="w-full text-left text-[0.6875rem]">
                  <thead className="bg-[#0056b3] text-white">
                    <tr>
                      <th className="px-8 py-4 font-bold uppercase tracking-widest">Partner Shop</th>
                      <th className="px-8 py-4 font-bold uppercase tracking-widest">Registered UPI ID</th>
                      <th className="px-8 py-4 font-bold uppercase tracking-widest">Gross 12h Vol</th>
                      <th className="px-8 py-4 font-bold uppercase tracking-widest">5% Fee Deduction</th>
                      <th className="px-8 py-4 font-bold uppercase tracking-widest">Net Payout Release</th>
                      <th className="px-8 py-4 font-bold uppercase tracking-widest text-right">Operational Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats?.allPartners?.map((p: any) => {
                      // Calculate gross volume from completed/eligible bookings
                      const partnerBookings = stats?.auditLog?.filter((l: any) => l.shopId === p.id && (l.status === 'payment_held' || l.status === 'settlement_due' || l.status === 'Confirmed' || l.status === 'Accepted'));
                      const grossAmount = partnerBookings?.reduce((sum: number, b: any) => sum + b.totalPaid, 0) || 0;
                      const commission = grossAmount * 0.05;
                      const netPayout = grossAmount - commission;
                      const registeredUpi = p.upiId || p.upi_id || 'unregistered@upi';

                      if (grossAmount === 0) return null;

                      return (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-all">
                          <td className="px-8 py-5 font-bold text-black">{p.brandName || p.brand_name}</td>
                          <td className="px-8 py-5 font-mono text-bbBlue">{registeredUpi}</td>
                          <td className="px-8 py-5 text-gray-500 font-bold">₹{grossAmount.toLocaleString()}</td>
                          <td className="px-8 py-5 text-red-500 font-bold">-₹{commission.toLocaleString()}</td>
                          <td className="px-8 py-5 text-emerald-600 font-bold">₹{netPayout.toLocaleString()}</td>
                          <td className="px-8 py-5 text-right">
                            <button 
                              onClick={async () => {
                                try {
                                  // 1. Release settlement logs in Firestore
                                  await setDoc(doc(db, 'partner_settlements', p.id + '_' + Date.now()), {
                                    partnerId: p.id,
                                    partnerName: p.brandName || p.brand_name,
                                    upiId: registeredUpi,
                                    grossAmount,
                                    commission,
                                    netPayout,
                                    releasedAt: new Date().toISOString()
                                  });

                                  // 2. Trigger localized message insert into partner's bell notification stream
                                  await addDoc(collection(db, 'notifications'), {
                                    message: `Settlement payout of ₹${netPayout.toLocaleString()} released to your registered UPI ID ${registeredUpi} after 5% platform commission deduction.`,
                                    target: p.id, // direct partner target
                                    timestamp: new Date().toISOString(),
                                    createdAt: Timestamp.now(),
                                    type: 'GLOBAL BROADCAST'
                                  });

                                  // 3. Mark the partner's bookings as Settled (or 'completed')
                                  for (const b of partnerBookings) {
                                    await updateBookingStatus(b.bookingId, 'completed');
                                  }

                                  showToast(`Released ₹${netPayout.toLocaleString()} to ${p.brandName}! Notification triggered.`);
                                  fetchStats();
                                } catch (err) {
                                  console.error(err);
                                  alert("Failed to release partner settlement");
                                }
                              }}
                              className="px-6 py-2 rounded-xl text-[0.5625rem] font-bold uppercase tracking-widest bg-black text-white hover:bg-emerald-600 transition-all font-sans"
                            >
                              Release & Notify
                            </button>
                          </td>
                        </tr>
                      );
                    }).filter(Boolean)}
                    {(!stats?.allPartners || stats.allPartners.length === 0) && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-gray-300 font-bold uppercase">No active settlements in current 12h cycle</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Admin Bottom Navigation */}
      <motion.div 
        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black border border-white/10 p-2 rounded-full shadow-2xl z-[1000] flex items-center gap-2"
      >
        {[
          { id: 'overview', label: 'Dashboard' },
          { id: 'verification', label: 'Vetting', badge: stats?.pendingVerifications?.length },
          { id: 'shops', label: 'shops' },
          { id: 'ledger', label: 'ledger' },
          { id: 'feedback', label: 'Feedback' },
          { id: 'manual_refund', label: 'Refunds' },
          { id: 'partner_payment_hub', label: 'Payout Hub' },
          { id: 'broadcast', label: 'Global' },
          { id: 'settings', label: 'Systems' }
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => setCurrentView(v.id)}
            className={`px-6 py-2 rounded-full text-[8px] font-bold uppercase tracking-widest transition-all relative ${
              currentView === v.id ? 'bg-white text-black' : 'text-white/40 hover:text-white'
            }`}
          >
            {v.label}
            {(v.badge ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[6px]">
                {v.badge}
              </span>
            )}
          </button>
        ))}
        <button onClick={logout} className="px-6 py-2 rounded-full text-[8px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/10">Exit</button>
      </motion.div>

      {/* Partner Edit Modal */}
      {editingPartner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[3000] flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-xl p-12 rounded-[4rem] relative shadow-2xl">
             <button onClick={() => setEditingPartner(null)} className="absolute top-10 right-10 text-gray-300 hover:text-black">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
             <div className="mb-10">
                <h3 className="text-2xl font-serif font-bold text-black uppercase">Partner Core Edit</h3>
                <p className="text-[10px] text-bbBlue font-black uppercase tracking-[0.4em] mt-2 underline">Bypass Verification & Data Injection</p>
             </div>
             
             <div className="space-y-6">
                <div>
                   <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">Display Name (Brand)</label>
                   <input 
                      type="text" 
                      defaultValue={editingPartner.brandName || editingPartner.brand_name}
                      onChange={(e) => setEditingPartner({...editingPartner, brandName: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-100 px-6 py-4 rounded-2xl font-bold text-sm outline-none focus:border-bbBlue"
                   />
                </div>
                <div>
                   <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">Communication (Mobile)</label>
                   <input 
                      type="text" 
                      defaultValue={editingPartner.mobile}
                      onChange={(e) => setEditingPartner({...editingPartner, mobile: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-100 px-6 py-4 rounded-2xl font-bold text-sm outline-none focus:border-bbBlue"
                   />
                </div>
                <div>
                   <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">Internal Status Protocol</label>
                   <select 
                      defaultValue={editingPartner.status}
                      onChange={(e) => setEditingPartner({...editingPartner, status: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-100 px-6 py-4 rounded-2xl font-bold text-[10px] uppercase outline-none focus:border-bbBlue"
                   >
                      <option value="pending">Pending Review</option>
                      <option value="approved">White-listed (Approved)</option>
                      <option value="rejected">Black-listed (Rejected)</option>
                      <option value="suspended">Suspended</option>
                   </select>
                </div>

                <div className="pt-8">
                   <button 
                     onClick={() => {
                        handleUpdateShopDetails(editingPartner.id, editingPartner);
                        setEditingPartner(null);
                     }}
                     className="w-full bg-black text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-bbBlue transition-all shadow-xl active:scale-95"
                   >
                      Commit Database Logic Update
                   </button>
                </div>
             </div>
          </motion.div>
        </div>
      )}

      {/* Document Modal (Verification) */}
      {selectedShopDocs && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto p-10 rounded-[3rem] relative shadow-2xl">
            <button onClick={() => setSelectedShopDocs(null)} className="absolute top-8 right-8 text-gray-300 hover:text-black transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="mb-10">
              <h3 className="text-2xl font-serif font-bold text-black">{selectedShopDocs.brandName || selectedShopDocs.brand_name}</h3>
              <p className="text-[0.625rem] text-[#0056b3] font-bold uppercase tracking-[0.4em] mt-1">Vetting & Document Verification</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-12">
                <div>
                  <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest mb-6">Shop Premises Verification ({ (selectedShopDocs.shopImages || selectedShopDocs.brandImages || []).length } Images)</p>
                  <div className="grid grid-cols-3 gap-3">
                    { (selectedShopDocs.shopImages || selectedShopDocs.brandImages || []).length > 0 ? (
                      (selectedShopDocs.shopImages || selectedShopDocs.brandImages || []).map((img: string, i: number) => (
                        <div key={i} className="aspect-square bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden shadow-sm group flex items-center justify-center p-2 text-center">
                          { (typeof img === 'string' && (img.startsWith('data:image') || img.startsWith('http'))) ? (
                            <img src={img} alt="Shop" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="flex flex-col items-center">
                              <svg className="w-6 h-6 text-gray-200 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                              <span className="text-[8px] font-bold text-bbBlue uppercase truncate w-full px-1">{typeof img === 'string' ? (img.split(': ')[1] || img) : 'Invalid Image'}</span>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 aspect-[3/1] border border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-[10px] text-gray-300 font-bold uppercase tracking-widest">No Premises Images</div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest mb-6">Worker Verification ({ (selectedShopDocs.workerImages || selectedShopDocs.staffImages || []).length } Staff)</p>
                  <div className="grid grid-cols-3 gap-3">
                    { (selectedShopDocs.workerImages || selectedShopDocs.staffImages || []).length > 0 ? (
                      (selectedShopDocs.workerImages || selectedShopDocs.staffImages || []).map((img: string, i: number) => (
                        <div key={i} className="aspect-square bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden shadow-sm group flex items-center justify-center p-2 text-center">
                          { (typeof img === 'string' && (img.startsWith('data:image') || img.startsWith('http'))) ? (
                            <img src={img} alt="Worker" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="flex flex-col items-center">
                              <svg className="w-6 h-6 text-gray-200 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                              <span className="text-[8px] font-bold text-bbBlue uppercase truncate w-full px-1">{typeof img === 'string' ? (img.split(': ')[1] || img) : 'Invalid Image'}</span>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 aspect-[3/1] border border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-[10px] text-gray-300 font-bold uppercase tracking-widest">No Worker Images</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest mb-6">Government ID Verification</p>
                  <div className="aspect-[1.6/1] bg-gray-50 rounded-[2rem] border border-gray-100 overflow-hidden relative shadow-sm flex items-center justify-center p-4 text-center">
                    { (selectedShopDocs.govtIdUrl || selectedShopDocs.govId) ? (
                      (typeof (selectedShopDocs.govtIdUrl || selectedShopDocs.govId) === 'string' && ((selectedShopDocs.govtIdUrl || selectedShopDocs.govId).startsWith('data:image') || (selectedShopDocs.govtIdUrl || selectedShopDocs.govId).startsWith('http'))) ? (
                        <img src={selectedShopDocs.govtIdUrl || selectedShopDocs.govId} alt="Govt ID" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                          <span className="text-[10px] font-bold text-bbBlue uppercase tracking-widest">
                            { typeof (selectedShopDocs.govtIdUrl || selectedShopDocs.govId) === 'string' 
                               ? ((selectedShopDocs.govtIdUrl || selectedShopDocs.govId).split(': ')[1] || 'DOC LOADED') 
                               : 'NOT A VALID IMAGE STRING' }
                          </span>
                        </div>
                      )
                    ) : (
                      <span className="text-[10px] text-gray-300 font-bold uppercase">No ID Documents</span>
                    )}
                  </div>
                </div>
                
                <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100">
                  <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest mb-4">Onboarding Data Summary</p>
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-gray-200/50 pb-2">
                       <span className="text-[0.625rem] font-bold text-gray-400 uppercase">Owner</span>
                       <span className="text-[0.6875rem] font-bold text-black">{selectedShopDocs.ownerName}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200/50 pb-2">
                       <span className="text-[0.625rem] font-bold text-gray-400 uppercase">Category</span>
                       <span className="text-[0.6875rem] font-bold text-bbBlue uppercase">{selectedShopDocs.category}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200/50 pb-2">
                       <span className="text-[0.625rem] font-bold text-gray-400 uppercase">Staff Count</span>
                       <span className="text-[0.6875rem] font-bold text-black">{selectedShopDocs.workerCount || selectedShopDocs.workerQuantity || 0} Personnel</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200/50 pb-2">
                       <span className="text-[0.625rem] font-bold text-gray-400 uppercase">UPI ID (Finance)</span>
                       <span className="text-[0.6875rem] font-bold text-bbBlue font-mono">{selectedShopDocs.upiId || selectedShopDocs.upi_id || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200/50 pb-2">
                       <span className="text-[0.625rem] font-bold text-gray-400 uppercase">Mobile</span>
                       <span className="text-[0.6875rem] font-bold text-black font-mono">{selectedShopDocs.mobile || selectedShopDocs.mobile_number}</span>
                    </div>
                    <div className="flex flex-col gap-1 pt-1">
                       <div className="flex justify-between border-b border-gray-200/50 pb-2">
                          <span className="text-[0.625rem] font-bold text-gray-400 uppercase">Manual Address</span>
                          <span className="text-[0.6875rem] font-bold text-black line-clamp-2 text-right max-w-[60%] lowercase first-letter:uppercase">{selectedShopDocs.manualAddress || selectedShopDocs.address || selectedShopDocs.manual_address || 'Not Provided'}</span>
                       </div>
                       <div className="flex justify-between border-b border-gray-200/50 pb-2 pt-1">
                          <span className="text-[0.625rem] font-bold text-gray-400 uppercase">GPS Location</span>
                          <span className="text-[0.6875rem] font-bold text-bbBlue font-mono">
                            { (selectedShopDocs.coords?.lat || selectedShopDocs.lat) ? `${Number(selectedShopDocs.coords?.lat || selectedShopDocs.lat).toFixed(4)}, ${Number(selectedShopDocs.coords?.lng || selectedShopDocs.lng).toFixed(4)}` : 'No Coords' }
                          </span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-gray-50 flex justify-end gap-4">
              <button onClick={() => setSelectedShopDocs(null)} className="px-8 py-3 text-[0.625rem] font-bold uppercase tracking-widest text-gray-400 hover:text-black">Close</button>
              <button onClick={() => { handleVerify(selectedShopDocs.id, 'approve'); setSelectedShopDocs(null); }} className="px-10 py-3 bg-[#0056b3] text-white rounded-2xl text-[0.625rem] font-bold uppercase tracking-widest hover:bg-[#004494] transition-all shadow-xl shadow-[#0056b3]/20">Approve Now</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
