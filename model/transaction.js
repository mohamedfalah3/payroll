const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dataPath = path.join(__dirname, '..', 'data');
const bankTransactionsFile = path.join(dataPath, 'bankTransactions.json');
const hawalaTransactionsFile = path.join(dataPath, 'hawalaTransactions.json');
const marketsFile = path.join(dataPath, 'markets.json');

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

// Ensure data directory and files exist
async function initializeDataFiles() {
    try {
        await fs.mkdir(dataPath, { recursive: true });
        
        // Initialize bank transactions file if it doesn't exist
        try {
            await fs.access(bankTransactionsFile);
        } catch {
            await fs.writeFile(bankTransactionsFile, '[]');
        }

        // Initialize hawala transactions file if it doesn't exist
        try {
            await fs.access(hawalaTransactionsFile);
        } catch {
            await fs.writeFile(hawalaTransactionsFile, '[]');
        }

        // Initialize markets file if it doesn't exist
        try {
            await fs.access(marketsFile);
        } catch {
            await fs.writeFile(marketsFile, '[]');
        }
    } catch (error) {
        console.error('Error initializing data files:', error);
    }
}

// Initialize on module load
initializeDataFiles();

class Transaction {
    static async getBankTransactions() {
        try {
            const data = await fs.readFile(path.join(__dirname, '../data/bankTransactions.json'), 'utf8');
            const transactions = JSON.parse(data);
            return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (error) {
            console.error('Error reading bank transactions:', error);
            throw new Error('Failed to retrieve bank transactions');
        }
    }

    static async getHawalaTransactions() {
        try {
            const data = await fs.readFile(path.join(__dirname, '../data/hawalaTransactions.json'), 'utf8');
            const transactions = JSON.parse(data);
            return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (error) {
            console.error('Error reading hawala transactions:', error);
            throw new Error('Failed to retrieve hawala transactions');
        }
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
            await fs.writeFile(
                path.join(__dirname, '../data/bankTransactions.json'),
                JSON.stringify(transactions, null, 2)
            );

            return newTransaction;
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
            this.validateHawalaTransaction(transactionData);
            
            const transactions = await this.getHawalaTransactions();
            const newTransaction = {
                id: uuidv4(),
                date: new Date().toISOString(),
                status: 'pending',
                ...transactionData
            };

            transactions.push(newTransaction);
            await fs.writeFile(
                path.join(__dirname, '../data/hawalaTransactions.json'),
                JSON.stringify(transactions, null, 2)
            );

            return newTransaction;
        } catch (error) {
            console.error('Error saving hawala transaction:', error);
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error('Failed to save hawala transaction');
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
    }

    static validateHawalaTransaction(transaction) {
        if (!transaction.amount || isNaN(parseFloat(transaction.amount))) {
            throw new ValidationError('Invalid amount');
        }

        if (!transaction.market || transaction.market.trim().length === 0) {
            throw new ValidationError('Market is required');
        }

        if (!['send', 'receive'].includes(transaction.transactionType)) {
            throw new ValidationError('Invalid transaction type');
        }
    }

    static async toggleBankTransactionStatus(id) {
        try {
            const transactions = await this.getBankTransactions();
            const transaction = transactions.find(t => t.id === id);
            
            if (!transaction) {
                throw new ValidationError('Transaction not found');
            }

            transaction.status = transaction.status === 'pending' ? 'completed' : 'pending';
            transaction.lastModified = new Date().toISOString();

            await fs.writeFile(
                path.join(__dirname, '../data/bankTransactions.json'),
                JSON.stringify(transactions, null, 2)
            );

            return transaction;
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
            const transactions = await this.getHawalaTransactions();
            const transaction = transactions.find(t => t.id === id);
            
            if (!transaction) {
                throw new ValidationError('Transaction not found');
            }

            transaction.status = transaction.status === 'pending' ? 'completed' : 'pending';
            transaction.lastModified = new Date().toISOString();

            await fs.writeFile(
                path.join(__dirname, '../data/hawalaTransactions.json'),
                JSON.stringify(transactions, null, 2)
            );

            return transaction;
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
            const transactions = type === 'bank' 
                ? await this.getBankTransactions()
                : await this.getHawalaTransactions();
                
            const transaction = transactions.find(t => t.id === id);
            
            if (!transaction) {
                throw new ValidationError('Transaction not found');
            }

            return transaction;
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
            const data = await fs.readFile(marketsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading markets:', error);
            throw new Error('Failed to retrieve markets');
        }
    }

    static async addMarket(marketName) {
        try {
            if (!marketName || marketName.trim().length === 0) {
                throw new ValidationError('Market name is required');
            }

            const markets = await this.getMarkets();
            const trimmedMarketName = marketName.trim();
            
            // Check if market already exists
            if (markets.includes(trimmedMarketName)) {
                throw new ValidationError('Market already exists');
            }

            // Add new market as a string
            markets.push(trimmedMarketName);

            // Save back to file
            await fs.writeFile(
                path.join(__dirname, '../data/markets.json'),
                JSON.stringify(markets, null, 2)
            );

            return trimmedMarketName;
        } catch (error) {
            console.error('Error in addMarket:', error);
            throw error;
        }
    }
}

module.exports = Transaction;