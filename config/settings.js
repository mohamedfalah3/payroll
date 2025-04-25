/**
 * Application Settings
 * 
 * This file contains global settings for the application.
 * Firebase Firestore is now used by default for data storage.
 */

module.exports = {
    // Set to true to use Firebase Firestore, false to use local JSON files
    useFirebase: true,
    
    // Firebase collection prefix (optional)
    firebasePrefix: 'payroll',
    
    // Other application settings
    defaultCurrency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    
    // Logging settings
    enableDetailedLogs: true
};