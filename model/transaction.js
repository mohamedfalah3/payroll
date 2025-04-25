const { v4: uuidv4 } = require('uuid');
const { BaseModel, ValidationError } = require('./base');
const path = require('path');

// Direct model imports for better structured approach
const BankTransaction = require('./bankTransaction');
const HawalaTransaction = require('./hawalaTransaction');
const Market = require('./market');

class Transaction extends BaseModel {
    // Use static properties to define collection/file names
    static bankTransactionsFile = 'bankTransactions.json';
    static hawalaTransactionsFile = 'hawalaTransactions.json';
    
    static async getBankTransactions() {
        try {
            return await BankTransaction.getBankTransactions();
        } catch (error) {
            console.error('Error reading bank transactions:', error);
            return [];
        }
    }

    static async getHawalaTransactions() {
        try {
            return await HawalaTransaction.getHawalaTransactions();
        } catch (error) {
            console.error('Error reading hawala transactions:', error);
            return [];
        }
    }

    // Combined method to get all transactions (both bank and hawala)
    static async getAllTransactions() {
        try {
            const bankTransactions = await this.getBankTransactions() || [];
            const hawalaTransactions = await this.getHawalaTransactions() || [];
            
            // Add type property to differentiate transaction sources
            const formattedBankTxns = bankTransactions.map(t => ({
                ...t,
                transactionSourceType: 'bank'
            }));
            
            const formattedHawalaTxns = hawalaTransactions.map(t => ({
                ...t,
                transactionSourceType: 'hawala'
            }));
            
            // Combine and sort by date (newest first)
            const allTransactions = [...formattedBankTxns, ...formattedHawalaTxns];
            return allTransactions.sort((a, b) => {
                const dateA = a?.date ? new Date(a.date) : new Date(0);
                const dateB = b?.date ? new Date(b.date) : new Date(0);
                return dateB - dateA;
            });
        } catch (error) {
            console.error('Error getting all transactions:', error);
            return [];
        }
    }

    static async saveBankTransaction(transactionData) {
        try {
            if (!transactionData) {
                throw new ValidationError('Transaction data is required');
            }
            
            return await BankTransaction.saveBankTransaction(transactionData);
        } catch (error) {
            console.error('Error saving bank transaction:', error);
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Failed to save bank transaction');
        }
    }

    static async saveHawalaTransaction(transactionData) {
        try {
            if (!transactionData) {
                throw new ValidationError('Transaction data is required');
            }
            
            return await HawalaTransaction.saveHawalaTransaction(transactionData);
        } catch (error) {
            console.error('Error saving hawala transaction:', error);
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Failed to save hawala transaction');
        }
    }

    static validateBankTransaction(transaction) {
        if (!transaction) {
            throw new ValidationError('Transaction data is required');
        }
        
        if (!transaction.amount || isNaN(parseFloat(transaction.amount))) {
            throw new ValidationError('Invalid amount');
        }

        if (!transaction.bankName?.trim()) {
            throw new ValidationError('Bank name is required');
        }

        if (!['send', 'receive'].includes(transaction.transactionType)) {
            throw new ValidationError('Invalid transaction type');
        }
        
        if (!transaction.currency) {
            throw new ValidationError('Currency is required');
        }
        
        if (!['USD', 'EUR', 'IQD'].includes(transaction.currency)) {
            throw new ValidationError('Invalid currency');
        }
    }

    static validateHawalaTransaction(transaction) {
        if (!transaction) {
            throw new ValidationError('Transaction data is required');
        }
        
        if (!transaction.amount || isNaN(parseFloat(transaction.amount))) {
            throw new ValidationError('Invalid amount');
        }

        if (!transaction.market?.trim()) {
            throw new ValidationError('Market is required');
        }

        if (!['send', 'receive'].includes(transaction.transactionType)) {
            throw new ValidationError('Invalid transaction type');
        }
        
        if (!transaction.currency) {
            throw new ValidationError('Currency is required');
        }
        
        if (!['USD', 'EUR', 'IQD'].includes(transaction.currency)) {
            throw new ValidationError('Invalid currency');
        }
    }

    static async toggleBankTransactionStatus(id) {
        try {
            if (!id) {
                throw new ValidationError('Transaction ID is required');
            }
            
            return await BankTransaction.toggleTransactionStatus(id);
        } catch (error) {
            console.error('Error toggling bank transaction status:', error);
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Failed to update transaction status');
        }
    }

    static async toggleHawalaTransactionStatus(id) {
        try {
            if (!id) {
                throw new ValidationError('Transaction ID is required');
            }
            
            return await HawalaTransaction.toggleTransactionStatus(id);
        } catch (error) {
            console.error('Error toggling hawala transaction status:', error);
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Failed to update transaction status');
        }
    }

    static async getTransactionById(id, type) {
        try {
            if (!id) {
                throw new ValidationError('Transaction ID is required');
            }
            
            if (!type || !['bank', 'hawala'].includes(type)) {
                throw new ValidationError('Valid transaction type (bank or hawala) is required');
            }
            
            if (type === 'bank') {
                return await BankTransaction.getTransactionById(id);
            } else {
                return await HawalaTransaction.getTransactionById(id);
            }
        } catch (error) {
            console.error('Error getting transaction by ID:', error);
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Failed to retrieve transaction');
        }
    }

    static async getMarkets() {
        try {
            return await Market.getMarkets();
        } catch (error) {
            console.error('Error reading markets:', error);
            return [];
        }
    }

    static async addMarket(marketName) {
        try {
            if (!marketName) {
                throw new ValidationError('Market name is required');
            }
            
            return await Market.addMarket(marketName);
        } catch (error) {
            console.error('Error in addMarket:', error);
            throw error;
        }
    }
    
    // Helper method to check if a transaction exists
    static async transactionExists(id, type) {
        try {
            if (!id || !type) {
                return false;
            }
            
            if (type === 'bank') {
                const transaction = await BankTransaction.getTransactionById(id);
                return !!transaction;
            } else if (type === 'hawala') {
                const transaction = await HawalaTransaction.getTransactionById(id);
                return !!transaction;
            }
            
            return false;
        } catch (error) {
            console.error('Error checking if transaction exists:', error);
            return false;
        }
    }
    
    // Delete a transaction by ID and type
    static async deleteTransaction(id, type) {
        try {
            if (!id) {
                throw new ValidationError('Transaction ID is required');
            }
            
            if (!type || !['bank', 'hawala'].includes(type)) {
                throw new ValidationError('Valid transaction type (bank or hawala) is required');
            }
            
            if (type === 'bank') {
                await BankTransaction.deleteTransaction(id);
            } else {
                await HawalaTransaction.deleteTransaction(id);
            }
            
            return true;
        } catch (error) {
            console.error('Error deleting transaction:', error);
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Failed to delete transaction');
        }
    }
}

module.exports = Transaction;