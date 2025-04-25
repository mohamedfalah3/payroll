const { BaseModel, ValidationError } = require('./base');
const { v4: uuidv4 } = require('uuid');

class Market extends BaseModel {
    static filename = 'markets.json';

    static async getMarkets() {
        try {
            const markets = await this.getData(this.filename);
            
            // If using Firebase, return the data as is
            if (this.useFirebase) {
                return markets || [];
            }
            
            // For local JSON storage, handle potential migration from string to object format
            if (markets && markets.length > 0) {
                // If first item is a string, convert all to objects for consistency
                if (typeof markets[0] === 'string') {
                    return markets.map(marketName => ({
                        id: uuidv4(),
                        name: marketName,
                        createdAt: new Date().toISOString()
                    }));
                }
            }
            
            return markets || [];
        } catch (error) {
            console.error('Error getting markets:', error);
            return [];
        }
    }

    // Migrate all existing markets to Firestore
    static async migrateMarketsToFirestore() {
        if (!this.useFirebase) {
            console.log("Firebase is not enabled. Skipping migration.");
            return false;
        }
        
        try {
            // Get existing markets from JSON file
            const jsonData = await this.readJsonFile(this.filename);
            if (!jsonData || jsonData.length === 0) {
                console.log("No markets to migrate.");
                return true;
            }
            
            console.log(`Found ${jsonData.length} markets to migrate to Firestore.`);
            const collectionName = this.getCollectionName(this.filename);
            
            // Process each market
            for (const market of jsonData) {
                try {
                    if (typeof market === 'string') {
                        // Convert string to object with name field
                        const marketObj = {
                            id: uuidv4(),
                            name: market,
                            createdAt: new Date().toISOString(),
                            migratedAt: new Date().toISOString()
                        };
                        
                        await this.addFirebaseDoc(collectionName, marketObj);
                        console.log(`Migrated market "${market}" to Firestore with ID: ${marketObj.id}`);
                    } else if (typeof market === 'object' && market.name) {
                        // Ensure object has an ID
                        const marketObj = {
                            ...market,
                            id: market.id || uuidv4(),
                            migratedAt: new Date().toISOString()
                        };
                        
                        await this.addFirebaseDoc(collectionName, marketObj);
                        console.log(`Migrated market "${market.name}" to Firestore with ID: ${marketObj.id}`);
                    } else {
                        console.error("Invalid market format:", market);
                    }
                } catch (error) {
                    console.error(`Error migrating market ${JSON.stringify(market)}:`, error);
                }
            }
            
            console.log("Market migration completed.");
            return true;
        } catch (error) {
            console.error("Market migration failed:", error);
            return false;
        }
    }

    static async getMarketById(id) {
        if (!id) {
            return null;
        }
        
        try {
            return await this.getById(this.filename, id);
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
                
                if (typeof market === 'string') {
                    return market.toLowerCase() === trimmedMarketName.toLowerCase();
                } else if (market.name) {
                    return market.name.toLowerCase() === trimmedMarketName.toLowerCase();
                }
                
                return false;
            });
            
            if (existingMarket) {
                throw new ValidationError('Market already exists');
            }

            // Create market object for Firestore compatibility
            const newMarket = {
                id: uuidv4(),
                name: trimmedMarketName,
                createdAt: new Date().toISOString()
            };

            if (this.useFirebase) {
                // Add directly to Firebase
                const collectionName = this.getCollectionName(this.filename);
                await this.addFirebaseDoc(collectionName, newMarket);
                console.log(`Market "${trimmedMarketName}" added to Firestore collection ${collectionName} with ID: ${newMarket.id}`);
            } else {
                // Handle both string-based and object-based storage formats
                const isObjectFormat = markets.length > 0 && typeof markets[0] === 'object';
                
                if (isObjectFormat) {
                    markets.push(newMarket);
                    await this.writeJsonFile(this.filename, markets);
                } else {
                    // Convert all existing markets to objects for consistency
                    const updatedMarkets = markets.map(name => ({
                        id: uuidv4(),
                        name: name,
                        createdAt: new Date().toISOString()
                    }));
                    
                    // Add the new market
                    updatedMarkets.push(newMarket);
                    await this.writeJsonFile(this.filename, updatedMarkets);
                }
            }

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

            if (this.useFirebase) {
                const updatedMarket = await this.updateFirebaseDoc(
                    this.getCollectionName(this.filename),
                    id,
                    marketData
                );
                
                return updatedMarket || null;
            } else {
                const markets = await this.getMarkets();
                const isObjectFormat = markets.length > 0 && typeof markets[0] === 'object';
                
                if (isObjectFormat) {
                    const marketIndex = markets.findIndex(market => market && market.id === id);
                    
                    if (marketIndex === -1) {
                        throw new ValidationError('Market not found');
                    }
                    
                    markets[marketIndex] = { ...markets[marketIndex], ...marketData };
                    await this.writeJsonFile(this.filename, markets);
                    
                    return markets[marketIndex];
                } else {
                    // For string-based format, we need to migrate to object format
                    const newMarkets = markets.map(market => ({
                        id: uuidv4(),
                        name: market
                    }));
                    
                    await this.writeJsonFile(this.filename, newMarkets);
                    throw new ValidationError('Market storage format upgraded. Please try again.');
                }
            }
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
            await this.deleteById(this.filename, id);
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
            return markets.map(market => {
                if (typeof market === 'string') return market;
                return market?.name || '';
            }).filter(name => name.trim() !== '');
        } catch (error) {
            console.error('Error getting market names:', error);
            return [];
        }
    }
}

// Initialize data file when module loads
Market.initializeDataFile(Market.filename);

// Try to migrate markets to Firestore if Firebase is enabled
if (Market.useFirebase) {
    // Run migration asynchronously
    Market.migrateMarketsToFirestore()
        .then(result => {
            if (result) {
                console.log('Markets successfully migrated to Firestore');
            }
        })
        .catch(err => {
            console.error('Error during market migration:', err);
        });
}

module.exports = Market;