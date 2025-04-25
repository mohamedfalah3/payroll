const BankTransaction = require('../model/bankTransaction');
const HawalaTransaction = require('../model/hawalaTransaction');
const Market = require('../model/market');

class AdminController {
    static async toggleBankTransactionStatus(req, res) {
        try {
            if (!req.params.id) {
                return res.status(400).json({ error: 'Transaction ID is required' });
            }
            
            const transaction = await BankTransaction.toggleTransactionStatus(req.params.id);
            const returnUrl = req?.body?.returnUrl || '/bank-history';
            res.redirect(returnUrl);
        } catch (error) {
            console.error('Error toggling bank transaction status:', error);
            res.status(500).send(error.message || 'Failed to update transaction status');
        }
    }

    static async toggleHawalaTransactionStatus(req, res) {
        try {
            if (!req.params.id) {
                return res.status(400).json({ error: 'Transaction ID is required' });
            }
            
            const transaction = await HawalaTransaction.toggleTransactionStatus(req.params.id);
            
            if (!transaction) {
                return res.status(404).json({ error: 'Transaction not found or status update failed' });
            }
            
            res.json({ success: true, transaction });
        } catch (error) {
            console.error('Error toggling hawala transaction status:', error);
            res.status(500).json({ error: error.message || 'Failed to update transaction status' });
        }
    }

    static async addMarket(req, res) {
        try {
            const { marketName } = req.body || {};
            console.log('Received market name:', marketName);
            
            if (!marketName || marketName.trim() === '') {
                console.log('Market name validation failed');
                return res.status(400).json({ error: 'Market name is required' });
            }

            console.log('Adding market:', marketName);
            const result = await Market.addMarket(marketName);
            console.log('Market added successfully:', result);
            
            // Check if this is an API request or a form submission
            const isApiRequest = req.xhr || req.headers.accept?.includes('application/json');
            
            if (isApiRequest) {
                return res.json({ 
                    success: true, 
                    message: 'Market added successfully',
                    market: result
                });
            } else {
                res.redirect('/add-market');
            }
        } catch (error) {
            console.error('Detailed error in addMarket:', error);
            
            // Check if this is an API request or a form submission
            const isApiRequest = req.xhr || req.headers.accept?.includes('application/json');
            
            if (isApiRequest) {
                if (error.name === 'ValidationError') {
                    return res.status(400).json({ error: error.message });
                }
                return res.status(500).json({ error: 'Error adding market: ' + error.message });
            } else {
                // For form submissions, redirect with error message
                res.redirect('/add-market?error=' + encodeURIComponent(error.message));
            }
        }
    }
    
    static async getBankTransactions(req, res) {
        try {
            const transactions = await BankTransaction.getBankTransactions();
            
            // Handle API vs. template rendering
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.json({ transactions });
            } else {
                res.render('bank-history', { transactions });
            }
        } catch (error) {
            console.error('Error getting bank transactions:', error);
            
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(500).json({ error: error.message || 'Failed to get bank transactions' });
            } else {
                res.status(500).render('error', { error: 'Failed to get bank transactions' });
            }
        }
    }
    
    static async getHawalaTransactions(req, res) {
        try {
            const transactions = await HawalaTransaction.getHawalaTransactions();
            
            // Handle API vs. template rendering
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.json({ transactions });
            } else {
                res.render('hawala-history', { transactions });
            }
        } catch (error) {
            console.error('Error getting hawala transactions:', error);
            
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(500).json({ error: error.message || 'Failed to get hawala transactions' });
            } else {
                res.status(500).render('error', { error: 'Failed to get hawala transactions' });
            }
        }
    }
}

module.exports = AdminController;