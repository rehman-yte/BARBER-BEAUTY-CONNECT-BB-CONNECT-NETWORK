
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { X } from 'lucide-react';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, { 
          name: name || 'Valued Customer', 
          mobile,
          role: 'customer',
          user_type: 'customer' // Specific directive requirement
        });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await signInWithGoogle();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
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
            className="relative w-full max-w-[28rem] bg-white border border-gray-100 p-[2.5rem] md:p-[3rem] rounded-[3rem] shadow-2xl"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-300 hover:text-charcoal transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-[2rem]">
              <h2 className="text-[1.5rem] font-serif font-bold text-charcoal mb-[0.5rem] uppercase tracking-tight">
                {isLogin ? 'Customer Login' : 'Create Account'}
              </h2>
              <p className="text-[0.5625rem] text-bbBlue font-bold uppercase tracking-[0.4em]">Essential Network Access</p>
            </div>

            <button 
              onClick={handleGoogleAuth} 
              disabled={isSubmitting} 
              className="w-full flex items-center justify-center gap-[0.75rem] py-[0.875rem] border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all mb-[1.5rem] group disabled:opacity-50 active:scale-95"
            >
              <svg className="w-[1.25rem] h-[1.25rem]" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-[0.625rem] font-bold text-charcoal tracking-widest uppercase">Continue with Google</span>
            </button>

            <div className="relative mb-[1.5rem] text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <span className="relative px-[1rem] bg-white text-[0.5rem] font-bold text-gray-300 uppercase tracking-[0.3em]">OR USE EMAIL</span>
            </div>

            <form onSubmit={handleAuth} className="space-y-[1.25rem]">
              {!isLogin && (
                <div className="space-y-1">
                  <label className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest ml-4">Full Name</label>
                  <input required type="text" placeholder="John Doe" className="w-full px-[1.5rem] py-[0.875rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest ml-4">Email Address</label>
                <input required type="email" placeholder="name@example.com" className="w-full px-[1.5rem] py-[0.875rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {!isLogin && (
                <div className="space-y-1">
                  <label className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest ml-4">Mobile Number</label>
                  <input required type="tel" placeholder="10-digit mobile" className="w-full px-[1.5rem] py-[0.875rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest ml-4">Password</label>
                <input required type="password" placeholder="••••••••" className="w-full px-[1.5rem] py-[0.875rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              {error && <p className="text-[0.625rem] text-red-500 font-bold uppercase tracking-widest text-center">{error}</p>}

              <button type="submit" disabled={isSubmitting} className="w-full py-[1rem] bg-bbBlue text-white rounded-2xl font-bold uppercase text-[0.625rem] tracking-[0.3em] shadow-lg shadow-bbBlue/20 hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50">
                {isSubmitting ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            <div className="mt-[1.5rem] text-center">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest hover:text-bbBlue transition-colors"
              >
                {isLogin ? "New to the Network? Create Account" : "Already a Member? Sign In"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CustomerAuthModal;
