
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getShops } from '../services/logic_engine';
import { useAuth } from '../context/AuthContext';

const PartnerSignIn: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      if (user.role === 'admin') {
        navigate('/admin-dashboard', { replace: true });
      } else if (user.role === 'partner') {
        if (!user.onboardingComplete) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/partner-dashboard', { replace: true });
        }
      } else {
        navigate('/customer-dashboard', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      let errMsg = err.message;
      if (err.code === 'auth/user-not-found') {
        errMsg = 'Partner account not found. Are you registered as a Merchant?';
      } else if (err.code === 'auth/wrong-password') {
        errMsg = 'Incorrect security token. Please try again.';
      } else if (err.code === 'auth/invalid-credential') {
        errMsg = 'Invalid credentials. If you are a customer, please use the Header "Sign In" link.';
      }
      setError(errMsg);
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
          <p className="text-[0.625rem] text-bbBlue font-bold uppercase tracking-[0.4em]">Secure Sign-In</p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-[1.5rem]">
          <div className="space-y-[1rem]">
            <div className="flex flex-col gap-[0.5rem]">
              <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-[0.25rem]">Email Address</label>
              <input required type="email" placeholder="example@mail.com" className="w-full px-[1.5rem] py-[1rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            
            <div className="flex flex-col gap-[0.5rem]">
              <div className="flex justify-between items-center ml-[0.25rem]">
                <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em]">Password</label>
                <button 
                  type="button"
                  onClick={() => navigate('/forgot-password?type=partner')}
                  className="text-[0.5625rem] font-bold text-bbBlue uppercase tracking-widest hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <input required type="password" placeholder="••••••••" className="w-full px-[1.5rem] py-[1rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>

          {error && (
            <div className="p-[1rem] bg-red-50 border border-red-100 rounded-2xl">
              <p className="text-[0.625rem] text-red-600 font-medium text-center">{error}</p>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="w-full py-[1.25rem] bg-bbBlue text-white rounded-2xl font-bold uppercase text-[0.75rem] tracking-[0.3em] shadow-xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98] disabled:opacity-50">
            {isSubmitting ? 'Verifying...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-[2rem] text-center">
          <Link to="/partner-auth" className="text-[0.5625rem] font-bold text-gray-400 uppercase tracking-widest hover:text-bbBlue transition-colors">
            New partner? Start Registration
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default PartnerSignIn;
