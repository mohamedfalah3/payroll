const { BaseModel, ValidationError } = require('./base');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class Bank extends BaseModel {
    constructor() {
        super();
        this.banksFile = 'banks.json';
        this.constructor.initializeDataFile(this.banksFile);
    }

    async getAllBanks() {
        try {
            const banks = await this.constructor.getData(this.banksFile);
            return banks || [];
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
            return await this.constructor.getById(this.banksFile, id);
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
            
            // Handle array of objects for Firestore compatibility
            if (this.constructor.useFirebase) {
                await this.constructor.addFirebaseDoc(
                    this.constructor.getCollectionName(this.banksFile),
                    newBank
                );
            } else {
                banks.push(newBank);
                await this.constructor.writeJsonFile(this.banksFile, banks);
            }
            
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
            if (this.constructor.useFirebase) {
                const updatedBank = await this.constructor.updateFirebaseDoc(
                    this.constructor.getCollectionName(this.banksFile),
                    id,
                    bankData
                );
                
                return updatedBank ? 
                    { success: true, message: 'Bank updated successfully', bank: updatedBank } :
                    { success: false, message: 'Failed to update bank' };
            } else {
                const banks = await this.getAllBanks();
                const bankIndex = banks.findIndex(bank => bank && bank.id === id);
                
                if (bankIndex === -1) {
                    return { success: false, message: 'Bank not found' };
                }
                
                banks[bankIndex] = { ...banks[bankIndex], ...bankData };
                await this.constructor.writeJsonFile(this.banksFile, banks);
                
                return { 
                    success: true, 
                    message: 'Bank updated successfully',
                    bank: banks[bankIndex]
                };
            }
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
            await this.constructor.deleteById(this.banksFile, id);
            return { success: true, message: 'Bank deleted successfully' };
        } catch (error) {
            console.error(`Error deleting bank ${id}:`, error);
            return { success: false, message: error.message || 'Failed to delete bank' };
        }
    }
}

module.exports = new Bank();