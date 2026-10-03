/* UNIFIED NAVIGATION SYSTEM v4.0 */
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { getBookings, updateShop, subscribeToNotifications } from '../services/logic_engine';
import { ShoppingBag, Compass, LayoutDashboard, Briefcase, ShieldCheck, Bell } from 'lucide-react';
import officialLogo from './offical_logoBB.jpeg';

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
          const success = await updateShop(user.uid, { ownerPicture: base64String });
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

  const isOnboarding = location.pathname === '/onboarding' || location.pathname === '/partner/signup';

  if (isOnboarding) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-[1000] bg-charcoal border-b border-white/5 h-[5rem] flex items-center px-[5%] justify-between shadow-2xl">
        <Link to="/" className="flex items-center gap-3 group">
          <img 
            src={officialLogo} 
            alt="BB Connect Network" 
            className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl border border-white/10 shadow-md bg-white/5 p-0.5 group-hover:scale-105 transition-transform" 
          />
          <div className="flex flex-col">
            <span className="text-[0.95rem] sm:text-[1rem] font-serif font-black text-white tracking-widest uppercase">
              Network <span className="text-bbBlue">Admission</span>
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-[0.625rem] font-bold text-white/30 uppercase tracking-widest">Protocol Active</span>
          <div className="w-2 h-2 rounded-full bg-bbBlue animate-pulse"></div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-md border-b-2 border-black/10 h-[4.5rem] sm:h-[5rem] shadow-xs">
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 md:px-[5%] h-full flex justify-between items-center gap-2">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0 shrink select-none">
          <img 
            src={officialLogo} 
            alt="BB Connect Network Logo" 
            className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 object-contain rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000000] group-hover:scale-105 transition-transform duration-300 bg-white shrink-0" 
          />
          <div className="flex flex-col items-start justify-center leading-none min-w-0">
            <span className="font-cinzel text-[0.82rem] xs:text-[0.95rem] sm:text-[1.1rem] md:text-[1.22rem] font-black text-black tracking-wide uppercase group-hover:text-blue-600 transition-colors drop-shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
              Barber <span className="text-blue-600 font-serif italic font-extrabold">&amp;</span> Beauty
            </span>
            <span className="font-outfit text-[0.45rem] xs:text-[0.52rem] sm:text-[0.6rem] md:text-[0.66rem] font-black text-blue-600 uppercase tracking-[0.22em] sm:tracking-[0.28em] mt-0.5">
              Connect Network
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
          {(!isLoggedIn || user.role === 'customer' || user.role === 'admin') && (
            <Link 
              to="/customer/explore" 
              title="Explore Salons & Barbers"
              className={`p-2 md:px-3 md:py-1.5 rounded-xl flex items-center gap-1.5 font-black uppercase tracking-wider transition-all ${
                location.pathname === '/customer/explore' 
                  ? 'text-blue-600 bg-blue-50 border-2 border-blue-600/30' 
                  : 'text-black hover:text-blue-600 hover:bg-gray-100'
              }`}
            >
              <Compass className="w-5 h-5 shrink-0" />
              <span className="hidden md:inline text-xs">Explore</span>
            </Link>
          )}

          {isLoggedIn && user.role === 'customer' && (
            <Link 
              to="/customer-dashboard" 
              title="Customer Dashboard"
              className={`p-2 md:px-3 md:py-1.5 rounded-xl flex items-center gap-1.5 font-black uppercase tracking-wider transition-all ${
                location.pathname === '/customer-dashboard' 
                  ? 'text-blue-600 bg-blue-50 border-2 border-blue-600/30' 
                  : 'text-black hover:text-blue-600 hover:bg-gray-100'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span className="hidden md:inline text-xs">Dashboard</span>
            </Link>
          )}

          {isLoggedIn && user.role === 'partner' && user.onboardingComplete && (
            <Link 
              to="/partner/dashboard" 
              title="Partner Terminal"
              className={`p-2 md:px-3 md:py-1.5 rounded-xl flex items-center gap-1.5 font-black uppercase tracking-wider transition-all ${
                location.pathname === '/partner/dashboard' 
                  ? 'text-blue-600 bg-blue-50 border-2 border-blue-600/30' 
                  : 'text-black hover:text-blue-600 hover:bg-gray-100'
              }`}
            >
              <Briefcase className="w-5 h-5 shrink-0" />
              <span className="hidden md:inline text-xs">Terminal</span>
            </Link>
          )}

          {isLoggedIn && (user.role === 'admin' || (user.email || '').toLowerCase().trim() === 'haidartheworldking@gmail.com') && (
            <Link 
              to="/admin/dashboard" 
              title="Master Admin Portal"
              className={`p-2 md:px-3 md:py-1.5 rounded-xl flex items-center gap-1.5 font-black uppercase tracking-wider transition-all ${
                location.pathname.startsWith('/admin') 
                  ? 'text-blue-600 bg-blue-50 border-2 border-blue-600/30' 
                  : 'text-black hover:text-blue-600 hover:bg-gray-100'
              }`}
            >
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span className="hidden md:inline text-xs">Admin</span>
            </Link>
          )}
          
          {isLoggedIn ? (
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
              <Link 
                to="/checkout" 
                title="Shopping Bag"
                className="relative p-2 text-black hover:text-blue-600 hover:bg-gray-100 rounded-xl flex items-center justify-center shrink-0 transition-colors"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[1rem] h-4 bg-blue-600 text-white text-[10px] flex items-center justify-center rounded-full border border-black px-1 font-black">
                    {totalItems}
                  </span>
                )}
              </Link>
              
              <div className="relative shrink-0" ref={notificationRef}>
                <button 
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setHasUnread(false);
                    localStorage.setItem('bb_last_viewed_notifs', Date.now().toString());
                    setLastViewed(Date.now());
                  }} 
                  title="Network Notifications"
                  aria-label="Network Notifications"
                  className="relative p-2 text-black hover:text-blue-600 hover:bg-gray-100 rounded-xl transition-colors flex items-center justify-center"
                >
                  <Bell className="w-5 h-5" />
                  {hasUnread && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white animate-pulse"></span>}
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.95 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, y: 15, scale: 0.95 }} 
                      className="absolute right-0 mt-3 w-72 sm:w-80 bg-white border-2 border-black shadow-[6px_6px_0px_0px_#000000] rounded-2xl py-5 z-[1100] max-h-[28rem] overflow-hidden flex flex-col"
                    >
                      <div className="px-6 mb-3 flex justify-between items-center border-b border-black/10 pb-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-black">Network Alerts</h3>
                        {notifications.length > 0 && <button onClick={() => setClearedIds(notifications.map(n => n.id))} className="text-[10px] font-bold text-black/50 hover:text-red-500 uppercase">Clear All</button>}
                      </div>
                      <div className="overflow-y-auto space-y-2.5 custom-scrollbar px-5">
                        {notifications.length > 0 ? (
                          notifications.map(n => (
                            <div key={n.id} className="p-3 bg-gray-50 rounded-xl border border-black/10 hover:border-black transition-all group">
                              <div className="flex justify-between items-start mb-1">
                                <p className={`text-[9px] font-black uppercase tracking-wider ${n.type === 'GLOBAL BROADCAST' ? 'text-red-600' : 'text-blue-600'}`}>
                                  {n.type}
                                </p>
                                <span className="text-[8px] text-black/50 font-bold uppercase">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-xs font-bold text-black mb-0.5">{n.title || (n.type === 'GLOBAL BROADCAST' ? 'Admin Message' : 'Booking Alert')}</p>
                              <p className="text-xs text-black/75 leading-relaxed font-medium">{n.message}</p>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2 text-black/40">
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                            </div>
                            <p className="text-xs font-black text-black uppercase tracking-wider">Inbox Zero</p>
                            <p className="text-[10px] text-black/50 uppercase mt-0.5">No pending updates</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative shrink-0" ref={dropdownRef}>
                <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 group">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 border-2 border-black flex items-center justify-center overflow-hidden shadow-[2px_2px_0px_0px_#000000]">
                    {photoURL ? <img src={photoURL} className="w-full h-full object-cover" /> : <span className="text-black text-xs sm:text-sm font-bold">👤</span>}
                  </div>
                </button>
                <AnimatePresence>{showDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: 15 }} 
                    className="absolute right-0 mt-3 w-60 sm:w-64 bg-white border-2 border-black shadow-[6px_6px_0px_0px_#000000] rounded-2xl py-2 z-[1100] overflow-hidden"
                  >
                    <div className="px-5 py-3 border-b border-black/10 mb-1">
                      <p className="text-[9px] font-bold text-black/50 uppercase tracking-wider mb-0.5">Signed in as</p>
                      <p className="text-xs font-black text-black truncate">{user.email}</p>
                    </div>

                    {/* Dynamic Role Links */}
                    {user.role === 'customer' && (
                      <>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(false);
                            navigate('/customer-dashboard');
                          }} 
                          className="w-full text-left flex items-center gap-3 px-5 py-2.5 text-xs font-bold uppercase text-black hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <span className="opacity-70">📊</span> My Dashboard
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(false);
                            navigate('/my-shopping');
                          }} 
                          className="w-full text-left flex items-center gap-3 px-5 py-2.5 text-xs font-bold uppercase text-black hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <span className="opacity-70">🛍️</span> My Shopping
                        </button>
                      </>
                    )}

                    {user.role === 'partner' && user.onboardingComplete && (
                      <>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(false);
                            navigate('/partner/dashboard');
                          }} 
                          className="w-full text-left flex items-center gap-3 px-5 py-2.5 text-xs font-bold uppercase text-black hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <span className="opacity-70">💼</span> Partner Terminal
                        </button>
                      </>
                    )}

                    {(user.role === 'admin' || (user.email || '').toLowerCase().trim() === 'haidartheworldking@gmail.com') && (() => {
                      const adminDropdownOptions = [
                        { label: "👑 Admin Control", path: "/admin/dashboard", icon: "🔐" },
                        { label: "✂️ Control Shops", path: "/admin/manage-live-shops", icon: "🛠️" },
                        { label: "📦 Manage Inventory", path: "/admin/dropship", icon: "📦" },
                        { label: "🤝 Partner Vetting", path: "/admin/dashboard?view=verification", icon: "🛡️" },
                        { label: "📈 Revenue Ledger", path: "/admin/dashboard?view=ledger", icon: "💸" },
                        { label: "📢 Global Broadcast", path: "/admin/dashboard?view=broadcast", icon: "📢" },
                        { label: "💬 Feedback Hub", path: "/admin/dashboard?view=feedback", icon: "💬" },
                        { label: "🏦 Partner Payment Hub", path: "/admin/dashboard?view=partner_payment_hub", icon: "🏦" }
                      ];
                      return (
                        <>
                          {adminDropdownOptions.map((option, idx) => (
                            <button 
                              key={idx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDropdown(false);
                                navigate(option.path);
                              }} 
                              className="w-full text-left flex items-center gap-3 px-5 py-2.5 text-xs font-bold uppercase text-black hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              <span className="opacity-70">{option.icon}</span> {option.label.toUpperCase()}
                            </button>
                          ))}
                        </>
                      );
                    })()}

                    <div className="border-t border-black/10 mt-1 pt-1">
                      <button 
                        onClick={() => {
                          setShowDropdown(false);
                          fileInputRef.current?.click();
                        }} 
                        className="w-full text-left flex items-center gap-3 px-5 py-2.5 text-xs font-bold uppercase text-black hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        <span className="opacity-70">📸</span> {isUploading ? 'Uploading...' : 'Update Profile Photo'}
                      </button>
                      <button onClick={handleLogout} className="w-full text-left px-5 py-3 text-xs font-bold uppercase text-red-600 hover:bg-red-50 transition-colors">
                        Logout Session
                      </button>
                    </div>
                  </motion.div>
                )}</AnimatePresence>
              </div>
            </div>
          ) : (
            <Link to="/auth" className="text-xs font-black text-white bg-black hover:bg-blue-600 border-2 border-black px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl uppercase tracking-wider transition-all whitespace-nowrap shrink-0 shadow-[3px_3px_0px_0px_#0052FF] active:scale-95">
              Sign In
            </Link>
          )}
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
    </nav>
  );
};

export default Navbar;

