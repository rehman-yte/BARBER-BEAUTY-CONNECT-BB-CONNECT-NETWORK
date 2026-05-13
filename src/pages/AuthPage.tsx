import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';

type Role = 'customer' | 'partner' | 'admin';

const AuthPage: React.FC = () => {
  const { user, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('role') as Role;
    return (r === 'partner' || r === 'admin' || r === 'customer') ? r : 'customer';
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // GLOBAL REDIRECTION LOGIC
  useEffect(() => {
    if (user && !loading) {
      console.log(`[AUTH ARCHITECT] Identifying Route | User: ${user.email} | Role: ${user.role} | Onboarding: ${user.onboardingComplete}`);
      
      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'partner') {
        // STEP C & STEP E Logic: Found vs New Partner
        if (user.onboardingComplete) {
          console.log("[AUTH ARCHITECT] Existing Partner -> Terminal");
          navigate('/partner/dashboard', { replace: true });
        } else {
          console.log("[AUTH ARCHITECT] New/Incomplete Partner -> Registration Workflow");
          navigate('/onboarding', { replace: true });
        }
      } else if (user.role === 'customer') {
        navigate('/customer/explore', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  // LOADING TIMEOUT: 7 seconds before showing fallback error
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSubmitting) {
      timer = setTimeout(() => {
        setIsSubmitting(false);
        setError("Identity verification is taking longer than expected. Please try again or check your Google Account permissions.");
      }, 7000);
    }
    return () => clearTimeout(timer);
  }, [isSubmitting]);

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      console.log(`[AUTH] Initiating Google Auth for Role: ${role}`);
      await signInWithGoogle(role);
    } catch (err: any) { 
      setError(err.message || 'Google Authentication Failed.');
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
          <h1 className="text-[1.75rem] font-serif font-bold text-charcoal mb-2 uppercase tracking-tight">Access Gateway</h1>
          <p className="text-[0.625rem] text-bbBlue font-bold uppercase tracking-[0.3em]">Proprietor & Member Network</p>
        </div>

        {/* Roles Toggle */}
        <div className="flex bg-gray-50 p-1.5 rounded-2xl mb-8 border border-gray-100">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setRole(r.id);
                setError('');
              }}
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-red-50 border border-red-100 rounded-2xl mb-6 text-center"
          >
            <p className="text-[0.625rem] text-red-600 font-bold uppercase tracking-widest">{error}</p>
          </motion.div>
        )}

        <div className="space-y-6">
          <div className="p-6 bg-bbBlue/5 rounded-[2rem] border border-bbBlue/10 text-center">
            <p className="text-[0.625rem] font-bold text-bbBlue leading-relaxed uppercase tracking-widest">
              Biometric & Google Authentication Required.
            </p>
            {role === 'partner' && (
              <p className="mt-2 text-[0.5rem] text-charcoal/40 uppercase font-bold tracking-widest">
                New Partners will be redirected to onboarding.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <button 
              onClick={handleGoogleAuth} 
              disabled={isSubmitting} 
              className="w-full flex items-center justify-center gap-3 py-5 bg-black text-white rounded-3xl hover:bg-gray-900 transition-all group disabled:opacity-50 active:scale-95 shadow-xl shadow-black/20"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /></svg>
                  <span className="text-[0.875rem] font-bold tracking-widest uppercase">
                    {role === 'admin' ? 'Admin Access' : (role === 'partner' ? 'Partner Login' : 'Customer Account')}
                  </span>
                </>
              )}
            </button>

            {role === 'partner' && (
              <button 
                onClick={handleGoogleAuth}
                disabled={isSubmitting}
                className="w-full py-5 border-2 border-bbBlue text-bbBlue rounded-3xl font-bold uppercase text-[0.75rem] tracking-[0.3em] hover:bg-bbBlue hover:text-white transition-all shadow-lg shadow-bbBlue/5 active:scale-95"
              >
                New Partner? Join Our Network
              </button>
            )}
          </div>
        </div>

        <div className="mt-12 text-center opacity-20">
          <p className="text-[0.5rem] font-bold text-gray-500 uppercase tracking-[0.5em]">BB Security Engine v6.1 — Role Isolation Active</p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
