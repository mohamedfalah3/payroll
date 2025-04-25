const { BaseModel, ValidationError } = require('./base');
const { v4: uuidv4 } = require('uuid');

class Account extends BaseModel {
    constructor() {
        super();
        this.accountsFile = 'accounts.json';
        this.constructor.initializeDataFile(this.accountsFile);
    }

    async getAllAccounts() {
        try {
            const accounts = await this.constructor.getData(this.accountsFile);
            return accounts || [];
        } catch (error) {
            console.error('Error reading accounts:', error);
            return [];
        }
    }

    async addAccount(accountName) {
        if (!accountName) {
            return { success: false, message: 'Account name is required' };
        }

        try {
            const accounts = await this.getAllAccounts();
            
            // Check if account exists
            const existingAccount = accounts.find(account => 
                account && account.name && account.name.toLowerCase() === accountName.toLowerCase()
            );
            
            if (existingAccount) {
                return { success: false, message: 'Account already exists' };
            }

            // Create new account with ID for Firestore
            const newAccount = {
                id: uuidv4(),
                name: accountName,
                createdAt: new Date().toISOString()
            };
            
            // Handle array of objects for Firestore compatibility
            if (this.constructor.useFirebase) {
                await this.constructor.addFirebaseDoc(
                    this.constructor.getCollectionName(this.accountsFile),
                    newAccount
                );
            } else {
                accounts.push(newAccount);
                await this.constructor.writeJsonFile(this.accountsFile, accounts);
            }
            
            return { 
                success: true, 
                message: 'Account added successfully',
                account: newAccount
            };
        } catch (error) {
            console.error('Error adding account:', error);
            return { success: false, message: 'Failed to add account' };
        }
    }

    async getAccountById(id) {
        if (!id) {
            return null;
        }
        
        try {
            return await this.constructor.getById(this.accountsFile, id);
        } catch (error) {
            console.error(`Error getting account with ID ${id}:`, error);
            return null;
        }
    }

    async updateAccount(id, accountData) {
        if (!id || !accountData) {
            return { success: false, message: 'Account ID and data are required' };
        }

        try {
            if (this.constructor.useFirebase) {
                const updatedAccount = await this.constructor.updateFirebaseDoc(
                    this.constructor.getCollectionName(this.accountsFile),
                    id,
                    accountData
                );
                
                return updatedAccount ? 
                    { success: true, message: 'Account updated successfully', account: updatedAccount } :
                    { success: false, message: 'Failed to update account' };
            } else {
                const accounts = await this.getAllAccounts();
                const accountIndex = accounts.findIndex(account => account && account.id === id);
                
                if (accountIndex === -1) {
                    return { success: false, message: 'Account not found' };
                }
                
                accounts[accountIndex] = { ...accounts[accountIndex], ...accountData };
                await this.constructor.writeJsonFile(this.accountsFile, accounts);
                
                return { 
                    success: true, 
                    message: 'Account updated successfully',
                    account: accounts[accountIndex]
                };
            }
        } catch (error) {
            console.error(`Error updating account ${id}:`, error);
            return { success: false, message: 'Failed to update account' };
        }
    }

    async deleteAccount(id) {
        if (!id) {
            return { success: false, message: 'Account ID is required' };
        }

        try {
            await this.constructor.deleteById(this.accountsFile, id);
            return { success: true, message: 'Account deleted successfully' };
        } catch (error) {
            console.error(`Error deleting account ${id}:`, error);
            return { success: false, message: error.message || 'Failed to delete account' };
        }
    }
}

module.exports = new Account();