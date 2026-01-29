
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase/firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  limit 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const isLoggedIn = !!user;
  const isPartner = user?.role === 'partner';
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [clearedIds, setClearedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('bb_cleared_notifs');
    return saved ? JSON.parse(saved) : [];
  });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevCount = useRef(0);

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  // Sync Notifications
  useEffect(() => {
    if (!user || !db) return;

    // 1. Admin Offers Listener
    const adminQuery = query(collection(db, 'admin_offers'), limit(10));
    const unsubAdmin = onSnapshot(adminQuery, (snapshot) => {
      const adminNotifs = snapshot.docs.map(doc => ({
        id: doc.id,
        type: 'PLATFORM OFFER',
        title: 'Administration Offer',
        message: doc.data().message || 'New offer available on the platform.',
        timestamp: doc.data().createdAt?.toMillis() || Date.now(),
        isOffer: true
      }));
      updateNotifications(adminNotifs, 'admin');
    });

    // 2. Booking Status Updates Listener (Only for Customers)
    let unsubBookings = () => {};
    if (user.role === 'customer') {
      const bookingQuery = query(collection(db, 'bookings'), where('customerId', '==', user.uid));
      unsubBookings = onSnapshot(bookingQuery, (snapshot) => {
        const bookingNotifs = snapshot.docs.map(doc => {
          const data = doc.data();
          let msg = `Your booking at ${data.shopName} is now ${data.status}.`;
          if (data.status === 'Cancelled' || data.status === 'cancelled') {
             msg = `Payment Cancelled ❌ for your slot at ${data.shopName}. Slot not booked.`;
          }
          return {
            id: doc.id,
            type: 'STATUS UPDATE',
            title: data.status === 'payment_held' ? 'Booking Pending' : 'Booking ' + data.status,
            message: msg,
            timestamp: data.createdAt?.toMillis() || Date.now(),
            isStatus: true
          };
        });
        updateNotifications(bookingNotifs, 'booking');
      });
    }

    return () => {
      unsubAdmin();
      unsubBookings();
    };
  }, [user]);

  const [rawNotifs, setRawNotifs] = useState<{admin: any[], booking: any[]}>({ admin: [], booking: [] });

  const updateNotifications = (newItems: any[], source: 'admin' | 'booking') => {
    setRawNotifs(prev => {
      const updated = { ...prev, [source]: newItems };
      const combined = [...updated.admin, ...updated.booking]
        .filter(n => !clearedIds.includes(n.id))
        .sort((a, b) => b.timestamp - a.timestamp);

      // Sound logic
      if (combined.length > prevCount.current && prevCount.current !== 0) {
        audioRef.current?.play().catch(e => console.log('Audio play blocked'));
      }
      prevCount.current = combined.length;
      setNotifications(combined);
      return updated;
    });
  };

  useEffect(() => {
    localStorage.setItem('bb_cleared_notifs', JSON.stringify(clearedIds));
    const combined = [...rawNotifs.admin, ...rawNotifs.booking]
      .filter(n => !clearedIds.includes(n.id))
      .sort((a, b) => b.timestamp - a.timestamp);
    setNotifications(combined);
    prevCount.current = combined.length;
  }, [clearedIds]);

  const handleClearNotif = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setClearedIds(prev => [...prev, id]);
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
    navigate('/auth');
    setShowDropdown(false);
  };

  const dashboardLink = isPartner ? "/partner-dashboard" : "/customer-dashboard";

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-gray-100 py-3 px-6 md:px-12 flex justify-between items-center h-20 shadow-sm">
      
      {/* LEFT: Logo Section */}
      <div className="flex-1 flex justify-start">
        <Link to={isPartner ? "/partner-dashboard" : "/"} className="flex flex-col items-start leading-none group">
          <span className="text-base md:text-lg font-serif font-bold text-black tracking-tight transition-colors">
            BARBER & BEAUTY CONNECT
          </span>
          <span className="text-[8px] md:text-[9px] font-bold text-bbBlue uppercase tracking-[0.3em] mt-1">
            BB CONNECT NETWORK
          </span>
        </Link>
      </div>

      {/* CENTER: Navigation Links */}
      <div className="flex flex-none justify-center items-center gap-10 px-4">
        {!isPartner && (
          <Link 
            to="/" 
            className={`text-[10px] font-bold uppercase tracking-widest transition-all ${location.pathname === '/' ? 'text-bbBlue' : 'text-black hover:text-bbBlue'}`}
          >
            Home
          </Link>
        )}
        <Link 
          to={dashboardLink} 
          className={`text-[10px] font-bold uppercase tracking-widest transition-all ${location.pathname === dashboardLink ? 'text-bbBlue' : 'text-black hover:text-bbBlue'}`}
        >
          Dashboard
        </Link>
        {!isPartner && (
          <Link 
            to="/explore" 
            className={`text-[10px] font-bold uppercase tracking-widest transition-all ${location.pathname === '/explore' ? 'text-bbBlue' : 'text-black hover:text-bbBlue'}`}
          >
            Explore
          </Link>
        )}
      </div>

      {/* RIGHT: Action & Profile Section */}
      <div className="flex-1 flex justify-end items-center gap-6">
        {!isLoggedIn ? (
          <Link to="/auth" className="text-[10px] font-bold text-black uppercase tracking-widest hover:text-bbBlue transition-all border-b border-transparent hover:border-bbBlue pb-0.5">
            Sign In / Sign Up
          </Link>
        ) : (
          <div className="flex items-center gap-5 relative">
            {/* Bell Icon */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-400 hover:text-bbBlue transition-all active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-80 bg-white border border-gray-100 shadow-2xl rounded-[1.5rem] py-6 z-[110]"
                  >
                    <div className="flex justify-between items-center mb-5 px-6">
                       <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Notifications</h4>
                       <span className="text-[9px] font-bold text-bbBlue uppercase bg-bbBlue/5 px-2 py-0.5 rounded-full">{notifications.length} Active</span>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto px-6 space-y-4 custom-scrollbar">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div key={notif.id} className="relative p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-1">
                              <p className={`text-[8px] font-bold uppercase tracking-widest ${notif.isOffer ? 'text-bbBlue' : 'text-charcoal'}`}>{notif.type}</p>
                              <button 
                                onClick={(e) => handleClearNotif(notif.id, e)}
                                className="text-gray-300 hover:text-red-500 transition-colors p-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                            <p className="text-[10px] font-bold text-black mb-1">{notif.title}</p>
                            <p className="text-[11px] font-medium text-gray-500 leading-relaxed">{notif.message}</p>
                          </div>
                        ))
                      ) : (
                        <div className="py-10 text-center">
                          <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.2em]">No active messages</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Section */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 group active:scale-95 transition-all"
              >
                <div className="hidden sm:flex flex-col items-end leading-none">
                  <span className="text-[11px] font-bold text-black group-hover:text-bbBlue transition-colors">{user?.name}</span>
                  <span className="text-[9px] font-semibold text-gray-400 mt-1 uppercase tracking-tighter">ID: {user?.uid.slice(-4)}X</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shadow-sm overflow-hidden group-hover:border-bbBlue transition-all">
                   <svg className="w-5 h-5 text-gray-300 group-hover:text-bbBlue transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              </button>

              <AnimatePresence>
                {showDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-56 bg-white border border-gray-100 shadow-2xl rounded-[1.5rem] py-3 z-[110] overflow-hidden"
                  >
                    <div className="px-5 py-3 border-b border-gray-50 mb-1">
                       <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mb-1">Signed in as</p>
                       <p className="text-[10px] font-bold text-black truncate">{user?.email}</p>
                    </div>
                    <Link 
                      to={dashboardLink} 
                      onClick={() => setShowDropdown(false)}
                      className="block px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-black hover:bg-gray-50 hover:text-bbBlue transition-colors"
                    >
                      Dashboard
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left block px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
