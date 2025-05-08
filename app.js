const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');
const adminRoutes = require('./controller/admin');
// Import Firebase configuration
const firebase = require('./config/firebase');
// Import authentication middleware
const auth = require('./middleware/auth');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Enhanced Session configuration for Vercel's serverless environment
app.use(session({
    secret: 'payroll-secret-key',
    resave: true, // Changed to true for better compatibility with Vercel
    saveUninitialized: true,
    cookie: {
        // Disable secure cookies for now to ensure they work in all environments
        secure: false,
        // Standard cookie settings
        httpOnly: true,
        // Session expires after 2 hours of inactivity
        maxAge: 2 * 60 * 60 * 1000,
        // Using 'lax' for broader compatibility
        sameSite: 'lax'
    },
    name: 'payroll_session' // Set a specific name for the session cookie
}));
app.use(flash());

// Debugging middleware for session tracking
app.use((req, res, next) => {
    const sessionInfo = req.session ? 'Session exists' : 'No session';
    const userInfo = req.session && req.session.user ? `User ID: ${req.session.user.id}` : 'No user';
    console.log(`Request path: ${req.path}, ${sessionInfo}, ${userInfo}`);
    // Set session cookie explicitly on every request
    if (req.session) {
        req.session.touch();
    }
    next();
});

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

// Make Firebase services available to all routes
app.use((req, res, next) => {
    req.firebase = firebase;
    next();
});

// Add user data to all views
app.use(auth.addUserToLocals);

// Define public routes that don't need authentication
const publicPaths = ['/login', '/logout', '/css', '/js', '/images', '/favicon.ico'];

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
        console.log('Not authenticated, redirecting to login');
        // Save the requested URL for redirect after login
        req.session.returnTo = req.originalUrl;
        // Redirect to login page
        return res.redirect('/login');
    }
    
    // User is authenticated, proceed to next middleware
    console.log(`Authenticated as ${req.session.user.email}, proceeding to ${req.path}`);
    next();
});

// Login route - not protected by authentication check above
app.get('/login', (req, res) => {
    // If already logged in, redirect to first permitted page
    if (req.session && req.session.user) {
        const redirectPath = auth.getDefaultPageForUser(req.session.user);
        console.log(`User already logged in, redirecting to: ${redirectPath}`);
        return res.redirect(redirectPath);
    }
    
    res.render('login', {
        title: 'Login',
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// Login POST handler - Updated for Firebase Authentication with improved error handling and session persistence
app.post('/login', async (req, res) => {
    console.log('Login attempt received');
    
    const { email, password } = req.body;
    
    // Validate request
    if (!email || !password) {
        console.log('Missing email or password');
        req.flash('error', 'Email and password are required');
        return res.redirect('/login');
    }
    
    try {
        console.log(`Attempting login for: ${email}`);
        // Authenticate user with Firebase
        const user = await auth.authenticateUser(email, password);
        
        if (!user) {
            console.log('Authentication failed - invalid credentials');
            req.flash('error', 'Invalid email or password');
            return res.redirect('/login');
        }
        
        console.log(`User authenticated successfully: ${user.id}`);
        
        // Save user in session
        req.session.user = user;
        // Set a flag to ensure the session was set
        req.session.authenticated = true;
        // Add a timestamp
        req.session.authTimestamp = Date.now();
        
        // Force session save and handle redirect
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                req.flash('error', 'Login failed due to session error');
                return res.redirect('/login');
            }
            
            // Additional debugging to check if session was saved properly
            console.log(`Session saved with user ID: ${req.session.user.id}`);
            
            // Redirect to original URL or appropriate page based on permissions
            const returnTo = req.session.returnTo || auth.getDefaultPageForUser(user);
            delete req.session.returnTo;
            
            console.log(`Login successful, redirecting to: ${returnTo}`);
            
            // Set a cookie to track login state as backup
            res.cookie('user_logged_in', 'true', { 
                maxAge: 2 * 60 * 60 * 1000,
                httpOnly: true,
                secure: false,
                sameSite: 'lax'
            });
            
            return res.redirect(returnTo);
        });
    } catch (error) {
        console.error("Login error:", error);
        req.flash('error', `Login failed: ${error.message || 'Unknown error'}`);
        return res.redirect('/login');
    }
});

// Logout route - Updated for Firebase
app.get('/logout', async (req, res) => {
    try {
        console.log('Logout requested');
        // Logout from Firebase
        await auth.logoutUser();
        
        // Clear the backup cookie
        res.clearCookie('user_logged_in');
        
        // Destroy session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
            }
            console.log('User logged out successfully');
            res.redirect('/login');
        });
    } catch (error) {
        console.error("Logout error:", error);
        res.redirect('/login');
    }
});

// Root route redirects to login or appropriate page based on permissions
app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        const redirectPath = auth.getDefaultPageForUser(req.session.user);
        console.log(`Root path with authenticated user, redirecting to: ${redirectPath}`);
        return res.redirect(redirectPath);
    }
    
    console.log('Root path with no auth, redirecting to login');
    return res.redirect('/login');
});

// PERMISSION-BASED ACCESS CONTROLS
app.use('/bank', auth.hasAccess('bank'));
app.use('/bank-history', auth.hasAccess('bank'));

app.use('/hawala', auth.hasAccess('hawala'));
app.use('/hawala-history', auth.hasAccess('hawala'));

app.use('/add-market', auth.hasAccess('add-market'));
app.use('/add-bank', auth.hasAccess('add-bank'));
app.use('/add-account', auth.hasAccess('add-account'));

// Admin routes
app.use('/', adminRoutes);

// Error handler for 404 Not Found
app.use((req, res, next) => {
    console.log(`404 Not Found: ${req.path}`);
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