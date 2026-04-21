
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import { 
  getShops, 
  getBookings, 
  updateShop, 
  updateBookingStatus, 
  updateBooking, 
  getSettings, 
  updateSettings,
  sendNotification,
  getPendingPartners
} from '../services/logic_engine';
import { PersistenceService, StorageManager } from '../services/PersistenceService';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>(PersistenceService.load('admin_stats'));
  const [loading, setLoading] = useState(!PersistenceService.load('admin_stats'));
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShopDocs, setSelectedShopDocs] = useState<any>(null);
  const [platformFee, setPlatformFee] = useState(PersistenceService.load('admin_platform_fee') || 10);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'customers' | 'partners'>('all');
  const [isUpdatingFee, setIsUpdatingFee] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = (searchParams.get('view') || 'overview') as 'overview' | 'verification' | 'shops' | 'ledger' | 'broadcast';
  const navigate = useNavigate();

  const setCurrentView = (view: string) => {
    setSearchParams({ view });
  };

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
      let config = { platformFee: 10, broadcasts: [] };

      try {
        data = await getShops();
        allBookings = await getBookings();
        config = await getSettings();
      } catch (firestoreErr) {
        console.debug("Firestore access restricted, activating preview bypass mode...", firestoreErr);
      }

      // data already contains combined real + mock shops with persistence overrides from getShops()
      const mergedPartners = data;
      const pendingVerifications = await getPendingPartners();
      
      const configFee = config.platformFee || 10;
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
        broadcasts: config.broadcasts || []
      };

      setStats(newStats);
      setPlatformFee(configFee);
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
      await updateSettings({ platformFee });
    } catch (err) {
       // Local only fee update if firebase fails
       setPlatformFee(platformFee);
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

  const handleToggleActive = async (shopId: string, currentStatus: boolean) => {
    await updateShop(shopId, { isActive: !currentStatus });
    fetchStats();
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
      <main className="p-8 pb-24 max-w-7xl mx-auto">
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
                          <p className="text-[0.6875rem] text-gray-500 font-medium">Workers: {shop.workerQuantity || '1'}</p>
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
                        <td className="px-8 py-5 text-right">
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
                        <th className="px-8 py-4 font-bold uppercase tracking-widest">Platform Fee ({platformFee}%)</th>
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

        {currentView === 'broadcast' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-12 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-serif font-bold text-black">BROADCAST CENTER</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-2">Global Communication & System Config</p>
              </div>
              <button onClick={() => setCurrentView('overview')} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black">Back</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm">
                <h3 className="text-[10px] font-bold text-black uppercase tracking-widest mb-6">Global Message Hub</h3>
                <textarea 
                  placeholder="TYPE BROADCAST MESSAGE..."
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 p-6 rounded-3xl text-sm font-medium outline-none focus:border-[#0056b3] min-h-[150px] resize-none mb-6"
                />
                <div className="flex flex-wrap gap-4 mb-8">
                  {(['all', 'customers', 'partners'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setBroadcastTarget(t)}
                      className={`px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                        broadcastTarget === t 
                          ? 'bg-black text-white border-black' 
                          : 'bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black'
                      }`}
                    >
                      Target: {t}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Recipients: {broadcastTarget.toUpperCase()}</p>
                  <button 
                    onClick={handleBroadcast}
                    disabled={isBroadcasting}
                    className="bg-black text-white px-10 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-900 transition-all disabled:opacity-50"
                  >
                    {isBroadcasting ? 'Broadcasting...' : 'Send Global Broadcast'}
                  </button>
                </div>
              </div>

              <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm">
                <h3 className="text-[10px] font-bold text-black uppercase tracking-widest mb-6">System Configuration</h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Platform Fee (%)</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={platformFee}
                        onChange={(e) => setPlatformFee(Number(e.target.value))}
                        className="flex-1 bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl text-sm font-bold outline-none focus:border-[#0056b3]"
                      />
                      <button onClick={handleUpdateFee} disabled={isUpdatingFee} className="bg-[#0056b3] text-white px-6 py-3 rounded-2xl text-[8px] font-bold uppercase tracking-widest disabled:opacity-50">Apply</button>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mb-1">Last Broadcast</p>
                    <p className="text-[10px] font-bold text-black">{stats?.broadcasts?.[0]?.timestamp ? new Date(stats.broadcasts[0].timestamp).toLocaleString() : 'None'}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>

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
                  <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest mb-6">Shop Premises Verification ({selectedShopDocs.shopImages?.length || 0} Images)</p>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedShopDocs.shopImages?.length > 0 ? (
                      selectedShopDocs.shopImages.map((img: string, i: number) => (
                        <div key={i} className="aspect-square bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden shadow-sm group flex items-center justify-center p-2 text-center">
                          {img.startsWith('data:image') || img.startsWith('http') ? (
                            <img src={img} alt="Shop" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="flex flex-col items-center">
                              <svg className="w-6 h-6 text-gray-200 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                              <span className="text-[8px] font-bold text-bbBlue uppercase truncate w-full px-1">{img.split(': ')[1] || img}</span>
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
                  <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest mb-6">Worker Verification ({selectedShopDocs.workerImages?.length || 0} Staff)</p>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedShopDocs.workerImages?.length > 0 ? (
                      selectedShopDocs.workerImages.map((img: string, i: number) => (
                        <div key={i} className="aspect-square bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden shadow-sm group flex items-center justify-center p-2 text-center">
                          {img.startsWith('data:image') || img.startsWith('http') ? (
                            <img src={img} alt="Worker" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="flex flex-col items-center">
                              <svg className="w-6 h-6 text-gray-200 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                              <span className="text-[8px] font-bold text-bbBlue uppercase truncate w-full px-1">{img.split(': ')[1] || img}</span>
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
                    {selectedShopDocs.govId ? (
                      (selectedShopDocs.govId.startsWith('data:image') || selectedShopDocs.govId.startsWith('http')) ? (
                        <img src={selectedShopDocs.govId} alt="Govt ID" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                          <span className="text-[10px] font-bold text-bbBlue uppercase">{selectedShopDocs.govId.split(': ')[1] || selectedShopDocs.govId}</span>
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
                       <span className="text-[0.6875rem] font-bold text-black">{selectedShopDocs.workerQuantity} Personnel</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200/50 pb-2">
                       <span className="text-[0.625rem] font-bold text-gray-400 uppercase">Mobile</span>
                       <span className="text-[0.6875rem] font-bold text-black font-mono">{selectedShopDocs.mobile}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200/50 pb-2">
                       <span className="text-[0.625rem] font-bold text-gray-400 uppercase">Address</span>
                       <span className="text-[0.6875rem] font-bold text-black line-clamp-2 text-right max-w-[60%]">{selectedShopDocs.manualAddress || 'Lat/Lng Captured'}</span>
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
