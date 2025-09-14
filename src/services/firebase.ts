// src/services/firebase.ts
import { getApps, initializeApp, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = { 
  apiKey : "AIzaSyAzbp6Gbtosy_slSrlq-k2MYz33TRmEF7Q" , 
  authDomain : "naver-ai-b9c56.firebaseapp.com" , 
  projectId : "naver-ai-b9c56" , 
  storageBucket : "naver-ai-b9c56.firebasestorage.app" , 
  messagingSenderId : "475712203216" , 
  appId : "1:475712203216:web:a5035b2a25d2d004e671d5" , 
  measurementId : "G-D6MXPCT20B" 
};


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);

export const loginWithGoogle = async (): Promise<User | null> => {
  try {
    const res = await signInWithPopup(auth, provider);
    return res.user;
  } catch (err) {
    console.error("Google login error:", err);
    return null;
  }
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export { onAuthStateChanged };
