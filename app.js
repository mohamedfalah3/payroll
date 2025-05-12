const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');
const adminRoutes = require('./controller/admin');

// Run Firebase configuration check
try {
    require('./check-firebase-config');
} catch (error) {
    console.error('Error running Firebase configuration check:', error);
}

// Import Firebase configuration
const firebase = require('./config/firebase');
// Import authentication middleware
const auth = require('./middleware/auth');
// Import Firebase authentication middleware
const firebaseAuth = require('./middleware/firebase-auth');
// Import debugging middleware
const debugMiddleware = require('./middleware/debug-auth');

// Log Firebase initialization status to help with debugging
console.log('Firebase Admin SDK Status:', firebase.adminApp ? 'Initialized' : 'Not Initialized');
console.log('Firebase Client SDK Status:', firebase.clientApp ? 'Initialized' : 'Not Initialized');

// CORS middleware for split deployment (Firebase frontend, Vercel backend)
app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin);
  console.log('Referer:', req.headers.referer);
  
  // Allow Firebase Hosting domain and local development
  const allowedOrigins = [
    // Firebase hosting domains
    'https://money-transfering.firebaseapp.com',
    'https://money-transfering.web.app',
    // Local development
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
    // Main Vercel URL
    'https://payroll-d8ab939e794c4f112a1950c3eccd91db11e72498.vercel.app',
    // Vercel deployment preview URLs
    'https://payroll-d8ab939e794c4f112a1950c3eccd91db11e72498-5ajwt8ntj.vercel.app',
    'https://payroll-d8ab939e794c4f112a1950c3eccd91db11e72498-rfjxk0t44.vercel.app',
    'https://payroll-d8ab939e794c4f112a1950c3eccd91db11e72498-kwh4tqhpu.vercel.app',
    'https://payroll-d8ab939e794c4f112a1950c3eccd91db11e72498-dir8ed9j7.vercel.app',
    'https://payroll-d8ab939e794c4f112a1950c3eccd91db11e72498-izbnhqpb4.vercel.app',
    'https://payroll-d8ab939e794c4f112a1950c3eccd91db11e72498-e4iwqafr4.vercel.app'
  ];
  
  // Add the current host to allowed origins
  if (req.headers.host) {
    const protocol = req.secure ? 'https://' : 'http://';
    const currentOrigin = `${protocol}${req.headers.host}`;
    if (!allowedOrigins.includes(currentOrigin)) {
      allowedOrigins.push(currentOrigin);
      console.log(`Added current origin to allowed list: ${currentOrigin}`);
    }
  }
  
  // Auto-allow any Vercel preview deployment URLs for our project
  const origin = req.headers.origin;
  if (origin && 
      (origin.includes('payroll-d8ab939e794c4f112a1950c3eccd91db11e72498') && 
       origin.includes('vercel.app'))) {
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
      console.log(`Auto-allowed Vercel deployment URL: ${origin}`);
    }
  }
  
  // Always allow the same origin
  if (!origin || origin === req.headers.host) {
    console.log('Same-origin request, proceeding');
    return next();
  }
  
  // For browser requests, check against allowed origins
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      console.log(`Access allowed for origin: ${origin}`);
    } else {
      // In production and development, allow any origin but log it
      res.setHeader('Access-Control-Allow-Origin', origin);
      console.log(`Warning: Access allowed for non-whitelisted origin: ${origin}`);
    }
  } else {
    // For requests without origin header
    console.log('No origin header, proceeding without CORS headers');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Add API test endpoint for Firebase hosting redirect connectivity check
app.get('/api/test', (req, res) => {
  // Get information about the request
  const host = req.get('host');
  const origin = req.get('origin') || 'None';
  const secure = req.secure;
  const sessionExists = req.session && Object.keys(req.session).length > 0;
  const sessionId = req.sessionID || 'not-created';
  const cookies = req.headers.cookie || 'none';
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Check Firebase Admin status
  const firebaseAdminInitialized = !!require('./config/firebase').adminAuth;
  
  console.log(`API Test Request from ${origin} to ${host}, secure: ${secure}, session: ${sessionExists ? 'exists' : 'none'}`);
  
  // Send back status and diagnostic information
  res.json({
    status: 'success',
    message: 'API endpoint reached successfully',
    timestamp: new Date().toISOString(),
    host: host,
    origin: origin,
    secure: secure,
    sessionExists: sessionExists,
    sessionId: sessionId.substring(0, 6) + '...', // Only show part of ID for security
    cookiesPresent: cookies !== 'none',
    environment: nodeEnv,
    firebaseAdmin: firebaseAdminInitialized ? 'initialized' : 'not initialized',
    authEnabled: firebaseAdminInitialized,
    serverTime: new Date().toISOString()
  });
});

// Add an endpoint to verify authentication from cross-origin requests
app.post('/api/auth/verify', (req, res) => {
  // Get information about the request
  const host = req.get('host');
  const origin = req.get('origin') || 'None';
  const secure = req.secure;
  const idToken = req.body.idToken;
  
  console.log(`Auth verification request from ${origin} to ${host}, secure: ${secure}`);
  
  if (!idToken) {
    return res.status(400).json({
      success: false,
      error: 'No token provided'
    });
  }

  // Use Firebase Admin to verify the token
  const { adminAuth } = require('./config/firebase');
  
  adminAuth.verifyIdToken(idToken)
    .then(decodedToken => {
      console.log('Token verified successfully for user:', decodedToken.uid);
      
      // Return user information without setting session
      // (useful for cross-domain verification)
      return res.json({
        success: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified
        },
        auth: {
          tokenValid: true,
          issuedAt: new Date(decodedToken.iat * 1000).toISOString(),
          expiresAt: new Date(decodedToken.exp * 1000).toISOString()
        },
        server: {
          host: host,
          time: new Date().toISOString()
        }
      });
    })
    .catch(error => {
      console.error('Error verifying token:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: error.message
      });
    });
});

// Authentication endpoints removed

// Add authentication test endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/auth/clear', (req, res) => {
    if (req.session) {
      req.session.destroy();
    }
    return res.json({ status: 'Authentication cleared', timestamp: new Date().toISOString() });
  });
}

// Enhanced session configuration with cross-domain support
app.use(session({
    secret: 'payroll-secret-key',
    resave: false,
    saveUninitialized: true, // Create a session for all requests to improve cross-domain auth
    cookie: {
        // In production, secure=true is required when sameSite=none
        secure: process.env.NODE_ENV === 'production',
        // Use 'none' in production to support cross-domain cookies from Firebase hosting
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        // Session expires after 8 hours (increased from 2 hours)
        maxAge: 8 * 60 * 60 * 1000,
        // Don't set domain to allow cookies to work across different Vercel deployments
        domain: undefined,
        // In production, httpOnly=true for better security
        // In development, httpOnly=false to help with debugging
        httpOnly: process.env.NODE_ENV === 'production'
    }
}));

// Log session configuration for debugging
console.log('Session configuration:', {
    environment: process.env.NODE_ENV || 'development',
    cookieSettings: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: '8 hours',
        httpOnly: process.env.NODE_ENV === 'production'
    }
});
app.use(flash());

// Make flash messages available to all views
app.use((req, res, next) => {
    res.locals.messages = {
        success: req.flash('success'),
        error: req.flash('error')
    };
    next();
});

// Configure body parser with higher limits
app.use(bodyParser.json({
    limit: '10mb'
}));
app.use(bodyParser.urlencoded({
    limit: '10mb',
    extended: true
}));

// Add specific handler for favicon.ico to prevent redirect issues
app.get('/favicon.ico', (req, res) => {
    // Use default favicon from public folder or return empty response
    res.status(204).end(); // No content response
});

// Allow static files before authentication check
app.use(express.static(path.join(__dirname, 'public')));
// Also serve files from the root path to support relative paths
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Make Firebase services available to all routes
app.use((req, res, next) => {
    req.firebase = firebase;
    next();
});

// Add user data to all views
app.use(auth.addUserToLocals);

// Define public routes that don't need authentication
const publicPaths = ['/login', '/firebase-login', '/api/auth', '/logout', '/css', '/js', '/images', '/favicon.ico'];

// Authentication check - MUST be before any protected routes
// This middleware handles all routes except login/logout and static files
app.use((req, res, next) => {
    // Check if the path is public
    const isPublicPath = publicPaths.some(publicPath => req.path.startsWith(publicPath));
    
    // Skip authentication for public paths
    if (isPublicPath) {
        return next();
    }
    
    // Check if user is authenticated
    if (!req.session || !req.session.user) {
        // Save the requested URL for redirect after login
        req.session.returnTo = req.originalUrl;
        // Redirect to login page
        return res.redirect('/login');
    }
    
    // User is authenticated, proceed to next middleware
    next();
});

// Add debug middleware to log authentication attempts
app.use(debugMiddleware.debugAuth);

// Firebase Authentication API Routes
app.post('/api/auth/login', firebaseAuth.handleFirebaseLogin);
app.post('/api/auth/session', firebaseAuth.createSessionFromToken);

// Diagnostic routes to help debug authentication issues
app.get('/api/auth/status', (req, res) => {
    res.json({
        isAuthenticated: !!(req.session && req.session.user),
        sessionData: req.session ? {
            user: req.session.user ? {
                email: req.session.user.email,
                role: req.session.user.role,
                permissions: req.session.user.permissions
            } : null,
            cookie: req.session.cookie ? {
                originalMaxAge: req.session.cookie.originalMaxAge,
                expires: req.session.cookie.expires,
                secure: req.session.cookie.secure,
                httpOnly: req.session.cookie.httpOnly,
                domain: req.session.cookie.domain,
                sameSite: req.session.cookie.sameSite
            } : null
        } : null,
        headers: {
            host: req.headers.host,
            origin: req.headers.origin,
            referer: req.headers.referer
        }
    });
});

// Test route that always returns success, useful for CORS testing
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working correctly',
        timestamp: new Date().toISOString()
    });
});

// Authentication endpoints removed

// Login route - not protected by authentication check above
app.get('/login', (req, res) => {
    // If already logged in, redirect to first permitted page
    if (req.session && req.session.user) {
        console.log('User already logged in, redirecting to default page');
        // Redirect to the appropriate page based on permissions
        return res.redirect(firebaseAuth.getDefaultPageForUser(req.session.user));
    }
    
    console.log('Rendering login page');
    
    // Use Firebase login page
    res.render('firebase-login', {
        title: 'Login',
        error: req.flash('error'),
        success: req.flash('success'),
        // Add debug information to the login page to help troubleshoot
        debug: {
            timestamp: new Date().toISOString(),
            host: req.headers.host,
            origin: req.headers.origin,
            secure: req.secure,
            sessionExists: !!req.session
        }
    });
});

// Legacy login route (for backward compatibility) - will be deprecated
app.get('/legacy-login', (req, res) => {
    // If already logged in, redirect to first permitted page
    if (req.session && req.session.user) {
        // Redirect to the appropriate page based on permissions
        return res.redirect(getDefaultPageForUser(req.session.user));
    }
    
    res.render('login', {
        title: 'Login',
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// Legacy Login POST handler - will be deprecated
app.post('/legacy-login', (req, res) => {
    const { username, password } = req.body;
    
    // Validate request
    if (!username || !password) {
        req.flash('error', 'Username and password are required');
        return res.redirect('/legacy-login');
    }
    
    // Authenticate user
    const user = auth.authenticateUser(username, password);
    
    if (!user) {
        req.flash('error', 'Invalid username or password');
        return res.redirect('/legacy-login');
    }
    
    // Save user in session
    req.session.user = user;
    
    // Redirect to original URL or appropriate page based on permissions
    const returnTo = req.session.returnTo || getDefaultPageForUser(user);
    delete req.session.returnTo;
    
    res.redirect(returnTo);
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Root route redirects to login or appropriate page based on permissions
app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect(firebaseAuth.getDefaultPageForUser(req.session.user));
    }
    return res.redirect('/login');
});

// Helper function to determine default page for user based on permissions (legacy)
function getDefaultPageForUser(user) {
    if (!user || !user.permissions || user.permissions.length === 0) {
        return '/access-denied';
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
    
    // Fallback to access denied if no recognized permissions
    return '/access-denied';
}

// PERMISSION-BASED ACCESS CONTROLS
// Using Firebase authentication middleware for permission checks
app.use('/bank', firebaseAuth.hasAccess('bank'));
app.use('/bank-history', firebaseAuth.hasAccess('bank'));

app.use('/hawala', firebaseAuth.hasAccess('hawala'));
app.use('/hawala-history', firebaseAuth.hasAccess('hawala'));

app.use('/add-market', firebaseAuth.hasAccess('add-market'));
app.use('/add-bank', firebaseAuth.hasAccess('add-bank'));
app.use('/add-account', firebaseAuth.hasAccess('add-account'));

// Admin routes
app.use('/', adminRoutes);

// Error handler for 404 Not Found
app.use((req, res, next) => {
    res.status(404).send('Page not found');
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});

// Update server initialization for compatibility with Vercel
const PORT = process.env.PORT || 3000;

// For local development, listen on the specified port
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log('Firebase initialized successfully');
    });
}

// Export the Express app for Vercel serverless deployment
module.exports = app;

