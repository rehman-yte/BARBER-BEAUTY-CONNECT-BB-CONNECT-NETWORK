
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
      try {
        if (!firebaseUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        const storedRole = localStorage.getItem(ROLE_KEY) as 'customer' | 'partner' | 'admin' | null;
        console.log(`[AUTH ARCHITECT] Resolving Identity for ${firebaseUser.uid} (Intended Role: ${storedRole})`);
        
        // Timeout helper to prevent infinite spinning
        const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number = 3000): Promise<T> => {
          const timeout = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
          );
          return Promise.race([promise, timeout]);
        };

        try {
          // 1. Check Admin
          const adminDoc = await withTimeout(getDoc(doc(db, 'admins', firebaseUser.uid)));
          if (adminDoc.exists()) {
            const adminData = adminDoc.data();
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
            return;
          }

          // 2. Check Partner
          const partnerDoc = await withTimeout(getDoc(doc(db, 'partners', firebaseUser.uid)));
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
              photoURL: partnerData.photoURL || partnerData.ownerPicture || firebaseUser.photoURL || undefined,
              brandName: partnerData.brandName || undefined,
              onboardingComplete: onboardingComplete
            });
            setLoading(false);
            return;
          }

          // 3. Check Customer
          const customerDoc = await withTimeout(getDoc(doc(db, 'customers', firebaseUser.uid)));
          if (customerDoc.exists()) {
            const customerData = customerDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: customerData.name || 'Customer',
              role: 'customer',
              user_type: 'customer',
              status: 'active',
              photoURL: customerData.photoURL || firebaseUser.photoURL || undefined
            });
            setLoading(false);
            return;
          }
        } catch (dbErr) {
          console.warn("[AUTH ARCHITECT] Database check failed or timed out:", dbErr);
          // If timeout occurs, we proceed to registration check based on stored role
        }

        // 4. NEW USER LOGIC (Not found in any collection or timeout reached)
        const finalRole = storedRole || 'customer';
        
        // Final fallback if no record found
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || 'New User',
          role: finalRole as any,
          user_type: finalRole as any,
          status: null,
          onboardingComplete: false
        });

      } catch (err) {
        console.error("Auth status resolution error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, pass: string, additionalData: any) => {
    // Still support manual signup for certain workflows if needed, but UI is removed
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
      
      if (role === 'partner') {
        await setDoc(doc(db, 'partners', firebaseUser.uid), userData);
      } else if (role === 'admin') {
        await setDoc(doc(db, 'admins', firebaseUser.uid), userData);
      } else {
        await setDoc(doc(db, 'customers', firebaseUser.uid), userData);
      }
      
      setUser({ uid: firebaseUser.uid, ...userData } as AppUser);
    } catch (err: any) {
      console.error("Firebase signUp error:", err);
      throw err;
    }
  };

  const signIn = async (email: string, pass: string, intendedRole: 'customer' | 'partner' | 'admin') => {
    try {
      localStorage.setItem(ROLE_KEY, intendedRole);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      localStorage.removeItem(ROLE_KEY);
      console.error("Firebase signIn error:", err);
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
      token: role === 'admin' ? adminConfig.adminSecret : undefined,
      onboardingComplete: true
    };
    setUser(mockUser);
    setLoading(false);
  };

  const signInWithGoogle = async (role: 'customer' | 'partner' | 'admin') => {
    try {
      localStorage.setItem(ROLE_KEY, role);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Logic for record creation is now moved to the onAuthStateChanged resolver 
      // to ensure consistency between first-time login and subsequent refreshes.
    } catch (err: any) {
      localStorage.removeItem(ROLE_KEY);
      console.error("Firebase Google Auth error:", err);
      throw err;
    }
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

