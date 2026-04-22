
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { X, Smartphone, Lock, Mail, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PartnerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PartnerAuthModal: React.FC<PartnerAuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePartnerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isLogin) {
        // Handle both raw email and mobile-mask email for legacy/flexibility
        const authEmail = email.includes('@') ? email : `${email}@bb.net`;
        if (!authEmail) throw new Error("Email or Mobile is required");
        await signIn(authEmail, password);
        navigate('/onboarding');
      } else {
        // Registration now uses explicit Email field
        if (!email) throw new Error("Email Address is required");
        
        await signUp(email, password, { 
          role: 'partner',
          mobile: mobile,
          status: null // SYSTEM DIRECTIVE: Initialize with null
        });
        
        // Persist session data for onboarding form
        localStorage.setItem('bb_partner_mobile', mobile);
        localStorage.setItem('bb_partner_password', password);
        
        navigate('/onboarding');
      }
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in or use a different email.');
      } else {
        setError(err.message);
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
                {isLogin ? 'Partner Sign In' : 'Partner Registration'}
              </h2>
              <p className="text-[0.5625rem] text-bbBlue font-bold uppercase tracking-[0.4em]">Elite Network Access</p>
            </div>

            <form onSubmit={handlePartnerAuth} className="space-y-[1.25rem]">
              {!isLogin && (
                <div className="space-y-1">
                  <label className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest ml-4">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input required type="email" placeholder="example@mail.com" className="w-full pl-[3rem] pr-[1.5rem] py-[0.875rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest ml-4">
                  {isLogin ? 'Mobile or Email' : 'Mobile Number'}
                </label>
                <div className="relative">
                  {isLogin ? (
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  ) : (
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  )}
                  <input 
                    required 
                    type={isLogin ? "text" : "tel"} 
                    placeholder={isLogin ? "Email or Mobile" : "10-digit mobile"} 
                    className="w-full pl-[3rem] pr-[1.5rem] py-[0.875rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all" 
                    value={isLogin ? email : mobile} 
                    onChange={(e) => isLogin ? setEmail(e.target.value) : setMobile(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest ml-4">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input required type="password" placeholder="••••••••" className="w-full pl-[3rem] pr-[1.5rem] py-[0.875rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>

              {error && <p className="text-[0.625rem] text-red-500 font-bold uppercase tracking-widest text-center">{error}</p>}

              <button type="submit" disabled={isSubmitting} className="w-full py-[1rem] bg-bbBlue text-white rounded-2xl font-bold uppercase text-[0.625rem] tracking-[0.3em] shadow-lg shadow-bbBlue/20 hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50">
                {isSubmitting ? 'Processing...' : (isLogin ? 'Enter Dashboard' : 'Start Onboarding')}
              </button>
            </form>

            <div className="mt-[1.5rem] text-center">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest hover:text-bbBlue transition-colors"
              >
                {isLogin ? "New Merchant? Join Network" : "Existing Partner? Sign In"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PartnerAuthModal;
