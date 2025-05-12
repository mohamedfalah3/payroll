// Check Firebase Service Account Configuration
// This script will run at startup to validate Firebase credentials

// Node.js filesystem methods to write logs
const fs = require('fs');
const path = require('path');
const util = require('util');

// Create logs directory for debugging
const logsDir = path.join(__dirname, 'logs');
try {
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir);
    }
} catch (err) {
    console.error('Failed to create logs directory:', err);
}

// Log file path
const logFile = path.join(logsDir, 'firebase-config-check.log');

// Log to both console and file
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    
    try {
        fs.appendFileSync(logFile, logMessage);
    } catch (err) {
        console.error('Failed to write to log file:', err);
    }
}

// Begin checking Firebase configuration
log('========== FIREBASE CONFIGURATION CHECK ==========');
log(`Environment: ${process.env.NODE_ENV || 'development'}`);
log(`Node.js version: ${process.version}`);

// Check if Firebase service account environment variable exists
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    log('✓ FIREBASE_SERVICE_ACCOUNT environment variable is set');
    
    // Try to parse it to ensure it's valid JSON
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        
        // Check for required fields
        const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
        const missingFields = requiredFields.filter(field => !serviceAccount[field]);
        
        if (missingFields.length === 0) {
            log('✓ FIREBASE_SERVICE_ACCOUNT contains all required fields');
            log(`✓ Project ID: ${serviceAccount.project_id}`);
            log(`✓ Client email: ${serviceAccount.client_email}`);
            
            // Check if private key is a placeholder
            if (serviceAccount.private_key === 'YOUR_PRIVATE_KEY') {
                log('✗ ERROR: private_key contains placeholder value "YOUR_PRIVATE_KEY"');
            } else {
                log('✓ Private key appears to be properly formatted');
            }
        } else {
            log(`✗ ERROR: FIREBASE_SERVICE_ACCOUNT is missing required fields: ${missingFields.join(', ')}`);
        }
    } catch (error) {
        log(`✗ ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT as JSON: ${error.message}`);
    }
} else {
    log('✗ ERROR: FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    
    // Check if local service account file exists as fallback
    try {
        const localServiceAccountPath = path.join(__dirname, 'firebase-service-account.json');
        if (fs.existsSync(localServiceAccountPath)) {
            log('✓ Local firebase-service-account.json file exists');
            
            // Check if it's valid JSON
            try {
                const localServiceAccount = JSON.parse(fs.readFileSync(localServiceAccountPath, 'utf8'));
                log('✓ Local service account file contains valid JSON');
                
                // Check for placeholder values
                if (localServiceAccount.private_key === 'YOUR_PRIVATE_KEY') {
                    log('✗ WARNING: Local service account file contains placeholder values');
                } else {
                    log('✓ Local service account file appears to be properly configured');
                }
            } catch (error) {
                log(`✗ ERROR: Failed to parse local service account file as JSON: ${error.message}`);
            }
        } else {
            log('✗ ERROR: Local firebase-service-account.json file does not exist');
        }
    } catch (error) {
        log(`✗ ERROR: Failed to check for local service account file: ${error.message}`);
    }
}

log('============= CONFIGURATION CHECK COMPLETE =============');
