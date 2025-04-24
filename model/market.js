const { BaseModel, ValidationError } = require('./base');

class Market extends BaseModel {
    static filename = 'markets.json';

    static async getMarkets() {
        return await this.readJsonFile(this.filename);
    }

    static async addMarket(marketName) {
        try {
            if (!marketName || marketName.trim().length === 0) {
                throw new ValidationError('Market name is required');
            }

            const markets = await this.getMarkets();
            const trimmedMarketName = marketName.trim();
            
            if (markets.includes(trimmedMarketName)) {
                throw new ValidationError('Market already exists');
            }

            markets.push(trimmedMarketName);
            await this.writeJsonFile(this.filename, markets);

            return trimmedMarketName;
        } catch (error) {
            console.error('Error in addMarket:', error);
            throw error;
        }
    }
}

// Initialize data file when module loads
Market.initializeDataFile(Market.filename);

module.exports = Market;