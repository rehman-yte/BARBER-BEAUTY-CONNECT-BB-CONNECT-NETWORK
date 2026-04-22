
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
  user_type: 'customer' | 'partner' | 'admin';
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
        try {
          // ARCHITECTURE GATEKEEPER: Unified Multi-Collection Check
          
          // 1. MASTER CHECK: partners
          const partnerDoc = await getDoc(doc(db, 'partners', firebaseUser.uid));
          if (partnerDoc.exists()) {
            const partnerData = partnerDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: partnerData.brandName || partnerData.brand_name || partnerData.ownerName || 'Partner',
              role: 'partner',
              user_type: 'partner',
              status: partnerData.status !== undefined ? partnerData.status : null,
              photoURL: firebaseUser.photoURL || undefined
            });
            setLoading(false);
            return;
          }

          // 2. MASTER CHECK: customers
          const customerDoc = await getDoc(doc(db, 'customers', firebaseUser.uid));
          if (customerDoc.exists()) {
            const customerData = customerDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: customerData.name || 'Valued Customer',
              role: 'customer',
              user_type: 'customer',
              status: 'active',
              photoURL: firebaseUser.photoURL || undefined
            });
            setLoading(false);
            return;
          }

          // 3. LEGACY/ADMIN CHECK: users
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as any;
            const finalRole = userData.user_type || userData.role || 'customer';
            
            // Re-sync to specific collections if role is clear but doc is missing
            if (finalRole === 'partner') {
               // This shouldn't happen if gatekeeper is perfect, but for legacy support:
               setUser({
                 uid: firebaseUser.uid,
                 email: firebaseUser.email,
                 name: userData.name || 'Partner',
                 role: 'partner',
                 user_type: 'partner',
                 status: userData.status !== undefined ? userData.status : null,
                 photoURL: firebaseUser.photoURL || undefined
               });
               setLoading(false);
               return;
            }

            const isAdmin = firebaseUser.email === 'haidartheworldking@gmail.com';
            const role = isAdmin ? 'admin' : 'customer';

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: userData.name || (isAdmin ? 'Master Admin' : 'Network Member'),
              role: role as any,
              user_type: role as any,
              status: 'active',
              photoURL: firebaseUser.photoURL || undefined,
              token: (role === 'admin' || isAdmin) ? adminConfig.adminSecret : undefined
            });
          } else {
            // New User Discovery Path (Default to Customer)
            const isAdmin = firebaseUser.email === 'haidartheworldking@gmail.com';
            const role = isAdmin ? 'admin' : 'customer';
            
            // For customers, we initialize the doc automatically
            if (role === 'customer') {
              const customerData = {
                name: firebaseUser.displayName || 'Network Member',
                email: firebaseUser.email,
                role: 'customer',
                user_type: 'customer',
                status: 'active',
                createdAt: new Date().toISOString()
              };
              await setDoc(doc(db, 'customers', firebaseUser.uid), customerData);
            }

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: isAdmin ? 'Master Admin' : (firebaseUser.displayName || 'Network Member'),
              role: role,
              user_type: role,
              status: 'active',
              token: isAdmin ? adminConfig.adminSecret : undefined
            });
          }
        } catch (err) {
          console.error("Identity resolution error:", err);
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
      
      const role = additionalData.role || 'customer';
      const userData = {
        email: firebaseUser.email,
        name: additionalData.name || 'Network Member',
        role: role,
        user_type: role,
        status: additionalData.status !== undefined ? additionalData.status : (role === 'partner' ? null : 'active'),
        createdAt: new Date().toISOString()
      };
      
      // CRITICAL GATE: Route to collection
      if (role === 'partner') {
        await setDoc(doc(db, 'partners', firebaseUser.uid), userData);
      } else {
        await setDoc(doc(db, 'customers', firebaseUser.uid), userData);
      }
      
      // Sync to legacy for backward compatibility
      await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      
      setUser({
        uid: firebaseUser.uid,
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
      user_type: role,
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
      
      // IDENTITY LOCK: Double-check collection membership
      const partnerRef = doc(db, 'partners', firebaseUser.uid);
      const partnerSnap = await getDoc(partnerRef);
      
      if (partnerSnap.exists()) {
        console.log("Verified Partner Google Login:", firebaseUser.uid);
        // User is a partner, routing will be handled by App.tsx guards
        return;
      }

      // Not a partner, ensure they are in customers collection
      const customerRef = doc(db, 'customers', firebaseUser.uid);
      const customerSnap = await getDoc(customerRef);
      
      if (!customerSnap.exists()) {
        const userData = {
          name: firebaseUser.displayName || 'Network Member',
          email: firebaseUser.email,
          role: 'customer',
          user_type: 'customer',
          status: 'active',
          createdAt: new Date().toISOString()
        };
        await setDoc(customerRef, userData);
        // Also sync to legacy users for safety
        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
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
    if (!auth.currentUser || !user) return;
    
    try {
      const collections = user.role === 'partner' ? ['partners', 'users'] : ['customers', 'users'];
      
      for (const coll of collections) {
         try {
           const docRef = doc(db, coll, auth.currentUser.uid);
           await updateDoc(docRef, updates);
         } catch (e) {
           console.warn(`Sync failed for collection ${coll}:`, e);
         }
      }
      
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
