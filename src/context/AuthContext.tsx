
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, adminConfig } from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface AppUser {
  uid: string;
  email: string | null;
  name: string;
  role: 'customer' | 'partner' | 'admin';
  status: 'active' | 'pending' | null;
  photoURL?: string;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        // Fetch additional user data from Firestore
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const userData = docSnap.data() as any;
            let finalStatus = userData.status;
            
            // ROLE-BASED STATUS LOCK: 
            // If status is missing, partners MUST default to null (onboarding requested)
            // while customers default to 'active'.
            if (finalStatus === undefined) {
              finalStatus = userData.role === 'partner' ? null : 'active';
            }

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: userData.name || 'Network Member',
              role: userData.role || 'customer',
              status: finalStatus,
              photoURL: firebaseUser.photoURL || undefined,
              token: (userData.role === 'admin' || firebaseUser.email === 'haidartheworldking@gmail.com') ? adminConfig.adminSecret : undefined
            });
          } else {
            // New user or bypass case
            const isAdmin = firebaseUser.email === 'haidartheworldking@gmail.com';
            const role = isAdmin ? 'admin' : 'customer'; // Default role is customer for new signups
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: isAdmin ? 'Master Admin' : (firebaseUser.displayName || 'Network Member'),
              role: role,
              status: role === 'partner' ? null : 'active',
              token: isAdmin ? adminConfig.adminSecret : undefined
            });
          }
        } catch (err) {
          console.error("Auth sync error (Firestore Permissions):", err);
          // FALLBACK: Use Firebase Auth info if Firestore is restricted
          const isAdmin = firebaseUser.email === 'haidartheworldking@gmail.com';
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: isAdmin ? 'Master Admin' : (firebaseUser.displayName || 'Network Member'),
            role: isAdmin ? 'admin' : 'customer',
            status: 'active',
            token: isAdmin ? adminConfig.adminSecret : undefined
          });
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
      
      const userData = {
        name: additionalData.name || 'Network Member',
        role: additionalData.role || 'customer',
        status: additionalData.status !== undefined ? additionalData.status : 'active',
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        ...userData
      } as AppUser);
    } catch (err: any) {
      console.error("Firebase signUp error:", err);
      throw err;
    }
  };

  const signIn = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error("Firebase signIn error:", err);
      throw err;
    }
  };

  const bypassLogin = (email: string, role: 'admin' | 'partner' | 'customer') => {
    console.log(`Executing Administrative Bypass for: ${email}`);
    setUser({
      uid: role === 'admin' ? 'admin-bypass-master' : 'mock-bypass-' + role,
      email: email,
      name: role === 'admin' ? 'Master Admin' : (role === 'partner' ? 'Partner Studio' : 'Active Customer'),
      role: role,
      status: 'active',
      token: role === 'admin' ? adminConfig.adminSecret : undefined
    });
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      // Check if user exists in Firestore
      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        const userData = {
          name: firebaseUser.displayName || 'Google User',
          role: 'customer',
          user_type: 'customer',
          status: 'active',
          createdAt: new Date().toISOString()
        };
        await setDoc(docRef, userData);
      }
    } catch (err: any) {
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
      // Explicitly reset user state to null (important for bypass sessions)
      setUser(null);
      // Clear all local storage and session storage for a clean exit
      localStorage.clear();
      sessionStorage.clear();
    } catch (err) {
      console.error("Logout error:", err);
      // Ensure state is cleared even if signOut fails
      setUser(null);
      localStorage.clear();
      sessionStorage.clear();
    }
  };

  const updateUser = async (updates: Partial<AppUser>) => {
    if (!auth.currentUser) return;
    
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(docRef, updates);
      // Local state will be updated if we trigger a re-fetch or if we manually update it
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
