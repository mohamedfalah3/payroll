const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');
const adminRoutes = require('./controller/admin');
// Import Firebase configuration
const firebase = require('./config/firebase');

app.set('view engine', 'ejs');
app.set('views', 'views');

// Middleware
app.use(session({
    secret: 'payroll-secret-key',
    resave: false,
    saveUninitialized: false
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

app.use(express.static(path.join(__dirname, 'public')));

// Make Firebase services available to all routes
app.use((req, res, next) => {
    req.firebase = firebase;
    next();
});

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

app.listen(3000, () => {
    console.log('Server is running on port 3000');
    console.log('Firebase initialized successfully');
});