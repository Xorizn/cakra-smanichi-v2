// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database"; // Import Realtime Database SDK

const firebaseConfig = {
  apiKey: "AIzaSyCd3ehI_cHsv1cwe3zp56PvN08J8EloGp0",
  authDomain: "ums-cakra.firebaseapp.com",
  databaseURL: "https://ums-cakra-default-rtdb.firebaseio.com",
  projectId: "ums-cakra",
  storageBucket: "ums-cakra.firebasestorage.app",
  messagingSenderId: "410018953800",
  appId: "1:410018953800:web:0136e7dccaa554acf3f67d",
  measurementId: "G-3MJ71SMCX5"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app); // Firestore instance
const rtdb = getDatabase(app); // Realtime Database instance

export { app, auth, db, rtdb }; // Export rtdb
