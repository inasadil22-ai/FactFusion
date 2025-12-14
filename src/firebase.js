// src/firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your Firebase configuration (taken from your provided firebase_config.py, 
// using 'username' as 'email' for Firebase Auth)
const firebaseConfig = {
    apiKey: "AIzaSyBAXphT_xM9Fmg6GBeBngo_uVY2q4Omkeg",
    authDomain: "fact-fusion-e63a6.firebaseapp.com",
    projectId: "fact-fusion-e63a6",
    storageBucket: "fact-fusion-e63a6.firebasestorage.app",
    messagingSenderId: "900092940867",
    appId: "1:900092940867:web:9f316cf1f0e63d0d51baf6",
    measurementId: "G-6FH9L88V3Y",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and export it
export const auth = getAuth(app);

// NOTE: If you decide to use Firestore for prediction history, you'd add:
// import { getFirestore } from 'firebase/firestore';
// export const db = getFirestore(app);