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
  token?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signUp: (email: string, pass: string, data: any) => Promise<void>;
  signIn: (email: string, pass: string, role: 'customer' | 'partner' | 'admin') => Promise<void>;
  signInWithGoogle: (role: 'customer' | 'partner' | 'admin') => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AppUser>) => Promise<void>;
  bypassLogin: (email: string, role: 'admin' | 'partner' | 'customer') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'bb_network_session_v5';
const ROLE_KEY = 'bb_network_role_v5';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      localStorage.setItem(ROLE_KEY, user.role);
    } else {
      localStorage.removeItem(SESSION_KEY);
      // We keep ROLE_KEY for a bit to help identity resolution if storedRole is needed
    }
  }, [user]);

  useEffect(() => {
    // Initial persistence setup
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const uid = firebaseUser.uid;
        const storedRole = localStorage.getItem(ROLE_KEY) as any;
        
        // Timer for loading fallback
        const resolutionTimeout = setTimeout(() => {
          setLoading(false);
        }, 5000);

        try {
          // STEP B: Check Admin
          const adminDoc = await getDoc(doc(db, 'admins', uid));
          if (adminDoc.exists()) {
            const data = adminDoc.data();
            setUser({
              uid,
              email: firebaseUser.email,
              name: data.name || 'Admin',
              role: 'admin',
              user_type: 'admin',
              status: 'active',
              token: adminConfig.adminSecret
            });
            clearTimeout(resolutionTimeout);
            setLoading(false);
            return;
          }

          // STEP C: Check Partner
          const partnerDoc = await getDoc(doc(db, 'partners', uid));
          if (partnerDoc.exists()) {
            const data = partnerDoc.data();
            setUser({
              uid,
              email: firebaseUser.email,
              name: data.brandName || data.ownerName || 'Partner',
              role: 'partner',
              user_type: 'partner',
              status: data.status || 'pending',
              onboardingComplete: !!data.onboardingComplete,
              photoURL: data.photoURL || data.ownerPicture || undefined
            });
            clearTimeout(resolutionTimeout);
            setLoading(false);
            return;
          }

          // STEP D: Check Customer
          const customerDoc = await getDoc(doc(db, 'customers', uid));
          if (customerDoc.exists()) {
            const data = customerDoc.data();
            setUser({
              uid,
              email: firebaseUser.email,
              name: data.name || 'Customer',
              role: 'customer',
              user_type: 'customer',
              status: 'active'
            });
            clearTimeout(resolutionTimeout);
            setLoading(false);
            return;
          }

          // STEP E: New User Logic
          if (storedRole === 'partner') {
            console.log("[AUTH] Resolving as NEW PARTNER (Onboarding Required)");
            setUser({
              uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || 'New Partner',
              role: 'partner',
              user_type: 'partner',
              status: null,
              onboardingComplete: false
            });
          } else if (storedRole === 'admin') {
            console.log("[AUTH] Resolving as NEW ADMIN (Restricted)");
            setUser({
              uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || 'Admin Candidate',
              role: 'admin',
              user_type: 'admin',
              status: null,
              onboardingComplete: false
            });
          } else {
            // Default to Customer auto-creation for safety
            console.log("[AUTH] Resolving as NEW CUSTOMER (Auto-Creating)");
            const newCustomer = {
              name: firebaseUser.displayName || 'Customer',
              email: firebaseUser.email,
              role: 'customer',
              user_type: 'customer',
              status: 'active',
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'customers', uid), newCustomer);
            setUser({ uid, ...newCustomer } as AppUser);
          }
        } catch (err) {
          console.error("[AUTH] Identity resolution error:", err);
          setUser(null);
        } finally {
          clearTimeout(resolutionTimeout);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (role: 'customer' | 'partner' | 'admin') => {
    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      localStorage.setItem(ROLE_KEY, role);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      localStorage.removeItem(ROLE_KEY);
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
  };

  const signUp = async (email: string, pass: string, data: any) => {
    setLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      const uid = res.user.uid;
      const role = data.role || 'customer';
      const coll = role === 'admin' ? 'admins' : (role === 'partner' ? 'partners' : 'customers');
      
      const userData = {
        uid,
        email,
        ...data,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, coll, uid), userData);
      setUser(userData as any);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, pass: string, role: 'customer' | 'partner' | 'admin') => {
    setLoading(true);
    try {
      localStorage.setItem(ROLE_KEY, role);
      await signInWithEmailAndPassword(auth, email, pass);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (updates: Partial<AppUser>) => {
    if (!user) return;
    const coll = user.role === 'admin' ? 'admins' : (user.role === 'partner' ? 'partners' : 'customers');
    await updateDoc(doc(db, coll, user.uid), updates);
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  const bypassLogin = (email: string, role: 'admin' | 'partner' | 'customer') => {
    localStorage.setItem(ROLE_KEY, role);
    const mockUser: AppUser = {
      uid: 'bypass-' + role,
      email,
      name: 'Bypass ' + role,
      role: role as any,
      user_type: role as any,
      status: 'active',
      onboardingComplete: true,
      token: role === 'admin' ? adminConfig.adminSecret : undefined
    };
    setUser(mockUser);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signUp, 
      signIn, 
      signInWithGoogle, 
      resetPassword: async (e) => await sendPasswordResetEmail(auth, e), 
      logout,
      updateUser,
      bypassLogin
    }}>
      {!loading ? children : (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
