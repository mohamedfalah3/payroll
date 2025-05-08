/**
 * Utility script to set up initial users in Firebase Authentication
 * 
 * Run this script once to create the Firebase Authentication users that match
 * your previous hardcoded users. This creates the users and their roles in 
 * Firestore for permission management.
 */

const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signOut 
} = require('firebase/auth');
const { 
  getFirestore, 
  doc, 
  setDoc 
} = require('firebase/firestore');

// Firebase configuration from your config file
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
const auth = getAuth(app);
const db = getFirestore(app);

// User data mapping from the previous hardcoded users
const users = [
  {
    email: 'mahamad@example.com',
    password: 'Mahamad100%',
    role: 'admin',
    permissions: ['bank', 'hawala', 'add-market', 'add-bank', 'add-account'],
    displayName: 'Mahamad'
  },
  {
    email: 'roman@example.com',
    password: 'roman100%',
    role: 'bank-manager',
    permissions: ['bank'],
    displayName: 'Roman'
  },
  {
    email: 'ari@example.com',
    password: 'ari100%',
    role: 'hawala-manager',
    permissions: ['hawala'],
    displayName: 'Ari'
  },
  {
    email: 'yusif@example.com',
    password: 'yusif100%',
    role: 'data-entry',
    permissions: ['add-market', 'add-bank', 'add-account'],
    displayName: 'Yusif'
  },
  {
    email: 'omar@example.com',
    password: 'omar100%',
    role: 'bank-hawala-manager',
    permissions: ['bank', 'hawala'],
    displayName: 'Omar'
  }
];

// Function to create a user in Firebase Authentication and Firestore
async function createUser(userData) {
  try {
    console.log(`Creating user: ${userData.email}`);
    
    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      userData.email, 
      userData.password
    );
    
    const user = userCredential.user;
    console.log(`User created with UID: ${user.uid}`);
    
    // Create user document in Firestore with role and permissions
    await setDoc(doc(db, "users", user.uid), {
      email: userData.email,
      role: userData.role,
      permissions: userData.permissions,
      displayName: userData.displayName
    });
    
    console.log(`User data stored in Firestore: ${userData.email}`);
    return true;
  } catch (error) {
    console.error(`Error creating user ${userData.email}:`, error.message);
    // If email already in use, consider it a success (user already exists)
    if (error.code === 'auth/email-already-in-use') {
      console.log(`User ${userData.email} already exists. Skipping.`);
      return true;
    }
    return false;
  }
}

// Main function to create all users
async function setupUsers() {
  console.log('Setting up Firebase users...');
  
  for (const userData of users) {
    await createUser(userData);
  }
  
  console.log('User setup complete!');
  // Sign out after creating users
  await signOut(auth);
  process.exit(0);
}

// Run the setup
setupUsers().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});