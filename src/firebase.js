// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyH8h0OqHmI3vXsW_ee1qugqCAHRiL3vk",
  authDomain: "soccer-app-e81d0.firebaseapp.com",
  projectId: "soccer-app-e81d0",
  storageBucket: "soccer-app-e81d0.appspot.com",  // Fixed storage bucket URL
  messagingSenderId: "199836947592",
  appId: "1:199836947592:web:8388db5a944f98b6d57b3d",
  measurementId: "G-JQZVTJX6TJ"
};

// Initialize Firebase
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// Enable offline persistence

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a a time.
    console.warn('Firebase persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    console.warn('Firebase persistence not supported');
  }
});

export { db, auth, analytics };