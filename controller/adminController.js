const BankTransaction = require('../model/bankTransaction');
const HawalaTransaction = require('../model/hawalaTransaction');

class AdminController {
    static async toggleBankTransactionStatus(req, res) {
        try {
            const transaction = await BankTransaction.toggleTransactionStatus(req.params.id);
            const returnUrl = req.body.returnUrl || '/bank-history';
            res.redirect(returnUrl);
        } catch (error) {
            res.status(500).send(error.message);
        }
    }

    static async toggleHawalaTransactionStatus(req, res) {
        try {
            const transaction = await HawalaTransaction.toggleTransactionStatus(req.params.id);
            res.json({ success: true, transaction });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async addMarket(req, res) {
        try {
            const { marketName } = req.body;
            console.log('Received market name:', marketName);
            
            if (!marketName || marketName.trim() === '') {
                console.log('Market name validation failed');
                return res.status(400).json({ error: 'Market name is required' });
            }

            console.log('Adding market:', marketName);
            await Transaction.addMarket(marketName);
            console.log('Market added successfully');
            
            res.redirect('/add-market');
        } catch (error) {
            console.error('Detailed error in addMarket:', error);
            if (error.name === 'ValidationError') {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Error adding market: ' + error.message });
        }
    }
}

module.exports = AdminController;