const { v4: uuidv4 } = require('uuid');
const { BaseModel, ValidationError } = require('./base');

class HawalaTransaction extends BaseModel {
    static filename = 'hawalaTransactions.json';

    static async getHawalaTransactions() {
        const transactions = await this.readJsonFile(this.filename);
        return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    static async saveHawalaTransaction(transactionData) {
        try {
            // Validate all required fields
            if (!transactionData.accountName?.trim()) {
                throw new ValidationError('Account name is required');
            }
            if (!transactionData.market?.trim()) {
                throw new ValidationError('Market is required');
            }
            if (!transactionData.transactionType?.trim()) {
                throw new ValidationError('Transaction type is required');
            }
            if (!['send', 'receive'].includes(transactionData.transactionType)) {
                throw new ValidationError('Invalid transaction type');
            }
            if (!transactionData.amount || isNaN(parseFloat(transactionData.amount))) {
                throw new ValidationError('Invalid amount');
            }
            if (!transactionData.currency) {
                throw new ValidationError('Currency is required');
            }
            if (!['USD', 'EUR', 'IQD'].includes(transactionData.currency)) {
                throw new ValidationError('Invalid currency');
            }

            const transactions = await this.getHawalaTransactions();
            const newTransaction = {
                id: uuidv4(),
                date: new Date().toISOString(),
                status: 'pending',
                accountName: transactionData.accountName.trim(),
                market: transactionData.market.trim(),
                transactionType: transactionData.transactionType,
                currency: transactionData.currency,
                amount: transactionData.amount.toString(),
                purpose: (transactionData.purpose || '').trim(),
                nusinga: (transactionData.nusinga || '').trim()
            };

            transactions.push(newTransaction);
            await this.writeJsonFile(this.filename, transactions);
            return newTransaction;
        } catch (error) {
            console.error('Error saving hawala transaction:', error);
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Failed to save hawala transaction');
        }
    }

    static validateHawalaTransaction(transaction) {
        if (!transaction.accountName?.trim()) {
            throw new ValidationError('Account name is required');
        }
        if (!transaction.market?.trim()) {
            throw new ValidationError('Market is required');
        }
        if (!transaction.transactionType?.trim()) {
            throw new ValidationError('Transaction type is required');
        }
        if (!['send', 'receive'].includes(transaction.transactionType)) {
            throw new ValidationError('Invalid transaction type');
        }
        if (!transaction.amount || isNaN(parseFloat(transaction.amount))) {
            throw new ValidationError('Invalid amount');
        }
        if (!transaction.currency) {
            throw new ValidationError('Currency is required');
        }
        if (!['USD', 'EUR', 'IQD'].includes(transaction.currency)) {
            throw new ValidationError('Invalid currency');
        }
    }

    static async toggleTransactionStatus(id) {
        try {
            const transactions = await this.getHawalaTransactions();
            const transaction = transactions.find(t => t.id === id);
            
            if (!transaction) {
                throw new ValidationError('Transaction not found');
            }

            // Toggle the status and normalize it
            transaction.status = transaction.status.toLowerCase() === 'pending' ? 'completed' : 'pending';
            transaction.lastModified = new Date().toISOString();

            await this.writeJsonFile(this.filename, transactions);
            return transaction;
        } catch (error) {
            console.error('Error toggling hawala transaction status:', error);
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Failed to update transaction status');
        }
    }

    static async getTransactionById(id) {
        try {
            const transactions = await this.getHawalaTransactions();
            const transaction = transactions.find(t => t.id === id);
            
            if (!transaction) {
                throw new ValidationError('Transaction not found');
            }

            return transaction;
        } catch (error) {
            console.error('Error getting hawala transaction:', error);
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Failed to get transaction');
        }
    }

    static async updateTransaction(id, transactionData) {
        try {
            const transactions = await this.getHawalaTransactions();
            const transaction = transactions.find(t => t.id === id);
            
            if (!transaction) {
                throw new ValidationError('Transaction not found');
            }

            // Validate all required fields
            if (!transactionData.accountName?.trim()) {
                throw new ValidationError('Account name is required');
            }
            if (!transactionData.market?.trim()) {
                throw new ValidationError('Market is required');
            }
            if (!transactionData.transactionType?.trim()) {
                throw new ValidationError('Transaction type is required');
            }
            if (!['send', 'receive'].includes(transactionData.transactionType)) {
                throw new ValidationError('Invalid transaction type');
            }
            if (!transactionData.amount || isNaN(parseFloat(transactionData.amount))) {
                throw new ValidationError('Invalid amount');
            }
            if (!transactionData.currency) {
                throw new ValidationError('Currency is required');
            }
            if (!['USD', 'EUR', 'IQD'].includes(transactionData.currency)) {
                throw new ValidationError('Invalid currency');
            }

            // Update the transaction
            Object.assign(transaction, {
                accountName: transactionData.accountName.trim(),
                market: transactionData.market.trim(),
                transactionType: transactionData.transactionType,
                currency: transactionData.currency,
                amount: transactionData.amount.toString(),
                purpose: (transactionData.purpose || '').trim(),
                nusinga: (transactionData.nusinga || '').trim(),
                lastModified: new Date().toISOString()
            });

            await this.writeJsonFile(this.filename, transactions);
            return transaction;
        } catch (error) {
            console.error('Error updating hawala transaction:', error);
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Failed to update transaction');
        }
    }

    static async deleteTransaction(id) {
        try {
            await this.deleteById(this.filename, id);
        } catch (error) {
            console.error('Error deleting hawala transaction:', error);
            throw error;
        }
    }
}

// Initialize data file when module loads
HawalaTransaction.initializeDataFile(HawalaTransaction.filename);

module.exports = HawalaTransaction;