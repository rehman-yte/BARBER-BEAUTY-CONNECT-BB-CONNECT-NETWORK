
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { X } from 'lucide-react';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await signInWithGoogle('customer');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      const errMsg = err.message;
      if (errMsg.includes('auth/unauthorized-domain')) {
        setError("Firebase Error: Domain not authorized. Please add this domain to the 'Authorized domains' list in the Firebase Console (Auth > Settings).");
      } else {
        setError(errMsg);
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
            className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[28rem] bg-white border-3 border-black p-6 sm:p-8 rounded-3xl shadow-[10px_10px_0px_0px_#0052FF]"
          >
            <button 
              onClick={onClose}
              className="absolute top-5 right-5 p-2 bg-black text-white rounded-xl hover:bg-blue-600 transition-colors shadow-xs"
            >
              <X size={18} />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-widest text-blue-600 uppercase mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>CUSTOMER GATEWAY</span>
              </div>
              <h2 className="text-2xl font-black text-black uppercase tracking-tight">
                Customer Sign In
              </h2>
              <p className="text-xs text-black/60 font-bold uppercase tracking-wider mt-0.5">Instant Slot Booking &amp; Escrow Safety</p>
            </div>

            <button 
              onClick={handleGoogleAuth} 
              disabled={isSubmitting} 
              className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl border-2 border-black font-black uppercase text-xs sm:text-sm tracking-wider transition-all disabled:opacity-50 active:scale-95 shadow-[4px_4px_0px_0px_#000000]"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /></svg>
              <span>{isSubmitting ? 'Authenticating...' : 'Continue with Google'}</span>
            </button>

            {error && <p className="text-xs text-red-600 font-black tracking-wide text-center mt-4 bg-red-50 p-3 rounded-xl border-2 border-red-500">{error}</p>}

            <div className="mt-6 text-center border-t-2 border-black/10 pt-4">
              <p className="text-[10px] font-mono font-bold text-black/50 uppercase tracking-widest">
                Safe &amp; Secure 256-Bit Escrow Protection
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CustomerAuthModal;
