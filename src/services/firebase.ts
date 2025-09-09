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
  apiKey: "AIzaSyD43I6rC11KEGU-vrapYVKzO8rt44wSNng",
  authDomain: "naverai-b5abc.firebaseapp.com",
  projectId: "naverai-b5abc",
  storageBucket: "naverai-b5abc.firebasestorage.app",
  messagingSenderId: "67514673971",
  appId: "1:67514673971:web:5c5c5c5c5c5c5c5c5c5c5c",
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
