import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBsL38fu8shuNe4F5gfGPDIWC2I7i43YOU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hwm-software.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hwm-software",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hwm-software.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "627970499229",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:627970499229:web:2a1f6eaebb90c72bc52a74",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-J6TEK6EG54"
};

// Initialize Firebase once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use initializeFirestore with auto-detect long polling and persistent offline cache
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
