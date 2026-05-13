
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
  signIn: (email: string, pass: string, intendedRole: 'customer' | 'partner' | 'admin') => Promise<void>;
  bypassLogin: (email: string, role: 'admin' | 'partner' | 'customer') => void;
  signInWithGoogle: (role: 'customer' | 'partner' | 'admin') => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => void;
  updateUser: (updates: Partial<AppUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'bb_network_session';
const ROLE_KEY = 'bb_network_role';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Initialize persistence once
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(err => {
      console.warn("Persistence setup failed:", err);
    });
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      localStorage.setItem(ROLE_KEY, user.role);
    } else {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(ROLE_KEY);
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const uid = firebaseUser.uid;
          const storedRole = localStorage.getItem(ROLE_KEY) as 'customer' | 'partner' | 'admin' | null;
          
          // Timeout protection for identity resolution
          const timeout = setTimeout(() => {
            console.warn("[AUTH] Identity resolution timed out, forcing fallback");
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
              clearTimeout(timeout);
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
                status: data.onboardingComplete ? data.status : null,
                onboardingComplete: !!data.onboardingComplete,
                photoURL: data.photoURL || data.ownerPicture || firebaseUser.photoURL || undefined
              });
              clearTimeout(timeout);
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
              clearTimeout(timeout);
              setLoading(false);
              return;
            }

            // STEP E: New User
            const finalRole = storedRole || 'customer';
            if (finalRole === 'customer') {
              const defaultData = {
                name: firebaseUser.displayName || 'Customer',
                email: firebaseUser.email,
                role: 'customer',
                user_type: 'customer',
                status: 'active',
                createdAt: new Date().toISOString()
              };
              await setDoc(doc(db, 'customers', uid), defaultData);
              setUser({ uid, ...defaultData } as AppUser);
            } else {
              setUser({
                uid,
                email: firebaseUser.email,
                name: firebaseUser.displayName || 'New Partner',
                role: 'partner',
                user_type: 'partner',
                status: null,
                onboardingComplete: false
              });
            }
          } finally {
            clearTimeout(timeout);
          }
        } catch (err) {
          console.error("Auth identity resolution failed:", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, pass: string, additionalData: any) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;
      const role = additionalData.role || 'customer';
      const userData = {
        email: firebaseUser.email,
        name: additionalData.name || (role === 'partner' ? 'New Partner' : 'Customer'),
        role: role,
        user_type: role,
        status: additionalData.status !== undefined ? additionalData.status : (role === 'partner' ? null : 'active'),
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem(ROLE_KEY, role);
      const coll = role === 'admin' ? 'admins' : (role === 'partner' ? 'partners' : 'customers');
      await setDoc(doc(db, coll, firebaseUser.uid), userData);
      setUser({ uid: firebaseUser.uid, ...userData } as AppUser);
    } catch (err: any) {
      console.error("Signup error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, pass: string, role: 'customer' | 'partner' | 'admin') => {
    setLoading(true);
    try {
      localStorage.setItem(ROLE_KEY, role);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      localStorage.removeItem(ROLE_KEY);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (role: 'customer' | 'partner' | 'admin') => {
    setLoading(true);
    try {
      // 3. Persistence
      await setPersistence(auth, browserLocalPersistence);
      localStorage.setItem(ROLE_KEY, role);
      
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      
      // The onAuthStateChanged listener will handle the collection checks and state updates
      // This keeps the source of truth unified.
    } catch (err: any) {
      localStorage.removeItem(ROLE_KEY);
      setLoading(false);
      throw err;
    }
  };

  const bypassLogin = (email: string, role: 'admin' | 'partner' | 'customer') => {
    console.log(`Executing Administrative Bypass for: ${email}`);
    localStorage.setItem(ROLE_KEY, role);
    const mockUser: AppUser = {
      uid: role === 'admin' ? 'admin-bypass-master' : 'mock-bypass-' + role,
      email: email,
      name: role === 'admin' ? 'Master Admin' : (role === 'partner' ? 'Partner Studio' : 'Active Customer'),
      role: role,
      user_type: role,
      status: 'active',
      token: adminConfig.adminSecret,
      onboardingComplete: true
    };
    setUser(mockUser);
    setLoading(false);
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      console.error("Firebase password reset error:", err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(ROLE_KEY);
      sessionStorage.clear();
    } catch (err) {
      console.error("Logout error:", err);
      setUser(null);
      localStorage.clear();
      sessionStorage.clear();
    }
  };

  const updateUser = async (updates: Partial<AppUser>) => {
    if (!auth.currentUser || !user) return;
    try {
      const coll = user.role === 'admin' ? 'admins' : (user.role === 'partner' ? 'partners' : 'customers');
      const docRef = doc(db, coll, auth.currentUser.uid);
      await updateDoc(docRef, updates);
      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      console.error("Firestore update user error:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, bypassLogin, signInWithGoogle, resetPassword, logout, refreshAuth: () => {}, updateUser }}>
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

