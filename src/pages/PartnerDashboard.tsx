import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  getBookings, 
  updateBookingStatus, 
  updateShop,
  getShopById
} from '../services/logic_engine';

interface Service {
  name: string;
  price: number;
}

const PartnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'Requests' | 'Portfolio' | 'Registry'>('Requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user && user.role !== 'partner') {
      navigate('/customer-dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const myShop = await getShopById(user.uid);
        if (myShop) {
          setProfileData(myShop);
          setServices(myShop.services || []);
          const allBookings = await getBookings(user.uid);
          setRequests(allBookings);
        } else {
          // If no partner doc, force onboarding
          navigate('/onboarding', { replace: true });
        }
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
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
      await updateShop(user.uid, { services });
      alert("Services Synced with Network.");
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAccept = async (id: string) => {
    await updateBookingStatus(id, 'Accepted');
    const allBookings = await getBookings(user?.uid || '');
    setRequests(allBookings);
  };

  const handleReject = async (id: string) => {
    await updateBookingStatus(id, 'Cancelled');
    const allBookings = await getBookings(user?.uid || '');
    setRequests(allBookings);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ROYAL FACE BRAND HEADER */}
      <div className="bg-charcoal pt-[8rem] pb-[4rem] px-[5%] text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gold via-transparent to-transparent"></div>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">
          <span className="text-gold text-[0.625rem] font-bold uppercase tracking-[0.6em] mb-4 block">Master Proprietor Portfolio</span>
          <h1 className="text-[2.5rem] md:text-[4.5rem] font-serif font-bold text-white mb-2 uppercase tracking-tighter leading-none">
            {profileData?.brandName || 'Royal Face Studio'}
          </h1>
          <div className="flex items-center justify-center gap-4 text-white/40 text-[0.625rem] font-bold uppercase tracking-widest mt-6">
            <span className="px-3 py-1 border border-white/10 rounded-full">{profileData?.category || 'Barber'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
            <span className="px-3 py-1 border border-white/10 rounded-full">{profileData?.id || 'BB-NETWORK-ID'}</span>
          </div>
        </motion.div>
      </div>

      <div className="flex-grow max-w-[1200px] w-full mx-auto px-[5%] py-[4rem]">
        {/* SIMPLE NAVIGATIONBAR */}
        <div className="flex items-center gap-[3rem] border-b border-gray-100 mb-[4rem]">
          {[
            { id: 'Requests', label: 'Booking Registry' },
            { id: 'Portfolio', label: 'Service & Pricing' },
            { id: 'Registry', label: 'Business Profile' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 text-[0.625rem] font-bold uppercase tracking-[0.3em] transition-all relative ${
                activeTab === tab.id ? 'text-bbBlue' : 'text-gray-300 hover:text-charcoal'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && <motion.div layoutId="tabUnderline" className="absolute bottom-0 left-0 right-0 h-1 bg-bbBlue" />}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'Requests' && (
            <motion.div key="req" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-charcoal/5 overflow-hidden">
                <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                   <h2 className="text-[1.25rem] font-serif font-bold text-charcoal uppercase">Active Bookings</h2>
                   <span className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-gray-100">Live Registry</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {requests.length > 0 ? requests.map(req => (
                    <div key={req.id} className="p-8 hover:bg-gray-50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-bold text-bbBlue text-sm">
                          {req.customerName?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <p className="text-[0.875rem] font-bold text-charcoal">{req.customerName}</p>
                          <p className="text-[0.625rem] font-bold text-bbBlue uppercase tracking-widest">{req.serviceName}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-12">
                        <div>
                          <p className="text-[0.875rem] font-bold text-charcoal">₹{req.price}</p>
                          <p className="text-[0.5625rem] font-bold text-gray-300 uppercase tracking-widest">{req.status}</p>
                        </div>
                        <div className="flex gap-2">
                           {req.status === 'Pending' && (
                             <>
                               <button onClick={() => handleAccept(req.id)} className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-[0.5rem] font-bold uppercase tracking-widest hover:bg-emerald-600">Accept</button>
                               <button onClick={() => handleReject(req.id)} className="bg-red-500 text-white px-4 py-2 rounded-lg text-[0.5rem] font-bold uppercase tracking-widest hover:bg-red-600">Reject</button>
                             </>
                           )}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-20 text-center">
                      <p className="text-[0.625rem] font-bold text-gray-300 uppercase tracking-[0.5em]">No booking requests found.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Portfolio' && (
            <motion.div key="port" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1 bg-white p-10 rounded-[3rem] border border-gray-100 h-fit">
                  <h3 className="text-[1.125rem] font-serif font-bold text-charcoal mb-8 uppercase tracking-tight underline">Add New Service</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Service Designation</label>
                      <input type="text" value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} placeholder="e.g. Master Fade" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-bbBlue" />
                    </div>
                    <div>
                      <label className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Pricing (INR)</label>
                      <input type="number" value={newServicePrice} onChange={(e) => setNewServicePrice(e.target.value)} placeholder="500" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-bbBlue" />
                    </div>
                    <button onClick={handleAddService} className="w-full py-5 bg-bbBlue text-white rounded-2xl font-bold uppercase text-[0.625rem] tracking-[0.3em] hover:bg-bbBlue-deep transition-all">Register Service</button>
                  </div>
                </div>
                
                <div className="lg:col-span-2 bg-white rounded-[3rem] border border-gray-100 overflow-hidden">
                   <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                      <h2 className="text-[1.25rem] font-serif font-bold text-charcoal uppercase">Service Portfolio</h2>
                      <button onClick={handleSaveServices} disabled={isSaving} className="text-[0.625rem] font-bold text-bbBlue uppercase tracking-widest hover:underline disabled:opacity-50">
                        {isSaving ? 'Syncing...' : 'Sync Master Portfolio'}
                      </button>
                   </div>
                   <div className="divide-y divide-gray-50">
                     {services.map((s, idx) => (
                       <div key={idx} className="p-8 flex items-center justify-between group">
                         <div>
                            <p className="text-[0.875rem] font-bold text-charcoal uppercase">{s.name}</p>
                            <p className="text-[0.75rem] font-bold text-bbBlue">₹{s.price}</p>
                         </div>
                         <button onClick={() => handleRemoveService(idx)} className="opacity-0 group-hover:opacity-100 text-red-500 text-[0.5625rem] font-bold uppercase tracking-widest transition-all">Remove</button>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Registry' && (
            <motion.div key="reg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="max-w-[700px] mx-auto bg-white p-16 rounded-[4rem] border border-gray-100 shadow-xl shadow-charcoal/5">
                 <h2 className="text-[1.5rem] font-serif font-bold text-charcoal mb-12 uppercase border-b border-gray-100 pb-6 tracking-tight">Business Integrity Profile</h2>
                 <div className="grid grid-cols-2 gap-12">
                   <div>
                      <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest mb-1">Brand Name</p>
                      <p className="text-[1.125rem] font-serif font-bold text-charcoal underline">{profileData?.brandName}</p>
                   </div>
                   <div>
                      <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest mb-1">Proprietor</p>
                      <p className="text-[1.125rem] font-serif font-bold text-charcoal">{profileData?.ownerName}</p>
                   </div>
                   <div>
                      <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest mb-1">Settlement ID</p>
                      <p className="text-[0.875rem] font-mono font-bold text-bbBlue">{profileData?.upiId || 'Not Set'}</p>
                   </div>
                   <div>
                      <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest mb-1">Network Member ID</p>
                      <p className="text-[0.75rem] font-mono text-gray-300 break-all">{user?.uid}</p>
                   </div>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PartnerDashboard;
