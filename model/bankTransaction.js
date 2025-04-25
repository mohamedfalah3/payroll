const { v4: uuidv4 } = require('uuid');
const { BaseModel, ValidationError } = require('./base');

class BankTransaction extends BaseModel {
    static filename = 'bankTransactions.json';

    static async getBankTransactions() {
        // Use the new getData method that supports both Firebase and local JSON
        const transactions = await this.getData(this.filename);
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

            if (this.useFirebase) {
                // Add directly to Firebase
                await this.addFirebaseDoc(this.getCollectionName(this.filename), newTransaction);
            } else {
                // Add to local JSON file
                transactions.push(newTransaction);
                await this.writeJsonFile(this.filename, transactions);
            }

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
            if (this.useFirebase) {
                // Get the specific transaction from Firebase
                const collectionName = this.getCollectionName(this.filename);
                const transactions = await this.getFirebaseCollection(collectionName);
                const transaction = transactions.find(t => t.id === id);
                
                if (!transaction) {
                    throw new ValidationError('Transaction not found');
                }

                // Toggle the status
                transaction.status = transaction.status.toLowerCase() === 'pending' ? 'completed' : 'pending';
                transaction.lastModified = new Date().toISOString();
                
                // Update in Firebase
                await this.updateFirebaseDoc(collectionName, id, transaction);
                return transaction;
            } else {
                // Local JSON file approach
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
            }
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
            // Validate the updated data
            this.validateBankTransaction({
                ...transactionData,
                currency: transactionData.currency || 'USD' // Bank transactions default to USD
            });

            const updatedData = {
                amount: transactionData.amount.toString(),
                bankName: transactionData.bankName.trim(),
                accountName: transactionData.accountName.trim(),
                transactionType: transactionData.transactionType,
                currency: transactionData.currency || 'USD',
                description: (transactionData.description || '').trim(),
                lastModified: new Date().toISOString()
            };

            if (this.useFirebase) {
                // Update directly in Firebase
                const collectionName = this.getCollectionName(this.filename);
                await this.updateFirebaseDoc(collectionName, id, updatedData);
                
                // Retrieve the updated document
                const transactions = await this.getFirebaseCollection(collectionName);
                return transactions.find(t => t.id === id);
            } else {
                // Update in local JSON file
                const transactions = await this.getBankTransactions();
                const transaction = transactions.find(t => t.id === id);
                
                if (!transaction) {
                    throw new ValidationError('Transaction not found');
                }

                // Update the transaction
                Object.assign(transaction, updatedData);

                await this.writeJsonFile(this.filename, transactions);
                return transaction;
            }
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