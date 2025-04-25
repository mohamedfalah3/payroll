const fs = require('fs').promises;
const path = require('path');
const { db } = require('../config/firebase');
const { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, where, getDoc } = require('firebase/firestore');
const settings = require('../config/settings');

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

class BaseModel {
    static dataPath = path.join(__dirname, '..', 'data');
    static useFirebase = settings.useFirebase; // Use the setting from config file

    static async readJsonFile(filename) {
        try {
            const data = await fs.readFile(path.join(this.dataPath, filename), 'utf8');
            return JSON.parse(data || '[]');
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
                JSON.stringify(data || [], null, 2),
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
        if (!id) {
            throw new ValidationError('ID is required for deletion');
        }

        if (this.useFirebase) {
            return this.deleteFirebaseDoc(this.getCollectionName(filename), id);
        }
        
        try {
            const items = await this.readJsonFile(filename);
            const index = items.findIndex(item => item && item.id === id);
            
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
    
    // Firebase methods
    
    static getCollectionName(filename) {
        if (!filename) return '';
        
        // Convert filename like 'accounts.json' to 'accounts'
        const baseName = path.basename(filename, '.json');
        // Add prefix if specified in settings
        return settings.firebasePrefix ? `${settings.firebasePrefix}_${baseName}` : baseName;
    }
    
    static async getFirebaseCollection(collectionName) {
        if (!collectionName || !db) {
            console.error('Invalid collection name or Firestore not initialized');
            return [];
        }

        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            const data = [];
            querySnapshot.forEach((docSnapshot) => {
                if (docSnapshot.exists()) {
                    data.push({ id: docSnapshot.id, ...docSnapshot.data() });
                }
            });
            return data;
        } catch (error) {
            console.error(`Error getting Firebase collection ${collectionName}:`, error);
            return [];
        }
    }
    
    static async getFirebaseDocById(collectionName, id) {
        if (!collectionName || !id || !db) {
            console.error('Invalid collection name or ID, or Firestore not initialized');
            return null;
        }

        try {
            const docRef = doc(db, collectionName, id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                return null;
            }
        } catch (error) {
            console.error(`Error getting Firebase document from ${collectionName}:`, error);
            return null;
        }
    }
    
    static async addFirebaseDoc(collectionName, data) {
        if (!collectionName || !data || !db) {
            console.error('Invalid collection name or data, or Firestore not initialized');
            return null;
        }

        try {
            if (!data.id) {
                throw new Error('ID is required for Firebase documents');
            }
            
            const cleanData = this.sanitizeData(data);
            await setDoc(doc(db, collectionName, data.id), cleanData);
            return data;
        } catch (error) {
            console.error(`Error adding Firebase document to ${collectionName}:`, error);
            return null;
        }
    }
    
    static async updateFirebaseDoc(collectionName, id, data) {
        if (!collectionName || !id || !data || !db) {
            console.error('Invalid parameters for updateFirebaseDoc');
            return null;
        }

        try {
            const docRef = doc(db, collectionName, id);
            const cleanData = this.sanitizeData(data);
            await updateDoc(docRef, cleanData);
            return { id, ...cleanData };
        } catch (error) {
            console.error(`Error updating Firebase document in ${collectionName}:`, error);
            return null;
        }
    }
    
    static async deleteFirebaseDoc(collectionName, id) {
        if (!collectionName || !id || !db) {
            console.error('Invalid parameters for deleteFirebaseDoc');
            return false;
        }

        try {
            await deleteDoc(doc(db, collectionName, id));
            return true;
        } catch (error) {
            console.error(`Error deleting Firebase document from ${collectionName}:`, error);
            return false;
        }
    }
    
    // Sanitize data before sending to Firestore
    static sanitizeData(data) {
        if (!data) return {};
        
        const cleanData = { ...data };
        
        // Remove undefined values which Firestore doesn't support
        Object.keys(cleanData).forEach(key => {
            if (cleanData[key] === undefined) {
                cleanData[key] = null;
            }
        });
        
        return cleanData;
    }
    
    static async getData(filename) {
        if (!filename) {
            console.error('Filename is required');
            return [];
        }
        
        if (this.useFirebase) {
            return this.getFirebaseCollection(this.getCollectionName(filename));
        } else {
            return this.readJsonFile(filename);
        }
    }
    
    static async getById(filename, id) {
        if (!filename || !id) {
            console.error('Filename and ID are required');
            return null;
        }
        
        if (this.useFirebase) {
            return this.getFirebaseDocById(this.getCollectionName(filename), id);
        } else {
            const items = await this.readJsonFile(filename);
            return items.find(item => item && item.id === id) || null;
        }
    }
    
    static async saveData(filename, data) {
        if (!filename) {
            console.error('Filename is required');
            return [];
        }
        
        const safeData = Array.isArray(data) ? data : [];
        
        if (this.useFirebase) {
            const collectionName = this.getCollectionName(filename);
            
            // Add all new data
            for (const item of safeData) {
                if (item && item.id) {
                    await this.addFirebaseDoc(collectionName, item);
                }
            }
            
            return safeData;
        } else {
            await this.writeJsonFile(filename, safeData);
            return safeData;
        }
    }
}

module.exports = { BaseModel, ValidationError };