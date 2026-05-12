import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';

type Role = 'customer' | 'partner' | 'admin';

const AuthPage: React.FC = () => {
  const { user, signIn, signInWithGoogle, loading } = useAuth();
  const [role, setRole] = useState<Role>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      if (user.role === 'customer') {
        navigate('/customer/explore', { replace: true });
      } else if (user.role === 'partner') {
        const path = user.onboardingComplete ? '/partner/dashboard' : '/onboarding';
        navigate(path, { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await signIn(email, password, role);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await signInWithGoogle(role);
    } catch (err: any) { 
      setError(err.message || 'Google login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roles: { id: Role; label: string; icon: string }[] = [
    { id: 'customer', label: 'Customer', icon: '👤' },
    { id: 'partner', label: 'Partner', icon: '💼' },
    { id: 'admin', label: 'Admin', icon: '🔐' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-[10rem] pb-[5rem] px-[5%] flex justify-center items-start">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[28rem] bg-white border border-gray-100 p-[2rem] md:p-[2.5rem] rounded-[2.5rem] shadow-2xl shadow-charcoal/5"
      >
        <div className="text-center mb-8">
          <h1 className="text-[1.75rem] font-serif font-bold text-charcoal mb-2 uppercase tracking-tight">Unified Access</h1>
          <p className="text-[0.625rem] text-bbBlue font-bold uppercase tracking-[0.3em]">Select your portal below</p>
        </div>

        {/* Role Toggles */}
        <div className="flex bg-gray-50 p-1.5 rounded-2xl mb-8 border border-gray-100">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all duration-300 relative ${
                role === r.id ? 'text-bbBlue' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-lg mb-1">{r.icon}</span>
              <span className="text-[0.5625rem] font-bold uppercase tracking-widest">{r.label}</span>
              {role === r.id && (
                <motion.div 
                  layoutId="activeRole"
                  className="absolute inset-0 bg-white shadow-sm border border-gray-200/50 rounded-xl -z-10"
                />
              )}
            </button>
          ))}
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 bg-red-50 border border-red-100 rounded-2xl mb-6 text-center"
          >
            <p className="text-[0.625rem] text-red-600 font-bold">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest ml-4">Email Address</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-3xl text-[0.875rem] font-medium outline-none focus:border-bbBlue/30 transition-all"
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest ml-4">Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-3xl text-[0.875rem] font-medium outline-none focus:border-bbBlue/30 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-4 bg-black text-white rounded-3xl font-bold uppercase tracking-widest text-[0.75rem] hover:bg-gray-900 transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-black/10"
          >
            {isSubmitting ? 'Verifying...' : `Login as ${role}`}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <div className="relative flex justify-center text-[0.625rem] uppercase font-bold text-gray-300 bg-white px-4 tracking-[0.25em]">Or continue with</div>
        </div>

        <button 
          onClick={handleGoogleAuth} 
          disabled={isSubmitting} 
          className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-gray-100 rounded-3xl hover:bg-gray-50 transition-all group disabled:opacity-50 active:scale-95 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
          <span className="text-[0.75rem] font-bold text-charcoal tracking-widest uppercase">Google Account</span>
        </button>

        <div className="mt-8 text-center pt-4 opacity-30">
          <p className="text-[0.5rem] font-bold text-gray-500 uppercase tracking-[0.5em]">BB Network Security Layer v4.0</p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
