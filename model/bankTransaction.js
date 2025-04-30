const { v4: uuidv4 } = require('uuid');
const { BaseModel, ValidationError } = require('./base');

class BankTransaction extends BaseModel {
    static filename = 'bankTransactions.json';

    static async getBankTransactions() {
        // Always use Firebase for transactions
        const collectionName = this.getCollectionName(this.filename);
        const transactions = await this.getFirebaseCollection(collectionName);
        return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    static async saveBankTransaction(transactionData) {
        try {
            this.validateBankTransaction(transactionData);
            
            // Ensure tax is stored as a number
            let tax = 0;
            if (transactionData.tax !== undefined && transactionData.tax !== '') {
                tax = parseFloat(transactionData.tax);
            }
            
            const newTransaction = {
                id: uuidv4(),
                date: new Date().toISOString(),
                status: 'pending',
                ...transactionData,
                tax: tax.toString()
            };

            // Add directly to Firebase
            const collectionName = this.getCollectionName(this.filename);
            await this.addFirebaseDoc(collectionName, newTransaction);
            
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
        
        // Validate tax if provided
        if (transaction.tax !== undefined && transaction.tax !== '') {
            const taxAmount = parseFloat(transaction.tax);
            if (isNaN(taxAmount) || taxAmount < 0) {
                throw new ValidationError('Tax amount must be a positive number or zero');
            }
        }
    }

    static async toggleTransactionStatus(id) {
        try {
            // Get the specific transaction from Firebase
            const collectionName = this.getCollectionName(this.filename);
            const transaction = await this.getFirebaseDocById(collectionName, id);
            
            if (!transaction) {
                throw new ValidationError('Transaction not found');
            }

            // Toggle the status
            const newStatus = transaction.status.toLowerCase() === 'pending' ? 'completed' : 'pending';
            const updatedData = {
                status: newStatus,
                lastModified: new Date().toISOString()
            };
            
            // Update in Firebase
            await this.updateFirebaseDoc(collectionName, id, updatedData);
            
            return { ...transaction, ...updatedData };
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
            const collectionName = this.getCollectionName(this.filename);
            const transaction = await this.getFirebaseDocById(collectionName, id);
            
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
            const collectionName = this.getCollectionName(this.filename);
            await this.deleteFirebaseDoc(collectionName, id);
        } catch (error) {
            console.error('Error deleting bank transaction:', error);
            throw error;
        }
    }

    static async updateTransaction(id, transactionData) {
        try {
            // Validate the updated data
            this.validateBankTransaction({
                ...transactionData,
                currency: transactionData.currency || 'USD' // Bank transactions default to USD
            });

            // Process tax value
            let tax = 0;
            if (transactionData.tax !== undefined && transactionData.tax !== '') {
                tax = parseFloat(transactionData.tax);
            }

            const updatedData = {
                amount: transactionData.amount.toString(),
                bankName: transactionData.bankName.trim(),
                accountName: transactionData.accountName.trim(),
                transactionType: transactionData.transactionType,
                currency: transactionData.currency || 'USD',
                description: (transactionData.description || '').trim(),
                tax: tax.toString(),
                lastModified: new Date().toISOString()
            };

            // Update directly in Firebase
            const collectionName = this.getCollectionName(this.filename);
            await this.updateFirebaseDoc(collectionName, id, updatedData);
            
            // Return the updated document
            return await this.getFirebaseDocById(collectionName, id);
        } catch (error) {
            console.error('Error updating bank transaction:', error);
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Failed to update transaction');
        }
    }
}

module.exports = BankTransaction;