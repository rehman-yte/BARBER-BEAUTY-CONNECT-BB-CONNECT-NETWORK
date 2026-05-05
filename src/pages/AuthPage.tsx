import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const AuthPage: React.FC = () => {
  const { user, signInWithGoogle, loading } = useAuth();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Redirection is handled by App.tsx global routes when user state is non-null

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      localStorage.setItem('bb_intended_role', 'customer');
      await signInWithGoogle();
      // No manual navigate here - let App.tsx handle it
    } catch (err: any) { 
      const errMsg = err.message;
      console.error("GOOGLE_AUTH_FAILURE:", errMsg);
      if (errMsg.includes('auth/unauthorized-domain')) {
        setError("Firebase Error: Domain not authorized. Please add this domain to the 'Authorized domains' list in the Firebase Console (Auth > Settings).");
      } else {
        setError(`Google Auth Error: ${errMsg}`); 
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
          <h1 className="text-[1.875rem] font-serif font-bold text-charcoal mb-[0.5rem] uppercase tracking-tight">Customer Portal</h1>
          <p className="text-[0.625rem] text-bbBlue font-bold uppercase tracking-[0.4em]">Secure Access Hub</p>
        </div>

        <button onClick={handleGoogleAuth} disabled={isSubmitting} className="w-full flex items-center justify-center gap-[0.75rem] py-[1.25rem] bg-white border border-gray-100 rounded-3xl hover:bg-gray-50 transition-all mb-[2rem] group disabled:opacity-50 active:scale-95 shadow-sm">
          <svg className="w-[1.25rem] h-[1.25rem]" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
          <span className="text-[0.75rem] font-bold text-charcoal tracking-widest uppercase">Continue with Google</span>
        </button>

        {error && (
          <div className="p-[1rem] bg-red-50 border border-red-100 rounded-2xl mb-8">
            <p className="text-[0.5625rem] font-bold text-red-500 uppercase tracking-widest text-center mb-[0.25rem]">Authorization Failed</p>
            <p className="text-[0.625rem] text-red-600 font-medium text-center break-words">{error}</p>
          </div>
        )}

        <div className="mt-[2rem] text-center border-t border-gray-50 pt-8">
          <p className="text-[0.5625rem] font-bold text-gray-300 uppercase tracking-[0.4em]">
            Secure Customer Access Gateway
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;