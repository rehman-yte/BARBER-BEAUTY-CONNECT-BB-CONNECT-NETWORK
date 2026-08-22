
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
export const OFFICIAL_ADMIN_EMAIL = (adminConfig.adminEmail || 'haidartheworldking@gmail.com').toLowerCase().trim();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      
      // Strict Security Check on Cached Admin Session
      if (parsed && parsed.role === 'admin') {
        const cachedEmail = (parsed.email || '').toLowerCase().trim();
        if (cachedEmail !== OFFICIAL_ADMIN_EMAIL) {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(ROLE_KEY);
          return null;
        }
      }

      // Aggressive Flag Sync for Partners
      const isRegistered = localStorage.getItem(`bb_registered_${parsed.uid}`) === 'true';
                          
      if (parsed && parsed.role === 'partner' && isRegistered) {
        parsed.onboardingComplete = true;
      }
      return parsed;
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

        const userEmail = (firebaseUser.email || '').toLowerCase().trim();
        const isOfficialAdmin = userEmail === OFFICIAL_ADMIN_EMAIL;

        // 1. ABSOLUTE ADMIN VERIFICATION: Strictly haidartheworldking@gmail.com
        if (isOfficialAdmin) {
          console.log(`[AUTH ARCHITECT] Official Admin Verified: ${userEmail}`);
          const adminUser: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || 'System Admin',
            role: 'admin',
            user_type: 'admin',
            status: 'active',
            token: adminConfig.adminSecret,
            onboardingComplete: true
          };
          setUser(adminUser);
          setLoading(false);

          // Guarantee admin doc exists in Firestore
          setDoc(doc(db, 'admins', firebaseUser.uid), {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || 'System Admin',
            role: 'admin',
            status: 'active',
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(() => {});
          return;
        }

        const storedRole = localStorage.getItem(ROLE_KEY) as 'customer' | 'partner' | 'admin' | null;
        // Non-official accounts are strictly forbidden from having 'admin' role
        const safeStoredRole = (storedRole === 'admin') ? 'customer' : storedRole;
        console.log(`[AUTH ARCHITECT] Resolving Identity for ${firebaseUser.uid} (Intended Role: ${safeStoredRole})`);
        
        const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> => {
          const timeout = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
          );
          return Promise.race([promise, timeout]);
        };

        const REGISTERED_KEY = `bb_registered_${firebaseUser.uid}`;
        const isRegisteredCache = localStorage.getItem(REGISTERED_KEY) === 'true';

        // OPTIMIZATION: Immediate Recognition for Registered Partners
        if (isRegisteredCache && safeStoredRole === 'partner') {
          const cachedSession = localStorage.getItem(SESSION_KEY);
          let baseData = cachedSession ? JSON.parse(cachedSession) : null;
          
          if (!baseData || baseData.uid !== firebaseUser.uid) {
            baseData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || 'Partner',
              role: 'partner',
              user_type: 'partner',
              status: 'pending',
              onboardingComplete: true
            };
          }
          
          // Ensure flag is set on the object
          baseData.onboardingComplete = true;
          
          setUser(baseData);
          setLoading(false);
          
          // Keep cache in sync
          localStorage.setItem(REGISTERED_KEY, 'true');
          
          // Verify with DB in background to sync latest status
          getDoc(doc(db, 'partners', firebaseUser.uid)).then(docSnap => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              updateUser({
                name: data.brandName || data.ownerName || baseData.name,
                status: data.status,
                photoURL: data.ownerPicture,
                onboardingComplete: true
              });
            } else {
              localStorage.removeItem(REGISTERED_KEY);
              setUser(prev => prev ? { ...prev, onboardingComplete: false } : null);
            }
          }).catch(e => console.warn("Background partner sync failed:", e));
          
          return;
        }

        try {
          // 2. Check Partner
          const partnerDoc = await withTimeout(getDoc(doc(db, 'partners', firebaseUser.uid)));
          
          if (partnerDoc.exists()) {
            const partnerData = partnerDoc.data();
            localStorage.setItem(REGISTERED_KEY, 'true');
            
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: partnerData.brandName || partnerData.ownerName || firebaseUser.displayName || 'Partner',
              role: 'partner',
              user_type: 'partner',
              status: partnerData.status || 'pending',
              photoURL: partnerData.ownerPicture || firebaseUser.photoURL || undefined,
              brandName: partnerData.brandName || undefined,
              onboardingComplete: true
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
              photoURL: customerData.photoURL || firebaseUser.photoURL || undefined,
              onboardingComplete: true
            });
            setLoading(false);
            return;
          }
        } catch (dbErr) {
          console.warn("[AUTH ARCHITECT] Database check failed or timed out:", dbErr);
          // Fallback to session cache or registered flag if DB is slow
          const isRegisteredCache = localStorage.getItem(REGISTERED_KEY) === 'true';
          const cached = localStorage.getItem(SESSION_KEY);
          
          if (isRegisteredCache || cached) {
            const parsed = cached ? JSON.parse(cached) : { uid: firebaseUser.uid, role: safeStoredRole || 'partner', onboardingComplete: true };
            if (parsed.uid === firebaseUser.uid && parsed.role !== 'admin') {
              setUser({ ...parsed, onboardingComplete: isRegisteredCache ? true : parsed.onboardingComplete });
              setLoading(false);
              return;
            }
          }
        }

        // 4. NEW USER LOGIC (Not found in any collection or timeout reached)
        const finalRole: 'customer' | 'partner' = safeStoredRole || 'customer';
        const wasOnboarded = (isRegisteredCache && finalRole === 'partner');
        
        // Final fallback if no record found (Never admin)
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || (finalRole === 'partner' ? 'Partner Studio' : 'Network User'),
          role: finalRole,
          user_type: finalRole,
          status: wasOnboarded ? 'active' : null,
          onboardingComplete: wasOnboarded
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
        const skeletonPartner = {
          ownerName: additionalData.name || 'New Partner',
          brandName: 'New Partner Shop',
          status: 'pending',
          mobileNumber: additionalData.mobile || '',
          adminApproved: false,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'partners', firebaseUser.uid), skeletonPartner);
        // Also save to global user collections if allowed
        await setDoc(doc(db, 'users', firebaseUser.uid), userData).catch(() => {});
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
    const cleanEmail = email.toLowerCase().trim();
    if (role === 'admin' && cleanEmail !== OFFICIAL_ADMIN_EMAIL) {
      console.warn("Unauthorized administrative bypass attempt rejected.");
      throw new Error(`Unauthorized Admin: Only ${OFFICIAL_ADMIN_EMAIL} can access the admin panel.`);
    }
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
      const userCredential = await signInWithPopup(auth, provider);
      const authedEmail = (userCredential.user.email || '').toLowerCase().trim();

      if (role === 'admin' && authedEmail !== OFFICIAL_ADMIN_EMAIL) {
        // Immediate termination of unauthorized admin sign-in attempt
        await signOut(auth);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(ROLE_KEY);
        setUser(null);
        throw new Error(`Access Denied: Only the official administrator Gmail (${OFFICIAL_ADMIN_EMAIL}) is authorized to access the Admin Panel.`);
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

  const updateUser = (updates: Partial<AppUser>) => {
    const activeUid = auth.currentUser?.uid || user?.uid;
    if (!activeUid) return;
    
    // 1. Optimistic Update (Immediate UI response)
    setUser(prev => {
      if (!prev) return null;
      const newUser = { ...prev, ...updates };
      localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
      return newUser;
    });

    // 2. Background Persistence
    const syncToDb = async () => {
      try {
        const role = updates.role || user?.role || 'customer';
        const coll = role === 'admin' ? 'admins' : (role === 'partner' ? 'partners' : 'customers');
        const docRef = doc(db, coll, activeUid);
        await updateDoc(docRef, updates).catch(async (e) => {
          // If update fails, document might not exist (e.g. race condition), try setDoc
          if (e.code === 'not-found') {
             const { role: _, ...rest } = updates; // Avoid overwriting role if possible
             await setDoc(docRef, updates, { merge: true });
          }
        });
      } catch (err) {
        console.error("Firestore sync error:", err);
      }
    };
    
    syncToDb();
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

