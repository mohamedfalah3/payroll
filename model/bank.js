const { BaseModel } = require('./base');
const path = require('path');

class Bank extends BaseModel {
    constructor() {
        super();
        this.banksFile = 'banks.json';
        this.constructor.initializeDataFile(this.banksFile);
    }

    async getAllBanks() {
        try {
            return await this.constructor.readJsonFile(this.banksFile);
        } catch (error) {
            console.error('Error reading banks:', error);
            return [];
        }
    }

    async addBank(bankName) {
        try {
            const banks = await this.getAllBanks();
            if (banks.includes(bankName)) {
                return { success: false, message: 'Bank already exists' };
            }
            banks.push(bankName);
            await this.constructor.writeJsonFile(this.banksFile, banks);
            return { success: true, message: 'Bank added successfully' };
        } catch (error) {
            console.error('Error adding bank:', error);
            return { success: false, message: 'Failed to add bank' };
        }
    }
}

module.exports = new Bank();