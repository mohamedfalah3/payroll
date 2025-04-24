const express = require('express');
const router = express.Router();
const BankTransaction = require('../model/bankTransaction');
const HawalaTransaction = require('../model/hawalaTransaction');
const Market = require('../model/market');
const AdminController = require('./adminController');
const Bank = require('../model/bank');
const Account = require('../model/account');

router.get('/', (req, res) => {
    res.redirect('/hawala');
});

// Hawala routes
router.get('/hawala', async (req, res) => {
    try {
        const [markets, accounts] = await Promise.all([
            Market.getMarkets(),
            Account.getAllAccounts()
        ]);
        res.render('hawala', {
            title: 'Hawala Transfer',
            markets,
            accounts
        });
    } catch (error) {
        console.error('Error fetching markets:', error);
        res.render('hawala', {
            title: 'Hawala Transfer',
            markets: [],
            accounts: [],
            error: 'Error loading data'
        });
    }
});

router.get('/bank', async (req, res) => {
    try {
        const [banks, accounts] = await Promise.all([
            Bank.getAllBanks(),
            Account.getAllAccounts()
        ]);
        res.render('bank', {
            title: 'Bank Transfer',
            banks,
            accounts
        });
    } catch (error) {
        console.error('Error fetching banks:', error);
        res.render('bank', {
            title: 'Bank Transfer',
            banks: [],
            accounts: [],
            error: 'Error loading data'
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
        // Get current page from query params
        const currentPage = parseInt(req.query.page) || 1;
        
        res.render('bank-history', { 
            transactions,
            banks,
            accounts,
            currentPage,
            title: 'Bank Transaction History'
        });
    } catch (error) {
        console.error('Error fetching bank transactions:', error);
        res.status(500).send('Error fetching bank transactions');
    }
});

router.get('/hawala-history', async (req, res) => {
    try {
        const [transactions, markets, accounts] = await Promise.all([
            HawalaTransaction.getHawalaTransactions(),
            Market.getMarkets(),
            Account.getAllAccounts()
        ]);
        
        const totalReceived = transactions
            .filter(t => t.transactionType === 'receive')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const totalSent = transactions
            .filter(t => t.transactionType === 'send')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
        // Get page from query params
        const currentPage = parseInt(req.query.page) || 1;
        const rowsPerPage = 10;
        const totalPages = Math.ceil(transactions.length / rowsPerPage);
            
        res.render('hawala-history', { 
            transactions,
            totalReceived,
            totalSent,
            markets,
            accounts,
            currentPage,
            totalPages,
            rowsPerPage,
            title: 'Hawala Transaction History'
        });
    } catch (error) {
        console.error('Error fetching hawala data:', error);
        res.status(500).send('Error fetching hawala data');
    }
});

// API routes for saving transactions
router.post('/bank/save', async (req, res) => {
    try {
        const transaction = await BankTransaction.saveBankTransaction(req.body);
        res.json(transaction);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error saving bank transaction' });
    }
});

// Add update route for bank transactions
router.put('/bank/update/:id', async (req, res) => {
    try {
        const transaction = await BankTransaction.updateTransaction(req.params.id, req.body);
        res.json(transaction);
    } catch (error) {
        console.error('Error updating bank transaction:', error);
        res.status(500).json({ error: 'Error updating bank transaction' });
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
        res.json(transaction);
    } catch (error) {
        console.error('Error saving hawala transaction:', error);
        if (error.name === 'ValidationError') {
            res.status(400).json({ error: error.message });
        } else {
            next(error); // Pass to global error handler
        }
    }
});

// Add update route for hawala transactions
router.put('/hawala/update/:id', async (req, res) => {
    try {
        const transaction = await HawalaTransaction.updateTransaction(req.params.id, req.body);
        res.json(transaction);
    } catch (error) {
        console.error('Error updating hawala transaction:', error);
        res.status(500).json({ error: 'Error updating hawala transaction' });
    }
});

// Confirmation endpoints
router.post('/bank-history/confirm/:id', async (req, res) => {
    try {
        const transaction = await BankTransaction.toggleTransactionStatus(req.params.id);
        res.json(transaction);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error confirming bank transaction' });
    }
});

router.post('/hawala-history/confirm/:id', async (req, res) => {
    try {
        const transaction = await HawalaTransaction.toggleTransactionStatus(req.params.id);
        res.json(transaction);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error confirming hawala transaction' });
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
        const transaction = await BankTransaction.toggleTransactionStatus(req.params.id);
        const returnUrl = req.body.returnUrl || '/bank-history';
        res.redirect(returnUrl);
    } catch (error) {
        console.error('Error toggling bank transaction status:', error);
        res.status(500).send(error.message);
    }
});

// Toggle hawala transaction status
router.post('/toggle-hawala-status/:id', async (req, res) => {
    try {
        const transaction = await HawalaTransaction.toggleTransactionStatus(req.params.id);
        const returnUrl = req.body.returnUrl || '/hawala-history';
        res.redirect(returnUrl);
    } catch (error) {
        console.error('Error toggling hawala transaction status:', error);
        res.status(500).send(error.message);
    }
});

// Delete transactions
router.delete('/bank/delete/:id', async (req, res) => {
    try {
        await BankTransaction.deleteTransaction(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting bank transaction:', error);
        res.status(500).json({ error: 'Error deleting bank transaction' });
    }
});

router.delete('/hawala/delete/:id', async (req, res) => {
    try {
        await HawalaTransaction.deleteTransaction(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting hawala transaction:', error);
        res.status(500).json({ error: 'Error deleting hawala transaction' });
    }
});

// Transaction details route
router.get('/transaction/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
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
            banks,
            markets,
            accounts,
            title: 'Transaction Details',
            originalUrl: req.originalUrl,
            req: req
        });
    } catch (error) {
        console.error('Error fetching transaction details:', error);
        res.status(500).send('Error fetching transaction details');
    }
});

// Market management routes
router.get('/add-market', async (req, res) => {
    try {
        const markets = await Market.getMarkets();
        res.render('add-market', { 
            markets,
            error: null,
            title: 'Add Market'
        });
    } catch (error) {
        console.error('Error loading add market page:', error);
        res.render('add-market', { 
            markets: [],
            error: 'Error loading markets',
            title: 'Add Market'
        });
    }
});

router.post('/add-market', async (req, res) => {
    try {
        const { marketName } = req.body;
        await Market.addMarket(marketName);
        res.redirect('/add-market');
    } catch (error) {
        console.error('Error adding market:', error);
        const markets = await Market.getMarkets();
        res.render('add-market', { 
            markets,
            error: error.message || 'Error adding market'
        });
    }
});

// Market API route
router.get('/api/markets', async (req, res) => {
    try {
        const markets = await Market.getMarkets();
        res.json(markets);
    } catch (error) {
        console.error('Error fetching markets:', error);
        res.status(500).json({ error: 'Error fetching markets' });
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
            banks,
            error: null,
            title: 'Add Bank'
        });
    } catch (error) {
        console.error('Error loading add bank page:', error);
        res.render('add-bank', { 
            banks: [],
            error: 'Error loading banks',
            title: 'Add Bank'
        });
    }
});

router.post('/add-bank', async (req, res) => {
    try {
        const { bankName } = req.body;
        const result = await Bank.addBank(bankName);
        if (!result.success) {
            const banks = await Bank.getAllBanks();
            return res.render('add-bank', { 
                banks,
                error: result.message,
                title: 'Add Bank'
            });
        }
        res.redirect('/add-bank');
    } catch (error) {
        console.error('Error adding bank:', error);
        const banks = await Bank.getAllBanks();
        res.render('add-bank', { 
            banks,
            error: error.message || 'Error adding bank',
            title: 'Add Bank'
        });
    }
});

// Bank API route
router.get('/api/banks', async (req, res) => {
    try {
        const banks = await Bank.getAllBanks();
        res.json(banks);
    } catch (error) {
        console.error('Error fetching banks:', error);
        res.status(500).json({ error: 'Error fetching banks' });
    }
});

// Account management routes
router.get('/add-account', async (req, res) => {
    try {
        const accounts = await Account.getAllAccounts();
        res.render('add-account', { 
            accounts,
            error: null,
            title: 'Add Account'
        });
    } catch (error) {
        console.error('Error loading add account page:', error);
        res.render('add-account', { 
            accounts: [],
            error: 'Error loading accounts',
            title: 'Add Account'
        });
    }
});

router.post('/add-account', async (req, res) => {
    try {
        const { accountName } = req.body;
        const result = await Account.addAccount(accountName);
        if (!result.success) {
            const accounts = await Account.getAllAccounts();
            return res.render('add-account', { 
                accounts,
                error: result.message,
                title: 'Add Account'
            });
        }
        res.redirect('/bank');  // Changed from /add-account to /bank
    } catch (error) {
        console.error('Error adding account:', error);
        const accounts = await Account.getAllAccounts();
        res.render('add-account', { 
            accounts,
            error: error.message || 'Error adding account',
            title: 'Add Account'
        });
    }
});

// Account API route
router.get('/api/accounts', async (req, res) => {
    try {
        const accounts = await Account.getAllAccounts();
        res.json(accounts);
    } catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ error: 'Error fetching accounts' });
    }
});

module.exports = router;