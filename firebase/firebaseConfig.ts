
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * MASTER FIREBASE CONFIGURATION
 * Restored valid API Key from environment to resolve "400 INVALID_ARGUMENT" errors.
 * Analytics is disabled to prevent unnecessary Installations API calls that may fail.
 */
const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: "bb-connect-network.firebaseapp.com",
  databaseURL: "https://bb-connect-network-default-rtdb.firebaseio.com",
  projectId: "bb-connect-network",
  storageBucket: "bb-connect-network.firebasestorage.app",
  messagingSenderId: "117108477417",
  appId: "1:117108477417:web:7f935176cc16abf1984f78"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
