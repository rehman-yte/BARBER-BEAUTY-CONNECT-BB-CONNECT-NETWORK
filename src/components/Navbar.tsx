import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getBookings, getShopById, updateShop, subscribeToNotifications } from '../services/logic_engine';
import { PersistenceService } from '../services/PersistenceService';
import { ShoppingBag, User } from 'lucide-react';
import CustomerAuthModal from './CustomerAuthModal';

const Navbar: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const { totalItems } = useCart();
  const isLoggedIn = !!user;
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [settingsData, setSettingsData] = useState({ upiId: '', isActive: true });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevCount = useRef(0);
  const prevBroadcastId = useRef<number | null>(null);

  // Sync with Auth directly for display name and photo
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
          // Customer logic: Simple update
          updateUser({ photoURL: base64String });
        } else if (user.role === 'partner') {
          // Partner logic: Update shop and set to pending verification
          const success = await updateShop(user.uid, {
            image: base64String,
            isVerified: false // Trigger pending status
          });
          if (success) {
            updateUser({ photoURL: base64String });
            // Dispatch event for dashboard to update
            window.dispatchEvent(new Event('bb_settings_updated'));
          }
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
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    if (!user) return;

    const target = user.role === 'customer' ? 'customers' : (user.role === 'partner' ? 'partners' : 'all');
    
    const unsubscribe = subscribeToNotifications(target, (newNotifs) => {
      setBroadcastNotifs(newNotifs);
      
      if (newNotifs.length > 0) {
        const latest = newNotifs[0];
        const latestTime = new Date(latest.timestamp).getTime();
        
        if (latestTime > prevBroadcastId.current && latest.type === 'GLOBAL BROADCAST') {
          setActiveToast(latest);
          const heavySound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          heavySound.volume = 1.0;
          heavySound.play().catch(e => console.log('Audio play blocked'));
          setTimeout(() => setActiveToast(null), 8000);
        }
        prevBroadcastId.current = latestTime;

        if (latestTime > lastViewed) {
          setHasUnread(true);
        }
      }
    });

    const interval = setInterval(async () => {
      const userBookings = await getBookings(user.uid);
      const mapped = userBookings.map((data: any) => ({
        id: data.id,
        type: 'STATUS UPDATE',
        title: data.status === 'payment_held' ? 'Booking Pending' : 'Booking ' + data.status,
        message: `Your booking at ${data.shopName} is now ${data.status}.`,
        timestamp: new Date(data.createdAt).getTime(),
        isStatus: true
      }));
      setBookingNotifs(mapped);
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user, lastViewed]);

  const notifications = [...broadcastNotifs, ...bookingNotifs]
    .filter(n => !clearedIds.includes(n.id))
    .sort((a, b) => {
      const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
      const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
      return timeB - timeA;
    });

  const toggleNotifications = () => {
    if (!showNotifications) {
      setHasUnread(false);
      const now = Date.now();
      setLastViewed(now);
      localStorage.setItem('bb_last_viewed_notifs', now.toString());
    }
    setShowNotifications(!showNotifications);
  };

  const handleClearNotif = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setClearedIds(prev => {
      const next = [...prev, id];
      localStorage.setItem('bb_cleared_notifs', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
    setShowDropdown(false);
  };

  const handleOpenSettings = async () => {
    if (!user) return;
    const shop = await getShopById(user.uid);
    if (shop) {
      setSettingsData({
        upiId: shop.upiId || '',
        isActive: shop.isActive !== false
      });
      setShowSettings(true);
    }
    setShowDropdown(false);
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setIsSavingSettings(true);
    try {
      const success = await updateShop(user.uid, {
        upiId: settingsData.upiId,
        isActive: settingsData.isActive
      });
      if (success) {
        setShowSettings(false);
        // Dispatch event for dashboard to update
        window.dispatchEvent(new Event('bb_settings_updated'));
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const isPartner = user?.role === 'partner';

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] bg-white/90 backdrop-blur-md border-b border-gray-100 h-[5rem] shadow-sm">
      <div className="w-full max-w-[1440px] mx-auto px-[5%] h-full flex justify-between items-center">
        <div className="flex-1 flex justify-start min-w-0">
          <Link 
            to={isPartner ? "#" : "/"} 
            className={`flex flex-col items-start leading-none group ${isPartner ? 'pointer-events-none' : ''} truncate`}
          >
            <span className="text-[0.875rem] sm:text-[1rem] md:text-[1.125rem] font-serif font-bold text-black tracking-tight transition-colors truncate w-full">
              BARBER & BEAUTY CONNECT
            </span>
            <span className="text-[0.45rem] sm:text-[0.5rem] md:text-[0.5625rem] font-bold text-bbBlue uppercase tracking-[0.3em] mt-[0.25rem] truncate w-full">
              BB CONNECT NETWORK
            </span>
          </Link>
        </div>

        <div className="flex flex-none justify-center items-center gap-[0.75rem] sm:gap-[1.5rem] md:gap-[2.5rem] px-[0.5rem] sm:px-[1rem]">
          {!isPartner && (
            <Link 
              to="/" 
              className={`text-[0.5625rem] sm:text-[0.625rem] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${location.pathname === '/' ? 'text-bbBlue' : 'text-black hover:text-bbBlue'}`}
            >
              Home
            </Link>
          )}
          
          <button
            onClick={() => {
              const target = user?.role === 'admin' ? "/admin-dashboard" : 
              (isPartner ? ((!user.brandName && !user.onboardingComplete) ? "/onboarding" : "/partner-dashboard") : "/customer-dashboard");
              
              if (isLoggedIn) {
                navigate(target);
              } else {
                setPendingPath(target);
                setShowAuthModal(true);
              }
            }}
            className={`text-[0.5625rem] sm:text-[0.625rem] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${(location.pathname === '/customer-dashboard' || location.pathname === '/partner-dashboard' || location.pathname === '/admin-dashboard' || location.pathname === '/onboarding') ? 'text-bbBlue' : 'text-charcoal hover:text-bbBlue'}`}
          >
            Dashboard
          </button>

          {!isPartner && (
            <button
              onClick={() => {
                if (isLoggedIn) navigate('/explore');
                else {
                  setPendingPath('/explore');
                  setShowAuthModal(true);
                }
              }}
              className={`text-[0.5625rem] sm:text-[0.625rem] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${location.pathname === '/explore' ? 'text-bbBlue' : 'text-black hover:text-bbBlue'}`}
            >
              Explore
            </button>
          )}

          {!isPartner && (
            <button
              onClick={() => {
                if (isLoggedIn) navigate('/shop');
                else {
                  setPendingPath('/shop');
                  setShowAuthModal(true);
                }
              }}
              className={`text-[0.5625rem] sm:text-[0.625rem] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${location.pathname === '/shop' ? 'text-bbBlue' : 'text-charcoal hover:text-bbBlue'}`}
            >
              Shop
            </button>
          )}
        </div>

        <div className="flex-1 flex justify-end items-center gap-[0.75rem] md:gap-[1.5rem]">
          {!isLoggedIn ? (
            <button 
              onClick={() => {
                setPendingPath(null);
                setShowAuthModal(true);
              }}
              className="text-[0.625rem] font-bold text-black uppercase tracking-widest hover:text-bbBlue transition-all border-b border-transparent hover:border-bbBlue pb-[0.125rem] whitespace-nowrap"
            >
              Sign In
            </button>
          ) : (
          <div className="flex items-center gap-[0.75rem] sm:gap-[1.25rem] relative">
            <Link 
              to="/checkout"
              className="relative p-[0.5rem] text-gray-400 hover:text-bbBlue transition-all active:scale-95"
            >
              <ShoppingBag size={20} />
              {totalItems > 0 && (
                <span className="absolute top-[0.375rem] right-[0.375rem] min-w-[1rem] h-4 bg-bbBlue text-white text-[0.5rem] font-bold flex items-center justify-center rounded-full border-2 border-white px-1">
                  {totalItems}
                </span>
              )}
            </Link>

            <div className="relative" ref={notificationRef}>
              <button 
                onClick={toggleNotifications}
                className="relative p-[0.5rem] text-gray-400 hover:text-bbBlue transition-all active:scale-95"
              >
                <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {hasUnread && (
                  <span className="absolute top-[0.375rem] right-[0.375rem] w-[0.625rem] h-[0.625rem] bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse"></span>
                )}
              </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      className="absolute right-0 mt-[0.75rem] w-[18rem] sm:w-[20rem] bg-white border border-gray-100 shadow-2xl rounded-[1.5rem] py-[1.5rem] z-[1100]"
                    >
                      <div className="flex justify-between items-center mb-[1.25rem] px-[1.5rem]">
                         <h4 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">Notifications</h4>
                         <span className="text-[0.5625rem] font-bold text-bbBlue uppercase bg-bbBlue/5 px-[0.5rem] py-[0.125rem] rounded-full">{notifications.length} Active</span>
                      </div>
                      <div className="max-h-[21.875rem] overflow-y-auto px-[1.5rem] space-y-[1rem] custom-scrollbar">
                        {notifications.length > 0 ? (
                          notifications.map((notif) => (
                            <div key={notif.id} className="relative p-[1rem] bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-md transition-all group">
                              <div className="flex justify-between items-start mb-[0.25rem]">
                                <p className={`text-[0.5rem] font-bold uppercase tracking-widest ${notif.isOffer ? 'text-bbBlue' : 'text-charcoal'}`}>{notif.type}</p>
                                <button 
                                  onClick={(e) => handleClearNotif(notif.id, e)}
                                  className="text-gray-300 hover:text-red-500 transition-colors p-[0.25rem]"
                                >
                                  <svg className="w-[0.875rem] h-[0.875rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                              <p className="text-[0.625rem] font-bold text-black mb-[0.25rem]">{notif.title}</p>
                              <p className="text-[0.6875rem] font-medium text-gray-500 leading-relaxed">{notif.message}</p>
                            </div>
                          ))
                        ) : (
                          <div className="py-[2.5rem] text-center">
                            <p className="text-[0.5625rem] font-bold text-gray-300 uppercase tracking-[0.2em]">No active messages</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-[0.5rem] sm:gap-[0.75rem] group active:scale-95 transition-all"
              >
                <div className="hidden sm:flex flex-col items-end leading-none">
                  <span className="text-[0.6875rem] font-bold text-black group-hover:text-bbBlue transition-colors">{displayName}</span>
                </div>
                <div className="w-[2.25rem] h-[2.25rem] sm:w-[2.5rem] sm:h-[2.5rem] rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shadow-sm overflow-hidden group-hover:border-bbBlue transition-all">
                   {photoURL ? (
                     <img src={photoURL} className="w-full h-full object-cover" alt="Profile" referrerPolicy="no-referrer" />
                   ) : (
                     <svg className="w-[1.125rem] h-[1.125rem] sm:w-[1.25rem] sm:h-[1.25rem] text-gray-300 group-hover:text-bbBlue transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                   )}
                </div>
              </button>

              <AnimatePresence>
                {showDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    className="absolute right-0 mt-[0.75rem] w-[16rem] bg-white border border-gray-100 shadow-2xl rounded-[1.5rem] py-[0.75rem] z-[1100] overflow-hidden"
                  >
                    <div className="px-[1.25rem] py-[1rem] border-b border-gray-50 mb-[0.25rem]">
                       <div className="flex items-center gap-3 mb-4">
                         <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                           {photoURL ? (
                             <img src={photoURL} className="w-full h-full object-cover" alt="Profile" />
                           ) : (
                             <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                               <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                             </svg>
                           )}
                         </div>
                         <div className="min-w-0">
                           <p className="text-[0.5625rem] font-bold text-gray-300 uppercase tracking-widest mb-[0.125rem]">
                             {user?.role === 'admin' ? 'MASTER ADMIN' : 'Signed in as'}
                           </p>
                           <p className="text-[0.625rem] font-bold text-black truncate">{user?.email}</p>
                         </div>
                       </div>
                       
                       {user?.role !== 'admin' && (
                         <button 
                           onClick={() => fileInputRef.current?.click()}
                           disabled={isUploading}
                           className="w-full py-2.5 px-3 bg-bbBlue/5 hover:bg-bbBlue/10 text-bbBlue text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                         >
                           {isUploading ? (
                             <div className="w-3 h-3 border-2 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
                           ) : (
                             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                             </svg>
                           )}
                           {isUploading ? 'Syncing...' : 'Update Photo'}
                         </button>
                       )}
                    </div>
                    {user?.role === 'customer' && (
                      <>
                        <Link 
                          to="/customer-dashboard" 
                          onClick={() => setShowDropdown(false)}
                          className="block px-[1.25rem] py-[0.875rem] text-[0.625rem] font-bold uppercase tracking-widest text-black hover:bg-gray-50 hover:text-bbBlue transition-colors"
                        >
                          My Dashboard
                        </Link>
                        <Link 
                          to="/my-shopping" 
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-2 px-[1.25rem] py-[0.875rem] text-[0.625rem] font-bold uppercase tracking-widest text-black hover:bg-gray-50 hover:text-bbBlue transition-colors border-t border-gray-50"
                        >
                          <ShoppingBag size={14} />
                          My Shopping
                        </Link>
                      </>
                    )}
                    {isPartner && (
                      <>
                        <Link 
                          to="/partner-dashboard" 
                          onClick={() => setShowDropdown(false)}
                          className="block px-[1.25rem] py-[0.875rem] text-[0.625rem] font-bold uppercase tracking-widest text-black hover:bg-gray-50 hover:text-bbBlue transition-colors"
                        >
                          Partner Dashboard
                        </Link>
                        <button 
                          onClick={handleOpenSettings}
                          className="w-full text-left block px-[1.25rem] py-[0.875rem] text-[0.625rem] font-bold uppercase tracking-widest text-black hover:bg-gray-50 hover:text-bbBlue transition-colors"
                        >
                          Settings
                        </button>
                      </>
                    )}
                    {user?.role === 'admin' && (
                      <div className="border-t border-gray-50 mt-1 pt-1">
                        {[
                          { id: 'overview', label: 'Dashboard Overview', path: '/admin-dashboard?view=overview' },
                        ].map((item) => (
                          <Link
                            key={item.id}
                            to={item.path}
                            onClick={() => setShowDropdown(false)}
                            className="block px-[1.25rem] py-[0.875rem] text-[0.625rem] font-bold uppercase tracking-widest text-black hover:bg-gray-50 hover:text-bbBlue transition-colors"
                          >
                            {item.label}
                          </Link>
                        ))}
                        <div className="px-[1.25rem] py-2 border-t border-gray-50 mt-1">
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Admin Control</p>
                        </div>
                        {[
                          { id: 'verification', label: 'Verification Queue', path: '/admin-dashboard?view=verification' },
                          { id: 'shops', label: 'Master Shop Control', path: '/admin-dashboard?view=shops' },
                          { id: 'ledger', label: 'Accountant AI Ledger', path: '/admin-dashboard?view=ledger' },
                          { id: 'broadcast', label: 'Broadcast Center', path: '/admin-dashboard?view=broadcast' },
                        ].map((item) => (
                          <Link
                            key={item.id}
                            to={item.path}
                            onClick={() => setShowDropdown(false)}
                            className="block px-[1.25rem] py-[0.75rem] text-[0.625rem] font-bold uppercase tracking-widest text-black hover:bg-gray-50 hover:text-bbBlue transition-colors"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                    <div className="border-t border-gray-50 mt-1 pt-1">
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left block px-[1.25rem] py-[0.875rem] text-[0.625rem] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-[1.5rem]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-charcoal/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[32rem] bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-[2.5rem] md:p-[3.5rem]">
                <div className="flex justify-between items-center mb-[2.5rem]">
                  <h2 className="text-[1.5rem] font-serif font-bold text-charcoal uppercase tracking-tight">Partner Settings Hub</h2>
                  <button onClick={() => setShowSettings(false)} className="text-gray-300 hover:text-charcoal transition-colors">
                    <svg className="w-[1.5rem] h-[1.5rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="space-y-[2rem]">
                  {/* SHOP STATUS TOGGLE */}
                  <div className="flex justify-between items-center p-[1.5rem] bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <p className="text-[0.75rem] font-bold text-charcoal uppercase tracking-widest mb-[0.25rem]">SHOP STATUS</p>
                      <p className="text-[0.5625rem] text-gray-400 font-medium uppercase tracking-widest">
                        {settingsData.isActive ? 'ONLINE' : 'OFFLINE'}
                      </p>
                    </div>
                    <button 
                      onClick={() => setSettingsData(prev => ({ ...prev, isActive: !prev.isActive }))}
                      className={`w-[3.5rem] h-[1.75rem] rounded-full relative transition-all duration-500 ${settingsData.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
                    >
                      <motion.div 
                        animate={{ x: settingsData.isActive ? '1.75rem' : '0.25rem' }}
                        className="absolute top-[0.25rem] w-[1.25rem] h-[1.25rem] bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>

                  {/* UPI ID UPDATE */}
                  <div>
                    <p className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest mb-[0.75rem]">PAYMENT SETTINGS (UPI ID)</p>
                    <input 
                      type="text"
                      value={settingsData.upiId}
                      onChange={(e) => setSettingsData(prev => ({ ...prev, upiId: e.target.value }))}
                      placeholder="merchant@upi"
                      className="w-full px-[1.5rem] py-[1.25rem] bg-gray-50 border border-gray-200 rounded-2xl text-[0.875rem] font-mono font-bold text-charcoal focus:border-bbBlue focus:bg-white outline-none transition-all"
                    />
                    <p className="text-[0.5rem] text-gray-400 mt-[0.5rem] uppercase font-bold tracking-widest">Funds will be settled to this ID every 12 hours.</p>
                  </div>

                  <div className="pt-[1rem]">
                    <button 
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className="w-full py-[1.25rem] bg-bbBlue text-white rounded-2xl text-[0.625rem] font-bold uppercase tracking-widest hover:bg-bbBlue/90 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-bbBlue/20"
                    >
                      {isSavingSettings ? 'Syncing with Network...' : 'SAVE CHANGES'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* GLOBAL BROADCAST TOAST */}
      <AnimatePresence>
        {activeToast && (
          <motion.div 
            initial={{ opacity: 0, y: 100, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 100, x: '-50%' }}
            className="fixed bottom-[2rem] left-1/2 z-[3000] w-full max-w-[24rem] px-[1rem]"
          >
            <div className="bg-black text-white p-[1.5rem] rounded-[2rem] shadow-2xl border border-white/10 flex items-center gap-[1.25rem]">
              <div className="w-[3.5rem] h-[3.5rem] bg-red-500 rounded-2xl flex items-center justify-center shrink-0 animate-pulse">
                <svg className="w-[1.75rem] h-[1.75rem] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <div className="flex-1">
                <p className="text-[0.5625rem] font-bold text-red-500 uppercase tracking-widest mb-[0.25rem]">ADMIN BROADCAST</p>
                <p className="text-[0.875rem] font-bold leading-tight">{activeToast.message}</p>
              </div>
              <button 
                onClick={() => setActiveToast(null)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      <CustomerAuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSuccess={() => {
          if (pendingPath) navigate(pendingPath);
          else if (location.pathname === '/auth') navigate('/customer-dashboard');
        }}
      />
    </nav>
  );
};

export default Navbar;