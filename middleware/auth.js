// auth.js middleware for user authentication using Firebase
const { 
    signInWithEmailAndPassword, 
    signOut,
    onAuthStateChanged
} = require('firebase/auth');
const { doc, getDoc } = require('firebase/firestore');
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
    // If user is authenticated, proceed to next middleware
    if (req.session && req.session.user) {
        return next();
    }
    
    // Save original URL to redirect after login
    req.session.returnTo = req.originalUrl;
    
    // Redirect to login page
    res.redirect('/login');
};

// Helper function to determine default page for user based on permissions
const getDefaultPageForUser = (user) => {
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
};

// Check if user has access to the specific route
const hasAccess = (permission) => {
    return (req, res, next) => {
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
    };
};

// Authenticate user with Firebase
const authenticateUser = async (email, password) => {
    try {
        // Attempt to sign in with Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(firebase.auth, email, password);
        const firebaseUser = userCredential.user;

        // Get user role and permissions from Firestore 
        // Or fallback to default mapping for initial setup
        let role = userRoleMapping[email] || 'user';
        let permissions = [];
        
        try {
            // Try to get user data from Firestore
            const userDoc = await getDoc(doc(firebase.db, "users", firebaseUser.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                role = userData.role || role;
                permissions = userData.permissions || defaultPermissions[role] || [];
            } else {
                // If user document doesn't exist in Firestore yet, use default permissions
                permissions = defaultPermissions[role] || [];
            }
        } catch (error) {
            console.error("Error getting user data from Firestore:", error);
            // Fallback to default permissions if Firestore fails
            permissions = defaultPermissions[role] || [];
        }
        
        // Return the user object for session storage
        return {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || email.split('@')[0],
            role,
            permissions
        };
    } catch (error) {
        console.error("Authentication failed:", error);
        return null;
    }
};

// Logout user from Firebase
const logoutUser = async () => {
    try {
        await signOut(firebase.auth);
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