import { getApp, getApps, initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

// IMPORTANT: Add your Firebase project configuration to .env.local
// See .env.example for a template.
const firebaseConfig = {
  projectId: "studio-5368005606-94de4",
  appId: "1:181282457818:web:754a41b8ceb647d778bde3",
  storageBucket: "studio-5368005606-94de4.firebasestorage.app",
  apiKey: "AIzaSyD-KsDNyiTbJCBQj76XaxZ9irEK_7fdRhE",
  authDomain: "studio-5368005606-94de4.firebaseapp.com",
  messagingSenderId: "181282457818",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const storage = getStorage(app);

export { app, storage, firebaseConfig };
