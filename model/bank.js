const { BaseModel, ValidationError } = require('./base');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class Bank extends BaseModel {
    constructor() {
        super();
        this.banksFile = 'banks.json';
        this.collectionName = this.constructor.getCollectionName(this.banksFile);
    }

    async getAllBanks() {
        try {
            return await this.constructor.getFirebaseCollection(this.collectionName) || [];
        } catch (error) {
            console.error('Error reading banks:', error);
            return [];
        }
    }

    async getBankById(id) {
        if (!id) {
            return null;
        }
        
        try {
            return await this.constructor.getFirebaseDocById(this.collectionName, id);
        } catch (error) {
            console.error(`Error getting bank with ID ${id}:`, error);
            return null;
        }
    }

    async addBank(bankName) {
        if (!bankName) {
            return { success: false, message: 'Bank name is required' };
        }

        try {
            const banks = await this.getAllBanks();
            
            // Check if bank exists
            const existingBank = banks.find(bank => 
                bank && bank.name && bank.name.toLowerCase() === bankName.toLowerCase()
            );
            
            if (existingBank) {
                return { success: false, message: 'Bank already exists' };
            }

            // Create new bank with ID for Firestore
            const newBank = {
                id: uuidv4(),
                name: bankName,
                balance: 0,
                createdAt: new Date().toISOString()
            };
            
            await this.constructor.addFirebaseDoc(
                this.collectionName,
                newBank
            );
            
            return { 
                success: true, 
                message: 'Bank added successfully',
                bank: newBank
            };
        } catch (error) {
            console.error('Error adding bank:', error);
            return { success: false, message: 'Failed to add bank' };
        }
    }

    async updateBank(id, bankData) {
        if (!id || !bankData) {
            return { success: false, message: 'Bank ID and data are required' };
        }

        try {
            const updatedBank = await this.constructor.updateFirebaseDoc(
                this.collectionName,
                id,
                bankData
            );
            
            return updatedBank ? 
                { success: true, message: 'Bank updated successfully', bank: updatedBank } :
                { success: false, message: 'Failed to update bank' };
        } catch (error) {
            console.error(`Error updating bank ${id}:`, error);
            return { success: false, message: 'Failed to update bank' };
        }
    }

    async deleteBank(id) {
        if (!id) {
            return { success: false, message: 'Bank ID is required' };
        }

        try {
            await this.constructor.deleteFirebaseDoc(this.collectionName, id);
            return { success: true, message: 'Bank deleted successfully' };
        } catch (error) {
            console.error(`Error deleting bank ${id}:`, error);
            return { success: false, message: error.message || 'Failed to delete bank' };
        }
    }
}

module.exports = new Bank();