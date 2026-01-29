
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
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
  loginPartnerGhost: (mobile: string, name: string) => void;
  logout: () => Promise<void>;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkGhostSession = useCallback(() => {
    const partnerMobile = localStorage.getItem('bb_partner_mobile');
    const isPartnerAuth = localStorage.getItem('bb_partner_authenticated');
    const partnerName = localStorage.getItem('bb_partner_name') || 'Partner';

    if (partnerMobile && isPartnerAuth === 'true') {
      return { 
        uid: partnerMobile, 
        email: `${partnerMobile}@partner.ghost`, 
        name: partnerName,
        role: 'partner' as const,
        status: 'pending' as const
      };
    }
    return null;
  }, []);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    const ghost = checkGhostSession();
    if (ghost) {
      setUser(ghost);
      setLoading(false);
      return;
    }

    const firebaseUser = auth.currentUser;
    if (firebaseUser && db) {
      try {
        const custDoc = await getDoc(doc(db, 'customers_roadmap', firebaseUser.uid));
        if (custDoc.exists()) {
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...custDoc.data() } as AppUser);
        }
      } catch (err) {
        console.error("Auth lookup error:", err);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, [checkGhostSession]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      await refreshAuth();
    });

    return unsubscribe;
  }, [refreshAuth]);

  const signUp = async (email: string, pass: string, additionalData: any, type: 'customer' | 'partner') => {
    if (!auth || !db) throw new Error("Auth service unavailable");
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, 'customers_roadmap', res.user.uid), {
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

  const loginPartnerGhost = (mobile: string, name: string) => {
    localStorage.setItem('bb_partner_authenticated', 'true');
    localStorage.setItem('bb_partner_mobile', mobile);
    localStorage.setItem('bb_partner_name', name);
    setUser({
      uid: mobile,
      email: `${mobile}@partner.ghost`,
      name: name,
      role: 'partner',
      status: 'pending'
    });
  };

  const logout = async () => {
    localStorage.removeItem('bb_partner_authenticated');
    localStorage.removeItem('bb_partner_mobile');
    localStorage.removeItem('bb_partner_name');
    localStorage.removeItem('bb_partner_active');
    if (auth) await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, loginPartnerGhost, logout, refreshAuth }}>
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
