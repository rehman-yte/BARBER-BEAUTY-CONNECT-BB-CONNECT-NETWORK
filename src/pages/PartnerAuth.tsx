
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const PartnerAuth: React.FC = () => {
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const handlePartnerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      console.log("Partner Auth Initiated: Establishing credentials...");
      
      if (!email) throw new Error("Email Address is required");

      await signUp(email, password, { role: 'partner', mobile: mobile });
      
      console.log("Auth Success: Moving to Deep Onboarding Form...");
      localStorage.setItem('bb_partner_mobile', mobile);
      localStorage.setItem('bb_partner_password', password);
      
      navigate('/onboarding');
    } catch (err: any) {
      console.error("Partner Signup Failure:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Account already exists with this email address. Please Sign-In.');
      } else {
        setError(err.message || 'Failed to initialize registration. Please try again.');
      }
    } finally {
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
          <h1 className="text-[1.875rem] font-serif font-bold text-charcoal mb-[0.5rem] uppercase tracking-tight">Partner Portal</h1>
          <p className="text-[0.625rem] text-bbBlue font-bold uppercase tracking-[0.4em]">Join Our Network</p>
        </div>

        <form onSubmit={handlePartnerAuth} className="space-y-[1.5rem]">
          <div className="space-y-[1rem]">
            <div className="flex flex-col gap-[0.5rem]">
              <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-[0.25rem]">Email Address</label>
              <input required type="email" placeholder="example@mail.com" className="w-full px-[1.5rem] py-[1rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            
            <div className="flex flex-col gap-[0.5rem]">
              <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-[0.25rem]">Mobile Number</label>
              <input required type="tel" placeholder="10-digit number" className="w-full px-[1.5rem] py-[1rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all font-mono" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>

            <div className="flex flex-col gap-[0.5rem]">
              <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-[0.25rem]">Create Password</label>
              <input required type="password" placeholder="••••••••" className="w-full px-[1.5rem] py-[1rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>

          {error && (
            <div className="p-[1rem] bg-red-50 border border-red-100 rounded-2xl">
              <p className="text-[0.625rem] text-red-600 font-medium text-center">{error}</p>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="w-full py-[1.25rem] bg-bbBlue text-white rounded-2xl font-bold uppercase text-[0.75rem] tracking-[0.3em] shadow-xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98] disabled:opacity-50">
            {isSubmitting ? 'Verifying...' : 'Start Registration'}
          </button>
        </form>

        <div className="mt-[2rem] text-center">
          <Link to="/partner-signin" className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest hover:text-bbBlue transition-colors">
            Already registered? Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default PartnerAuth;
