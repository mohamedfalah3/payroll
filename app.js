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

// Updated Session configuration for Vercel's serverless environment
app.use(session({
    secret: 'payroll-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        // Only use secure cookies in production
        secure: process.env.NODE_ENV === 'production' && process.env.VERCEL_URL ? true : false,
        // Ensure cookies work in Vercel's serverless environment
        httpOnly: true,
        // Session expires after 2 hours of inactivity
        maxAge: 2 * 60 * 60 * 1000,
        // Important for Vercel deployment
        sameSite: 'lax'
    }
}));
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
        // Save the requested URL for redirect after login
        req.session.returnTo = req.originalUrl;
        // Redirect to login page
        return res.redirect('/login');
    }
    
    // User is authenticated, proceed to next middleware
    next();
});

// Login route - not protected by authentication check above
app.get('/login', (req, res) => {
    // If already logged in, redirect to first permitted page
    if (req.session && req.session.user) {
        // Redirect to the appropriate page based on permissions
        return res.redirect(auth.getDefaultPageForUser(req.session.user));
    }
    
    res.render('login', {
        title: 'Login',
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// Login POST handler - Updated for Firebase Authentication
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Validate request
    if (!email || !password) {
        req.flash('error', 'Email and password are required');
        return res.redirect('/login');
    }
    
    try {
        // Authenticate user with Firebase
        const user = await auth.authenticateUser(email, password);
        
        if (!user) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/login');
        }
        
        // Save user in session
        req.session.user = user;
        
        // Ensure session is saved before redirect
        req.session.save(() => {
            // Redirect to original URL or appropriate page based on permissions
            const returnTo = req.session.returnTo || auth.getDefaultPageForUser(user);
            delete req.session.returnTo;
            res.redirect(returnTo);
        });
    } catch (error) {
        console.error("Login error:", error);
        req.flash('error', 'Login failed. Please try again.');
        return res.redirect('/login');
    }
});

// Logout route - Updated for Firebase
app.get('/logout', async (req, res) => {
    try {
        // Logout from Firebase
        await auth.logoutUser();
        
        // Destroy session
        req.session.destroy(() => {
            res.redirect('/login');
        });
    } catch (error) {
        console.error("Logout error:", error);
        res.redirect('/');
    }
});

// Root route redirects to login or appropriate page based on permissions
app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect(auth.getDefaultPageForUser(req.session.user));
    }
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