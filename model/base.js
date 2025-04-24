const fs = require('fs').promises;
const path = require('path');

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

class BaseModel {
    static dataPath = path.join(__dirname, '..', 'data');

    static async readJsonFile(filename) {
        try {
            const data = await fs.readFile(path.join(this.dataPath, filename), 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, return empty array
                return [];
            }
            console.error(`Error reading ${filename}:`, error);
            throw new Error(`Failed to read ${filename}`);
        }
    }

    static async writeJsonFile(filename, data) {
        try {
            await fs.writeFile(
                path.join(this.dataPath, filename),
                JSON.stringify(data, null, 2),
                'utf8'
            );
        } catch (error) {
            console.error(`Error writing to ${filename}:`, error);
            throw new Error(`Failed to write to ${filename}`);
        }
    }

    static async initializeDataFile(filename) {
        try {
            const filePath = path.join(this.dataPath, filename);
            try {
                await fs.access(filePath);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    await this.writeJsonFile(filename, []);
                }
            }
        } catch (error) {
            console.error(`Error initializing ${filename}:`, error);
            throw new Error(`Failed to initialize ${filename}`);
        }
    }

    static async deleteById(filename, id) {
        try {
            const items = await this.readJsonFile(filename);
            const index = items.findIndex(item => item.id === id);
            
            if (index === -1) {
                throw new ValidationError('Item not found');
            }

            items.splice(index, 1);
            await this.writeJsonFile(filename, items);
        } catch (error) {
            console.error(`Error deleting from ${filename}:`, error);
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new Error(`Failed to delete from ${filename}`);
        }
    }
}

module.exports = { BaseModel, ValidationError };