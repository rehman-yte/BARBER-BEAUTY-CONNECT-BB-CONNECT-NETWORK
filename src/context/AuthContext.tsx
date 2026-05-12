
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
          const storedRole = localStorage.getItem(ROLE_KEY) as 'customer' | 'partner' | 'admin' | null;
          console.log(`[AUTH ARCHITECT] Resolving Identity for ${firebaseUser.uid} (Intended Role: ${storedRole})`);
          
          // Role-based retrieval logic
          if (storedRole === 'admin') {
            const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
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
          }

          if (storedRole === 'partner' || !storedRole) {
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
              return;
            }
          }

          if (storedRole === 'customer' || !storedRole) {
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
              return;
            }
          }

          // Fallback to searching all (if storedRole was missing or wrong)
          const searchCollections = ['admins', 'partners', 'customers'];
          for (const coll of searchCollections) {
            const snap = await getDoc(doc(db, coll, firebaseUser.uid));
            if (snap.exists()) {
              const data = snap.data();
              const role = coll === 'admins' ? 'admin' : (coll === 'partners' ? 'partner' : 'customer');
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: data.name || data.brandName || (role === 'admin' ? 'Admin' : (role === 'partner' ? 'Partner' : 'Customer')),
                role: role as any,
                user_type: role as any,
                status: role === 'partner' ? (data.onboardingComplete ? data.status : null) : 'active',
                onboardingComplete: !!data.onboardingComplete,
                token: role === 'admin' ? adminConfig.adminSecret : undefined
              });
              setLoading(false);
              return;
            }
          }

          // Last resort: If still not found but authenticated, create basic user record
          const finalRole = storedRole || 'customer';
          const defaultData: any = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || 'New User',
            role: finalRole,
            user_type: finalRole,
            status: finalRole === 'partner' ? null : 'active'
          };
          setUser(defaultData);
        } catch (err) {
          console.error("Auth status resolution error:", err);
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
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      const coll = role === 'admin' ? 'admins' : (role === 'partner' ? 'partners' : 'customers');
      const docRef = doc(db, coll, firebaseUser.uid);
      const snap = await getDoc(docRef);
      
      if (!snap.exists()) {
        const userData = {
          name: firebaseUser.displayName || 'Network User',
          email: firebaseUser.email,
          role: role,
          user_type: role,
          status: role === 'partner' ? null : 'active',
          createdAt: new Date().toISOString()
        };
        await setDoc(docRef, userData);
      }
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

