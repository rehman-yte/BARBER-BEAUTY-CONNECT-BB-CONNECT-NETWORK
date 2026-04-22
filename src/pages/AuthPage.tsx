import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const AuthPage: React.FC = () => {
  const { user, signIn, signUp, signInWithGoogle, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      if (user.role === 'admin') {
        navigate('/admin-dashboard', { replace: true });
      } else if (user.role === 'partner') {
        // Partners should not use the Customer Portal
        setError('Partner detected. Please login through the Partner Portal at the bottom of the landing page.');
        console.warn("Blocked Partner Login on Customer Portal");
        // Optional: Auto redirect after few seconds
        setTimeout(() => navigate('/partner-signin', { replace: true }), 3000);
      } else {
        console.log("Customer session active:", user.uid);
        navigate('/customer-dashboard', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

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
          user_type: 'customer'
        });
      }
    } catch (err: any) {
      let errMsg = err.message;
      if (err.code === 'auth/email-already-in-use') {
        errMsg = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'The password is too weak. Please use at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'The email address is badly formatted.';
      } else if (err.code === 'auth/user-not-found') {
        errMsg = 'Customer profile not found. If you are a partner, please use the correct portal.';
      } else if (err.code === 'auth/wrong-password') {
        errMsg = 'Incorrect password. Please try again or reset it.';
      } else if (err.code === 'auth/invalid-credential') {
        errMsg = 'Invalid credentials. If you are a partner, please use the Partner Link on the Landing Page.';
      }
      
      console.error("AUTH_FAILURE:", errMsg);
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await signInWithGoogle();
      navigate('/customer-dashboard', { replace: true });
    } catch (err: any) { 
      const errMsg = err.message;
      console.error("GOOGLE_AUTH_FAILURE:", errMsg);
      setError(`Google Auth Error: ${errMsg}`); 
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

        <button onClick={handleGoogleAuth} disabled={isSubmitting} className="w-full flex items-center justify-center gap-[0.75rem] py-[1rem] border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all mb-[2rem] group disabled:opacity-50 active:scale-95">
          <svg className="w-[1.25rem] h-[1.25rem]" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
          <span className="text-[0.625rem] font-bold text-charcoal tracking-widest uppercase">Continue with Google</span>
        </button>

        <div className="relative mb-[2rem] text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <span className="relative px-[1rem] bg-white text-[0.5625rem] font-bold text-gray-300 uppercase tracking-[0.3em]">Credentials Hub</span>
        </div>

        <form onSubmit={handleAuth} className="space-y-[1.5rem]">
          <div className="space-y-[1rem]">
            {!isLogin && (
              <div className="flex flex-col gap-[0.5rem]">
                <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-[0.25rem]">Identity</label>
                <input required type="text" placeholder="Full Name" className="w-full px-[1.5rem] py-[1rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}

            <div className="flex flex-col gap-[0.5rem]">
              <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-[0.25rem]">Email Address</label>
              <input required type="email" placeholder="name@example.com" className="w-full px-[1.5rem] py-[1rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            
            <div className="flex flex-col gap-[0.5rem]">
              <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em] ml-[0.25rem]">Mobile</label>
              <input required type="tel" placeholder="10-digit number" className="w-full px-[1.5rem] py-[1rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all font-mono" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>

            <div className="flex flex-col gap-[0.5rem]">
              <div className="flex justify-between items-center ml-[0.25rem]">
                <label className="text-[0.5625rem] font-bold text-charcoal uppercase tracking-[0.2em]">Password</label>
                {isLogin && (
                  <button 
                    type="button"
                    onClick={() => navigate('/forgot-password?type=customer')}
                    className="text-[0.5625rem] font-bold text-bbBlue uppercase tracking-widest hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input required type="password" placeholder="••••••••" className="w-full px-[1.5rem] py-[1rem] bg-gray-50 border border-gray-100 rounded-2xl text-[0.875rem] outline-none focus:border-bbBlue transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>

          {error && (
            <div className="p-[1rem] bg-red-50 border border-red-100 rounded-2xl">
              <p className="text-[0.5625rem] font-bold text-red-500 uppercase tracking-widest text-center mb-[0.25rem]">Authorization Failed</p>
              <p className="text-[0.625rem] text-red-600 font-medium text-center break-words">{error}</p>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="w-full py-[1.25rem] bg-bbBlue text-white rounded-2xl font-bold uppercase text-[0.75rem] tracking-[0.3em] shadow-xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98] disabled:opacity-50">
            {isSubmitting ? 'Verifying...' : (isLogin ? 'Enter Portal' : 'Create Access')}
          </button>
        </form>

        <div className="mt-[2rem] text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest hover:text-bbBlue transition-colors"
          >
            {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;