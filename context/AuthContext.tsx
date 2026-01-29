
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { auth, db } from '../firebase/firebaseConfig';

interface AppUser {
  uid: string;
  email: string | null;
  name: string;
  role: 'customer' | 'partner' | 'admin';
  status: 'active' | 'pending' | 'rejected';
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signUp: (email: string, pass: string, data: any, type: 'customer' | 'partner') => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      // 1. CHECK FIREBASE AUTH (Mainly for Customers)
      if (firebaseUser && db) {
        try {
          const custDoc = await getDoc(doc(db, 'customers_roadmap', firebaseUser.uid));
          if (custDoc.exists()) {
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...custDoc.data() } as AppUser);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error("Firestore lookup failed:", err);
        }
      }

      // 2. CHECK GHOST PARTNER SESSION (LocalStorage + Mobile Registry)
      const partnerMobile = localStorage.getItem('bb_partner_mobile');
      const isPartnerAuth = localStorage.getItem('bb_partner_authenticated');

      if (partnerMobile && isPartnerAuth === 'true' && db) {
        try {
          const partDoc = await getDoc(doc(db, 'partners_registry', partnerMobile));
          if (partDoc.exists()) {
            setUser({ 
              uid: partnerMobile, 
              email: `${partnerMobile}@partner.ghost`, 
              ...partDoc.data() 
            } as AppUser);
          } else {
            // Failsafe for missing record
            setUser(null);
          }
        } catch (err) {
          console.error("Partner ghost lookup failed:", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, pass: string, additionalData: any, type: 'customer' | 'partner') => {
    if (!auth || !db) throw new Error("Auth service unavailable");
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = res.user.uid;

    await setDoc(doc(db, 'customers_roadmap', uid), {
      name: additionalData.name,
      role: 'customer',
      status: 'active',
      createdAt: serverTimestamp()
    });
  };

  const signIn = async (email: string, pass: string) => {
    if (!auth) throw new Error("Auth service unavailable");
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    localStorage.removeItem('bb_partner_authenticated');
    localStorage.removeItem('bb_partner_mobile');
    if (auth) await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, logout }}>
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
