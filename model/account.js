const { BaseModel } = require('./base');
const path = require('path');

class Account extends BaseModel {
    constructor() {
        super();
        this.accountsFile = 'accounts.json';
        this.constructor.initializeDataFile(this.accountsFile);
    }

    async getAllAccounts() {
        try {
            return await this.constructor.readJsonFile(this.accountsFile);
        } catch (error) {
            console.error('Error reading accounts:', error);
            return [];
        }
    }

    async addAccount(accountName) {
        try {
            const accounts = await this.getAllAccounts();
            if (accounts.includes(accountName)) {
                return { success: false, message: 'Account already exists' };
            }
            accounts.push(accountName);
            await this.constructor.writeJsonFile(this.accountsFile, accounts);
            return { success: true, message: 'Account added successfully' };
        } catch (error) {
            console.error('Error adding account:', error);
            return { success: false, message: 'Failed to add account' };
        }
    }
}

module.exports = new Account();