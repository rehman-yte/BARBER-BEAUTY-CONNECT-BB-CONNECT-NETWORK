
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

const AuthPage: React.FC = () => {
  const { user, signIn, signUp, loginPartnerGhost, loading } = useAuth();
  const [userType, setUserType] = useState<'Customer' | 'Partner'>('Customer');
  const [isLogin, setIsLogin] = useState(false);
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      console.log("Auth session detected:", user.role, user.uid);
      if (user.role === 'customer') {
        navigate('/customer-dashboard', { replace: true });
      } else if (user.role === 'partner') {
        if (localStorage.getItem('bb_partner_active') === 'true') {
          navigate('/partner-dashboard', { replace: true });
        } else {
          navigate('/partner-register', { replace: true });
        }
      }
    }
  }, [user, loading, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    console.log("Initiating Auth Protocol...", { userType, isLogin, mobile });

    try {
      if (!/^\d{10}$/.test(mobile)) {
        throw new Error('Enter 10-digit mobile number.');
      }

      if (userType === 'Partner') {
        if (!isLogin) {
          // PARTNER SIGN UP PROTOCOL
          console.log("Partner Signup Sequence Started...");
          if (otp !== '123456') {
            throw new Error('Invalid OTP. Use 123456 for demo purposes.');
          }

          // Trigger Immediate Session Bridge
          console.log("Demo Credentials Verified. Establishing Ghost Session...");
          loginPartnerGhost(mobile, name || 'Partner');
          
          // Redirect to actual data collection form
          console.log("Redirecting to Partner Registry Form...");
          navigate('/partner-register');
        } else {
          // PARTNER SIGN IN
          console.log("Partner Login Sequence Started...");
          if (password.length < 6) {
            throw new Error('Invalid Password. Minimal 6 characters required.');
          }
          
          loginPartnerGhost(mobile, 'Partner');
          
          // Verification check in Registry
          if (db) {
            const snap = await getDoc(doc(db, 'partners_registry', mobile));
            if (snap.exists()) {
               const data = snap.data();
               console.log("Registry Entry Found:", data.status);
               if (data.status === 'approved' || data.status === 'active') {
                  localStorage.setItem('bb_partner_active', 'true');
                  navigate('/partner-dashboard');
               } else {
                  console.warn("Account pending verification or incomplete.");
                  navigate('/partner-register');
               }
            } else {
               console.warn("No registry entry for this mobile. Completing setup...");
               navigate('/partner-register');
            }
          } else {
            console.error("Database connection failure.");
            navigate('/partner-register');
          }
        }
      } else {
        // Customer Flow
        const customerEmail = `${mobile}@bb.net`;
        if (isLogin) {
          await signIn(customerEmail, password);
        } else {
          await signUp(customerEmail, password, { name: name || 'User' }, 'customer');
        }
      }
    } catch (err: any) {
      console.error("AUTH CRITICAL ERROR:", err.message);
      setError(err.message || 'System verification failed.');
    } finally {
      setIsSubmitting(false);
      console.log("Auth Sequence Completed.");
    }
  };

  const handleGoogleAuth = async () => {
    if (userType === 'Partner') return; 
    setIsSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user && db) {
        const userRef = doc(db, 'customers_roadmap', result.user.uid);
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
          await setDoc(userRef, {
            name: result.user.displayName || 'New Member',
            role: 'customer',
            status: 'active',
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (err: any) { 
      console.error("Google Auth failed:", err);
      setError('Google Auth failed.'); 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6 flex justify-center items-start">
      <div className="w-full max-w-md bg-white border border-gray-100 p-8 md:p-12 rounded-[2.5rem] shadow-sm">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-serif font-bold text-charcoal mb-2 uppercase tracking-tight">BB Connect Portal</h1>
          <p className="text-[10px] text-bbBlue font-bold uppercase tracking-[0.4em]">
            {userType === 'Partner' ? 'Professional Registry' : 'Secure Entry Point'}
          </p>
        </div>

        {userType === 'Customer' && (
          <button onClick={handleGoogleAuth} disabled={isSubmitting} className="w-full flex items-center justify-center gap-3 py-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all mb-8 group disabled:opacity-50">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            <span className="text-xs font-bold text-charcoal tracking-widest uppercase">Continue with Google</span>
          </button>
        )}

        <div className="relative mb-8 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-50"></div></div>
          <span className="relative px-4 bg-white text-[9px] font-bold text-gray-300 uppercase tracking-[0.3em]">Credentials Hub</span>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
            <button type="button" onClick={() => setUserType('Customer')} className={`flex-1 py-3.5 text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all ${userType === 'Customer' ? 'bg-white text-bbBlue shadow-sm' : 'text-gray-400'}`}>Customer</button>
            <button type="button" onClick={() => setUserType('Partner')} className={`flex-1 py-3.5 text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all ${userType === 'Partner' ? 'bg-white text-bbBlue shadow-sm' : 'text-gray-400'}`}>Partner</button>
          </div>

          <div className="space-y-4">
            {!isLogin && (
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em] ml-1">Full Legal Name</label>
                <input required type="text" placeholder="Professional Identity" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-bbBlue" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em] ml-1">Mobile Access</label>
              <input required type="tel" placeholder="10-digit number" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-bbBlue font-mono" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>

            {!isLogin && (
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em] ml-1">OTP (Demo: 123456)</label>
                <input required type="text" placeholder="6-digit code" className="w-full px-5 py-4 bg-blue-50/50 border border-bbBlue/20 rounded-2xl text-sm outline-none focus:border-bbBlue text-center tracking-[1em]" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em] ml-1">Secure Password</label>
              <input required type="password" placeholder="••••••••" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-bbBlue" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>

          {error && <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest text-center animate-pulse bg-red-50 py-2 rounded-lg border border-red-100">{error}</p>}

          <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-bbBlue text-white rounded-2xl font-bold uppercase text-xs tracking-[0.2em] shadow-xl shadow-bbBlue/20 hover:bg-bbBlue-deep transition-all active:scale-[0.98] disabled:opacity-50">
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Verifying...
              </span>
            ) : 'Enter Portal'}
          </button>
        </form>

        <div className="mt-8 text-center flex flex-col gap-3">
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-[9px] font-bold text-gray-400 uppercase tracking-widest hover:text-bbBlue transition-colors">
            {isLogin ? "Join the network" : "Existing Member? Sign In here"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
