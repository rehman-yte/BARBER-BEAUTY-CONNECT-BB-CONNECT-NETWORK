import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  getShops, 
  getBookings, 
  updateShop 
} from '../services/logic_engine';
import { 
  Shield, 
  Search, 
  ArrowLeft, 
  Edit3, 
  Trash2, 
  Calendar, 
  Clock, 
  User, 
  X, 
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';

const ManageLiveShops: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [partners, setPartners] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Modal states
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [viewingSlotsPartner, setViewingSlotsPartner] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toDateString());
  
  // Form edit states
  const [editBrandName, setEditBrandName] = useState('');
  const [editCategory, setEditCategory] = useState('');

  useEffect(() => {
    // Admin Authority Check
    if (!user || user.role !== 'admin') {
      navigate('/404', { replace: true });
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const allShops = await getShops();
      const allBookings = await getBookings();
      
      // Filter partners where status is Approved/approved
      const approvedOnly = allShops.filter((p: any) => {
        const status = String(p.status || '').toLowerCase();
        return status === 'approved' || p.adminApproved === true;
      });

      setPartners(approvedOnly);
      setBookings(allBookings);
    } catch (err: any) {
      console.error('Error fetching admin live shop data:', err);
      setError('Failed to fetch partners or bookings database details.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (partnerId: string, currentActiveStatus: boolean) => {
    try {
      setError('');
      // Toggle active flag
      const nextStatus = !currentActiveStatus;
      await updateShop(partnerId, { isActive: nextStatus });
      
      // Update local state snappily
      setPartners(prev => prev.map(p => p.id === partnerId ? { ...p, isActive: nextStatus } : p));
      showToast(`Shop visibility set to ${nextStatus ? 'ONLINE' : 'OFFLINE'}.`);
    } catch (err: any) {
      setError('Failed to update shop active status.');
    }
  };

  const handleOpenEdit = (partner: any) => {
    setEditingPartner(partner);
    setEditBrandName(partner.brandName || partner.brand_name || '');
    setEditCategory(partner.category || '');
  };

  const handleUpdateShopDetails = async () => {
    if (!editingPartner) return;
    if (!editBrandName.trim()) {
      setError('Brand Name cannot be blank.');
      return;
    }

    try {
      setError('');
      await updateShop(editingPartner.id, {
        brandName: editBrandName,
        brand_name: editBrandName,
        category: editCategory
      });

      // Update local state
      setPartners(prev => prev.map(p => 
        p.id === editingPartner.id 
          ? { ...p, brandName: editBrandName, brand_name: editBrandName, category: editCategory } 
          : p
      ));

      setEditingPartner(null);
      showToast('Shop details manually modified successfully.');
    } catch (err: any) {
      setError('Failed to manually update shop details.');
    }
  };

  const handleSuspendShop = async (partnerId: string, brandName: string) => {
    const doubleConfirm = window.confirm(`CRITICAL SECURITY ACTION:\nAre you sure you want to permanently SUSPEND "${brandName}"?\nThis removes them from the approved network permanently.`);
    if (!doubleConfirm) return;

    try {
      setError('');
      // Suspend permanently
      await updateShop(partnerId, {
        status: 'suspended',
        adminApproved: false,
        isActive: false
      });

      // Remove from list
      setPartners(prev => prev.filter(p => p.id !== partnerId));
      showToast(`Partner "${brandName}" successfully suspended and banned.`);
    } catch (err: any) {
      setError('Suspension command rejected by database.');
    }
  };

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  // Dynamically generate the standard 30-min slot array
  const generateStandardSlots = () => {
    const slots = [];
    for (let h = 8; h <= 21; h++) {
      slots.push(`${h}:00`);
      slots.push(`${h}:30`);
    }
    slots.push(`22:00`);
    return slots;
  };

  const allSlots = generateStandardSlots();

  // Helper to generate next 7 days for the slot checker
  const getNext7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };
  const weekDays = getNext7Days();

  // Query filter
  const filteredLiveShops = partners.filter((p: any) => {
    const brand = String(p.brandName || p.brand_name || '').toLowerCase();
    const owner = String(p.ownerName || p.owner_name || '').toLowerCase();
    const queryMatch = brand.includes(searchQuery.toLowerCase()) || owner.includes(searchQuery.toLowerCase());
    
    if (selectedCategory === 'All') return queryMatch;
    return queryMatch && p.category === selectedCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans pb-16">
      {/* Toast Notification */}
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

      <main className="max-w-7xl mx-auto px-6 pt-12">
        {/* Back navigation & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <button 
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#0056b3] hover:text-[#004494] transition-all mb-4"
            >
              <ArrowLeft className="w-3 h-3" /> Back to command dashboard
            </button>
            <h1 className="text-4xl font-serif font-bold text-black tracking-tight uppercase flex items-center gap-3">
              <Shield className="w-8 h-8 text-[#0056b3]" /> Live Shop Control Hub
            </h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-2">
              System Administrator Real-time Node Control Portal (V1)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="SEARCH LIVE BRAND/OWNER..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border border-gray-200 pl-11 pr-6 py-3 rounded-full text-[10px] font-bold w-64 outline-none focus:border-[#0056b3] shadow-sm transition-all"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-gray-200 px-6 py-3 rounded-full text-[10px] font-black uppercase outline-none focus:border-[#0056b3] shadow-sm cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Barber">Barber</option>
              <option value="Beauty Parlour">Beauty Parlour</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <XCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Content Table Grid */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#0056b3] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Querying Active Shop Registries...</p>
          </div>
        ) : filteredLiveShops.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] font-sans border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-8 py-5 text-gray-400 font-bold uppercase tracking-widest text-[9px]">Platform Partner</th>
                    <th className="px-8 py-5 text-gray-400 font-bold uppercase tracking-widest text-[9px]">Contact No</th>
                    <th className="px-8 py-5 text-gray-400 font-bold uppercase tracking-widest text-[9px]">Category</th>
                    <th className="px-8 py-5 text-gray-400 font-bold uppercase tracking-widest text-[9px]">Live Status</th>
                    <th className="px-8 py-5 text-gray-400 font-bold uppercase tracking-widest text-[9px] text-right">System Override Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLiveShops.map((partner: any) => {
                    const isOnline = partner.isActive !== false;
                    return (
                      <tr key={partner.id} className="hover:bg-gray-50/50 transition-all">
                        {/* Partner brand & ID */}
                        <td className="px-8 py-6">
                          <div>
                            <p className="text-sm font-bold text-black font-serif leading-tight">
                              {partner.brandName || partner.brand_name || 'Unnamed Shop'}
                            </p>
                            <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">
                              Owner: {partner.ownerName || partner.owner_name || 'N/A'}
                            </p>
                            <p className="text-[8px] text-gray-300 font-mono mt-0.5">UID: {partner.id}</p>
                          </div>
                        </td>

                        {/* Contact No */}
                        <td className="px-8 py-6">
                          <p className="font-mono text-gray-600 font-medium">{partner.mobile || 'N/A'}</p>
                        </td>

                        {/* Category */}
                        <td className="px-8 py-6">
                          <span className="text-[9px] font-black uppercase text-[#0056b3] bg-[#0056b3]/10 px-3 py-1 rounded-full">
                            {partner.category || 'Barber'}
                          </span>
                        </td>

                        {/* Live Status indicator */}
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                              <span className={`font-black uppercase text-[10px] tracking-wide ${isOnline ? 'text-emerald-600' : 'text-red-500'}`}>
                                {isOnline ? 'Online (Explore Page)' : 'Offline (Hidden)'}
                              </span>
                            </div>
                            <span className="text-[8px] text-gray-400 uppercase tracking-widest font-bold">
                              {partner.status === 'approved' || partner.adminApproved ? 'VERIFIED PARTNER' : 'UNVERIFIED'}
                            </span>
                          </div>
                        </td>

                        {/* Actions buttons row */}
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {/* Toggle view slots */}
                            <button 
                              onClick={() => setViewingSlotsPartner(partner)}
                              className="px-3.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-1.5"
                            >
                              <Calendar className="w-3 h-3 text-[#0056b3]" /> Slots
                            </button>

                            {/* Toggle active status offline/online */}
                            <button 
                              onClick={() => handleToggleActive(partner.id, isOnline)}
                              className={`px-3.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 ${
                                isOnline 
                                  ? 'border-orange-100 text-orange-600 bg-orange-50/50 hover:bg-orange-50' 
                                  : 'border-emerald-100 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50'
                              }`}
                            >
                              <Activity className="w-3 h-3" />
                              {isOnline ? 'Set Offline' : 'Set Online'}
                            </button>

                            {/* Edit brand details */}
                            <button 
                              onClick={() => handleOpenEdit(partner)}
                              className="px-3.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-100 text-[#0056b3] bg-blue-50/30 hover:bg-blue-50 transition-all flex items-center gap-1.5"
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>

                            {/* Suspend brand detail */}
                            <button 
                              onClick={() => handleSuspendShop(partner.id, partner.brandName || partner.brand_name)}
                              className="px-3.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-100 text-red-600 bg-red-50/30 hover:bg-red-50 transition-all flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3 h-3" /> Suspend
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-24 border border-dashed border-gray-200 rounded-[2.5rem] bg-white">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em]">No Verified Active Partners Found</p>
          </div>
        )}
      </main>

      {/* Edit Dialog Modal */}
      {editingPartner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2200] flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-white w-full max-w-md p-10 rounded-[3rem] relative shadow-2xl border border-gray-100"
          >
            <button 
              onClick={() => setEditingPartner(null)} 
              className="absolute top-8 right-8 text-gray-400 hover:text-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-8">
              <h3 className="text-2xl font-serif font-bold text-black uppercase">Edit Shop Info</h3>
              <p className="text-[9px] text-[#0056b3] font-black uppercase tracking-widest mt-1">Manual Platform Bypass override</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Brand / Shop Name</label>
                <input 
                  type="text" 
                  value={editBrandName}
                  onChange={(e) => setEditBrandName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 px-5 py-4 rounded-2xl font-bold text-xs outline-none focus:border-[#0056b3] transition-all"
                />
              </div>

              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Shop Category</label>
                <select 
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 px-5 py-4 rounded-2xl font-bold text-xs outline-none focus:border-[#0056b3] transition-all"
                >
                  <option value="Barber">Barber</option>
                  <option value="Beauty Parlour">Beauty Parlour</option>
                </select>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleUpdateShopDetails}
                  className="w-full bg-black text-white hover:bg-[#0056b3] py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-lg active:scale-95"
                >
                  Save Override Settings
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Slots Viewer Modal */}
      {viewingSlotsPartner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2200] flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-white w-full max-w-4xl p-10 rounded-[3rem] relative shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <button 
              onClick={() => setViewingSlotsPartner(null)} 
              className="absolute top-8 right-8 text-gray-400 hover:text-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-8">
              <h3 className="text-2xl font-serif font-bold text-black uppercase">
                {viewingSlotsPartner.brandName || viewingSlotsPartner.brand_name}
              </h3>
              <p className="text-[9px] text-[#0056b3] font-black uppercase tracking-widest mt-1">
                Admin-Level Slots & Bookings Inspect Pane
              </p>
            </div>

            {/* Date Selection tabs */}
            <div className="mb-8">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-3">Choose Inspect Date (Next 7 Days)</p>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {weekDays.map((dateObj) => {
                  const dateString = dateObj.toDateString();
                  const isSelected = selectedDate === dateString;
                  return (
                    <button
                      key={dateString}
                      onClick={() => setSelectedDate(dateString)}
                      className={`px-4 py-2.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                        isSelected 
                          ? 'bg-black text-white border-black shadow-md' 
                          : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slots Status Grid */}
            <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-4">Inspection Grid for {selectedDate}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {allSlots.map((slot) => {
                  // Find booking matching this slot time and date for this partner
                  const matchedBooking = bookings.find((b: any) => {
                    const idMatch = b.shopId === viewingSlotsPartner.id || b.partnerId === viewingSlotsPartner.id;
                    const dateMatch = b.date === selectedDate;
                    const timeMatch = b.time === slot;
                    return idMatch && dateMatch && timeMatch && b.status !== 'Cancelled';
                  });

                  return (
                    <div 
                      key={slot}
                      className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all ${
                        matchedBooking 
                          ? 'bg-red-50/40 border-red-100' 
                          : 'bg-emerald-50/30 border-emerald-100'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono font-bold text-black flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" /> {slot}
                        </span>
                        
                        <span className={`text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          matchedBooking 
                            ? 'bg-red-200 text-red-700' 
                            : 'bg-emerald-200 text-emerald-700'
                        }`}>
                          {matchedBooking ? 'Booked' : 'Available'}
                        </span>
                      </div>

                      {matchedBooking ? (
                        <div className="mt-2">
                          <p className="text-[10px] font-bold text-black truncate flex items-center gap-1">
                            <User className="w-2.5 h-2.5 text-red-400" /> {matchedBooking.customerName || matchedBooking.clientName || 'Client'}
                          </p>
                          <p className="text-[8px] font-black text-[#0056b3] uppercase tracking-widest truncate mt-0.5">
                            {matchedBooking.serviceName || 'Grooming service'}
                          </p>
                          <p className="text-[8px] text-gray-400 font-semibold font-mono mt-0.5">
                            ₹{matchedBooking.price || 0} ({matchedBooking.status})
                          </p>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Ready for Booking</p>
                          <p className="text-[8px] text-gray-300">Open Node</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setViewingSlotsPartner(null)}
                className="px-8 py-3 bg-black text-white hover:bg-gray-800 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-md"
              >
                Close Inspect
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ManageLiveShops;
