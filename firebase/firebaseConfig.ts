import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';

/**
 * MASTER FIREBASE CONFIGURATION (STRICT CONTROL)
 * Hardcoded keys to bypass environment variable resolution issues.
 */
const firebaseConfig = {
  apiKey: "AIzaSyCA0qq1pc9JRQo4dYgqLvROwVsRFkFWjE0",
  authDomain: "bb-connect-network.firebaseapp.com",
  databaseURL: "https://bb-connect-network-default-rtdb.firebaseio.com",
  projectId: "bb-connect-network",
  storageBucket: "bb-connect-network.firebasestorage.app",
  messagingSenderId: "117108477417",
  appId: "1:117108477417:web:7f935176cc16abf1984f78",
  measurementId: "G-VGT1T6BE6V"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;