import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  Key, 
  X, 
  PowerOff, 
  LogIn,
  CheckCircle2
} from 'lucide-react';
import { useAuth, OFFICIAL_ADMIN_EMAIL } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { updateSettings } from '../services/logic_engine';
import { PersistenceService } from '../services/PersistenceService';
import { adminConfig } from '../lib/firebase';

const MaintenancePage: React.FC = () => {
  const { user, signInWithGoogle, bypassLogin, signIn } = useAuth();
  const navigate = useNavigate();

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const isAdmin = user?.role === 'admin' || (user?.email || '').toLowerCase().trim() === OFFICIAL_ADMIN_EMAIL.toLowerCase().trim();

  // Quick turn-off maintenance mode directly from the maintenance screen
  const handleTurnOffMaintenance = async () => {
    setIsSubmitting(true);
    try {
      await updateSettings({ maintenanceMode: false });
      PersistenceService.save('system_maintenance', false);
      setActionSuccess('Global Maintenance Mode has been DISABLED! Website is now LIVE for all users.');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setAuthError('Failed to disable maintenance mode: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google Sign-In for Admin
  const handleAdminGoogleSignIn = async () => {
    setIsSubmitting(true);
    setAuthError('');
    try {
      await signInWithGoogle('admin');
      setShowAdminModal(false);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setAuthError(err.message || 'Google admin sign-in failed. Please verify with haidartheworldking@gmail.com');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password / Master Key Sign-In for Admin
  const handleAdminPasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      setAuthError('Please enter the Admin Security Password / Master Key');
      return;
    }

    setIsSubmitting(true);
    setAuthError('');

    try {
      // 1. Check Master Key from adminConfig
      const expectedSecret = adminConfig.adminSecret || 'TheKing1278@';
      if (adminPassword.trim() === expectedSecret || adminPassword.trim() === 'TheKing1278@') {
        bypassLogin(OFFICIAL_ADMIN_EMAIL, 'admin');
        setShowAdminModal(false);
        navigate('/admin/dashboard');
        return;
      }

      // 2. Otherwise try Firebase email + password auth
      await signIn(OFFICIAL_ADMIN_EMAIL, adminPassword.trim(), 'admin');
      setShowAdminModal(false);
      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error('Admin unlock failed:', err);
      setAuthError('Authentication failed. Invalid Admin Master Key or Password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-[#0A0D14] text-white flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-y-auto">
      {/* Top Protocol Status Bar */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
            <ShieldAlert size={16} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
              BB CONNECT NETWORK
            </span>
            <span className="block text-[8px] font-bold uppercase tracking-widest text-red-400">
              Protocol Maintenance Active
            </span>
          </div>
        </div>

        {/* Live Traffic Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          <span className="text-[9px] font-black uppercase tracking-wider text-red-300">
            All Traffic Suspended
          </span>
        </div>
      </header>

      {/* Center Maintenance Message */}
      <main className="w-full max-w-xl mx-auto my-auto py-10 flex flex-col items-center text-center">
        {/* Animated Visual Icon */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-8"
        >
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-2xl shadow-red-900/30">
            <Clock size={48} className="animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-[#111827] border border-white/20 flex items-center justify-center text-yellow-400">
            <AlertTriangle size={14} />
          </div>
        </motion.div>

        {/* Scheduled Maintenance Badge */}
        <motion.span 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-[0.25em] mb-4"
        >
          Scheduled Protocol Maintenance
        </motion.span>

        {/* EXACT REQUIRED TEXT */}
        <motion.h1 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl sm:text-4xl font-serif font-black tracking-tight text-white mb-4 leading-snug"
        >
          Website is under maintenance, please wait some time.
        </motion.h1>

        <motion.p 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs sm:text-sm text-gray-400 font-medium leading-relaxed max-w-md mb-8"
        >
          Hamari website par is samay system updates aur maintenance ka kaam chal raha hai. Sabhi user gateways temporarily rok diye gaye hain. Kripya thoda intezaar karein, website jald hi wapas live ho jayegi.
        </motion.p>

        {/* Action success alert */}
        {actionSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="w-full p-4 mb-6 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} /> {actionSuccess}
          </motion.div>
        )}

        {/* Status Metrics Box */}
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 flex items-center justify-around gap-4 text-left mb-8">
          <div>
            <span className="block text-[8px] font-black uppercase tracking-widest text-gray-400">System Gateway</span>
            <span className="text-xs font-bold text-red-400 uppercase">Offline (Protected)</span>
          </div>
          <div className="w-[1px] h-8 bg-white/10"></div>
          <div>
            <span className="block text-[8px] font-black uppercase tracking-widest text-gray-400">Customer & Partner</span>
            <span className="text-xs font-bold text-gray-300 uppercase">Traffic Redirected</span>
          </div>
          <div className="w-[1px] h-8 bg-white/10"></div>
          <div>
            <span className="block text-[8px] font-black uppercase tracking-widest text-gray-400">Restoration Control</span>
            <span className="text-xs font-bold text-emerald-400 uppercase">Admin Overwrite</span>
          </div>
        </div>

        {/* ADMIN DEDICATED CONTROL BOX (IF LOGGED IN AS ADMIN) */}
        {isAdmin ? (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 text-left shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                    Official Admin Verified: {OFFICIAL_ADMIN_EMAIL}
                  </p>
                  <p className="text-[8px] text-emerald-400/80 uppercase font-bold tracking-wider">
                    Full Administrative Overwrite & Dashboard Access Granted
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Button 1: Open Admin Dashboard */}
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                Enter Admin Dashboard <ArrowRight size={14} />
              </button>

              {/* Button 2: Turn OFF Maintenance Mode Right Here */}
              <button
                onClick={handleTurnOffMaintenance}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-red-600/80 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 border border-red-500/50 shadow-lg"
              >
                <PowerOff size={14} />
                {isSubmitting ? 'Deactivating...' : 'Turn OFF Maintenance Mode'}
              </button>
            </div>
          </div>
        ) : (
          /* IF ADMIN IS NOT LOGGED IN: SPECIAL UNLOCK GATEWAY BUTTON */
          <div className="w-full flex flex-col items-center">
            <button
              onClick={() => {
                setShowAdminModal(true);
                setAuthError('');
              }}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center gap-2.5 shadow-lg group hover:border-amber-400/50"
            >
              <Lock size={14} className="text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Admin Gateway Access ({OFFICIAL_ADMIN_EMAIL})</span>
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 text-center sm:text-left">
        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
          © {new Date().getFullYear()} BB Connect Protocols • Central Server Operations
        </p>

        {!isAdmin && (
          <button
            onClick={() => setShowAdminModal(true)}
            className="text-[9px] text-amber-400/80 hover:text-amber-300 uppercase tracking-widest font-black transition-all flex items-center gap-1.5"
          >
            <Key size={12} /> Admin Unlock System
          </button>
        )}
      </footer>

      {/* ADMIN UNLOCK MODAL */}
      <AnimatePresence>
        {showAdminModal && (
          <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#111622] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl text-white relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowAdminModal(false)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Key size={22} />
                </div>
                <div>
                  <h3 className="text-base font-serif font-black uppercase tracking-tight text-white">
                    Admin Protocol Unlock
                  </h3>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                    Target Account: <span className="text-amber-400 font-mono">{OFFICIAL_ADMIN_EMAIL}</span>
                  </p>
                </div>
              </div>

              {authError && (
                <div className="p-3.5 mb-5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-[10px] font-bold">
                  {authError}
                </div>
              )}

              {/* OPTION 1: Google Sign-in */}
              <div className="space-y-4">
                <button
                  onClick={handleAdminGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-white hover:bg-gray-100 text-black text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  </svg>
                  {isSubmitting ? 'Authenticating...' : 'Unlock via Official Google Account'}
                </button>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-[1px] bg-white/10"></div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">OR MASTER KEY</span>
                  <div className="flex-1 h-[1px] bg-white/10"></div>
                </div>

                {/* OPTION 2: Master Password / PIN Form */}
                <form onSubmit={handleAdminPasswordUnlock} className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                      Admin Password or Master Key
                    </label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter Master Password / Key..."
                      className="w-full bg-white/5 border border-white/10 focus:border-amber-400 rounded-xl px-4 py-3.5 text-xs text-white placeholder-gray-500 outline-none transition-all font-mono"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 font-black shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    <LogIn size={14} />
                    {isSubmitting ? 'Verifying...' : 'Authorize Admin Session'}
                  </button>
                </form>
              </div>

              <p className="text-[8px] text-gray-500 text-center uppercase tracking-widest font-bold mt-6">
                Strict Security Protocol: Only {OFFICIAL_ADMIN_EMAIL} is granted administrative bypass permissions.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MaintenancePage;
