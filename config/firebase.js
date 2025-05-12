// Firebase configuration
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Import client Firebase
const { initializeApp: initializeClientApp } = require('firebase/app');
const { getFirestore: getClientFirestore } = require('firebase/firestore');
const { getAuth: getClientAuth } = require('firebase/auth');

// Firebase client configuration
const firebaseConfig = {
  apiKey: "AIzaSyA8BfGknaD7K8cualdLXq7aBBVtWWbxlgo",
  authDomain: "money-transfering.firebaseapp.com",
  projectId: "money-transfering",
  storageBucket: "money-transfering.firebasestorage.app",
  messagingSenderId: "1090188586001",
  appId: "1:1090188586001:web:a16689b5b9f7e73e2f95b0",
  measurementId: "G-FKEDK8EEX4"
};

// Initialize Firebase Admin with service account
let adminApp, adminDb, adminAuth;

// Try to initialize Firebase Admin
try {
  let serviceAccount;
  
  console.log('Starting Firebase Admin initialization...');
  console.log('Node.js environment:', process.env.NODE_ENV);
  
  // First, check if FIREBASE_SERVICE_ACCOUNT environment variable exists
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      // Try to parse the environment variable
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log('Using Firebase service account from environment variable');
      console.log('Service account project_id:', serviceAccount.project_id);
      console.log('Service account client_email:', serviceAccount.client_email);
    } catch (parseError) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:', parseError.message);
      // If the error is about invalid JSON, log the first few characters to help diagnose
      if (parseError instanceof SyntaxError && process.env.FIREBASE_SERVICE_ACCOUNT) {
        const preview = process.env.FIREBASE_SERVICE_ACCOUNT.substring(0, 40) + '...';
        console.error('First part of FIREBASE_SERVICE_ACCOUNT:', preview);
      }
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT format');
    }
  } else {
    console.log('FIREBASE_SERVICE_ACCOUNT environment variable not found, trying local file');
    // Try to use the local file as fallback
    try {
      // Get path to the service account file
      const serviceAccountPath = require('path').join(__dirname, '../firebase-service-account.json');
      
      // Check if file exists before attempting to load it
      if (!require('fs').existsSync(serviceAccountPath)) {
        throw new Error(`Firebase service account file not found at: ${serviceAccountPath}`);
      }
      
      // Try to parse the file to catch JSON syntax errors
      const fileContent = require('fs').readFileSync(serviceAccountPath, 'utf8');
      try {
        serviceAccount = JSON.parse(fileContent);
      } catch (jsonError) {
        throw new Error(`Invalid JSON in firebase-service-account.json: ${jsonError.message}`);
      }
      
      console.log('Using Firebase service account from local file');
      console.log('Service account project_id:', serviceAccount.project_id);
    } catch (fileError) {
      console.error('Failed to load firebase-service-account.json:', fileError.message);
      throw new Error('No Firebase service account available - please set FIREBASE_SERVICE_ACCOUNT environment variable or create a valid firebase-service-account.json file');
    }
  }
  
  // Verify the service account has required fields
  const requiredFields = ['project_id', 'private_key', 'client_email', 'client_id', 'type'];
  const missingFields = requiredFields.filter(field => !serviceAccount[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Firebase service account missing required fields: ${missingFields.join(', ')}`);
  }
  
  // Check for placeholder values in critical fields
  const placeholderChecks = [
    { field: 'private_key', value: serviceAccount.private_key, placeholders: ['YOUR_PRIVATE_KEY', '{{PRIVATE_KEY}}'] },
    { field: 'private_key_id', value: serviceAccount.private_key_id, placeholders: ['YOUR_PRIVATE_KEY_ID', '{{PRIVATE_KEY_ID}}'] },
    { field: 'client_id', value: serviceAccount.client_id, placeholders: ['YOUR_CLIENT_ID', '{{CLIENT_ID}}'] }
  ];
  
  for (const check of placeholderChecks) {
    if (check.placeholders.includes(check.value)) {
      throw new Error(`Firebase service account ${check.field} contains a placeholder value: ${check.value}`);
    }
  }
  
  // Validate private key format
  if (!serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Firebase service account private_key is invalid - missing "BEGIN PRIVATE KEY" marker');
  }

  adminApp = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
  });
  
  // Initialize Admin services
  adminDb = getFirestore(adminApp);
  adminAuth = getAuth(adminApp);
  
  console.log('Firebase Admin initialized successfully for project:', serviceAccount.project_id);
} catch (error) {
  console.error('Firebase Admin SDK initialization failed:', error.message);
  console.error('Server will run in client-only mode - some features requiring Admin SDK will not work');
  
  // Create stub implementations to prevent errors
  adminApp = null;
  adminDb = null;
  adminAuth = {
    verifyIdToken: () => Promise.reject(new Error('Firebase Admin SDK not initialized')),
    createUser: () => Promise.reject(new Error('Firebase Admin SDK not initialized'))
  };
}

// Initialize client Firebase
const clientApp = initializeClientApp(firebaseConfig);

// Initialize client services
const db = getClientFirestore(clientApp);
const auth = getClientAuth(clientApp);

console.log('Firebase Client initialized successfully');

module.exports = {
  adminApp,
  clientApp,
  adminDb,
  adminAuth,
  db,
  auth,
  firebaseConfig
};