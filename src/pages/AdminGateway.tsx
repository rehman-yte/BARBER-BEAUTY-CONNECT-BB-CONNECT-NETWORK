
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

const AdminGateway: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { signIn, bypassLogin } = useAuth();

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // GLOBAL ADMIN BYPASS FOR PREVIEW (MANDATORY OVERRIDE)
    if (email === 'haidartheworldking@gmail.com' && password === 'TheKing1278@') {
      console.log('Admin Bypass Verified: Initiating Session Establishment...');
      bypassLogin('haidartheworldking@gmail.com', 'admin');
      navigate('/admin-dashboard', { replace: true });
      return;
    }

    try {
      // 1. Strict Credential Verification (Hardcoded Bypass)
      const isAdminEmail = email === 'haidartheworldking@gmail.com';
      const isAdminPass = password === 'TheKing1278@';

      if (!isAdminEmail || !isAdminPass) {
        throw new Error('UNAUTHORIZED: Access Denied. These are not administrative credentials.');
      }
      
      // 2. Perform Firebase Auth
      console.log("Initiating Administrative Handshake...");
      await signIn(email, password);

      // 3. Robust Redirection Logic
      // We wait for the AuthContext to propagate the role change
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        const currentUser = auth.currentUser;
        
        if (currentUser && currentUser.email === 'haidartheworldking@gmail.com') {
          clearInterval(checkInterval);
          console.log("Authentication Confirmed. Redirecting to Infrastructure Dashboard.");
          navigate('/admin', { replace: true });
        } else if (attempts > 10) {
          clearInterval(checkInterval);
          setError('Handshake Timeout: Infrastructure failed to verify identity in time. Please refresh and try again.');
          setIsSubmitting(false);
          signOut(auth);
        }
      }, 500);

    } catch (err: any) {
      console.error("ADMIN_GATEWAY_FAILURE:", err.message);
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-[8rem] pb-[5rem] px-[5%] flex justify-center items-start">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[28rem] bg-white border border-gray-100 p-[2.5rem] md:p-[3rem] rounded-[3rem] shadow-xl shadow-charcoal/5"
      >
        <div className="text-center mb-[2.5rem]">
          <h1 className="text-[1.875rem] font-serif font-bold text-charcoal mb-[0.5rem] uppercase tracking-tight">Admin Gateway</h1>
          <p className="text-[0.625rem] text-bbBlue font-bold uppercase tracking-[0.4em]">Infrastructure Control Panel</p>
        </div>

        <form onSubmit={handleAdminSignIn} className="space-y-[1.5rem]">
          <div className="space-y-[1rem]">
            <div className="flex flex-col gap-[0.5rem]">
              <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-[0.25rem]">Administrator ID</label>
              <input 
                required 
                type="email" 
                placeholder="master@bbconnect.net" 
                className="w-full px-[1.5rem] py-[1rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all font-mono" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
            
            <div className="flex flex-col gap-[0.5rem]">
              <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-[0.25rem]">Security Token</label>
              <input 
                required 
                type="password" 
                placeholder="••••••••" 
                className="w-full px-[1.5rem] py-[1rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
          </div>

          {error && (
            <div className="p-[1rem] bg-red-50 border border-red-100 rounded-2xl">
              <p className="text-[0.5625rem] font-bold text-red-500 uppercase tracking-widest text-center mb-[0.25rem]">Security Violation</p>
              <p className="text-[0.625rem] text-red-600 font-medium text-center break-words uppercase leading-relaxed">{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full py-[1.25rem] bg-charcoal text-white rounded-2xl font-bold uppercase text-[0.75rem] tracking-[0.3em] shadow-xl shadow-charcoal/20 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? 'Verifying Credentials...' : 'Authorize Global Access'}
          </button>
        </form>

        <div className="mt-[2rem] text-center">
          <p className="text-[0.5rem] text-gray-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
            Authorized Personnel Only. Deployment via Termux Detected.<br/>
            Secure Socket Layer Verification Required.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminGateway;
