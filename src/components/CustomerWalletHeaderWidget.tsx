import React, { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';

interface CustomerWalletHeaderWidgetProps {
  db: Firestore;
  customerId: string;
}

export const CustomerWalletHeaderWidget: React.FC<CustomerWalletHeaderWidgetProps> = ({ db, customerId }) => {
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!customerId || !db) {
      setLoading(false);
      return;
    }

    // Set up real-time listener with fallback getDoc
    const userDocRef = doc(db, 'users', customerId);
    
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setWalletBalance(data.walletBalance || data.wallet || 0);
        } else {
          setWalletBalance(0);
        }
        setLoading(false);
      },
      async (err) => {
        console.warn('Real-time wallet subscription error, falling back to getDoc:', err);
        try {
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            setWalletBalance(data.walletBalance || data.wallet || 0);
          }
        } catch (fetchErr) {
          console.error('Error fetching wallet balance:', fetchErr);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [db, customerId]);

  return (
    <div
      id="customer-wallet-header-widget"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        padding: '20px 24px',
        borderRadius: '16px',
        margin: '16px 0 24px 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}
    >
      <div>
        <span style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
          BB Connect Wallet
        </span>
        <h2 style={{ margin: '4px 0 0 0', fontSize: '1.8rem', fontWeight: 'bold', color: '#38bdf8' }}>
          {loading ? 'Loading...' : `₹${walletBalance}`}
        </h2>
      </div>

      <div style={{ textAlign: 'right' }}>
        <button
          id="wallet-view-history-btn"
          type="button"
          onClick={() => alert('Wallet funds are auto-credited on booking cancellations/rejections and used instantly during next slot booking.')}
          style={{
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            border: '1px solid #38bdf8',
            padding: '8px 14px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}
        >
          View History
        </button>
      </div>
    </div>
  );
};

export default CustomerWalletHeaderWidget;
