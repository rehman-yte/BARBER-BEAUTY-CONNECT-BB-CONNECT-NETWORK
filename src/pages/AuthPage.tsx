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
      await signInWithGoogle(role);
      // Logic for redirection will be handled by the useEffect or by checking manually here
      // But the instructions specify checking collections after login.
      // signInWithGoogle in AuthContext handles the popup.
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

        <div className="space-y-6">
          <div className="p-6 bg-bbBlue/5 rounded-[2rem] border border-bbBlue/10 text-center">
            <p className="text-[0.6875rem] font-medium text-bbBlue leading-relaxed">
              Google Account required for secure biometric-level authentication. 
              Manual login has been deactivated for security.
            </p>
          </div>

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
                <span className="text-[0.875rem] font-bold tracking-widest uppercase">Continue with Google</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-8 text-center pt-4 opacity-30">
          <p className="text-[0.5rem] font-bold text-gray-500 uppercase tracking-[0.5em]">BB Network Security Layer v5.1</p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
