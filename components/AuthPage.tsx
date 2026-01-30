
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { auth, db } from '../firebase/firebaseConfig';
import { motion } from 'framer-motion';

const AuthPage: React.FC = () => {
  const { user, signIn, signUp, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      console.log("Customer session active:", user.uid);
      navigate('/explore', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!/^\d{10}$/.test(mobile)) {
        throw new Error('Enter a valid 10-digit mobile number.');
      }

      const customerEmail = `${mobile}@bb.net`;
      if (isLogin) {
        await signIn(customerEmail, password);
      } else {
        await signUp(customerEmail, password, { name: name || 'Valued Customer' });
      }
    } catch (err: any) {
      const errMsg = err.code ? `[${err.code}] ${err.message}` : err.message;
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
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user && db) {
        // Point to 'users' collection and auto-assign customer role
        const userRef = doc(db, 'users', result.user.uid);
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
          await setDoc(userRef, {
            name: result.user.displayName || 'Network Member',
            role: 'customer',
            status: 'active',
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (err: any) { 
      const errMsg = err.code ? `[${err.code}] ${err.message}` : err.message;
      console.error("GOOGLE_AUTH_FAILURE:", errMsg);
      setError(`Google Auth Error: ${errMsg}`); 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-20 px-6 flex justify-center items-start">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white border border-gray-100 p-10 md:p-12 rounded-[3rem] shadow-xl shadow-charcoal/5"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-serif font-bold text-charcoal mb-2 uppercase tracking-tight">Customer Portal</h1>
          <p className="text-[10px] text-bbBlue font-bold uppercase tracking-[0.4em]">Secure Access Hub</p>
        </div>

        <button onClick={handleGoogleAuth} disabled={isSubmitting} className="w-full flex items-center justify-center gap-3 py-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all mb-8 group disabled:opacity-50 active:scale-95">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
          <span className="text-[10px] font-bold text-charcoal tracking-widest uppercase">Continue with Google</span>
        </button>

        <div className="relative mb-8 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <span className="relative px-4 bg-white text-[9px] font-bold text-gray-300 uppercase tracking-[0.3em]">Credentials Hub</span>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-4">
            {!isLogin && (
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em] ml-1">Identity</label>
                <input required type="text" placeholder="Full Name" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-bbBlue transition-all" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em] ml-1">Mobile</label>
              <input required type="tel" placeholder="10-digit number" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-bbBlue transition-all font-mono" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em] ml-1">Password</label>
              <input required type="password" placeholder="••••••••" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-bbBlue transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
              <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest text-center mb-1">Authorization Failed</p>
              <p className="text-[10px] text-red-600 font-medium text-center break-words">{error}</p>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-bbBlue text-white rounded-2xl font-bold uppercase text-xs tracking-[0.3em] shadow-xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98] disabled:opacity-50">
            {isSubmitting ? 'Verifying...' : (isLogin ? 'Enter Portal' : 'Create Access')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-[9px] font-bold text-gray-400 uppercase tracking-widest hover:text-bbBlue transition-colors">
            {isLogin ? "Join the network" : "Existing member? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
