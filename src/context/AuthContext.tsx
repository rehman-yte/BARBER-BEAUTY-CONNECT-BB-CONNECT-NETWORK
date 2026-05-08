
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
          console.log(`[AUTH ARCHITECT] Resolving Identity for ${firebaseUser.uid}`);
          
          // STEP A: MASTER CHECK - PARTNERS COLLECTION ONLY (STRONGEST SIGNAL)
          const partnerDoc = await getDoc(doc(db, 'partners', firebaseUser.uid));
          let partnerData = partnerDoc.exists() ? partnerDoc.data() : null;
          let inVerificationQueue = false;

          if (!partnerData) {
            const queueDoc = await getDoc(doc(db, 'verification_queue', firebaseUser.uid));
            if (queueDoc.exists()) {
              partnerData = queueDoc.data();
              inVerificationQueue = true;
            }
          }

          if (partnerData) {
            console.log(`[AUTH ARCHITECT] Gate A: IDENTITY CONFIRMED -> PARTNER ${inVerificationQueue ? '(PENDING QUEUE)' : '(ACTIVE)'}`);
            
            // Step B: Resolve Partner Onboarding Status
            const onboardingComplete = !!partnerData.onboardingComplete;
            
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: partnerData.brandName || partnerData.ownerName || 'Partner',
              role: 'partner',
              user_type: 'partner',
              status: (onboardingComplete && partnerData.status) ? (partnerData.status as any) : (inVerificationQueue ? 'pending' : null),
              photoURL: firebaseUser.photoURL || undefined,
              brandName: partnerData.brandName || undefined,
              onboardingComplete: onboardingComplete
            });
            setLoading(false);
            return;
          }

          // STEP C: ONLY IF NOT FOUND IN PARTNERS, CHECK CUSTOMERS
          const customerDoc = await getDoc(doc(db, 'customers', firebaseUser.uid));
          if (customerDoc.exists()) {
            const customerData = customerDoc.data();
            console.log("[AUTH ARCHITECT] Gate C: IDENTITY CONFIRMED -> CUSTOMER");
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

          // STEP D: ADMIN / LEGACY DISCOVERY (Strict Isolation)
          const isAdmin = firebaseUser.email === 'haidartheworldking@gmail.com' || firebaseUser.email === 'rhfarooqui16@gmail.com';
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as any;
            const role = isAdmin ? 'admin' : (userData.role || userData.user_type || 'customer');
            
            console.log(`[AUTH ARCHITECT] Discovery Gate: DISCOVERED ROLE -> ${role}`);
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: userData.name || (isAdmin ? 'System Admin' : 'Member'),
              role: role as any,
              user_type: role as any,
              status: userData.status !== undefined ? userData.status : (role === 'partner' ? null : 'active'),
              token: isAdmin ? adminConfig.adminSecret : undefined
            });
            setLoading(false);
            return;
          }

          // STEP E: NEW ADMISSION PROTOCOL (Fallback if no doc exists yet)
          const intendedRole = localStorage.getItem('bb_intended_role');
          console.log(`[AUTH ARCHITECT] New Admission Protocol: INTENTION -> ${intendedRole}`);
          
          if (intendedRole === 'partner' || isAdmin) {
             const role = isAdmin ? 'admin' : 'partner';
             const status = role === 'partner' ? null : 'active';
             
             setUser({
               uid: firebaseUser.uid,
               email: firebaseUser.email,
               name: isAdmin ? 'System Admin' : 'New Partner',
               role: role as any,
               user_type: role as any,
               status: status,
               token: isAdmin ? adminConfig.adminSecret : undefined
             });
          } else {
             // DEFAULT TO CUSTOMER ONLY AS LAST RESORT
             setUser({
               uid: firebaseUser.uid,
               email: firebaseUser.email,
               name: firebaseUser.displayName || 'Customer',
               role: 'customer',
               user_type: 'customer',
               status: 'active'
             });
          }
        } catch (err) {
          console.error("Identity resolution error:", err);
          // SAFER FALLBACK: If Firestore is restricted, don't assume role. 
          // Stay in loading or use local storage hint
          const intended = localStorage.getItem('bb_intended_role') as any;
          const isAdmin = firebaseUser.email === 'haidartheworldking@gmail.com';
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || 'Network Member',
            role: isAdmin ? 'admin' : (intended || 'customer'),
            status: isAdmin ? 'active' : null
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
        name: additionalData.name || (role === 'partner' ? 'New Partner' : 'Customer'),
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
        const intendedRole = localStorage.getItem('bb_intended_role');
        const role = intendedRole === 'partner' ? 'partner' : 'customer';
        const userData = {
          name: firebaseUser.displayName || (role === 'partner' ? 'New Partner' : 'Customer'),
          email: firebaseUser.email,
          role: role,
          user_type: role,
          status: role === 'partner' ? null : 'active',
          createdAt: new Date().toISOString()
        };
        
        if (role === 'partner') {
          await setDoc(partnerRef, userData);
        } else {
          await setDoc(customerRef, userData);
        }
        
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
      // Determine collections based on current state and role
      const collections = [];
      if (user.role === 'partner') {
        collections.push('partners', 'users', 'verification_queue');
      } else {
        collections.push('customers', 'users');
      }
      
      for (const coll of collections) {
         try {
           const docRef = doc(db, coll, auth.currentUser.uid);
           const docSnap = await getDoc(docRef);
           if (docSnap.exists()) {
             await updateDoc(docRef, updates);
           }
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
