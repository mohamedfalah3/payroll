// Firebase Authentication Middleware
const { getAuth } = require('firebase-admin/auth');
const { db } = require('../config/firebase');
const { collection, doc, getDoc } = require('firebase/firestore');

// Define user roles and permissions mapping
const rolePermissions = {
    admin: ['bank', 'hawala', 'add-market', 'add-bank', 'add-account'],
    'bank-manager': ['bank'],
    'hawala-manager': ['hawala'],
    'data-entry': ['add-market', 'add-bank', 'add-account'],
    'bank-hawala-manager': ['bank', 'hawala']
};

// Authentication status endpoint for cross-origin requests
const getAuthStatus = async (req, res) => {
    const isLoggedIn = !!(req.session && req.session.user && req.session.user.uid);
    
    return res.json({
        authenticated: isLoggedIn,
        user: isLoggedIn ? {
            email: req.session.user.email,
            role: req.session.user.role
        } : null,
        session: {
            exists: !!req.session,
            id: req.session ? req.session.id : null,
            lastActive: req.session && req.session.user ? req.session.user.lastActive : null
        },
        request: {
            host: req.get('host'),
            origin: req.get('origin') || 'none',
            secure: req.secure,
            timestamp: new Date().toISOString()
        }
    });
};

// Clear authentication status (for debugging)
const clearAuth = async (req, res) => {
    if (req.session) {
        req.session.destroy();
    }
    return res.json({ status: 'Authentication cleared', timestamp: new Date().toISOString() });
};

// Check if user is logged in
const isAuthenticated = async (req, res, next) => {
    try {
        const requestPath = req.originalUrl;
        const host = req.get('host') || 'unknown';
        const origin = req.get('origin') || 'unknown';
        
        console.log(`Auth check for ${requestPath} from host:${host}, origin:${origin}`);
        
        // Special case for API testing endpoint
        if (requestPath === '/api/test') {
            return next();
        }
        
        // API auth status endpoint
        if (requestPath === '/api/auth/verify' || requestPath === '/api/auth/status') {
            return getAuthStatus(req, res);
        }
        
        // API auth clear endpoint (for debugging)
        if (requestPath === '/api/auth/clear' && process.env.NODE_ENV !== 'production') {
            return clearAuth(req, res);
        }
        
        // Check for session first (faster and more reliable)
        if (req.session && req.session.user && req.session.user.uid) {
            console.log(`Session found for user ${req.session.user.email}`);
            
            // Track session activity
            req.session.lastActive = Date.now();
            return next();
        }
        
        // Look for Firebase token in multiple places
        let idToken = null;
        let tokenSource = null;
        
        // 1. Check Authorization header (preferred)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            idToken = authHeader.split('Bearer ')[1];
            tokenSource = 'Authorization header';
            console.log('Found token in Authorization header');
        }
        
        // 2. Check cookies as fallback (useful for cross-domain scenarios)
        else if (req.cookies && req.cookies.firebaseToken) {
            idToken = req.cookies.firebaseToken;
            tokenSource = 'Cookie';
            console.log('Found token in cookies');
        }
        
        // 3. Check query parameter as last resort (used in redirects)
        else if (req.query && req.query.token) {
            idToken = req.query.token;
            tokenSource = 'URL query parameter';
            console.log('Found token in query parameter');
        }
        
        if (!idToken) {
            console.log('No authentication token found, redirecting to login');
            
            // For API requests, return 401 instead of redirecting
            if (requestPath.startsWith('/api/')) {
                return res.status(401).json({ 
                    error: 'Authentication required',
                    path: requestPath,
                    host: host,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Save original URL to redirect after login
            req.session.returnTo = req.originalUrl;
            return res.redirect('/login');
        }

        try {
            // Verify the token with Firebase Admin
            const decodedToken = await getAuth().verifyIdToken(idToken);
            const uid = decodedToken.uid;
            console.log(`Token verified for user ID: ${uid}`);
            
            // Get user data from Firestore
            const userDoc = await getDoc(doc(db, 'users', uid));
            
            if (!userDoc.exists()) {
                console.error(`User ${uid} token valid but no Firestore record found`);
                throw new Error('User not found in database');
            }
            
            const userData = userDoc.data();
            console.log(`User data retrieved: ${userData.email}, role: ${userData.role}`);
            
            // Set user data in session
            req.session.user = {
                uid: uid,
                email: userData.email,
                role: userData.role || 'user',
                permissions: userData.permissions || rolePermissions[userData.role] || [],
                lastActive: Date.now()
            };
            
            // Save session explicitly to ensure it's stored immediately
            req.session.save(err => {
                if (err) {
                    console.error('Error saving session:', err);
                } else {
                    console.log('Session saved successfully');
                }
                return next();
            });
        } catch (error) {
            console.error('Error verifying token:', error);
            req.session.returnTo = req.originalUrl;
            req.session.authError = {
                message: error.message, 
                time: Date.now()
            };
            return res.redirect('/login');
        }
    } catch (error) {
        console.error('Authentication error:', error);
        req.session.returnTo = req.originalUrl;
        req.session.authError = {
            message: error.message, 
            time: Date.now()
        };
        return res.redirect('/login');
    }
};

// Check if user has access to the specific route
const hasAccess = (permission) => {
    return async (req, res, next) => {
        // If not authenticated at all, redirect to login
        if (!req.session || !req.session.user) {
            req.session.returnTo = req.originalUrl;
            return res.redirect('/login');
        }
        
        // Get user permissions
        const userPermissions = req.session.user.permissions || [];
        
        // Check if user has the required permission
        if (userPermissions.includes(permission) || userPermissions.includes('admin')) {
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

// Helper function to determine default page for user based on permissions
function getDefaultPageForUser(user) {
    if (!user || !user.permissions || user.permissions.length === 0) {
        return '/login';
    }
    
    // Special case for admin
    if (user.permissions.includes('admin')) {
        return '/bank';
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
    } else {
        return '/logout'; // Fallback to logout if no valid permissions
    }
}

// Login route handler for Firebase authentication
const handleFirebaseLogin = async (req, res) => {
    console.log('Firebase login attempt:', {
        timestamp: new Date().toISOString(),
        headers: {
            host: req.headers.host,
            origin: req.headers.origin || 'none',
            referer: req.headers.referer || 'none'
        },
        body: {
            hasUid: !!req.body.uid,
            hasEmail: !!req.body.email,
            hasIdToken: !!req.body.idToken
        }
    });
    
    try {
        const { idToken, uid, email } = req.body;
        
        if (!uid || !email) {
            console.error('Authentication error: Missing user information');
            return res.status(400).json({ error: 'Missing user information (uid or email)' });
        }
        
        // Log the authentication attempt
        console.log(`Authentication attempt for: ${email} (${uid})`);
        
        try {
            // Get user data from Firestore
            console.log(`Looking up user data in Firestore for: ${uid}`);
            const userDoc = await getDoc(doc(db, 'users', uid));
            
            // If user doesn't exist in Firestore yet
            if (!userDoc.exists()) {
                console.error(`Authentication error: User not found in Firestore: ${email} (${uid})`);
                return res.status(403).json({ 
                    error: 'User not found in system. Please contact administrator.'
                });
            }
            
            console.log(`User document found for: ${email}`);
            const userData = userDoc.data();
              // Create session with full user data
            req.session.user = {
                uid: uid,
                email: email,
                role: userData.role || 'user',
                permissions: userData.permissions || rolePermissions[userData.role] || [],
                name: userData.name || email.split('@')[0], // Use name from Firestore or extract from email
                loginTime: Date.now()
            };
            
            // Force session save to ensure it's stored before responding
            req.session.save(err => {
                if (err) {
                    console.error('Error saving session:', err);
                }
                console.log('Session saved successfully');
            });
            
            // Debug log
            console.log(`User authenticated: ${email} (${uid}) with role: ${userData.role || 'user'}`);
            console.log('Session cookie:', req.session.cookie);
        } catch (firestoreError) {
            console.error('Firestore error during authentication:', firestoreError);
            return res.status(500).json({ error: 'Authentication database error' });
        }
        
        // Determine where to redirect the user
        const redirectUrl = req.session.returnTo || getDefaultPageForUser(req.session.user) || '/';
        delete req.session.returnTo;
        
        return res.status(200).json({ 
            success: true, 
            redirectUrl,
            user: {
                email: req.session.user.email,
                role: req.session.user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};

// Create session from existing Firebase auth - Used when redirected from Firebase hosting
const createSessionFromToken = async (req, res) => {
    console.log('Creating session from token (Firebase redirect flow)');
    console.log('Request origin:', req.headers.origin || 'No origin header');
    console.log('Request referrer:', req.headers.referer || 'No referrer');
    console.log('Request host:', req.headers.host);
    
    try {
        // Check that we have the required user information
        const { uid, email } = req.body;
        
        if (!uid || !email) {
            console.error('Missing uid or email in request body');
            return res.status(400).json({ 
                error: 'Missing required user information (uid, email)',
                success: false,
                redirectUrl: '/login?error=missing_user_info' 
            });
        }
        
        console.log(`Looking up user data for: ${email} (${uid})`);
        
        // Get user data from Firestore
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            
            if (!userDoc.exists()) {
                console.error(`User ${uid} not found in Firestore`);
                return res.status(200).json({ 
                    success: false,
                    error: 'User not found in database',
                    redirectUrl: '/login?error=user_not_found' 
                });
            }
            
            const userData = userDoc.data();
            console.log(`User data retrieved for ${email}, role: ${userData.role || 'user'}`);
              // Create session with all needed data
            req.session.user = {
                uid: uid,
                email: email,
                role: userData.role || 'user',
                permissions: userData.permissions || rolePermissions[userData.role] || [],
                name: userData.name || email.split('@')[0],
                loginTime: Date.now()
            };
            
            // Force session save to ensure it's stored before responding
            await new Promise((resolve, reject) => {
                req.session.save(err => {
                    if (err) {
                        console.error('Error saving session:', err);
                        reject(err);
                    } else {
                        console.log('Session successfully saved');
                        resolve();
                    }
                });
            });
            
            // Log the session cookie information
            console.log('Session cookie after save:', {
                maxAge: req.session.cookie.maxAge,
                expires: req.session.cookie.expires,
                secure: req.session.cookie.secure,
                sameSite: req.session.cookie.sameSite,
                httpOnly: req.session.cookie.httpOnly
            });
        
            // Determine where to redirect the user
            const redirectUrl = req.session.returnTo || getDefaultPageForUser(req.session.user) || '/';
            delete req.session.returnTo;
              return res.status(200).json({ 
                success: true,
                redirectUrl,
                user: {
                    email: req.session.user.email,
                    role: req.session.user.role
                }
            });
        } catch (firestoreError) {
            console.error('Firestore error during session creation:', firestoreError);
            return res.status(500).json({ 
                error: 'Error retrieving user data', 
                success: false,
                redirectUrl: '/login?error=firestore_error' 
            });
        }
    } catch (error) {
        console.error('Session creation error:', error);
        // Add detailed error information
        const errorInfo = {
            message: error.message || 'Unknown error',
            stack: process.env.NODE_ENV !== 'production' ? error.stack : null,
            timestamp: new Date().toISOString()
        };
        
        console.error('Error details:', errorInfo);
        
        return res.status(500).json({ 
            error: 'Session creation failed', 
            success: false,
            errorInfo: process.env.NODE_ENV !== 'production' ? errorInfo : undefined,
            redirectUrl: '/login?error=session_creation_failed' 
        });
    }
};

module.exports = {
    isAuthenticated,
    hasAccess,
    handleFirebaseLogin,
    createSessionFromToken,
    getDefaultPageForUser
};
