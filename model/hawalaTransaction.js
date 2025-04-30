const { v4: uuidv4 } = require('uuid');
const { BaseModel, ValidationError } = require('./base');

class HawalaTransaction extends BaseModel {
    static filename = 'hawalaTransactions.json';

    static async getHawalaTransactions() {
        try {
            // Always use Firebase for transactions
            const collectionName = this.getCollectionName(this.filename);
            const transactions = await this.getFirebaseCollection(collectionName);
            return transactions.sort((a, b) => {
                const dateA = a?.date ? new Date(a.date) : new Date(0);
                const dateB = b?.date ? new Date(b.date) : new Date(0);
                return dateB - dateA;
            });
        } catch (error) {
            console.error('Error getting hawala transactions:', error);
            return [];
        }
    }

    static async saveHawalaTransaction(transactionData) {
        try {
            if (!transactionData) {
                throw new ValidationError('Transaction data is required');
            }
            
            this.validateHawalaTransaction(transactionData);

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

            // Add directly to Firebase
            const collectionName = this.getCollectionName(this.filename);
            await this.addFirebaseDoc(collectionName, newTransaction);
            
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
        if (!transaction) {
            throw new ValidationError('Transaction data is required');
        }
        
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
            if (!id) {
                throw new ValidationError('Transaction ID is required');
            }
            
            // Get the specific transaction from Firebase
            const collectionName = this.getCollectionName(this.filename);
            const transaction = await this.getFirebaseDocById(collectionName, id);
            
            if (!transaction) {
                throw new ValidationError('Transaction not found');
            }

            // Toggle the status
            const status = transaction.status?.toLowerCase() === 'pending' ? 'completed' : 'pending';
            const updatedData = {
                status,
                lastModified: new Date().toISOString()
            };
            
            // Update in Firebase
            await this.updateFirebaseDoc(collectionName, id, updatedData);
            return { ...transaction, ...updatedData };
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
            if (!id) {
                throw new ValidationError('Transaction ID is required');
            }
            
            const collectionName = this.getCollectionName(this.filename);
            const transaction = await this.getFirebaseDocById(collectionName, id);
            
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
            if (!id || !transactionData) {
                throw new ValidationError('Transaction ID and data are required');
            }
            
            // Validate transaction data
            this.validateHawalaTransaction(transactionData);
            
            const updatedData = {
                accountName: transactionData.accountName.trim(),
                market: transactionData.market.trim(),
                transactionType: transactionData.transactionType,
                currency: transactionData.currency,
                amount: transactionData.amount.toString(),
                purpose: (transactionData.purpose || '').trim(),
                nusinga: (transactionData.nusinga || '').trim(),
                lastModified: new Date().toISOString()
            };

            // Update directly in Firebase
            const collectionName = this.getCollectionName(this.filename);
            await this.updateFirebaseDoc(collectionName, id, updatedData);
            
            // Return the updated document
            return await this.getFirebaseDocById(collectionName, id);
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
            if (!id) {
                throw new ValidationError('Transaction ID is required');
            }
            
            const collectionName = this.getCollectionName(this.filename);
            await this.deleteFirebaseDoc(collectionName, id);
            return true;
        } catch (error) {
            console.error('Error deleting hawala transaction:', error);
            throw error;
        }
    }
}

module.exports = HawalaTransaction;