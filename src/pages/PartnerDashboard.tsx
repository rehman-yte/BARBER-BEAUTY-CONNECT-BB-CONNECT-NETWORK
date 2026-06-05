import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, onSnapshot, query, collection, where, orderBy, getDocs, updateDoc } from 'firebase/firestore';
import { 
  getShopById, 
  updateShop,
  getBookings,
  getRatings,
  addShopService,
  updateShopService,
  deleteShopService,
  updateBooking
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

/* UI_CLEANUP_FINAL - LOCKED - SUCCESS */

const PartnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout, updateUser } = useAuth();
  const [shopData, setShopData] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const tokenId = user?.uid ? `BB-${user.uid.slice(0, 4).toUpperCase()}` : 'BB-0000';

  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'bookings' | 'settings'>('overview');
  const [bookingView, setBookingView] = useState<'today' | 'upcoming'>('today');
  const [hasNewBooking, setHasNewBooking] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1-second interval ticker for live countdown rendering
  const [ticker, setTicker] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTicker(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate remaining time for a payment-held booking (5 minutes max check)
  const getHeldTimeLeft = (heldAtStr?: string) => {
    if (!heldAtStr) return 0;
    const heldTime = new Date(heldAtStr).getTime();
    const now = Date.now();
    const diffMs = now - heldTime;
    const remainingMs = (5 * 60 * 1000) - diffMs;
    return remainingMs > 0 ? remainingMs : 0;
  };

  // Trigger simulated Razorpay Auto-Refund and mark booking & order as failed/rejected
  const triggerAutoRefundAndReject = async (booking: any) => {
    console.log(`[RAZORPAY AUTO-REFUND] Initializing auto-refund for expired/rejected booking ${booking.id}. Order: ${booking.razorpayOrderId}`);
    try {
      // 1. Update Booking status to rejected
      await updateBooking(booking.id, {
        status: 'rejected',
        bookingStatus: 'refunded',
        paymentStatus: 'refunded',
        refundedAt: new Date().toISOString(),
        refundReference: 'REFUND_AUTO_' + Math.random().toString(36).substring(2, 10).toUpperCase()
      });

      // 2. Locate and update any matching Order status to rejected (simulated refund status)
      if (booking.razorpayOrderId) {
        try {
          const qOrder = query(collection(db, 'orders'), where('razorpayOrderId', '==', booking.razorpayOrderId));
          const orderSnap = await getDocs(qOrder);
          for (const docSnap of orderSnap.docs) {
            await updateDoc(doc(db, 'orders', docSnap.id), {
              status: 'rejected',
              paymentStatus: 'refunded',
              refundedAt: new Date().toISOString(),
              refundId: 'rfnd_' + Math.random().toString(36).substring(2, 10).toUpperCase()
            });
          }
        } catch (orderErr) {
          console.error("Failed to auto-update matching order status:", orderErr);
        }
      }
    } catch (err) {
      console.error("[RAZORPAY AUTO-REFUND] Error execution failed:", err);
    }
  };

  // Core acceptance flow
  const handleAcceptBooking = async (booking: any) => {
    try {
      await updateBooking(booking.id, {
        status: 'confirmed',
        bookingStatus: 'confirmed',
        confirmedAt: new Date().toISOString()
      });

      if (booking.razorpayOrderId) {
        try {
          const qOrder = query(collection(db, 'orders'), where('razorpayOrderId', '==', booking.razorpayOrderId));
          const orderSnap = await getDocs(qOrder);
          for (const docSnap of orderSnap.docs) {
            await updateDoc(doc(db, 'orders', docSnap.id), {
              status: 'confirmed',
              confirmedAt: new Date().toISOString()
            });
          }
        } catch (orderErr) {
          console.error("Failed to update matching order status on acceptance:", orderErr);
        }
      }
    } catch (err) {
      console.error("Failed to accept booking:", err);
    }
  };

  const handleRejectBooking = async (booking: any) => {
    await triggerAutoRefundAndReject(booking);
  };

  // Background countdown timer monitor
  useEffect(() => {
    const expiredBookings = bookings.filter(b => {
      if (b.status !== 'payment_held') return false;
      const heldTimeStr = b.heldAt || b.createdAt;
      if (!heldTimeStr) return false;
      const heldTime = new Date(heldTimeStr).getTime();
      const now = Date.now();
      return (now - heldTime) >= (5 * 60 * 1000); // 5 mins in ms
    });

    expiredBookings.forEach(b => {
      console.log(`[TIMEOUT MONITOR] Expiring payment hold for booking ${b.id}`);
      triggerAutoRefundAndReject(b);
    });
  }, [bookings, ticker]);

  // Marketplace check from URL - reactive to search changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'settings') {
      setActiveTab('settings');
    }
  }, [window.location.search]);

  useEffect(() => {
    // Header Minimalism: Inject CSS to hide unwanted links in the global Navbar for a focused Partner experience
    const styleId = 'partner-header-minimalism';
    let styleTag = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    
    styleTag.innerHTML = `
      nav a[href$='/explore'], 
      nav a[href$='/partner/dashboard'],
      nav a[href$='/partner-dashboard'] { 
        display: none !important; 
      }
    `;

    return () => {
      const tag = document.getElementById(styleId);
      if (tag) tag.remove();
    };
  }, []);

  // Sync Bridge: Fallback to localStorage for resilient state
  useEffect(() => {
    if (user?.uid) {
      const cached = localStorage.getItem(`partner_data_${user.uid}`);
      if (cached) setShopData(JSON.parse(cached));
    }
  }, [user?.uid]);

  // Service Manager State
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('30');

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.8;
  }, []);

  // UI REAL-TIME ENGINE: Snapshot Listeners for zero-latency updates
  useEffect(() => {
    if (!user?.uid) return;

    // 1. Shop Data Listener
    const shopRef = doc(db, 'partners', user.uid);
    const unsubscribeShop = onSnapshot(shopRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const shop: any = {
          id: docSnap.id,
          ...data,
          brandName: (data as any).brand_name || (data as any).brandName,
          ownerName: (data as any).owner_name || (data as any).ownerName,
          mobile: (data as any).mobile_number || (data as any).mobile,
          upiId: (data as any).upi_id || (data as any).upiId,
          status: (data as any).status || 'pending',
          adminApproved: (data as any).adminApproved || (data as any).status === 'approved'
        };
        setShopData(shop);
        setIsLive(shop.isLive || false);
        localStorage.setItem(`partner_data_${user.uid}`, JSON.stringify(shop));
      }
      setLoading(false);
    }, (err) => {
      console.error("Shop snapshot error:", err);
      setLoading(false);
    });

    // 2. Bookings Listener (Dual Path: Partner or Auditor)
    const qPartner = query(collection(db, 'bookings'), where('partnerId', '==', user.uid));
    const unsubscribeBookings = onSnapshot(qPartner, (snapshot) => {
      const registry = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (registry.length > bookings.length && bookings.length > 0) {
        setHasNewBooking(true);
        audioRef.current?.play().catch(e => console.log('Audio blocked:', e));
        setTimeout(() => setHasNewBooking(false), 5000);
      }
      setBookings(registry);
    }, (err) => {
      console.error("Bookings snapshot error:", err);
    });

    // 3. Ratings Listener
    const qRatings = query(collection(db, 'ratings'), where('partnerId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribeRatings = onSnapshot(qRatings, (snapshot) => {
      const partnerRatings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRatings(partnerRatings);
    }, (err) => {
      console.error("Ratings snapshot error:", err);
    });

    return () => {
      unsubscribeShop();
      unsubscribeBookings();
      unsubscribeRatings();
    };
  }, [user?.uid]);

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
  // We use current Date in both ISO and Locale formats to capture all potential booking styles
  const todayISO = new Date().toISOString().split('T')[0];
  const todayLocale = new Date().toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD
  
  const todayBookings = bookings.filter(b => {
    const bDate = b.date || b.appointmentDate?.split('T')[0];
    return bDate === todayISO || bDate === todayLocale;
  });

  const futureBookingsList = bookings.filter(b => {
    const bDate = b.date || b.appointmentDate?.split('T')[0];
    return bDate > todayISO;
  });

  const todayEarnings = todayBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
  const totalSlotsBooked = bookings.length;
  
  const avgRating = ratings.length > 0 
    ? (ratings.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / ratings.length).toFixed(1) 
    : "0.0";
  const starCount = Math.round(Number(avgRating));
  
  // Accountant AI Engine Logic: Use field from Firestore or calculate if missing
  const walletBalance = shopData?.partner_wallet !== undefined 
    ? shopData.partner_wallet 
    : (todayEarnings * 0.95);

  const handleToggleLive = async () => {
    const nextState = !isLive;
    try {
      await updateShop(user!.uid, { 
        isLive: nextState, 
        shopStatus: nextState ? 'open' : 'closed' 
      });
      setIsLive(nextState);
      // Optimistic update for local cache
      const updated = { ...shopData, isLive: nextState, shopStatus: nextState ? 'open' : 'closed' };
      setShopData(updated);
      localStorage.setItem(`partner_data_${user!.uid}`, JSON.stringify(updated));
    } catch (err) {
      console.error("Live toggle fail:", err);
    }
  };

  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await updateShop(user.uid, { ownerPicture: base64String });
        setShopData({ ...shopData, ownerPicture: base64String });
        if (updateUser) updateUser({ photoURL: base64String });
        localStorage.setItem(`partner_data_${user.uid}`, JSON.stringify({ ...shopData, ownerPicture: base64String }));
      } catch (err) {
        console.error("Profile sync fail:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateMasterData = async (field: string, value: any) => {
    try {
      await updateShop(user!.uid, { [field]: value });
      const updated = { ...shopData, [field]: value };
      setShopData(updated);
      localStorage.setItem(`partner_data_${user!.uid}`, JSON.stringify(updated));
    } catch (err) {
      console.error(`Master data update fail (${field}):`, err);
    }
  };

  const handleSaveService = async () => {
    if (!newServiceName || !newServicePrice) return;
    
    const servicePayload = {
      name: newServiceName,
      price: Number(newServicePrice),
      duration: Number(newServiceDuration)
    };

    try {
      if (editingServiceId) {
        await updateShopService(user!.uid, editingServiceId, servicePayload);
        const updatedServices = shopData.services.map((s: any) => 
          s.id === editingServiceId ? { ...s, ...servicePayload } : s
        );
        setShopData({ ...shopData, services: updatedServices });
      } else {
        const newService = await addShopService(user!.uid, servicePayload);
        setShopData({ 
          ...shopData, 
          services: [...(shopData.services || []), newService] 
        });
      }

      setNewServiceName('');
      setNewServicePrice('');
      setNewServiceDuration('30');
      setIsAddingService(false);
      setEditingServiceId(null);
    } catch (err) {
      console.error("Asset sync fail:", err);
    }
  };

  const handleEditService = (service: any) => {
    setEditingServiceId(service.id);
    setNewServiceName(service.name);
    setNewServicePrice(service.price.toString());
    setNewServiceDuration(service.duration?.toString() || '30');
    setIsAddingService(true);
  };

  const handleRemoveService = async (serviceId: string) => {
    try {
      await deleteShopService(user!.uid, serviceId);
      const updatedServices = shopData.services.filter((s: any) => s.id !== serviceId);
      setShopData({ ...shopData, services: updatedServices });
    } catch (err) {
      console.error("Asset removal fail:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#111827]">
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
            RESTRICTED ACCESS: ACCOUNT VERIFICATION PENDING BY BB NETWORK ADMIN.
          </p>
        </div>
      )}

      {/* DASHBOARD CONTENT */}
      <main className="max-w-[1200px] mx-auto p-4 md:p-8 space-y-6">
        
        {/* LIVE STATUS BAR (RELOCATED FROM HEADER) */}
        <div className="bg-white px-8 py-6 rounded-[2.5rem] shadow-sm border border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white font-serif font-black overflow-hidden border border-gray-100 uppercase relative group shrink-0"
            >
               {shopData?.ownerPicture && shopData.ownerPicture !== 'pending_upload' ? <img src={shopData.ownerPicture} className="w-full h-full object-cover" /> : shopData?.brandName?.[0] || 'B'}
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity font-sans">
                  <Plus size={16} />
               </div>
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleProfileUpload} />
            <div>
              <h2 className="text-[1rem] font-black uppercase tracking-tight">{shopData?.brandName || 'Partner Hub'}</h2>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                <span className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-[0.2em]">
                  {isLive ? 'Network Active' : 'Station Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right mr-4">
              <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Protocol Status</span>
              <span className={`text-[0.625rem] font-black uppercase tracking-widest ${isLive ? 'text-green-600' : 'text-gray-400'}`}>
                {isLive ? 'Ready for Bookings' : 'Suspended'}
              </span>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 px-6 py-3 rounded-full border border-gray-100">
              <span className={`text-[0.5rem] font-black uppercase tracking-[0.2em] ${isLive ? 'text-green-600' : 'text-gray-400'}`}>
                {isLive ? 'GO OFFLINE' : 'GO LIVE'}
              </span>
              <button 
                onClick={handleToggleLive}
                className={`relative w-12 h-6 rounded-full p-1 transition-all duration-300 ${isLive ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <motion.div 
                  animate={{ x: isLive ? 24 : 0 }}
                  className="w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>
          </div>
        </div>
        
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
              <span className="text-[1.5rem] font-serif font-black leading-none tracking-tighter">{totalSlotsBooked}</span>
              <span className="text-[0.5rem] text-gray-300 font-bold mb-1 uppercase tracking-widest">Total</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex flex-col justify-between group hover:shadow-md transition-all">
            <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Customer Rating</span>
            <div className="flex items-center gap-1">
              <span className="text-[1.5rem] font-serif font-black leading-none tracking-tighter">{avgRating}</span>
              <div className="flex gap-0.5 ml-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= starCount ? 'bg-bbBlue' : 'bg-gray-200'}`}></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex gap-2 p-1 bg-white rounded-full border border-gray-100 shadow-sm w-fit overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={14} /> },
            { id: 'services', label: 'Services', icon: <Plus size={14} /> },
            { id: 'bookings', label: 'Bookings', icon: <Clock size={14} /> },
            { id: 'settings', label: 'Settings', icon: <Settings size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[0.625rem] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-charcoal'}`}
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
                         <h4 className="text-[2.5rem] font-serif font-black tracking-tighter leading-none">₹{walletBalance.toFixed(2)}</h4>
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
                    <h3 className="text-[0.625rem] font-black uppercase tracking-[0.2em] mb-4">Identity Hub</h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-[1.5rem]">
                       <div className="flex flex-col">
                         <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Network Token ID</span>
                         <span className="text-[0.75rem] font-black font-mono">{tokenId}</span>
                       </div>
                       <ShieldCheck size={18} className="text-bbBlue" />
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
                    onClick={() => setIsAddingService(true)} 
                    className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full text-[0.625rem] font-bold uppercase tracking-widest shadow-xl hover:bg-bbBlue transition-all active:scale-95"
                   >
                     <Plus size={16} />
                     Add New Service
                   </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {shopData?.services?.map((service: any) => (
                    <div key={service.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative group overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                         <button 
                          onClick={() => handleEditService(service)}
                          className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-lg"
                         >
                           <Settings size={16} />
                         </button>
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

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10 max-w-[50rem] mx-auto pb-20"
              >
                <div className="px-2 flex justify-between items-end">
                  <div>
                    <h2 className="text-[1.125rem] font-serif font-black uppercase tracking-tight">Studio Configuration</h2>
                    <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Master data and core infrastructure settings</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest">Network Token ID</p>
                    <p className="text-[0.75rem] font-black font-mono text-bbBlue">{tokenId}</p>
                  </div>
                </div>

                {/* UPI MANAGEMENT */}
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                   <div className="flex items-center gap-4 border-l-4 border-bbBlue pl-6">
                      <CreditCard className="text-bbBlue" />
                      <div>
                        <h3 className="text-[0.875rem] font-black uppercase tracking-tight">Settlement Infrastructure</h3>
                        <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Wallet funds will be wired to this identity</p>
                      </div>
                   </div>

                   <div className="space-y-4">
                     <label className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest ml-4">Merchant VPA / UPI ID</label>
                     <div className="flex gap-4">
                        <input 
                          value={shopData?.upiId || ''}
                          onChange={(e) => setShopData({...shopData, upiId: e.target.value})}
                          placeholder="merchant@upi"
                          className="flex-1 px-8 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] focus:border-bbBlue outline-none text-sm font-mono font-bold uppercase tracking-tight transition-all"
                        />
                        <button 
                          onClick={() => handleUpdateMasterData('upiId', shopData.upiId)}
                          className="px-10 bg-black text-white rounded-[1.5rem] text-[0.625rem] font-bold uppercase tracking-widest shadow-xl shadow-black/20 hover:bg-bbBlue transition-all"
                        >
                          Sync
                        </button>
                     </div>
                   </div>
                </div>

                {/* MASTER DATA */}
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                   <div className="flex items-center gap-4 border-l-4 border-bbBlue pl-6">
                      <LayoutDashboard className="text-bbBlue" />
                      <div>
                        <h3 className="text-[0.875rem] font-black uppercase tracking-tight">Studio Metadata</h3>
                        <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Business profile as seen in the public registry</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {[
                        { label: 'Brand Name', key: 'brandName', type: 'text' },
                        { label: 'Owner Identity', key: 'ownerName', type: 'text' },
                        { label: 'Mobile Comms', key: 'mobileNumber', type: 'text' },
                        { label: 'Worker Quota', key: 'workerQuantity', type: 'number' },
                        { label: 'Address Registry', key: 'address', type: 'text' },
                        { label: 'Studio Category', key: 'category', type: 'text' }
                      ].map(field => (
                        <div key={field.key} className="space-y-2">
                           <label className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest ml-4">{field.label}</label>
                           <div className="flex gap-2">
                             <input 
                               type={field.type}
                               value={shopData?.[field.key] || ''}
                               onChange={(e) => setShopData({...shopData, [field.key]: e.target.value})}
                               className="flex-1 px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-bbBlue outline-none text-[0.75rem] font-bold uppercase tracking-tight transition-all"
                             />
                             <button 
                               onClick={() => handleUpdateMasterData(field.key, shopData[field.key])}
                               className="w-10 h-10 bg-gray-50 flex items-center justify-center rounded-2xl text-gray-400 hover:bg-black hover:text-white transition-all shadow-sm"
                             >
                                <Plus size={14} />
                             </button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="pt-10 flex flex-col items-center gap-4">
                   <button 
                    onClick={() => logout && logout().then(() => navigate('/'))}
                    className="flex items-center gap-3 px-10 py-5 bg-red-50 text-red-500 rounded-full text-[0.625rem] font-bold uppercase tracking-[0.4em] hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                   >
                     <LogOut size={16} />
                     Terminate Session
                   </button>
                   <p className="text-[0.5rem] text-gray-300 font-bold uppercase tracking-widest">Protocol BB-HUB-SET-001 • v2.0.5</p>
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
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
                  <div>
                    <h2 className="text-[1.125rem] font-serif font-black uppercase tracking-tight">Master Booking Registry</h2>
                    <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Live queue and scheduling archive</p>
                  </div>
                  
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
                    <button 
                      onClick={() => setBookingView('today')}
                      className={`px-4 py-2 rounded-xl text-[0.5rem] font-bold uppercase tracking-widest transition-all ${bookingView === 'today' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-black'}`}
                    >
                      Today's Queue
                    </button>
                    <button 
                      onClick={() => setBookingView('upcoming')}
                      className={`px-4 py-2 rounded-xl text-[0.5rem] font-bold uppercase tracking-widest transition-all ${bookingView === 'upcoming' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-black'}`}
                    >
                      Upcoming Slots
                    </button>
                  </div>
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
                          <th className="px-8 py-5 text-[0.5rem] font-black uppercase tracking-[0.3em] text-gray-400 text-center">Actions</th>
                          <th className="px-8 py-5 text-[0.5rem] font-black uppercase tracking-[0.3em] text-gray-400 text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(bookingView === 'today' ? todayBookings : futureBookingsList).map((b: any) => (
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
                                b.status === 'payment_held' ? 'bg-amber-100 text-amber-700 animate-pulse' : b.status === 'confirmed' ? 'bg-green-100 text-green-600' : 
                                b.status === 'completed' ? 'bg-gray-100 text-gray-400' :
                                'bg-bbBlue/10 text-bbBlue'
                              }`}>
                                {b.status === 'payment_held' ? <>HELD (ESCROW)<span className="block text-[0.45rem] font-mono text-red-500 font-bold mt-1">REFUND IN {(() => { const rem = getHeldTimeLeft(b.heldAt || b.createdAt); const m = Math.floor(rem / 60000); const s = Math.floor((rem % 60000) / 1000); return `${m}m ${s}s`; })()}</span></> : b.status}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-center">
                              {b.status === 'payment_held' ? (
                                <div className="flex gap-1.5 justify-center items-center">
                                  <button onClick={async (e) => { e.stopPropagation(); await handleAcceptBooking(b); }} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-[0.5rem] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm">Accept</button>
                                  <button onClick={async (e) => { e.stopPropagation(); if (window.confirm("Reject this booking and return escrow payment to customer?")) { await handleRejectBooking(b); } }} className="px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[0.5rem] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm">Reject</button>
                                </div>
                              ) : b.status !== 'completed' && (
                                <button 
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const confirm = window.confirm("Clear this service? This will request feedback from customer.");
                                    if(confirm) {
                                      await updateBooking(b.id, { status: 'completed', completedAt: new Date().toISOString() });
                                      // Force reload or state update logic is already in fetchData interval
                                    }
                                  }}
                                  className="px-4 py-2 bg-black text-white rounded-xl text-[0.5rem] font-bold uppercase tracking-widest hover:bg-bbBlue transition-all shadow-lg active:scale-95"
                                >
                                  Clear Call
                                </button>
                              )}
                            </td>
                            <td className="px-8 py-6 text-right">
                              <span className="text-[0.75rem] font-serif font-black tracking-tight">₹{b.price}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {(bookingView === 'today' ? todayBookings : futureBookingsList).length === 0 && (
                    <div className="py-[10rem] flex flex-col items-center justify-center opacity-30 grayscale">
                       <Clock size={40} className="text-gray-200 mb-4" />
                       <p className="text-[0.625rem] font-bold uppercase tracking-[0.5em]">
                         {bookingView === 'today' ? 'No Bookings for Today' : 'No Future Appointments'}
                       </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* SERVICE ADD/EDIT MODAL */}
      <AnimatePresence>
        {isAddingService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAddingService(false); setEditingServiceId(null); }}
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
                   <h3 className="text-[1.5rem] font-serif font-black uppercase tracking-tight">
                     {editingServiceId ? 'Edit Service Asset' : 'Service Asset Registry'}
                   </h3>
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
                   <button onClick={() => { setIsAddingService(false); setEditingServiceId(null); }} className="flex-1 py-5 border-2 border-gray-100 rounded-2xl text-[0.625rem] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all">Cancel</button>
                   <button onClick={handleSaveService} className="flex-[2] py-5 bg-black text-white rounded-2xl text-[0.625rem] font-bold uppercase tracking-[0.4em] shadow-xl shadow-black/20 hover:bg-bbBlue transition-all">
                      {editingServiceId ? 'Update Asset' : 'Sync Asset'}
                   </button>
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
