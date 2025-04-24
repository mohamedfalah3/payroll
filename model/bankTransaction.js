const { v4: uuidv4 } = require('uuid');
const { BaseModel, ValidationError } = require('./base');

class BankTransaction extends BaseModel {
    static filename = 'bankTransactions.json';

    static async getBankTransactions() {
        const transactions = await this.readJsonFile(this.filename);
        return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    static async saveBankTransaction(transactionData) {
        try {
            this.validateBankTransaction(transactionData);
            
            const transactions = await this.getBankTransactions();
            const newTransaction = {
                id: uuidv4(),
                date: new Date().toISOString(),
                status: 'pending',
                ...transactionData
            };

            transactions.push(newTransaction);
            await this.writeJsonFile(this.filename, transactions);

            return newTransaction;
        } catch (error) {
            console.error('Error saving bank transaction:', error);
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Failed to save bank transaction');
        }
    }

    static validateBankTransaction(transaction) {
        if (!transaction.amount || isNaN(parseFloat(transaction.amount))) {
            throw new ValidationError('Invalid amount');
        }

        if (!transaction.bankName || transaction.bankName.trim().length === 0) {
            throw new ValidationError('Bank name is required');
        }

        if (!['send', 'receive'].includes(transaction.transactionType)) {
            throw new ValidationError('Invalid transaction type');
        }

        if (!transaction.currency || !['USD', 'EUR', 'IQD'].includes(transaction.currency)) {
            throw new ValidationError('Invalid currency');
        }
    }

    static async toggleTransactionStatus(id) {
        try {
            const transactions = await this.getBankTransactions();
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
            console.error('Error toggling bank transaction status:', error);
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Failed to update transaction status');
        }
    }

    static async getTransactionById(id) {
        try {
            const transactions = await this.getBankTransactions();
            const transaction = transactions.find(t => t.id === id);
            
            if (!transaction) {
                throw new ValidationError('Transaction not found');
            }

            return transaction;
        } catch (error) {
            console.error('Error getting bank transaction:', error);
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Failed to get transaction');
        }
    }

    static async deleteTransaction(id) {
        try {
            await this.deleteById(this.filename, id);
        } catch (error) {
            console.error('Error deleting bank transaction:', error);
            throw error;
        }
    }

    static async updateTransaction(id, transactionData) {
        try {
            const transactions = await this.getBankTransactions();
            const transaction = transactions.find(t => t.id === id);
            
            if (!transaction) {
                throw new ValidationError('Transaction not found');
            }

            // Validate the updated data
            this.validateBankTransaction({
                ...transactionData,
                currency: transactionData.currency || 'USD' // Bank transactions default to USD
            });

            // Update the transaction
            Object.assign(transaction, {
                amount: transactionData.amount.toString(),
                bankName: transactionData.bankName.trim(),
                accountName: transactionData.accountName.trim(),
                transactionType: transactionData.transactionType,
                currency: transactionData.currency || 'USD',
                description: (transactionData.description || '').trim(),
                lastModified: new Date().toISOString()
            });

            await this.writeJsonFile(this.filename, transactions);
            return transaction;
        } catch (error) {
            console.error('Error updating bank transaction:', error);
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Failed to update transaction');
        }
    }
}

// Initialize data file when module loads
BankTransaction.initializeDataFile(BankTransaction.filename);

module.exports = BankTransaction;