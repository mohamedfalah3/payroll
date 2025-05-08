const express = require('express');
const router = express.Router();
const BankTransaction = require('../model/bankTransaction');
const HawalaTransaction = require('../model/hawalaTransaction');
const Market = require('../model/market');
const AdminController = require('./adminController');
const Bank = require('../model/bank');
const Account = require('../model/account');
const settings = require('../config/settings'); // Import app settings
const auth = require('../middleware/auth'); // Import auth middleware

// Add Firebase configuration to all responses
router.use((req, res, next) => {
    res.locals.useFirebase = settings.useFirebase;
    next();
});

// Add a test route to verify authentication
router.get('/test-auth', (req, res) => {
    res.send(`Authentication test successful! User: ${req.session.user.username}, Role: ${req.session.user.role}`);
});

// Remove the default redirect since this is now handled in app.js
// router.get('/', (req, res) => {
//     res.redirect('/hawala');
// });

// Hawala routes
router.get('/hawala', async (req, res) => {
    try {
        // Get all required data in parallel: markets, accounts, and transactions
        const [markets, accounts, transactions] = await Promise.all([
            Market.getMarkets(),
            Account.getAllAccounts(),
            HawalaTransaction.getHawalaTransactions()
        ]);
        
        const safeTransactions = transactions || [];
        
        // Calculate totals with null safety
        const totalReceived = safeTransactions
            .filter(t => t?.transactionType === 'receive')
            .reduce((sum, t) => sum + parseFloat(t?.amount || 0), 0);
            
        const totalSent = safeTransactions
            .filter(t => t?.transactionType === 'send')
            .reduce((sum, t) => sum + parseFloat(t?.amount || 0), 0);
        
        // Calculate current page from query params (with safety)
        const currentPage = parseInt(req.query?.page) || 1;
        const rowsPerPage = 10;
        const totalPages = Math.ceil(safeTransactions.length / rowsPerPage);
        
        // Include tab parameter from query string if present
        const activeTab = req.query?.tab === 'history' ? 'history' : 'transfer';
        
        // Get current date from query if present
        const currentDate = req.query?.date || null;
        
        res.render('hawala', {
            title: 'Hawala Management',
            markets: markets || [],
            accounts: accounts || [],
            transactions: safeTransactions,
            totalReceived,
            totalSent,
            currentPage,
            totalPages,
            rowsPerPage,
            activeTab,
            currentDate,
            error: null // Always provide error
        });
    } catch (error) {
        console.error('Error fetching markets:', error);
        res.render('hawala', {
            title: 'Hawala Management',
            markets: [],
            accounts: [],
            transactions: [],
            error: error.message || 'Error loading data'
        });
    }
});

router.get('/bank', async (req, res) => {
    try {
        // Get all required data in parallel: banks, accounts, and transactions
        const [banks, accounts, transactions] = await Promise.all([
            Bank.getAllBanks(),
            Account.getAllAccounts(),
            BankTransaction.getBankTransactions()
        ]);
        
        // Calculate current page from query params (with safety)
        const currentPage = parseInt(req.query?.page) || 1;
        const rowsPerPage = 10;
        const totalPages = Math.ceil((transactions?.length || 0) / rowsPerPage);
        
        // Include tab parameter from query string if present
        const activeTab = req.query?.tab === 'history' ? 'history' : 'transfer';
        
        // Get current date from query if present
        const currentDate = req.query?.date || null;
        
        res.render('bank', {
            title: 'Bank Management',
            banks: banks || [],
            accounts: accounts || [],
            transactions: transactions || [],
            currentPage,
            totalPages,
            rowsPerPage,
            activeTab,
            currentDate
        });
    } catch (error) {
        console.error('Error fetching bank data:', error);
        res.render('bank', {
            title: 'Bank Management',
            banks: [],
            accounts: [],
            transactions: [],
            error: error.message || 'Error loading data'
        });
    }
});

// History routes
router.get('/bank-history', async (req, res) => {
    try {
        const [transactions, banks, accounts] = await Promise.all([
            BankTransaction.getBankTransactions(),
            Bank.getAllBanks(),
            Account.getAllAccounts()
        ]);
        
        // Get current page from query params (with safety)
        const currentPage = parseInt(req.query?.page) || 1;
        const rowsPerPage = 10;
        const totalPages = Math.ceil((transactions?.length || 0) / rowsPerPage);
        
        res.render('bank-history', { 
            transactions: transactions || [],
            banks: banks || [],
            accounts: accounts || [],
            currentPage,
            totalPages,
            rowsPerPage,
            title: 'Bank Transaction History'
        });
    } catch (error) {
        console.error('Error fetching bank transactions:', error);
        res.status(500).send(error.message || 'Error fetching bank transactions');
    }
});

router.get('/hawala-history', async (req, res) => {
    try {
        const [transactions, markets, accounts] = await Promise.all([
            HawalaTransaction.getHawalaTransactions(),
            Market.getMarkets(),
            Account.getAllAccounts()
        ]);
        
        const safeTransactions = transactions || [];
        
        // Calculate totals with null safety
        const totalReceived = safeTransactions
            .filter(t => t?.transactionType === 'receive')
            .reduce((sum, t) => sum + parseFloat(t?.amount || 0), 0);
            
        const totalSent = safeTransactions
            .filter(t => t?.transactionType === 'send')
            .reduce((sum, t) => sum + parseFloat(t?.amount || 0), 0);
            
        // Get page from query params (with safety)
        const currentPage = parseInt(req.query?.page) || 1;
        const rowsPerPage = 10;
        const totalPages = Math.ceil(safeTransactions.length / rowsPerPage);
            
        res.render('hawala-history', { 
            transactions: safeTransactions,
            totalReceived,
            totalSent,
            markets: markets || [],
            accounts: accounts || [],
            currentPage,
            totalPages,
            rowsPerPage,
            title: 'Hawala Transaction History'
        });
    } catch (error) {
        console.error('Error fetching hawala data:', error);
        res.status(500).send(error.message || 'Error fetching hawala data');
    }
});

// API routes for saving transactions
router.post('/bank/save', async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ error: 'Request body is missing' });
        }
        
        const transaction = await BankTransaction.saveBankTransaction(req.body);
        res.json(transaction);
    } catch (error) {
        console.error('Error saving bank transaction:', error);
        res.status(error.name === 'ValidationError' ? 400 : 500)
           .json({ error: error.message || 'Error saving bank transaction' });
    }
});

// Add update route for bank transactions
router.put('/bank/update/:id', async (req, res) => {
    try {
        if (!req.params?.id) {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }
        
        if (!req.body) {
            return res.status(400).json({ error: 'Request body is missing' });
        }
        
        const transaction = await BankTransaction.updateTransaction(req.params.id, req.body);
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found or update failed' });
        }
        
        res.json(transaction);
    } catch (error) {
        console.error('Error updating bank transaction:', error);
        res.status(error.name === 'ValidationError' ? 400 : 500)
           .json({ error: error.message || 'Error updating bank transaction' });
    }
});

router.post('/hawala/save', async (req, res, next) => {
    try {
        if (!req.body) {
            return res.status(400).json({ error: 'Request body is missing' });
        }

        // Log the request body for debugging
        console.log('Received hawala transaction data:', req.body);
        
        const transaction = await HawalaTransaction.saveHawalaTransaction(req.body);
        
        if (!transaction) {
            return res.status(500).json({ error: 'Failed to save hawala transaction' });
        }
        
        res.json(transaction);
    } catch (error) {
        console.error('Error saving hawala transaction:', error);
        if (error.name === 'ValidationError') {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message || 'Error saving hawala transaction' });
        }
    }
});

// Add update route for hawala transactions
router.put('/hawala/update/:id', async (req, res) => {
    try {
        if (!req.params?.id) {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }
        
        if (!req.body) {
            return res.status(400).json({ error: 'Request body is missing' });
        }
        
        const transaction = await HawalaTransaction.updateTransaction(req.params.id, req.body);
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found or update failed' });
        }
        
        res.json(transaction);
    } catch (error) {
        console.error('Error updating hawala transaction:', error);
        res.status(error.name === 'ValidationError' ? 400 : 500)
           .json({ error: error.message || 'Error updating hawala transaction' });
    }
});

// Confirmation endpoints
router.post('/bank-history/confirm/:id', async (req, res) => {
    try {
        if (!req.params?.id) {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }
        
        const transaction = await BankTransaction.toggleTransactionStatus(req.params.id);
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found or status update failed' });
        }
        
        res.json(transaction);
    } catch (error) {
        console.error('Error confirming bank transaction:', error);
        res.status(500).json({ error: error.message || 'Error confirming bank transaction' });
    }
});

router.post('/hawala-history/confirm/:id', async (req, res) => {
    try {
        if (!req.params?.id) {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }
        
        const transaction = await HawalaTransaction.toggleTransactionStatus(req.params.id);
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found or status update failed' });
        }
        
        res.json(transaction);
    } catch (error) {
        console.error('Error confirming hawala transaction:', error);
        res.status(500).json({ error: error.message || 'Error confirming hawala transaction' });
    }
});

// Complete bank transaction
router.post('/complete-bank-transaction/:id', async (req, res) => {
    try {
        const transaction = await BankTransaction.completeBankTransaction(req.params.id);
        res.redirect('/bank-history');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Complete hawala transaction
router.post('/complete-hawala-transaction/:id', async (req, res) => {
    try {
        const transaction = await HawalaTransaction.completeHawalaTransaction(req.params.id);
        res.redirect('/hawala-history');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Toggle bank transaction status
router.post('/toggle-bank-status/:id', async (req, res) => {
    try {
        if (!req.params?.id) {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }
        
        const transaction = await BankTransaction.toggleTransactionStatus(req.params.id);
        const returnUrl = req.body?.returnUrl || '/bank-history';
        res.redirect(returnUrl);
    } catch (error) {
        console.error('Error toggling bank transaction status:', error);
        res.status(500).send(error.message || 'Error updating transaction status');
    }
});

// Toggle hawala transaction status
router.post('/toggle-hawala-status/:id', async (req, res) => {
    try {
        if (!req.params?.id) {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }
        
        const transaction = await HawalaTransaction.toggleTransactionStatus(req.params.id);
        const returnUrl = req.body?.returnUrl || '/hawala-history';
        res.redirect(returnUrl);
    } catch (error) {
        console.error('Error toggling hawala transaction status:', error);
        res.status(500).send(error.message || 'Error updating transaction status');
    }
});

// Delete transactions
router.delete('/bank/delete/:id', async (req, res) => {
    try {
        if (!req.params?.id) {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }
        
        const result = await BankTransaction.deleteTransaction(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting bank transaction:', error);
        res.status(500).json({ error: error.message || 'Error deleting bank transaction' });
    }
});

router.delete('/hawala/delete/:id', async (req, res) => {
    try {
        if (!req.params?.id) {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }
        
        const result = await HawalaTransaction.deleteTransaction(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting hawala transaction:', error);
        res.status(500).json({ error: error.message || 'Error deleting hawala transaction' });
    }
});

// Add POST routes for transaction deletion (for compatibility)
router.post('/bank/delete/:id', async (req, res) => {
    try {
        if (!req.params?.id) {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }
        
        const result = await BankTransaction.deleteTransaction(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting bank transaction:', error);
        res.status(500).json({ error: error.message || 'Error deleting bank transaction' });
    }
});

router.post('/hawala/delete/:id', async (req, res) => {
    try {
        if (!req.params?.id) {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }
        
        const result = await HawalaTransaction.deleteTransaction(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting hawala transaction:', error);
        res.status(500).json({ error: error.message || 'Error deleting hawala transaction' });
    }
});

// Add direct form-based transaction deletion routes
router.post('/bank/delete-transaction/:id', async (req, res) => {
    try {
        const transactionId = req.params.id;
        
        if (!transactionId) {
            return res.status(400).send('Transaction ID is required');
        }
        
        await BankTransaction.deleteTransaction(transactionId);
        
        // Redirect to bank management with history tab active
        res.redirect('/bank?tab=history');
    } catch (error) {
        console.error('Error deleting bank transaction:', error);
        res.status(500).send('Error deleting transaction: ' + (error.message || 'Unknown error'));
    }
});

router.post('/hawala/delete-transaction/:id', async (req, res) => {
    try {
        const transactionId = req.params.id;
        
        if (!transactionId) {
            return res.status(400).send('Transaction ID is required');
        }
        
        await HawalaTransaction.deleteTransaction(transactionId);
        
        // Redirect to hawala management with history tab active
        res.redirect('/hawala?tab=history');
    } catch (error) {
        console.error('Error deleting hawala transaction:', error);
        res.status(500).send('Error deleting transaction: ' + (error.message || 'Unknown error'));
    }
});

// Transaction details route
router.get('/transaction/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        
        if (!type || !id) {
            return res.status(400).send('Transaction type and ID are required');
        }
        
        let transaction;
        let banks = [];
        let markets = [];
        let accounts = [];

        // Get accounts and markets first as they're needed for both types
        [accounts, markets] = await Promise.all([
            Account.getAllAccounts(),
            Market.getMarkets()
        ]);
        
        if (type === 'bank') {
            [transaction, banks] = await Promise.all([
                BankTransaction.getTransactionById(id),
                Bank.getAllBanks()
            ]);
        } else if (type === 'hawala') {
            transaction = await HawalaTransaction.getTransactionById(id);
        } else {
            return res.status(400).send('Invalid transaction type');
        }

        if (!transaction) {
            return res.status(404).send('Transaction not found');
        }

        // Add type for the view to use
        transaction.type = type;
        
        res.render('transaction-details', {
            transaction,
            banks: banks || [],
            markets: markets || [],
            accounts: accounts || [],
            title: 'Transaction Details',
            originalUrl: req.originalUrl || '',
            req: req
        });
    } catch (error) {
        console.error('Error fetching transaction details:', error);
        res.status(500).send(error.message || 'Error fetching transaction details');
    }
});

// Market management routes
router.get('/add-market', async (req, res) => {
    try {
        const markets = await Market.getMarkets();
        
        res.render('add-market', { 
            markets: markets || [],
            error: req.query?.error || null,
            success: req.query?.success || null,
            title: 'Add Market',
            user: req.session.user // Explicitly include user data
        });
    } catch (error) {
        console.error('Error loading add market page:', error);
        res.render('add-market', { 
            markets: [],
            error: error.message || 'Error loading markets',
            success: null,
            title: 'Add Market',
            user: req.session.user // Explicitly include user data
        });
    }
});

router.post('/add-market', async (req, res) => {
    try {
        const { name } = req.body || {};
        
        if (!name) {
            return res.render('add-market', {
                markets: await Market.getMarkets(),
                error: 'Market name is required',
                success: null,
                title: 'Add Market'
            });
        }
        
        const result = await Market.addMarket(name);
        
        // Redirect with success message
        return res.redirect('/add-market?success=' + encodeURIComponent('Market added successfully'));
    } catch (error) {
        console.error('Error adding market:', error);
        const markets = await Market.getMarkets() || [];
        
        res.render('add-market', { 
            markets,
            error: error.message || 'Error adding market',
            success: null,
            title: 'Add Market'
        });
    }
});

// Market API route
router.get('/api/markets', async (req, res) => {
    try {
        const markets = await Market.getMarkets();
        res.json(markets || []);
    } catch (error) {
        console.error('Error fetching markets:', error);
        res.status(500).json({ error: error.message || 'Error fetching markets' });
    }
});

// Market display route
router.get('/markets', async (req, res) => {
    try {
        const markets = await Market.getMarkets();
        res.render('markets', { 
            markets,
            title: 'Markets'
        });
    } catch (error) {
        console.error('Error fetching markets:', error);
        res.status(500).send('Error fetching markets');
    }
});

// Bank management routes
router.get('/add-bank', async (req, res) => {
    try {
        const banks = await Bank.getAllBanks();
        
        res.render('add-bank', { 
            banks: banks || [],
            error: req.query?.error || null,
            success: req.query?.success || null,
            title: 'Add Bank',
            user: req.session.user // Explicitly include user data
        });
    } catch (error) {
        console.error('Error loading add bank page:', error);
        
        res.render('add-bank', { 
            banks: [],
            error: error.message || 'Error loading banks',
            success: null,
            title: 'Add Bank',
            user: req.session.user // Explicitly include user data
        });
    }
});

router.post('/add-bank', async (req, res) => {
    try {
        const { bankName } = req.body || {};
        
        if (!bankName) {
            return res.render('add-bank', {
                banks: await Bank.getAllBanks() || [],
                error: 'Bank name is required',
                success: null,
                title: 'Add Bank'
            });
        }
        
        const result = await Bank.addBank(bankName);
        
        if (!result || !result.success) {
            const banks = await Bank.getAllBanks() || [];
            return res.render('add-bank', { 
                banks,
                error: result?.message || 'Failed to add bank',
                success: null,
                title: 'Add Bank'
            });
        }
        
        // Redirect with success message
        return res.redirect('/add-bank?success=' + encodeURIComponent('Bank added successfully'));
    } catch (error) {
        console.error('Error adding bank:', error);
        const banks = await Bank.getAllBanks() || [];
        
        res.render('add-bank', { 
            banks,
            error: error.message || 'Error adding bank',
            success: null,
            title: 'Add Bank'
        });
    }
});

// Bank API route
router.get('/api/banks', async (req, res) => {
    try {
        const banks = await Bank.getAllBanks();
        res.json(banks || []);
    } catch (error) {
        console.error('Error fetching banks:', error);
        res.status(500).json({ error: error.message || 'Error fetching banks' });
    }
});

// Account management routes
router.get('/add-account', async (req, res) => {
    try {
        const accounts = await Account.getAllAccounts();
        
        res.render('add-account', { 
            accounts: accounts || [],
            error: req.query?.error || null,
            success: req.query?.success || null,
            title: 'Add Account',
            user: req.session.user // Explicitly include user data
        });
    } catch (error) {
        console.error('Error loading add account page:', error);
        
        res.render('add-account', { 
            accounts: [],
            error: error.message || 'Error loading accounts',
            success: null,
            title: 'Add Account',
            user: req.session.user // Explicitly include user data
        });
    }
});

router.post('/add-account', async (req, res) => {
    try {
        const { accountName } = req.body || {};
        
        if (!accountName) {
            return res.render('add-account', {
                accounts: await Account.getAllAccounts() || [],
                error: 'Account name is required',
                success: null,
                title: 'Add Account'
            });
        }
        
        const result = await Account.addAccount(accountName);
        
        if (!result || !result.success) {
            const accounts = await Account.getAllAccounts() || [];
            
            return res.render('add-account', { 
                accounts,
                error: result?.message || 'Failed to add account',
                success: null,
                title: 'Add Account'
            });
        }
        
        // Redirect with success message
        return res.redirect('/add-account?success=' + encodeURIComponent('Account added successfully'));
    } catch (error) {
        console.error('Error adding account:', error);
        const accounts = await Account.getAllAccounts() || [];
        
        res.render('add-account', { 
            accounts,
            error: error.message || 'Error adding account',
            success: null,
            title: 'Add Account'
        });
    }
});

// Account API route
router.get('/api/accounts', async (req, res) => {
    try {
        const accounts = await Account.getAllAccounts();
        res.json(accounts || []);
    } catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ error: error.message || 'Error fetching accounts' });
    }
});

// Delete market route
router.post('/delete-market', async (req, res) => {
    try {
        const { marketId } = req.body;
        
        if (!marketId) {
            return res.status(400).json({ error: 'Market ID is required' });
        }
        
        await Market.deleteMarket(marketId);
        res.redirect('/add-market');
    } catch (error) {
        console.error('Error deleting market:', error);
        return res.redirect('/add-market?error=' + encodeURIComponent(error.message || 'Failed to delete market'));
    }
});

// Delete bank route
router.post('/delete-bank', async (req, res) => {
    try {
        const { bankId } = req.body;
        
        if (!bankId) {
            return res.status(400).json({ error: 'Bank ID is required' });
        }
        
        await Bank.deleteBank(bankId);
        res.redirect('/add-bank');
    } catch (error) {
        console.error('Error deleting bank:', error);
        return res.redirect('/add-bank?error=' + encodeURIComponent(error.message || 'Failed to delete bank'));
    }
});

// Delete account route
router.post('/delete-account', async (req, res) => {
    try {
        const { accountId } = req.body;
        
        if (!accountId) {
            return res.status(400).json({ error: 'Account ID is required' });
        }
        
        await Account.deleteAccount(accountId);
        res.redirect('/add-account');
    } catch (error) {
        console.error('Error deleting account:', error);
        return res.redirect('/add-account?error=' + encodeURIComponent(error.message || 'Failed to delete account'));
    }
});

// Add REST style DELETE routes for frontend AJAX calls
// Delete market via DELETE method
router.delete('/add-market/:id', async (req, res) => {
    try {
        const marketId = req.params.id;
        
        if (!marketId) {
            return res.status(400).json({ error: 'Market ID is required' });
        }
        
        await Market.deleteMarket(marketId);
        res.json({ success: true, message: 'Market deleted successfully' });
    } catch (error) {
        console.error('Error deleting market:', error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to delete market'
        });
    }
});

// Delete bank via DELETE method
router.delete('/add-bank/:id', async (req, res) => {
    try {
        const bankId = req.params.id;
        
        if (!bankId) {
            return res.status(400).json({ error: 'Bank ID is required' });
        }
        
        await Bank.deleteBank(bankId);
        res.json({ success: true, message: 'Bank deleted successfully' });
    } catch (error) {
        console.error('Error deleting bank:', error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to delete bank'
        });
    }
});

// Delete account via DELETE method
router.delete('/add-account/:id', async (req, res) => {
    try {
        const accountId = req.params.id;
        
        if (!accountId) {
            return res.status(400).json({ error: 'Account ID is required' });
        }
        
        await Account.deleteAccount(accountId);
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to delete account'
        });
    }
});

// Add dashboard route to use the existing dashboard.ejs template
router.get('/dashboard', async (req, res) => {
    try {
        // Render the dashboard view with user data
        res.render('dashboard', {
            title: 'Dashboard',
            user: req.session.user
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).send('Error loading dashboard');
    }
});

module.exports = router;