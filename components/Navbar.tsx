
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar: React.FC = () => {
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

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

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-gray-100 py-3 px-6 md:px-12 flex justify-between items-center h-20 shadow-sm">
      
      {/* LEFT: Logo Section (STRICT COLORS: BLACK & BLUE) */}
      <div className="flex-1 flex justify-start">
        <Link to="/" className="flex flex-col items-start leading-none group">
          <span className="text-base md:text-lg font-serif font-bold text-black tracking-tight transition-colors">
            BARBER & BEAUTY CONNECT
          </span>
          <span className="text-[8px] md:text-[9px] font-bold text-bbBlue uppercase tracking-[0.3em] mt-1">
            BB CONNECT NETWORK
          </span>
        </Link>
      </div>

      {/* CENTER: Permanent Navigation (Visible on ALL routes, NO conditional rendering) */}
      <div className="flex flex-none justify-center items-center gap-10 px-4">
        <Link 
          to="/" 
          className={`text-[10px] font-bold uppercase tracking-widest transition-all ${location.pathname === '/' ? 'text-bbBlue' : 'text-black hover:text-bbBlue'}`}
        >
          Home
        </Link>
        <Link 
          to="/customer-dashboard" 
          className={`text-[10px] font-bold uppercase tracking-widest transition-all ${location.pathname === '/customer-dashboard' || location.pathname === '/dashboard' ? 'text-bbBlue' : 'text-black hover:text-bbBlue'}`}
        >
          Dashboard
        </Link>
        <Link 
          to="/explore" 
          className={`text-[10px] font-bold uppercase tracking-widest transition-all ${location.pathname === '/explore' ? 'text-bbBlue' : 'text-black hover:text-bbBlue'}`}
        >
          Explore
        </Link>
      </div>

      {/* RIGHT: Action & Profile Section */}
      <div className="flex-1 flex justify-end items-center gap-6">
        {!isLoggedIn ? (
          <Link to="/auth" className="text-[10px] font-bold text-black uppercase tracking-widest hover:text-bbBlue transition-all border-b border-transparent hover:border-bbBlue pb-0.5">
            Sign In / Sign Up
          </Link>
        ) : (
          <div className="flex items-center gap-5 relative">
            {/* Interactive Bell Icon */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-400 hover:text-bbBlue transition-all active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-80 bg-white border border-gray-100 shadow-2xl rounded-[1.5rem] py-6 px-6 z-[110]"
                  >
                    <div className="flex justify-between items-center mb-5">
                       <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inbox</h4>
                       <span className="text-[9px] font-bold text-bbBlue uppercase bg-bbBlue/5 px-2 py-0.5 rounded-full">1 New</span>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 bg-bbBlue/5 rounded-2xl border border-bbBlue/10 hover:bg-bbBlue/10 transition-colors cursor-pointer group">
                        <p className="text-[10px] font-bold text-bbBlue uppercase tracking-widest mb-1 group-hover:translate-x-1 transition-transform">Platform Offer</p>
                        <p className="text-[11px] font-medium text-black leading-relaxed">Admin: Enjoy 20% off your next premium booking.</p>
                      </div>
                      <p className="text-[9px] text-center font-bold text-gray-300 uppercase tracking-[0.2em] py-4 border-t border-gray-50">No other activity</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Section & Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 group active:scale-95 transition-all"
              >
                <div className="hidden sm:flex flex-col items-end leading-none">
                  <span className="text-[11px] font-bold text-black group-hover:text-bbBlue transition-colors">{user?.name}</span>
                  <span className="text-[9px] font-semibold text-gray-400 mt-1 uppercase tracking-tighter">Member ID: {user?.mobile.slice(-4)}X</span>
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
                       <p className="text-[10px] font-bold text-black truncate">{user?.mobile}</p>
                    </div>
                    <Link 
                      to="/customer-dashboard" 
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
