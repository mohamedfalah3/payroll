// auth.js middleware for user authentication using Firebase
const { 
    signInWithEmailAndPassword, 
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserSessionPersistence
} = require('firebase/auth');
const { doc, getDoc, setDoc } = require('firebase/firestore');
const firebase = require('../config/firebase');

// Default user roles and permissions mapping
const defaultPermissions = {
    admin: ['bank', 'hawala', 'add-market', 'add-bank', 'add-account'],
    'bank-manager': ['bank'],
    'hawala-manager': ['hawala'],
    'data-entry': ['add-market', 'add-bank', 'add-account'],
    'bank-hawala-manager': ['bank', 'hawala']
};

// Map emails to their default roles (for initial setup)
// In production, you would manage this in Firestore
const userRoleMapping = {
    'mahamad@example.com': 'admin',
    'roman@example.com': 'bank-manager',
    'ari@example.com': 'hawala-manager',
    'yusif@example.com': 'data-entry',
    'omar@example.com': 'bank-hawala-manager'
};

// Check if user is logged in
const isAuthenticated = async (req, res, next) => {
    try {
        // If user is authenticated, proceed to next middleware
        if (req.session && req.session.user && req.session.user.id) {
            return next();
        }
        
        // Save original URL to redirect after login
        req.session.returnTo = req.originalUrl;
        
        // Redirect to login page
        res.redirect('/login');
    } catch (error) {
        console.error('isAuthenticated error:', error);
        res.redirect('/login');
    }
};

// Helper function to determine default page for user based on permissions
const getDefaultPageForUser = (user) => {
    try {
        if (!user || !user.permissions || user.permissions.length === 0) {
            return '/login';
        }
        
        // Check for specific permissions and redirect to the appropriate page
        if (user.permissions.includes('bank')) {
            return '/bank';
        } else if (user.permissions.includes('hawala')) {
            return '/hawala';
        } else if (user.permissions.includes('add-market')) {
            return '/add-market';
        } else if (user.permissions.includes('add-bank')) {
            return '/add-bank';
        } else if (user.permissions.includes('add-account')) {
            return '/add-account';
        }
        
        // Fallback to login if no recognized permissions
        return '/login';
    } catch (error) {
        console.error('getDefaultPageForUser error:', error);
        return '/login';
    }
};

// Check if user has access to the specific route
const hasAccess = (permission) => {
    return (req, res, next) => {
        try {
            // If not authenticated at all, redirect to login
            if (!req.session || !req.session.user) {
                req.session.returnTo = req.originalUrl;
                return res.redirect('/login');
            }
            
            // Get user permissions
            const userPermissions = req.session.user.permissions || [];
            
            // Check if user has the required permission
            if (userPermissions.includes(permission)) {
                return next();
            }
            
            // If no access, show access denied page with appropriate return path
            const returnTo = getDefaultPageForUser(req.session.user);
            return res.render('access-denied', { 
                title: 'Access Denied',
                user: req.session.user,
                returnTo: returnTo
            });
        } catch (error) {
            console.error('hasAccess error:', error);
            res.redirect('/login');
        }
    };
};

// Authenticate user with Firebase
const authenticateUser = async (email, password) => {
    try {
        console.log(`Attempting to authenticate: ${email}`);
        
        // Set authentication persistence to SESSION to work better with serverless
        try {
            await setPersistence(firebase.auth, browserSessionPersistence);
        } catch (persistenceError) {
            console.warn("Could not set persistence, might be server-side:", persistenceError);
            // Continue anyway as we'll use our own session mechanism
        }
        
        // Attempt to sign in with Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(firebase.auth, email, password);
        const firebaseUser = userCredential.user;
        
        console.log(`User authenticated with Firebase: ${firebaseUser.uid}`);

        // Get user role and permissions from Firestore or create if not exists
        let role = userRoleMapping[email] || 'user';
        let permissions = [];
        
        try {
            // Try to get user data from Firestore
            const userDocRef = doc(firebase.db, "users", firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                // User exists in Firestore
                const userData = userDoc.data();
                role = userData.role || role;
                permissions = userData.permissions || defaultPermissions[role] || [];
                console.log(`User data found in Firestore: ${role}, permissions: ${permissions}`);
            } else {
                // User doesn't exist in Firestore yet, create it
                console.log(`Creating new user document in Firestore for: ${email}`);
                permissions = defaultPermissions[role] || [];
                
                // Create user in Firestore with default role and permissions
                await setDoc(userDocRef, {
                    email,
                    role,
                    permissions,
                    displayName: email.split('@')[0],
                    createdAt: new Date().toISOString()
                });
            }
        } catch (firestoreError) {
            console.error("Error with Firestore:", firestoreError);
            // Fallback to default permissions if Firestore fails
            permissions = defaultPermissions[role] || [];
        }
        
        // Return the user object for session storage
        const sessionUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || email.split('@')[0],
            role,
            permissions,
            authTime: Date.now()
        };
        
        console.log(`Authentication successful, returning user object with ID: ${sessionUser.id}`);
        return sessionUser;
    } catch (error) {
        console.error("Authentication failed:", error.code, error.message);
        return null;
    }
};

// Logout user from Firebase
const logoutUser = async () => {
    try {
        await signOut(firebase.auth);
        console.log("User signed out from Firebase");
        return true;
    } catch (error) {
        console.error("Logout failed:", error);
        return false;
    }
};

// Add user data to all responses
const addUserToLocals = (req, res, next) => {
    // Make user available to all templates
    res.locals.user = req.session.user || null;
    next();
};

module.exports = {
    isAuthenticated,
    hasAccess,
    authenticateUser,
    logoutUser,
    addUserToLocals,
    getDefaultPageForUser
};