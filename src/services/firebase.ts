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
  apiKey: "AIzaSyC7IJJW9Wcb9UtFbXk3q10DAVGF-7_sjgI",
  authDomain: "naverai-hackathon.firebaseapp.com",
  projectId: "naverai-hackathon",
  storageBucket: "naverai-hackathon.firebasestorage.app",
  messagingSenderId: "91763174370",
  appId: "1:91763174370:web:eb23cd6486d42acf0aa7bb",
  measurementId: "G-BRN1EW1ZXZ"
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
