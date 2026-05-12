
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, adminConfig } from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface AppUser {
  uid: string;
  email: string | null;
  name: string;
  role: 'customer' | 'partner' | 'admin';
  user_type: 'customer' | 'partner' | 'admin';
  status: 'active' | 'pending' | null;
  photoURL?: string;
  brandName?: string;
  onboardingComplete?: boolean;
  token?: string; // For admin API calls
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signUp: (email: string, pass: string, data: any) => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
  bypassLogin: (email: string, role: 'admin' | 'partner' | 'customer') => void;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => void;
  updateUser: (updates: Partial<AppUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'bb_network_session';
const ADMIN_LOCK_KEY = 'bb_admin_lock';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      // Point 2: Admin specific persistence signal
      if (user.role === 'admin') {
        localStorage.setItem(ADMIN_LOCK_KEY, 'true');
      }
    } else {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(ADMIN_LOCK_KEY);
    }
  }, [user]);

  useEffect(() => {
    // SECURITY PROTOCOL: Empty dependency array ensures this listener only attaches once
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          console.log(`[AUTH ARCHITECT] Resolving Identity for ${firebaseUser.uid}`);
          const isHardcodedAdmin = firebaseUser.email === 'haidartheworldking@gmail.com' || 
                                   firebaseUser.email === 'rhfarooqui16@gmail.com';
          
          // STEP A: ADMIN GATE - STRICT CHECK
          const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
          
          if (adminDoc.exists() || isHardcodedAdmin) {
            console.log("[AUTH ARCHITECT] Gate A: ADMIN ACCESS GRANTED");
            const adminData = adminDoc.data() || {};
            // RE-LOCK ADMIN SESSION
            localStorage.setItem(ADMIN_LOCK_KEY, 'true');
            
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: adminData.name || 'System Admin',
              role: 'admin',
              user_type: 'admin',
              status: 'active',
              token: adminConfig.adminSecret
            });
            setLoading(false);
            setAuthInitialized(true);
            return;
          }

          // STEP B: PARTNERS CHECK
          const partnerDoc = await getDoc(doc(db, 'partners', firebaseUser.uid));
          if (partnerDoc.exists()) {
            const partnerData = partnerDoc.data();
            const onboardingComplete = !!partnerData.onboardingComplete;
            
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: partnerData.brandName || partnerData.ownerName || 'Partner',
              role: 'partner',
              user_type: 'partner',
              status: (onboardingComplete && partnerData.status) ? (partnerData.status as any) : null,
              photoURL: firebaseUser.photoURL || undefined,
              brandName: partnerData.brandName || undefined,
              onboardingComplete: onboardingComplete
            });
            setLoading(false);
            setAuthInitialized(true);
            return;
          }

          // STEP C: CUSTOMERS CHECK
          const customerDoc = await getDoc(doc(db, 'customers', firebaseUser.uid));
          if (customerDoc.exists()) {
            const customerData = customerDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: customerData.name || 'Customer',
              role: 'customer',
              user_type: 'customer',
              status: 'active',
              photoURL: firebaseUser.photoURL || undefined
            });
            setLoading(false);
            setAuthInitialized(true);
            return;
          }

          // STEP D: FALLBACK (Legacy/Users)
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as any;
            const role = userData.role || userData.user_type || 'customer';
            
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: userData.name || 'Member',
              role: role as any,
              user_type: role as any,
              status: userData.status !== undefined ? userData.status : (role === 'partner' ? null : 'active'),
            });
            setLoading(false);
            setAuthInitialized(true);
            return;
          }

          // Final Fallback for new signups
          const intendedRole = localStorage.getItem('bb_intended_role') || 'customer';
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || 'Member',
            role: intendedRole as any,
            user_type: intendedRole as any,
            status: intendedRole === 'partner' ? null : 'active'
          });

        } catch (err) {
          console.error("Identity resolution error:", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, pass: string, additionalData: any) => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;
      
      const role = additionalData.role || 'customer';
      const userData = {
        email: firebaseUser.email,
        name: additionalData.name || (role === 'partner' ? 'New Partner' : 'Customer'),
        role: role,
        user_type: role,
        createdAt: new Date().toISOString()
      };
      
      if (role === 'partner') {
        await setDoc(doc(db, 'partners', firebaseUser.uid), { ...userData, status: null });
      } else {
        await setDoc(doc(db, 'customers', firebaseUser.uid), { ...userData, status: 'active' });
      }
      
      await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      setUser({ uid: firebaseUser.uid, ...userData } as any);
    } catch (err: any) {
      console.error("Firebase signUp error:", err);
      throw err;
    }
  };

  const signIn = async (email: string, pass: string) => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error("Firebase signIn error:", err);
      throw err;
    }
  };

  const bypassLogin = (email: string, role: 'admin' | 'partner' | 'customer') => {
    setUser({
      uid: role === 'admin' ? 'admin-bypass-master' : 'mock-bypass-' + role,
      email: email,
      name: role === 'admin' ? 'Master Admin' : 'Bypass User',
      role: role,
      user_type: role,
      status: 'active',
      token: role === 'admin' ? adminConfig.adminSecret : undefined
    });
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Firebase Google Auth error:", err);
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    localStorage.clear();
    sessionStorage.clear();
  };

  const updateUser = async (updates: Partial<AppUser>) => {
    if (!auth.currentUser || !user) return;
    try {
      const collectionName = user.role === 'partner' ? 'partners' : 'customers';
      await updateDoc(doc(db, collectionName, auth.currentUser.uid), updates);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), updates);
      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  const contextValue = {
    user,
    loading: loading || !authInitialized,
    signUp,
    signIn,
    bypassLogin,
    signInWithGoogle,
    resetPassword,
    logout,
    refreshAuth: () => {},
    updateUser
  };

  // Point 3: Proper layout wrap with loading state
  return (
    <AuthContext.Provider value={contextValue}>
      {(!authInitialized) ? (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#0056b3] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] animate-pulse">
            {localStorage.getItem(ADMIN_LOCK_KEY) ? 'Restoring Admin Gateway...' : 'BB Network Secure Access...'}
          </p>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
