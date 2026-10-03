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
      console.log(`[AUTH ROUTER] User Role: ${user.role}, Onboarding: ${user.onboardingComplete}`);
      if (user.role === 'customer') {
        navigate('/customer/explore', { replace: true });
      } else if (user.role === 'partner') {
        // Explicitly check onboardingComplete to force /partner/signup for new partners
        const path = user.onboardingComplete ? '/partner/dashboard' : '/partner/signup';
        navigate(path, { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const loggedUser = await signInWithGoogle(role);
      const isOfficialAdmin = (loggedUser.email || '').toLowerCase().trim() === 'haidartheworldking@gmail.com' || loggedUser.role === 'admin';
      if (isOfficialAdmin) {
        navigate('/admin/dashboard', { replace: true });
      } else if (loggedUser.role === 'partner') {
        const path = loggedUser.onboardingComplete ? '/partner/dashboard' : '/partner/signup';
        navigate(path, { replace: true });
      } else {
        navigate('/customer-dashboard', { replace: true });
      }
    } catch (err: any) { 
      setError(err.message || 'Google login failed.');
      setIsSubmitting(false);
    }
  };

  const roles: { id: Role; label: string; icon: string }[] = [
    { id: 'customer', label: 'Customer', icon: '👤' },
    { id: 'partner', label: 'Partner', icon: '💼' },
    { id: 'admin', label: 'Admin', icon: '🔐' },
  ];

  return (
    <div className="min-h-screen bg-white pt-[7.5rem] sm:pt-[8.5rem] pb-16 px-4 flex justify-center items-start relative overflow-hidden">
      {/* Background Micro Grid */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#0052FF_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.04]"
      />
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl"
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-[28rem] bg-white border-3 border-black p-6 sm:p-8 rounded-3xl shadow-[10px_10px_0px_0px_#0052FF] relative z-10"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-widest text-blue-600 uppercase mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>SECURE GATEWAY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-black uppercase tracking-tight">Unified Access</h1>
          <p className="text-xs text-black/60 font-bold uppercase tracking-wider mt-1">Select your account portal</p>
        </div>

        {/* Role Toggles */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-6 border-2 border-black">
          {roles.map((r) => {
            const isSelected = role === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`flex-1 flex flex-col items-center py-2.5 rounded-xl transition-all duration-200 relative ${
                  isSelected ? 'text-white' : 'text-black/70 hover:text-black'
                }`}
              >
                <span className="text-base mb-0.5">{r.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-wider">{r.label}</span>
                {isSelected && (
                  <motion.div 
                    layoutId="activeRole"
                    className="absolute inset-0 bg-black rounded-xl -z-10 shadow-sm"
                  />
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-3.5 bg-red-50 border-2 border-red-500 rounded-xl mb-5 text-center"
          >
            <p className="text-xs text-red-600 font-black">{error}</p>
          </motion.div>
        )}

        <div className="space-y-5">
          <div className={`p-4 rounded-2xl border-2 text-center transition-colors ${
            role === 'admin' 
              ? 'bg-amber-50 border-amber-500 text-amber-950' 
              : 'bg-blue-50/70 border-blue-600/30 text-blue-950'
          }`}>
            <p className="text-xs font-semibold leading-relaxed">
              {role === 'admin' ? (
                <>
                  <span className="font-black block mb-1">🔐 Master Admin Security Protocol</span>
                  Admin Portal access is strictly verified for authorized account: <span className="font-black font-mono underline">haidartheworldking@gmail.com</span>
                </>
              ) : (
                'Google Account verification is required for instant, zero-fraud authentication on BB Connect.'
              )}
            </p>
          </div>

          <button 
            onClick={handleGoogleAuth} 
            disabled={isSubmitting} 
            className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl border-2 border-black font-black uppercase text-xs sm:text-sm tracking-wider transition-all group disabled:opacity-50 active:scale-95 shadow-[4px_4px_0px_0px_#000000]"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /></svg>
                <span>
                  {role === 'admin' ? 'Verify Official Admin' : 'Continue with Google'}
                </span>
              </>
            )}
          </button>
        </div>

        <div className="mt-6 text-center pt-3 border-t-2 border-black/10">
          <p className="text-[10px] font-mono font-bold text-black/50 uppercase tracking-widest">
            BB NETWORK PROTOCOL · 256-BIT ESCROW SECURITY
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
