/* UNIFIED NAVIGATION SYSTEM v4.0 */
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { getBookings, updateShop, subscribeToNotifications } from '../services/logic_engine';
import { ShoppingBag } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const { totalItems } = useCart();
  const isLoggedIn = !!user;
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [broadcastNotifs, setBroadcastNotifs] = useState<any[]>([]);
  const [bookingNotifs, setBookingNotifs] = useState<any[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [lastViewed, setLastViewed] = useState<number>(() => {
    const saved = localStorage.getItem('bb_last_viewed_notifs');
    return saved ? parseInt(saved) : Date.now();
  });
  const [activeToast, setActiveToast] = useState<any>(null);
  const [clearedIds, setClearedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('bb_cleared_notifs');
    return saved ? JSON.parse(saved) : [];
  });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevBroadcastId = useRef<number | null>(null);

  const displayName = user?.name || 'Network Member';
  const photoURL = user?.photoURL;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        if (user.role === 'customer') {
          updateUser({ photoURL: base64String });
        } else if (user.role === 'partner') {
          const success = await updateShop(user.uid, { image: base64String, isVerified: false });
          if (success) updateUser({ photoURL: base64String });
        }
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload photo:', error);
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const target = user.role === 'customer' ? 'customers' : (user.role === 'partner' ? 'partners' : 'all');
    const unsubscribe = subscribeToNotifications(target, user.uid, (newNotifs) => {
      setBroadcastNotifs(newNotifs);
      if (newNotifs.length > 0) {
        const latest = newNotifs[0];
        const latestTime = new Date(latest.timestamp).getTime();
        if (latestTime > prevBroadcastId.current && latest.type === 'GLOBAL BROADCAST') {
          setActiveToast(latest);
          new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
          setTimeout(() => setActiveToast(null), 8000);
        }
        prevBroadcastId.current = latestTime;
        if (latestTime > lastViewed) setHasUnread(true);
      }
    });

    const interval = setInterval(async () => {
      const userBookings = await getBookings(user.uid);
      setBookingNotifs(userBookings.map((data: any) => ({
        id: data.id,
        type: 'STATUS UPDATE',
        title: data.status === 'payment_held' ? 'Booking Pending' : 'Booking ' + data.status,
        message: `Your booking at ${data.shopName} is now ${data.status}.`,
        timestamp: new Date(data.createdAt).getTime(),
        isStatus: true
      })));
    }, 10000);

    return () => { unsubscribe(); clearInterval(interval); };
  }, [user, lastViewed]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowDropdown(false);
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
    setShowDropdown(false);
  };

  const notifications = [...broadcastNotifs, ...bookingNotifs]
    .filter(n => !clearedIds.includes(n.id))
    .sort((a, b) => (typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp) - (typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp));

  if (location.pathname === '/onboarding') {
    return (
      <nav className="fixed top-0 left-0 right-0 z-[1000] bg-charcoal border-b border-white/5 h-[5rem] flex items-center px-[5%] justify-between shadow-2xl">
        <div className="flex flex-col"><span className="text-[1rem] font-serif font-black text-white tracking-widest uppercase">Network <span className="text-bbBlue">Admission</span></span></div>
        <div className="flex items-center gap-4"><span className="text-[0.625rem] font-bold text-white/30 uppercase tracking-widest">Protocol Active</span><div className="w-2 h-2 rounded-full bg-bbBlue animate-pulse"></div></div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] bg-white/90 backdrop-blur-md border-b border-gray-100 h-[5rem] shadow-sm">
      <div className="w-full max-w-[1440px] mx-auto px-[5%] h-full flex justify-between items-center">
        <Link to="/" className="flex flex-col items-start leading-none group truncate">
          <span className="text-[0.875rem] sm:text-[1rem] font-serif font-bold text-black tracking-tight truncate">BARBER & BEAUTY CONNECT</span>
          <span className="text-[0.45rem] sm:text-[0.5rem] font-bold text-bbBlue uppercase tracking-[0.3em] mt-1">BB CONNECT NETWORK</span>
        </Link>

        <div className="flex items-center gap-[1rem] sm:gap-[2rem]">
          {(!isLoggedIn || user.role === 'customer') && (
            <Link to="/customer/explore" className={`text-[0.625rem] font-bold uppercase tracking-[0.2em] ${location.pathname === '/customer/explore' ? 'text-bbBlue' : 'text-black hover:text-bbBlue'}`}>Explore</Link>
          )}
          {isLoggedIn && user.role === 'customer' && <Link to="/customer-dashboard" className={`text-[0.625rem] font-bold uppercase tracking-[0.2em] ${location.pathname === '/customer-dashboard' ? 'text-bbBlue' : 'text-black hover:text-bbBlue'}`}>Dashboard</Link>}
          {isLoggedIn && user.role === 'partner' && <Link to="/partner/dashboard" className={`text-[0.625rem] font-bold uppercase tracking-[0.2em] ${location.pathname === '/partner/dashboard' ? 'text-bbBlue' : 'text-black hover:text-bbBlue'}`}>Terminal</Link>}
          {isLoggedIn && user.role === 'admin' && <Link to="/admin/dashboard" className={`text-[0.625rem] font-bold uppercase tracking-[0.2em] ${location.pathname === '/admin/dashboard' ? 'text-bbBlue' : 'text-black hover:text-bbBlue'}`}>Admin</Link>}
          
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <Link to="/checkout" className="relative p-2 text-gray-400 hover:text-bbBlue"><ShoppingBag size={20} />{totalItems > 0 && <span className="absolute top-1 right-1 min-w-[1rem] h-4 bg-bbBlue text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white px-1">{totalItems}</span>}</Link>
              
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setHasUnread(false);
                    localStorage.setItem('bb_last_viewed_notifs', Date.now().toString());
                    setLastViewed(Date.now());
                  }} 
                  className="relative p-2 text-gray-400 hover:text-bbBlue transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {hasUnread && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.95 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, y: 15, scale: 0.95 }} 
                      className="absolute right-0 mt-3 w-80 bg-white border border-gray-100 shadow-2xl rounded-3xl py-6 z-[1100] max-h-[28rem] overflow-hidden flex flex-col"
                    >
                      <div className="px-6 mb-4 flex justify-between items-center">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Network Alerts</h3>
                        {notifications.length > 0 && <button onClick={() => setClearedIds(notifications.map(n => n.id))} className="text-[8px] font-bold text-gray-300 hover:text-red-500 uppercase">Clear All</button>}
                      </div>
                      <div className="overflow-y-auto px-4 space-y-3 custom-scrollbar px-6">
                        {notifications.length > 0 ? (
                          notifications.map(n => (
                            <div key={n.id} className="p-4 bg-gray-50 rounded-[1.5rem] border border-transparent hover:border-gray-100 transition-all group">
                              <div className="flex justify-between items-start mb-1">
                                <p className={`text-[7px] font-black uppercase tracking-widest ${n.type === 'GLOBAL BROADCAST' ? 'text-red-500' : 'text-bbBlue'}`}>
                                  {n.type}
                                </p>
                                <span className="text-[7px] text-gray-300 font-bold uppercase">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-[10px] font-bold text-black mb-0.5">{n.title || (n.type === 'GLOBAL BROADCAST' ? 'Admin Message' : 'Booking Alert')}</p>
                              <p className="text-[10px] text-charcoal/70 leading-relaxed font-medium">{n.message}</p>
                            </div>
                          ))
                        ) : (
                          <div className="py-12 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-200">
                               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                            </div>
                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Inbox Zero</p>
                            <p className="text-[8px] text-gray-200 uppercase mt-1">No pending network updates</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 group"><div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">{photoURL ? <img src={photoURL} className="w-full h-full object-cover" /> : <span className="text-gray-300">👤</span>}</div></button>
                <AnimatePresence>{showDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: 15 }} 
                    className="absolute right-0 mt-3 w-64 bg-white border border-gray-100 shadow-2xl rounded-2xl py-2 z-[1100] overflow-hidden"
                  >
                    <div className="px-5 py-4 border-b border-gray-50 mb-1">
                      <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest mb-1">Signed in as</p>
                      <p className="text-[10px] font-bold text-black truncate">{user.email}</p>
                    </div>

                    {/* Dynamic Role Links */}
                    {user.role === 'customer' && (
                      <>
                        <Link to="/customer-dashboard" onClick={() => setShowDropdown(false)} className="flex items-center gap-3 px-5 py-3 text-[10px] font-bold uppercase text-charcoal hover:bg-gray-50 hover:text-bbBlue transition-all">
                          <span className="opacity-50">📊</span> My Dashboard
                        </Link>
                        <Link to="/my-shopping" onClick={() => setShowDropdown(false)} className="flex items-center gap-3 px-5 py-3 text-[10px] font-bold uppercase text-charcoal hover:bg-gray-50 hover:text-bbBlue transition-all">
                          <span className="opacity-50">🛍️</span> My Shopping
                        </Link>
                      </>
                    )}

                    {user.role === 'partner' && (
                      <>
                        <Link to="/partner/dashboard" onClick={() => setShowDropdown(false)} className="flex items-center gap-3 px-5 py-3 text-[10px] font-bold uppercase text-charcoal hover:bg-gray-50 hover:text-bbBlue transition-all">
                          <span className="opacity-50">💼</span> Partner Terminal
                        </Link>
                        <Link to="/customer/explore" onClick={() => setShowDropdown(false)} className="flex items-center gap-3 px-5 py-3 text-[10px] font-bold uppercase text-charcoal hover:bg-gray-50 hover:text-bbBlue transition-all">
                          <span className="opacity-50">🛍️</span> Member Store
                        </Link>
                        <Link to="/my-shopping" onClick={() => setShowDropdown(false)} className="flex items-center gap-3 px-5 py-3 text-[10px] font-bold uppercase text-charcoal hover:bg-gray-50 hover:text-bbBlue transition-all">
                          <span className="opacity-50">📦</span> My Orders
                        </Link>
                      </>
                    )}

                    {user.role === 'admin' && (
                      <>
                        <Link to="/admin/dashboard" onClick={() => setShowDropdown(false)} className="flex items-center gap-3 px-5 py-3 text-[10px] font-bold uppercase text-charcoal hover:bg-gray-50 hover:text-bbBlue transition-all">
                          <span className="opacity-50">🔐</span> Admin Control
                        </Link>
                        <Link to="/admin/dashboard?view=verification" onClick={() => setShowDropdown(false)} className="flex items-center gap-3 px-5 py-3 text-[10px] font-bold uppercase text-charcoal hover:bg-gray-50 hover:text-bbBlue transition-all">
                          <span className="opacity-50">🛡️</span> Partner Vetting
                        </Link>
                        <Link to="/admin/dashboard?view=ledger" onClick={() => setShowDropdown(false)} className="flex items-center gap-3 px-5 py-3 text-[10px] font-bold uppercase text-charcoal hover:bg-gray-50 hover:text-bbBlue transition-all">
                          <span className="opacity-50">💸</span> Revenue Ledger
                        </Link>
                        <Link to="/admin/dashboard?view=broadcast" onClick={() => setShowDropdown(false)} className="flex items-center gap-3 px-5 py-3 text-[10px] font-bold uppercase text-charcoal hover:bg-gray-50 hover:text-bbBlue transition-all">
                          <span className="opacity-50">📢</span> Global Broadcast
                        </Link>
                        <Link to="/admin/dashboard?view=feedback" onClick={() => setShowDropdown(false)} className="flex items-center gap-3 px-5 py-3 text-[10px] font-bold uppercase text-charcoal hover:bg-gray-50 hover:text-bbBlue transition-all">
                          <span className="opacity-50">💬</span> Feedback Hub
                        </Link>
                      </>
                    )}

                    <div className="border-t border-gray-50 mt-1">
                      <button 
                        onClick={() => {
                          setShowDropdown(false);
                          fileInputRef.current?.click();
                        }} 
                        className="w-full text-left flex items-center gap-3 px-5 py-3 text-[10px] font-bold uppercase text-charcoal hover:bg-gray-50 hover:text-bbBlue transition-all"
                      >
                        <span className="opacity-50">📸</span> {isUploading ? 'Uploading...' : 'Update Profile Photo'}
                      </button>
                      <button onClick={handleLogout} className="w-full text-left px-5 py-4 text-[10px] font-bold uppercase text-red-500 hover:bg-red-50 transition-colors">
                        Logout Session
                      </button>
                    </div>
                  </motion.div>
                )}</AnimatePresence>
              </div>
            </div>
          ) : (
            <Link to="/auth" className="text-[0.625rem] font-bold text-white bg-black px-6 py-2.5 rounded-full uppercase tracking-widest hover:bg-gray-800 transition-all">Sign In</Link>
          )}
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
    </nav>
  );
};

export default Navbar;

