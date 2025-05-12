const { BaseModel, ValidationError } = require('./base');
const { v4: uuidv4 } = require('uuid');

class Market extends BaseModel {
    static filename = 'markets.json';
    static collectionName = Market.getCollectionName(Market.filename);

    static async getMarkets() {
        try {
            return await this.getFirebaseCollection(this.collectionName) || [];
        } catch (error) {
            console.error('Error getting markets:', error);
            return [];
        }
    }

    static async getMarketById(id) {
        if (!id) {
            return null;
        }
        
        try {
            return await this.getFirebaseDocById(this.collectionName, id);
        } catch (error) {
            console.error(`Error getting market with ID ${id}:`, error);
            return null;
        }
    }

    static async addMarket(marketName) {
        try {
            if (!marketName || marketName.trim().length === 0) {
                throw new ValidationError('Market name is required');
            }

            const markets = await this.getMarkets();
            const trimmedMarketName = marketName.trim();
            
            // Check if market exists
            const existingMarket = markets.find(market => {
                if (!market) return false;
                return market.name && market.name.toLowerCase() === trimmedMarketName.toLowerCase();
            });
            
            if (existingMarket) {
                throw new ValidationError('Market already exists');
            }

            // Create market object for Firestore
            const newMarket = {
                id: uuidv4(),
                name: trimmedMarketName,
                createdAt: new Date().toISOString()
            };

            // Add directly to Firebase
            await this.addFirebaseDoc(this.collectionName, newMarket);
            console.log(`Market "${trimmedMarketName}" added to Firestore collection ${this.collectionName} with ID: ${newMarket.id}`);

            return newMarket;
        } catch (error) {
            console.error('Error in addMarket:', error);
            throw error;
        }
    }

    static async updateMarket(id, marketData) {
        if (!id || !marketData) {
            throw new ValidationError('Market ID and data are required');
        }

        try {
            if (marketData.name && typeof marketData.name !== 'string') {
                throw new ValidationError('Market name must be a string');
            }

            const updatedMarket = await this.updateFirebaseDoc(
                this.collectionName,
                id,
                marketData
            );
            
            return updatedMarket || null;
        } catch (error) {
            console.error(`Error updating market ${id}:`, error);
            throw error;
        }
    }

    static async deleteMarket(id) {
        if (!id) {
            throw new ValidationError('Market ID is required');
        }

        try {
            await this.deleteFirebaseDoc(this.collectionName, id);
            return true;
        } catch (error) {
            console.error(`Error deleting market ${id}:`, error);
            throw error;
        }
    }

    // Get all markets as an array of name strings (for backward compatibility)
    static async getMarketNames() {
        try {
            const markets = await this.getMarkets();
            return markets
                .map(market => market?.name || '')
                .filter(name => name.trim() !== '');
        } catch (error) {
            console.error('Error getting market names:', error);
            return [];
        }
    }
}

module.exports = Market;