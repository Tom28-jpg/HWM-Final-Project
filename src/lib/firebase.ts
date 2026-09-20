import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyBsL38fu8shuNe4F5gfGPDIWC2I7i43YOU",
  authDomain: "hwm-software.firebaseapp.com",
  projectId: "hwm-software",
  storageBucket: "hwm-software.firebasestorage.app",
  messagingSenderId: "627970499229",
  appId: "1:627970499229:web:2a1f6eaebb90c72bc52a74",
  measurementId: "G-J6TEK6EG54"
};

// Initialize Firebase once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
