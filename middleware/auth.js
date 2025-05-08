// auth.js middleware for user authentication
const crypto = require('crypto');

// Define our hardcoded users with their permissions
const users = [
    {
        id: 1,
        username: 'mahamad',
        password: 'Mahamad100%',
        role: 'admin',
        permissions: ['bank', 'hawala', 'add-market', 'add-bank', 'add-account'] // Full access
    },
    {
        id: 2,
        username: 'roman',
        password: 'roman100%',
        role: 'bank-manager',
        permissions: ['bank'] // Only bank management
    },
    {
        id: 3,
        username: 'ari',
        password: 'ari100%',
        role: 'hawala-manager',
        permissions: ['hawala'] // Only hawala management
    },
    {
        id: 4,
        username: 'yusif',
        password: 'yusif100%',
        role: 'data-entry',
        permissions: ['add-market', 'add-bank', 'add-account'] // Only add pages
    },
    {
        id: 5,
        username: 'omar',
        password: 'omar100%',
        role: 'bank-hawala-manager',
        permissions: ['bank', 'hawala'] // Both bank and hawala management
    }
];

// Check if user is logged in
const isAuthenticated = (req, res, next) => {
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

// Authenticate user function
const authenticateUser = (username, password) => {
    // Find user by username (case insensitive)
    const user = users.find(user => user.username.toLowerCase() === username.toLowerCase());
    
    // Check if user exists and password matches
    if (user && user.password === password) {
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    
    return null;
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
    addUserToLocals,
    getDefaultPageForUser  // Export this function so it can be used in app.js
};