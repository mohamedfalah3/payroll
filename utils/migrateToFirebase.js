const fs = require('fs').promises;
const path = require('path');
const { db } = require('../config/firebase');
const { collection, doc, setDoc } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

// List of JSON data files to migrate
const dataFiles = [
    'accounts.json',
    'banks.json',
    'bankTransactions.json',
    'hawalas.json',
    'hawalaTransactions.json',
    'markets.json'
];

async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return [];
    }
}

async function migrateData() {
    try {
        const dataPath = path.join(__dirname, '..', 'data');
        
        for (const file of dataFiles) {
            console.log(`Migrating ${file}...`);
            
            // Get collection name by removing .json extension
            const collectionName = file.replace('.json', '');
            const filePath = path.join(dataPath, file);
            
            // Read data from JSON file
            const jsonData = await readJsonFile(filePath);
            
            // Skip empty collections
            if (!jsonData || jsonData.length === 0) {
                console.log(`  - No data to migrate for ${file}`);
                continue;
            }
            
            console.log(`  - Migrating ${jsonData.length} items`);
            
            // Add each document to Firebase
            for (const item of jsonData) {
                // Ensure each item has an ID
                if (!item.id) {
                    item.id = uuidv4();
                }
                
                // Add to Firestore
                await setDoc(doc(db, collectionName, item.id), item);
                console.log(`  - Migrated item ${item.id}`);
            }
            
            console.log(`  - Migration completed for ${file}`);
        }
        
        console.log('All data migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    migrateData()
        .then(() => {
            console.log('Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateData };