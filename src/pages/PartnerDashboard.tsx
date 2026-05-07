import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  getShopById, 
  updateShop,
  getBookings 
} from '../services/logic_engine';
import { 
  LayoutDashboard,
  Settings, 
  PowerOff,
  Plus,
  Trash2,
  Clock,
  ShieldCheck,
  LogOut,
  AlertTriangle,
  Lock,
  BellRing,
  User,
  ShoppingBag,
  CreditCard
} from 'lucide-react';

const PartnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const [shopData, setShopData] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'bookings' | 'settings'>('overview');
  const [hasNewBooking, setHasNewBooking] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Service Manager State
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('30');

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.8;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;
      try {
        const [shop, registry] = await Promise.all([
          getShopById(user.uid),
          getBookings(user.uid)
        ]);
        
        if (shop) {
          setShopData(shop);
          setIsLive(shop.isLive || false);
        }
        
        if (registry.length > bookings.length && bookings.length > 0) {
          setHasNewBooking(true);
          audioRef.current?.play().catch(e => console.log('Audio blocked:', e));
          setTimeout(() => setHasNewBooking(false), 5000);
        }
        setBookings(registry);
      } catch (err) {
        console.error("Dashboard pull error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.uid) {
      fetchData();
      const interval = setInterval(fetchData, 8000); // Live Sync
      return () => clearInterval(interval);
    }
  }, [user, bookings.length]);

  if (!authLoading && (!user || user.role !== 'partner')) {
    return <Navigate to="/customer-dashboard" replace />;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isPending = shopData?.status === 'pending';
  
  // Stats Calculation
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date === today);
  const todayEarnings = todayBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
  const totalSlots = bookings.length;

  const handleToggleLive = async () => {
    if (isPending) return;
    const nextState = !isLive;
    try {
      await updateShop(user!.uid, { isLive: nextState });
      setIsLive(nextState);
    } catch (err) {
      console.error("Live toggle fail:", err);
    }
  };

  const handleAddService = async () => {
    if (!newServiceName || !newServicePrice) return;
    const updatedServices = [...(shopData.services || []), { 
      id: Date.now().toString(),
      name: newServiceName, 
      price: Number(newServicePrice),
      duration: Number(newServiceDuration)
    }];
    try {
      await updateShop(user!.uid, { services: updatedServices });
      setShopData({ ...shopData, services: updatedServices });
      setNewServiceName('');
      setNewServicePrice('');
      setIsAddingService(false);
    } catch (err) {
      console.error("Asset registration fail:", err);
    }
  };

  const handleRemoveService = async (serviceId: string) => {
    const updatedServices = shopData.services.filter((s: any) => s.id !== serviceId);
    try {
      await updateShop(user!.uid, { services: updatedServices });
      setShopData({ ...shopData, services: updatedServices });
    } catch (err) {
      console.error("Asset removal fail:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#111827]">
      {/* MOBILE HEADER (UBER STYLE) */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-serif font-black overflow-hidden border border-gray-100 uppercase">
             {shopData?.ownerPicture && shopData.ownerPicture !== 'pending_upload' ? <img src={shopData.ownerPicture} className="w-full h-full object-cover" /> : shopData?.brandName?.[0] || 'B'}
          </div>
          <div>
            <h1 className="text-[0.875rem] font-black uppercase tracking-tight truncate max-w-[150px]">
              {shopData?.brandName || 'Business Hub'}
            </h1>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest leading-none">
                {isLive ? 'Accepting Bookings' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`text-[0.5rem] font-black uppercase tracking-widest ${isLive ? 'text-green-600' : 'text-gray-400'}`}>
              {isLive ? 'GO OFFLINE' : 'GO LIVE'}
            </span>
            <button 
              onClick={handleToggleLive}
              disabled={isPending}
              className={`relative w-12 h-6 rounded-full p-1 transition-all duration-300 ${isPending ? 'bg-gray-100 cursor-not-allowed' : isLive ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <motion.div 
                animate={{ x: isLive ? 24 : 0 }}
                className="w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>
        </div>
      </header>

      {/* PENDING NOTIFICATION BANNER (UBER TYPE) */}
      {isPending && (
        <div className="bg-[#FFC000] px-6 py-3 flex items-center gap-3 relative overflow-hidden">
          <motion.div 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-white/10"
          />
          <AlertTriangle size={18} className="shrink-0 text-black" />
          <p className="text-[0.625rem] font-black uppercase tracking-wider text-black relative z-10 leading-tight">
            RESTRICTED ACCESS: ACCOUNT VERIFICATION PENDING BY ADMIN & ACCOUNTANT AI.
          </p>
        </div>
      )}

      {/* DASHBOARD CONTENT */}
      <main className="max-w-[1200px] mx-auto p-4 md:p-8 space-y-6">
        
        {/* STATS GRID (SWIGGY STYLE) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex flex-col justify-between group hover:shadow-md transition-all">
            <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Today's Earnings</span>
            <div className="flex items-end gap-1">
              <span className="text-[1.5rem] font-serif font-black leading-none tracking-tighter">₹{todayEarnings}</span>
              <span className="text-[0.5rem] text-green-500 font-bold mb-1">↑ 12%</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex flex-col justify-between group hover:shadow-md transition-all">
            <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Slots Today</span>
            <div className="flex items-end gap-1">
              <span className="text-[1.5rem] font-serif font-black leading-none tracking-tighter">{todayBookings.length}</span>
              <span className="text-[0.5rem] text-gray-300 font-bold mb-1 uppercase tracking-widest">Active</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex flex-col justify-between group hover:shadow-md transition-all">
            <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Total Bookings</span>
            <div className="flex items-end gap-1">
              <span className="text-[1.5rem] font-serif font-black leading-none tracking-tighter">{totalSlots}</span>
              <span className="text-[0.5rem] text-gray-300 font-bold mb-1 uppercase tracking-widest">Total</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex flex-col justify-between group hover:shadow-md transition-all">
            <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Customer Rating</span>
            <div className="flex items-center gap-1">
              <span className="text-[1.5rem] font-serif font-black leading-none tracking-tighter">4.9</span>
              <div className="flex gap-0.5 ml-1">
                {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-1 bg-bbBlue rounded-full"></div>)}
              </div>
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex gap-2 p-1 bg-white rounded-full border border-gray-100 shadow-sm w-fit">
          {[
            { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={14} /> },
            { id: 'services', label: 'Services', icon: <Plus size={14} /> },
            { id: 'bookings', label: 'Bookings', icon: <Clock size={14} /> },
            { id: 'settings', label: 'Settings', icon: <Settings size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[0.625rem] font-bold uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-charcoal'}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div className="min-h-[40rem]">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {/* RECENT BOOKINGS MINI LIST */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[0.625rem] font-black uppercase tracking-[0.2em]">Recent Activity</h3>
                    <button onClick={() => setActiveTab('bookings')} className="text-[0.5rem] text-bbBlue font-bold uppercase tracking-widest">View All</button>
                  </div>
                  <div className="space-y-3">
                    {bookings.length > 0 ? bookings.slice(0, 5).map(b => (
                      <div key={b.id} className="bg-white p-5 rounded-[1.5rem] flex items-center justify-between border border-gray-50 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center font-bold text-bbBlue border border-gray-100">
                             {b.clientName?.[0] || 'C'}
                          </div>
                          <div>
                            <p className="text-[0.75rem] font-black uppercase tracking-tight">{b.clientName}</p>
                            <p className="text-[0.5rem] text-gray-400 font-bold uppercase tracking-widest">{b.serviceName} • {b.time}</p>
                          </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[0.75rem] font-black font-mono">₹{b.price}</p>
                           <p className="text-[0.5rem] text-green-500 font-bold uppercase tracking-widest">{b.status}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="bg-white p-[5rem] rounded-[2rem] border border-dashed border-gray-200 flex flex-col items-center justify-center opacity-50 grayscale">
                         <Clock size={24} className="text-gray-300 mb-3" />
                         <p className="text-[0.625rem] font-bold uppercase tracking-widest">No Recent Activity</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ACCOUNT AI SNAPSHOT */}
                <div className="space-y-6">
                  <div className="bg-black p-8 rounded-[2.5rem] text-white space-y-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-bbBlue/20 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-8">
                        <div className="w-6 h-6 bg-bbBlue rounded-full flex items-center justify-center">
                          <ShieldCheck size={14} className="text-white" />
                        </div>
                        <span className="text-[0.5rem] font-bold uppercase tracking-[0.3em] text-bbBlue">Accountant AI Engine</span>
                      </div>
                      
                      <div className="space-y-1 mb-8">
                         <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Wallet Balance</span>
                         <h4 className="text-[2.5rem] font-serif font-black tracking-tighter leading-none">₹{(todayEarnings * 0.95).toFixed(2)}</h4>
                         <p className="text-[0.5rem] text-gray-500 font-bold uppercase tracking-widest mt-1">Net after 5% Platform Fuel</p>
                      </div>

                      <div className="pt-6 border-t border-white/10 space-y-4">
                        <div className="flex justify-between items-center">
                           <span className="text-[0.5rem] text-gray-400 font-bold uppercase tracking-widest">Next Settlement</span>
                           <span className="text-[0.625rem] font-bold uppercase tracking-widest">Tomorrow 10:00 AM</span>
                        </div>
                        <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[0.5rem] font-bold uppercase tracking-[0.4em] transition-all">
                          Request Instant Payout
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                    <h3 className="text-[0.625rem] font-black uppercase tracking-[0.2em] mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                       <button onClick={() => setActiveTab('services')} className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-[1.5rem] hover:bg-bbBlue/5 transition-all group">
                         <Plus size={18} className="text-gray-300 group-hover:text-bbBlue" />
                         <span className="text-[0.5rem] font-bold uppercase tracking-widest">Add Service</span>
                       </button>
                       <button onClick={() => logout && logout().then(() => navigate('/'))} className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-[1.5rem] hover:bg-red-50 transition-all group">
                         <LogOut size={18} className="text-gray-300 group-hover:text-red-500" />
                         <span className="text-[0.5rem] font-bold uppercase tracking-widest">Logout</span>
                       </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'services' && (
              <motion.div 
                key="services"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between px-2">
                   <div>
                     <h2 className="text-[1.125rem] font-serif font-black uppercase tracking-tight">Service Portfolio</h2>
                     <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Manage your offerings and pricing</p>
                   </div>
                   <button 
                    onClick={() => !isPending && setIsAddingService(true)} 
                    disabled={isPending}
                    className={`flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full text-[0.625rem] font-bold uppercase tracking-widest shadow-xl hover:bg-bbBlue transition-all ${isPending && 'opacity-30 grayscale cursor-not-allowed'}`}
                   >
                     <Plus size={16} />
                     Register Asset
                   </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {shopData?.services?.map((service: any) => (
                    <div key={service.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative group overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                          onClick={() => handleRemoveService(service.id)}
                          className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg"
                         >
                           <Trash2 size={16} />
                         </button>
                       </div>
                       
                       <div className="space-y-4">
                          <div className="w-12 h-12 bg-bbBlue/5 rounded-2xl flex items-center justify-center text-bbBlue font-serif font-black text-xl">
                            $
                          </div>
                          <div>
                            <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mb-1">SKU: {service.id?.slice(-8)}</p>
                            <h4 className="text-[1rem] font-black uppercase tracking-tight leading-tight">{service.name}</h4>
                          </div>
                          <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
                             <div className="flex flex-col">
                               <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Price</span>
                               <span className="text-[1rem] font-serif font-black tracking-tight">₹{service.price}</span>
                             </div>
                             <div className="flex flex-col border-l border-gray-100 pl-4">
                               <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">ETA</span>
                               <span className="text-[1rem] font-serif font-black tracking-tight">{service.duration || '30'}m</span>
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}

                  {(!shopData?.services || shopData.services.length === 0) && (
                    <div className="col-span-full py-[10rem] flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-gray-200">
                       <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                         <Lock size={24} className="text-gray-200" />
                       </div>
                       <p className="text-[0.625rem] font-bold text-gray-300 uppercase tracking-[0.5em] mb-2">Operational Assets Empty</p>
                       <p className="text-[0.5rem] font-bold text-gray-200 uppercase tracking-widest">Register services to start accepting bookings</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'bookings' && (
              <motion.div 
                key="bookings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="px-2">
                  <h2 className="text-[1.125rem] font-serif font-black uppercase tracking-tight">Master Booking Registry</h2>
                  <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Live queue and scheduling archive</p>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-8 py-5 text-[0.5rem] font-black uppercase tracking-[0.3em] text-gray-400">Client Info</th>
                          <th className="px-8 py-5 text-[0.5rem] font-black uppercase tracking-[0.3em] text-gray-400">Service Asset</th>
                          <th className="px-8 py-5 text-[0.5rem] font-black uppercase tracking-[0.3em] text-gray-400">Schedule</th>
                          <th className="px-8 py-5 text-[0.5rem] font-black uppercase tracking-[0.3em] text-gray-400 text-center">Status</th>
                          <th className="px-8 py-5 text-[0.5rem] font-black uppercase tracking-[0.3em] text-gray-400 text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {bookings.map((b: any) => (
                          <tr key={b.id} className="hover:bg-gray-50/50 transition-all group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-bbBlue/10 flex items-center justify-center font-bold text-bbBlue text-[0.625rem] border border-bbBlue/10">
                                   {b.clientName?.[0] || 'C'}
                                </div>
                                <span className="text-[0.75rem] font-black uppercase tracking-tight">{b.clientName}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className="text-[0.625rem] font-bold uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">{b.serviceName}</span>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex flex-col">
                                <span className="text-[0.625rem] font-black uppercase">{b.time}</span>
                                <span className="text-[0.5rem] text-gray-400 font-bold uppercase tracking-widest">{b.date}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <span className={`text-[0.5rem] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full ${
                                b.status === 'confirmed' ? 'bg-green-100 text-green-600' : 'bg-bbBlue/10 text-bbBlue'
                              }`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <span className="text-[0.75rem] font-serif font-black tracking-tight">₹{b.price}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {bookings.length === 0 && (
                    <div className="py-[10rem] flex flex-col items-center justify-center opacity-30 grayscale">
                       <Clock size={40} className="text-gray-200 mb-4" />
                       <p className="text-[0.625rem] font-bold uppercase tracking-[0.5em]">No Requests Found</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* SERVICE ADD MODAL */}
      <AnimatePresence>
        {isAddingService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingService(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-[35rem] bg-white rounded-[3rem] p-10 relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-bbBlue/5 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="relative z-10 space-y-8">
                <div className="border-l-4 border-bbBlue pl-6">
                   <h3 className="text-[1.5rem] font-serif font-black uppercase tracking-tight">Service Asset Registry</h3>
                   <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Protocol 09: System inventory capture</p>
                </div>

                <div className="space-y-5">
                   <div className="space-y-2">
                     <label className="text-[0.5625rem] font-black text-gray-400 uppercase tracking-[0.3em] ml-2">Service Identity</label>
                     <input 
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      placeholder="e.g. MASTER HAIR SCULPTING"
                      className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] focus:border-bbBlue outline-none text-xs font-bold uppercase tracking-tight transition-all"
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <label className="text-[0.5625rem] font-black text-gray-400 uppercase tracking-[0.3em] ml-2">Rate (₹)</label>
                       <input 
                        type="number"
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(e.target.value)}
                        placeholder="500"
                        className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] focus:border-bbBlue outline-none text-xs font-black font-mono transition-all"
                       />
                     </div>
                     <div className="space-y-2">
                       <label className="text-[0.5625rem] font-black text-gray-400 uppercase tracking-[0.3em] ml-2">Duration (Min)</label>
                       <select 
                        value={newServiceDuration}
                        onChange={(e) => setNewServiceDuration(e.target.value)}
                        className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] focus:border-bbBlue outline-none text-xs font-black appearance-none cursor-pointer"
                       >
                         {['15', '30', '45', '60', '90', '120'].map(m => <option key={m} value={m}>{m} MINUTES</option>)}
                       </select>
                     </div>
                   </div>
                </div>

                <div className="flex gap-4 pt-4">
                   <button onClick={() => setIsAddingService(false)} className="flex-1 py-5 border-2 border-gray-100 rounded-2xl text-[0.625rem] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all">Cancel</button>
                   <button onClick={handleAddService} className="flex-[2] py-5 bg-black text-white rounded-2xl text-[0.625rem] font-bold uppercase tracking-[0.4em] shadow-xl shadow-black/20 hover:bg-bbBlue transition-all">Sync Asset</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <audio ref={audioRef} />
    </div>
  );
};

export default PartnerDashboard;
