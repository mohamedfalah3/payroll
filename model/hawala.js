const { BaseModel, ValidationError } = require('./base');
const { v4: uuidv4 } = require('uuid');

class Hawala extends BaseModel {
    constructor() {
        super();
        this.hawalasFile = 'hawalas.json';
        this.constructor.initializeDataFile(this.hawalasFile);
    }

    async getAllHawalas() {
        try {
            const hawalas = await this.constructor.getData(this.hawalasFile);
            return hawalas || [];
        } catch (error) {
            console.error('Error reading hawalas:', error);
            return [];
        }
    }

    async getHawalaById(id) {
        if (!id) {
            return null;
        }
        
        try {
            return await this.constructor.getById(this.hawalasFile, id);
        } catch (error) {
            console.error(`Error getting hawala with ID ${id}:`, error);
            return null;
        }
    }

    async addHawala(hawalaData) {
        if (!hawalaData || !hawalaData.name) {
            return { success: false, message: 'Hawala name is required' };
        }

        try {
            const hawalas = await this.getAllHawalas();
            
            // Validate hawala data
            this.validateHawalaData(hawalaData);
            
            // Check if hawala exists
            const existingHawala = hawalas.find(hawala => 
                hawala && hawala.name && hawala.name.toLowerCase() === hawalaData.name.toLowerCase()
            );
            
            if (existingHawala) {
                return { success: false, message: 'Hawala already exists' };
            }

            // Create new hawala with ID for Firestore
            const newHawala = {
                id: uuidv4(),
                name: hawalaData.name,
                location: hawalaData.location || '',
                description: hawalaData.description || '',
                balance: 0,
                createdAt: new Date().toISOString()
            };
            
            // Handle array of objects for Firestore compatibility
            if (this.constructor.useFirebase) {
                await this.constructor.addFirebaseDoc(
                    this.constructor.getCollectionName(this.hawalasFile),
                    newHawala
                );
            } else {
                hawalas.push(newHawala);
                await this.constructor.writeJsonFile(this.hawalasFile, hawalas);
            }
            
            return { 
                success: true, 
                message: 'Hawala added successfully',
                hawala: newHawala
            };
        } catch (error) {
            console.error('Error adding hawala:', error);
            return { 
                success: false, 
                message: error instanceof ValidationError ? error.message : 'Failed to add hawala' 
            };
        }
    }

    validateHawalaData(data) {
        if (!data) {
            throw new ValidationError('Hawala data is required');
        }
        
        if (!data.name || typeof data.name !== 'string') {
            throw new ValidationError('Hawala name is required and must be a string');
        }
        
        if (data.location && typeof data.location !== 'string') {
            throw new ValidationError('Hawala location must be a string if provided');
        }
        
        if (data.description && typeof data.description !== 'string') {
            throw new ValidationError('Hawala description must be a string if provided');
        }
    }

    async updateHawala(id, hawalaData) {
        if (!id || !hawalaData) {
            return { success: false, message: 'Hawala ID and data are required' };
        }

        try {
            // Only validate fields that are being updated
            if (hawalaData.name && typeof hawalaData.name !== 'string') {
                throw new ValidationError('Hawala name must be a string');
            }
            
            if (hawalaData.location && typeof hawalaData.location !== 'string') {
                throw new ValidationError('Hawala location must be a string');
            }
            
            if (hawalaData.description && typeof hawalaData.description !== 'string') {
                throw new ValidationError('Hawala description must be a string');
            }

            if (this.constructor.useFirebase) {
                const updatedHawala = await this.constructor.updateFirebaseDoc(
                    this.constructor.getCollectionName(this.hawalasFile),
                    id,
                    hawalaData
                );
                
                return updatedHawala ? 
                    { success: true, message: 'Hawala updated successfully', hawala: updatedHawala } :
                    { success: false, message: 'Failed to update hawala' };
            } else {
                const hawalas = await this.getAllHawalas();
                const hawalaIndex = hawalas.findIndex(hawala => hawala && hawala.id === id);
                
                if (hawalaIndex === -1) {
                    return { success: false, message: 'Hawala not found' };
                }
                
                hawalas[hawalaIndex] = { ...hawalas[hawalaIndex], ...hawalaData };
                await this.constructor.writeJsonFile(this.hawalasFile, hawalas);
                
                return { 
                    success: true, 
                    message: 'Hawala updated successfully',
                    hawala: hawalas[hawalaIndex]
                };
            }
        } catch (error) {
            console.error(`Error updating hawala ${id}:`, error);
            return { 
                success: false, 
                message: error instanceof ValidationError ? error.message : 'Failed to update hawala' 
            };
        }
    }

    async deleteHawala(id) {
        if (!id) {
            return { success: false, message: 'Hawala ID is required' };
        }

        try {
            await this.constructor.deleteById(this.hawalasFile, id);
            return { success: true, message: 'Hawala deleted successfully' };
        } catch (error) {
            console.error(`Error deleting hawala ${id}:`, error);
            return { success: false, message: error.message || 'Failed to delete hawala' };
        }
    }
}

module.exports = new Hawala();