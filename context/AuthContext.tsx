
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
  role: 'customer';
  status: 'active';
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signUp: (email: string, pass: string, data: any) => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    const firebaseUser = auth.currentUser;
    if (firebaseUser && db) {
      try {
        const custDoc = await getDoc(doc(db, 'customers_roadmap', firebaseUser.uid));
        if (custDoc.exists()) {
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...custDoc.data() } as AppUser);
        } else {
          // If Firestore record doesn't exist but Firebase user does, it's a legacy or sync issue
          setUser(null);
        }
      } catch (err) {
        console.error("Auth lookup error:", err);
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

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

  const signUp = async (email: string, pass: string, additionalData: any) => {
    if (!auth || !db) throw new Error("Auth service unavailable");
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    const userData = {
      name: additionalData.name || 'Network Member',
      role: 'customer' as const,
      status: 'active' as const,
      createdAt: serverTimestamp()
    };
    await setDoc(doc(db, 'customers_roadmap', res.user.uid), userData);
    setUser({ uid: res.user.uid, email: res.user.email, ...userData } as AppUser);
  };

  const signIn = async (email: string, pass: string) => {
    if (!auth) throw new Error("Auth service unavailable");
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    if (auth) await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, logout, refreshAuth }}>
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
