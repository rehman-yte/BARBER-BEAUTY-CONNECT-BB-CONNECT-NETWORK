import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { X, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PartnerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PartnerAuthModal: React.FC<PartnerAuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithGoogle, user, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading && isOpen) {
      onClose();
      if (user.role === 'partner') {
        const path = user.onboardingComplete ? '/partner/dashboard' : '/partner/signup';
        navigate(path);
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/customer/explore');
      }
    }
  }, [user, loading, isOpen, navigate, onClose]);

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const loggedUser = await signInWithGoogle('partner');
      onClose();
      if (loggedUser.onboardingComplete) {
        navigate('/partner/dashboard');
      } else {
        navigate('/partner/signup');
      }
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.includes('auth/unauthorized-domain')) {
        setError("Firebase Error: Domain not authorized in Firebase Console (Auth > Settings).");
      } else if (errMsg.includes('popup-closed-by-user')) {
        setError("Sign-in cancelled. Please try again.");
      } else {
        setError(errMsg || "Authentication failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[28rem] bg-white border-2 border-black/10 p-[2.5rem] md:p-[3rem] rounded-[2.5rem] shadow-2xl text-center"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors"
            >
              <X size={20} />
            </button>

            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 font-bold border border-blue-100 shadow-xs">
              💈
            </div>

            <div className="mb-6">
              <h2 className="text-[1.5rem] font-serif font-black text-black mb-1 uppercase tracking-tight">
                Partner Gateway
              </h2>
              <p className="text-[0.6rem] text-blue-600 font-bold uppercase tracking-[0.3em]">
                Barber &amp; Beauty Connect Network
              </p>
            </div>

            <p className="text-xs text-gray-500 font-medium mb-6 leading-relaxed">
              Sign in with your Google account to access your salon terminal or register as a verified network partner.
            </p>

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[0.7rem] font-bold text-center leading-snug">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleAuth}
              disabled={isSubmitting}
              className="w-full py-4 px-6 bg-white border-2 border-black rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-wider text-black hover:bg-black hover:text-white transition-all shadow-md active:scale-95 disabled:opacity-50 group cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isSubmitting ? 'Authenticating...' : 'Continue with Google'}</span>
            </button>

            <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center gap-2 text-[0.625rem] text-gray-400 font-bold uppercase tracking-widest">
              <ShieldCheck size={14} className="text-green-500" />
              <span>Verified Partner Escrow Protected</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PartnerAuthModal;
