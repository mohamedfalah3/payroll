// Firebase configuration
const { initializeApp } = require('firebase/app');
const { getAnalytics } = require('firebase/analytics');
const { getFirestore } = require('firebase/firestore');
const { getAuth } = require('firebase/auth');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA8BfGknaD7K8cualdLXq7aBBVtWWbxlgo",
  authDomain: "money-transfering.firebaseapp.com",
  projectId: "money-transfering",
  storageBucket: "money-transfering.firebasestorage.app",
  messagingSenderId: "1090188586001",
  appId: "1:1090188586001:web:a16689b5b9f7e73e2f95b0",
  measurementId: "G-FKEDK8EEX4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services with null safety
let analytics = null;
const db = getFirestore(app) || null;
const auth = getAuth(app) || null;

// Only initialize Analytics in browser environment
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Analytics initialization failed:', error);
    analytics = null;
  }
}

// Verify Firestore connection
if (db) {
  console.log('Firestore initialized successfully');
} else {
  console.error('Failed to initialize Firestore');
}

module.exports = {
  app,
  analytics,
  db,
  auth
};