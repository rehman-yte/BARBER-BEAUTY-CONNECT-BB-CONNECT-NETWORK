
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  getShopById, 
  updateShop 
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
  Lock
} from 'lucide-react';

const PartnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const [shopData, setShopData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'services' | 'bookings'>('services');

  // Service Manager State
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;
      try {
        const data = await getShopById(user.uid);
        if (data) setShopData(data);
      } catch (err) {
        console.error("Dashboard pull error:", err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.uid) fetchData();
  }, [user]);

  // ROLE LOCK: Partners only
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

  const handleAddService = async () => {
    if (!newServiceName || !newServicePrice) return;
    const updatedServices = [...(shopData.services || []), { 
      id: Date.now().toString(),
      name: newServiceName, 
      price: Number(newServicePrice) 
    }];
    try {
      await updateShop(user!.uid, { services: updatedServices });
      setShopData({ ...shopData, services: updatedServices });
      setNewServiceName('');
      setNewServicePrice('');
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebars aren't requested to change, but rebuild refers to Uber/Swiggy style */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col fixed h-full z-30 shadow-sm">
        <div className="p-8 border-b border-gray-50">
          <div className="flex flex-col">
            <span className="text-[1.125rem] font-serif font-black text-black tracking-tight uppercase leading-none">
              Business
            </span>
            <span className="text-[0.625rem] font-bold text-bbBlue uppercase tracking-[0.4em] mt-1">Terminal Hub</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 mt-4">
          <button 
            onClick={() => setActiveTab('services')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${activeTab === 'services' ? 'bg-bbBlue/5 text-bbBlue font-bold shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-charcoal'}`}
          >
            <Settings size={18} />
            <span className="text-[0.625rem] uppercase tracking-widest">Service Manager</span>
          </button>
          
          <button 
            onClick={() => !isPending && setActiveTab('bookings')}
            disabled={isPending}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${isPending ? 'opacity-30 cursor-not-allowed' : activeTab === 'bookings' ? 'bg-bbBlue/5 text-bbBlue font-bold' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <Clock size={18} />
            <span className="text-[0.625rem] uppercase tracking-widest">Booking Registry</span>
            {isPending && <Lock size={12} className="ml-auto" />}
          </button>
        </nav>

        <div className="p-6 border-t border-gray-50">
          <button 
            onClick={() => logout && logout().then(() => navigate('/'))}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-bold group"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[0.625rem] uppercase tracking-widest">Secure Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 ml-64 flex flex-col">
        {/* STATUS BANNER */}
        {isPending && (
          <div className="sticky top-[5rem] z-20 bg-yellow-400 text-black px-8 py-3 flex items-center justify-center gap-3 shadow-md">
            <AlertTriangle size={16} className="shrink-0" />
            <span className="text-[0.6875rem] font-bold uppercase tracking-widest">
              ACCOUNT UNDER REVIEW - Our team is verifying your details. Features will unlock upon approval.
            </span>
          </div>
        )}

        <main className="p-10">
          <div className="flex justify-between items-start mb-12">
            <div>
              <p className="text-[0.5625rem] font-bold text-bbBlue uppercase tracking-[0.6em] mb-1">Authenticated Partner</p>
              <h1 className="text-4xl font-serif font-black text-black uppercase tracking-tight leading-none truncate max-w-xl">
                {shopData?.brandName || 'Untitled Brand'}
              </h1>
            </div>

            <div className="flex items-center gap-4">
               {/* Shop Status: Hard Locked to Offline in pending */}
               <div className={`flex items-center gap-3 px-6 py-3 rounded-[2rem] border-2 transition-all ${isPending ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-green-50 border-green-100'}`}>
                 <div className={`w-2 h-2 rounded-full ${isPending ? 'bg-gray-400' : 'bg-green-500 animate-pulse'}`}></div>
                 <div className="flex flex-col">
                    <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Shop Status</span>
                    <span className={`text-[0.625rem] font-black uppercase tracking-widest ${isPending ? 'text-gray-500' : 'text-green-600'}`}>
                      {isPending ? 'OFFLINE (LOCKED)' : 'ONLINE'}
                    </span>
                 </div>
                 {isPending ? <Lock size={14} className="text-gray-300 ml-2" /> : <ShieldCheck size={18} className="text-green-600 ml-2" />}
               </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'services' ? (
              <motion.div 
                key="services"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-bbBlue/5 rounded-full -translate-y-8 translate-x-8"></div>
                    <h3 className="text-[0.625rem] font-black text-charcoal uppercase tracking-[0.3em] mb-8 border-b border-gray-50 pb-4">Register Asset</h3>
                    
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest ml-1">Service Alias</label>
                        <input 
                          value={newServiceName}
                          onChange={(e) => setNewServiceName(e.target.value)}
                          placeholder="EXECUTIVE CUT"
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-gray-50 focus:border-bbBlue outline-none text-xs font-bold uppercase transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest ml-1">Market Price (INR)</label>
                        <input 
                          type="number"
                          value={newServicePrice}
                          onChange={(e) => setNewServicePrice(e.target.value)}
                          placeholder="₹ 0.00"
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-gray-50 focus:border-bbBlue outline-none text-xs font-bold font-mono transition-all"
                        />
                      </div>
                      <button 
                        onClick={handleAddService}
                        className="w-full py-4 bg-black text-white rounded-2xl text-[0.625rem] font-bold uppercase tracking-[0.4em] shadow-xl shadow-black/10 hover:bg-bbBlue transition-all active:scale-95 flex items-center justify-center gap-3"
                      >
                        <Plus size={16} />
                        Sync Asset
                      </button>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                   <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm min-h-[400px]">
                      <div className="flex justify-between items-center mb-10 border-b border-gray-50 pb-4">
                        <h3 className="text-[0.625rem] font-black text-charcoal uppercase tracking-[0.3em]">Operational Distribution Portfolio</h3>
                        <span className="text-[0.5rem] font-bold text-bbBlue uppercase bg-bbBlue/5 px-3 py-1 rounded-full">
                          {shopData?.services?.length || 0} Assets
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {shopData?.services?.map((service: any) => (
                          <div key={service.id} className="flex justify-between items-center p-6 bg-gray-50/50 rounded-[2rem] border border-transparent hover:border-bbBlue/20 transition-all hover:bg-white hover:shadow-md group">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 leading-none">SKU: {service.id?.slice(-6)}</span>
                              <p className="text-[0.75rem] font-black text-charcoal uppercase tracking-tighter">{service.name}</p>
                              <p className="text-[0.875rem] font-mono font-bold text-bbBlue mt-1">₹{service.price}</p>
                            </div>
                            <button 
                              onClick={() => handleRemoveService(service.id)}
                              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-200 hover:bg-red-50 hover:text-red-500 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {(!shopData?.services || shopData.services.length === 0) && (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                             <Lock className="text-gray-200" size={24} />
                          </div>
                          <p className="text-[0.625rem] font-bold text-gray-300 uppercase tracking-[0.4em]">Registry Portfolio Empty</p>
                        </div>
                      )}
                   </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="bookings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[3rem] border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-center min-h-[500px]"
              >
                 <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mb-6 border border-yellow-100">
                   <Clock className="text-yellow-500" size={32} />
                 </div>
                 <h3 className="text-2xl font-serif font-black text-charcoal uppercase tracking-tight mb-4">Registry Locked</h3>
                 <p className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-[0.4em] max-w-sm leading-loose">
                   {isPending ? "Real-time bookings will appear here once approved by our network controllers." : "Your booking channel is currently waiting for initial synchronization."}
                 </p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default PartnerDashboard;
