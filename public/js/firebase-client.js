// Client-side Firebase integration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-analytics.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

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
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// Check if user is authenticated
const checkAuthState = () => {
  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        resolve(user);
      } else {
        resolve(null);
      }
    }, reject);
  });
};

// Login with email/password
const loginWithEmailPassword = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Logout user
const logout = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

// Get documents from a collection
const getCollection = async (collectionName) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const data = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    return data;
  } catch (error) {
    console.error(`Error getting collection ${collectionName}:`, error);
    throw error;
  }
};

// Get a single document by ID
const getDocument = async (collectionName, id) => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error getting document ${id} from ${collectionName}:`, error);
    throw error;
  }
};

// Add a new document
const addDocument = async (collectionName, data) => {
  try {
    const id = data.id || crypto.randomUUID();
    await setDoc(doc(db, collectionName, id), { ...data, id });
    return { id, ...data };
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
};

// Update an existing document
const updateDocument = async (collectionName, id, data) => {
  try {
    const docRef = doc(db, collectionName, id);
    
    // First check if document exists
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      // Document exists, update it
      await updateDoc(docRef, data);
    } else {
      // Document doesn't exist, create it with setDoc to prevent errors
      console.log(`Document ${id} doesn't exist in ${collectionName}, creating it instead of updating`);
      await setDoc(docRef, { ...data, id });
    }
    
    return { id, ...data };
  } catch (error) {
    console.error(`Error updating document ${id} in ${collectionName}:`, error);
    throw error;
  }
};

// Delete a document
const deleteDocument = async (collectionName, id) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
    return true;
  } catch (error) {
    console.error(`Error deleting document ${id} from ${collectionName}:`, error);
    throw error;
  }
};

// Export Firebase functions
window.FirebaseClient = {
  checkAuthState,
  loginWithEmailPassword,
  logout,
  getCollection,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument
};