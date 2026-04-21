
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getShops, updateShop } from '../services/logic_engine';

const ForgotPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'customer'; // 'customer' or 'partner'
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [step, setStep] = useState(1); // 1: Mobile, 2: Success Message
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!/^\d{10}$/.test(mobile)) {
        throw new Error('Enter a valid 10-digit mobile number.');
      }

      const email = `${mobile}@bb.net`;
      
      // Check if user exists (optional but good for UX)
      if (type === 'partner') {
        const shops = await getShops();
        const exists = shops.some((s: any) => s.mobile === mobile);
        if (!exists) throw new Error('Mobile number not found in our partner records.');
      }

      await resetPassword(email);
      setStep(2);
      setSuccessMessage('Password reset email sent. Please check your inbox (associated with your mobile account).');
    } catch (err: any) {
      setError(err.message);
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
          <h1 className="text-[1.875rem] font-serif font-bold text-charcoal mb-[0.5rem] uppercase tracking-tight">Reset Password</h1>
          <p className="text-[0.625rem] text-bbBlue font-bold uppercase tracking-[0.4em]">
            {type === 'partner' ? 'Partner Portal' : 'Customer Portal'}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendResetEmail} className="space-y-[1.5rem]">
            <div className="flex flex-col gap-[0.5rem]">
              <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-[0.25rem]">Registered Mobile Number</label>
              <input 
                required 
                type="tel" 
                placeholder="10-digit number" 
                className="w-full px-[1.5rem] py-[1rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all font-mono" 
                value={mobile} 
                onChange={(e) => setMobile(e.target.value)} 
              />
            </div>

            {error && (
              <div className="p-[1rem] bg-red-50 border border-red-100 rounded-2xl">
                <p className="text-[0.625rem] text-red-600 font-medium text-center">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full py-[1.25rem] bg-bbBlue text-white rounded-2xl font-bold uppercase text-[0.75rem] tracking-[0.3em] shadow-xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Send Reset Email'}
            </button>
          </form>
        ) : (
          <div className="space-y-[1.5rem] text-center">
            <div className="p-[1.5rem] bg-emerald-50 border border-emerald-100 rounded-3xl">
              <p className="text-[0.75rem] text-emerald-600 font-medium leading-relaxed">{successMessage}</p>
            </div>
            <button 
              onClick={() => navigate(type === 'partner' ? '/partner-signin' : '/auth')} 
              className="w-full py-[1.25rem] bg-bbBlue text-white rounded-2xl font-bold uppercase text-[0.75rem] tracking-[0.3em] shadow-xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98]"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
