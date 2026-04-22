
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  getShopById, 
  getBookings, 
  updateBookingStatus, 
  updateShop 
} from '../services/logic_engine';
import { 
  LayoutDashboard, 
  ClipboardList, 
  UserCircle, 
  Settings, 
  Power, 
  PowerOff,
  Plus,
  Trash2,
  Clock,
  IndianRupee,
  ChevronRight,
  Bell
} from 'lucide-react';

interface Service {
  name: string;
  price: number;
}

const PartnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'services'>('overview');
  const [shopData, setShopData] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // Service Manager State
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'partner')) {
      navigate('/partner-auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;
      try {
        const data = await getShopById(user.uid);
        if (data) {
          setShopData(data);
        }
        
        const allBookings = await getBookings();
        const myBookings = allBookings.filter((b: any) => b.shopId === user.uid);
        setBookings(myBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.uid) fetchData();
  }, [user]);

  const toggleStatus = async () => {
    if (!shopData || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    const newStatus = shopData.shopStatus === 'open' ? 'closed' : 'open';
    try {
      await updateShop(user!.uid, { shopStatus: newStatus });
      setShopData({ ...shopData, shopStatus: newStatus });
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddService = async () => {
    if (!newServiceName || !newServicePrice || !shopData) return;
    const updatedServices = [...(shopData.services || []), { name: newServiceName, price: Number(newServicePrice) }];
    try {
      await updateShop(user!.uid, { services: updatedServices });
      setShopData({ ...shopData, services: updatedServices });
      setNewServiceName('');
      setNewServicePrice('');
    } catch (err) {
      console.error("Add service error:", err);
    }
  };

  const handleRemoveService = async (index: number) => {
    const updatedServices = shopData.services.filter((_: any, i: number) => i !== index);
    try {
      await updateShop(user!.uid, { services: updatedServices });
      setShopData({ ...shopData, services: updatedServices });
    } catch (err) {
      console.error("Remove service error:", err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Sidebar */}
      <aside className="w-72 bg-charcoal text-white flex flex-col fixed h-full z-20">
        <div className="p-8 border-b border-white/5">
          <h1 className="text-xl font-serif font-bold tracking-tight uppercase">
            Partner <span className="text-bbBlue">Ops</span>
          </h1>
        </div>
        
        <nav className="flex-1 p-6 space-y-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'overview' ? 'bg-bbBlue text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <LayoutDashboard size={18} />
            <span className="text-xs font-bold uppercase tracking-widest text-[0.625rem]">Intelligence</span>
          </button>
          <button 
            onClick={() => setActiveTab('bookings')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'bookings' ? 'bg-bbBlue text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <ClipboardList size={18} />
            <span className="text-xs font-bold uppercase tracking-widest text-[0.625rem]">Booking Registry</span>
          </button>
          <button 
            onClick={() => setActiveTab('services')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === 'services' ? 'bg-bbBlue text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Settings size={18} />
            <span className="text-xs font-bold uppercase tracking-widest text-[0.625rem]">Service Hub</span>
          </button>
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl">
            <div className="w-8 h-8 rounded-full bg-bbBlue flex items-center justify-center text-[0.625rem] font-bold">
              {user?.name?.[0] || 'P'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[0.625rem] font-bold truncate">{user?.name}</p>
              <p className="text-[0.5rem] text-gray-500 uppercase tracking-widest truncate">{shopData?.category}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 p-10">
        {/* Top Navbar */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-2xl font-serif font-bold text-charcoal tracking-tight uppercase">
              {shopData?.brandName || 'Business Dashboard'}
            </h2>
            <p className="text-[0.625rem] text-gray-400 font-bold uppercase tracking-[0.4em] mt-1">Live Global Registry Hub</p>
          </div>

          <div className="flex items-center gap-6">
            {/* Status Toggle */}
            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${shopData?.shopStatus === 'open' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <div className={`w-2 h-2 rounded-full ${shopData?.shopStatus === 'open' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`text-[0.625rem] font-bold uppercase tracking-widest ${shopData?.shopStatus === 'open' ? 'text-green-600' : 'text-red-600'}`}>
                Business {shopData?.shopStatus === 'open' ? 'Online' : 'Offline'}
              </span>
              <button 
                onClick={toggleStatus}
                disabled={isUpdatingStatus}
                className="ml-2 focus:outline-none disabled:opacity-50"
              >
                {shopData?.shopStatus === 'open' ? <Power size={16} className="text-green-600" /> : <PowerOff size={16} className="text-red-600" />}
              </button>
            </div>

            <button className="relative p-2 text-gray-400 hover:text-charcoal transition-all">
              <Bell size={20} />
              {bookings.length > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-[#F8F9FA]"></span>
              )}
            </button>
          </div>
        </header>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {/* Analytics Cards */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm col-span-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Revenue Intelligence</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-2xl">
                    <IndianRupee className="text-bbBlue mb-4" size={24} />
                    <p className="text-[1.5rem] font-serif font-bold text-charcoal tracking-tight">₹{bookings.reduce((acc, curr) => acc + (curr.price || 0), 0)}</p>
                    <p className="text-[0.5625rem] text-gray-400 font-bold uppercase tracking-widest mt-1">Gross Settlements</p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-2xl">
                    <Clock className="text-emerald-500 mb-4" size={24} />
                    <p className="text-[1.5rem] font-serif font-bold text-charcoal tracking-tight">{bookings.length}</p>
                    <p className="text-[0.5625rem] text-gray-400 font-bold uppercase tracking-widest mt-1">Total Requests</p>
                  </div>
                </div>
              </div>

              <div className="bg-charcoal text-white p-8 rounded-[2.5rem] shadow-xl">
                 <h3 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest mb-6">System Status</h3>
                 <div className="space-y-6">
                   <div className="flex justify-between items-center">
                     <span className="text-[0.625rem] font-bold text-gray-400 uppercase">Verification</span>
                     <span className="text-[0.5rem] font-bold text-emerald-400 uppercase bg-emerald-400/10 px-2 py-1 rounded">Approved</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-[0.625rem] font-bold text-gray-400 uppercase">Gateway</span>
                     <span className="text-[0.5rem] font-bold text-bbBlue uppercase bg-bbBlue/10 px-2 py-1 rounded">Active</span>
                   </div>
                   <div className="pt-6 border-t border-white/5">
                     <p className="text-[0.5625rem] text-gray-500 font-bold uppercase tracking-tight leading-relaxed">
                       Your business is currently visible to millions of users in the network explore registry.
                     </p>
                   </div>
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'bookings' && (
            <motion.div 
              key="bookings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Customer Entry Registry</h3>
                <span className="text-[0.5rem] font-bold text-bbBlue uppercase tracking-[0.2em]">Monitoring Live Queue</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-8 py-4 text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">Client</th>
                      <th className="px-8 py-4 text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">Designation</th>
                      <th className="px-8 py-4 text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">Timeline</th>
                      <th className="px-8 py-4 text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">Payment</th>
                      <th className="px-8 py-4 text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest">Governance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.length > 0 ? (
                      bookings.map((booking) => (
                        <tr key={booking.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all group">
                          <td className="px-8 py-6">
                            <p className="text-[0.875rem] font-bold text-charcoal">{booking.customerName}</p>
                            <p className="text-[0.625rem] font-mono text-gray-400 mt-0.5">{booking.customerMobile}</p>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-[0.6875rem] font-bold text-bbBlue uppercase tracking-tight">{booking.serviceName}</span>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-[0.6875rem] font-bold text-charcoal uppercase">{new Date(booking.createdAt).toLocaleDateString()}</p>
                            <p className="text-[0.5625rem] text-gray-400 mt-0.5 uppercase tracking-widest">{new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </td>
                          <td className="px-8 py-6 text-[0.875rem] font-serif font-bold text-charcoal">
                            ₹{booking.price}
                          </td>
                          <td className="px-8 py-6">
                            <span className={`text-[0.5625rem] font-bold px-3 py-1 rounded-full uppercase ${
                              booking.status === 'Accepted' || booking.status === 'payment_held' 
                              ? 'bg-blue-100 text-bbBlue' : 'bg-gray-100 text-gray-400'
                            }`}>
                              {booking.status === 'payment_held' ? 'Awaiting Service' : booking.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-gray-300 font-bold uppercase text-[0.625rem] tracking-[0.3em]">
                          No active bookings detected in the registry
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'services' && (
            <motion.div 
              key="services"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-10"
            >
              {/* Add Service */}
              <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm h-fit">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8 border-b border-gray-50 pb-4">Define New Asset</h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-[0.5rem] font-bold text-gray-400 uppercase mb-2 block tracking-widest">Service Alias</label>
                    <input 
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      placeholder="e.g. Executive Grooming"
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-bbBlue outline-none text-xs font-bold uppercase transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[0.5rem] font-bold text-gray-400 uppercase mb-2 block tracking-widest">Price Point (INR)</label>
                    <input 
                      type="number"
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(e.target.value)}
                      placeholder="e.g. 1500"
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-bbBlue outline-none text-xs font-bold transition-all font-mono"
                    />
                  </div>
                  <button 
                    onClick={handleAddService}
                    className="w-full py-4 bg-bbBlue text-white rounded-2xl text-[0.625rem] font-bold uppercase tracking-[0.4em] shadow-lg shadow-bbBlue/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Register Asset
                  </button>
                </div>
              </div>

              {/* Service List */}
              <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm h-fit">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8 border-b border-gray-50 pb-4">Active Distribution Portfolio</h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {shopData?.services?.map((service: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border border-transparent hover:border-bbBlue/10 transition-all group">
                      <div>
                        <p className="text-[0.75rem] font-bold text-charcoal uppercase tracking-tighter">{service.name}</p>
                        <p className="text-[0.6875rem] font-mono font-bold text-bbBlue mt-1">₹{service.price}</p>
                      </div>
                      <button 
                        onClick={() => handleRemoveService(idx)}
                        className="p-2 text-gray-200 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!shopData?.services || shopData.services.length === 0) && (
                    <p className="text-center py-20 text-gray-300 font-bold uppercase text-[0.625rem] tracking-[0.3em]">Registry Portfolio Empty</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default PartnerDashboard;
