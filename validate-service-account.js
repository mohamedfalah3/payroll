// Service Account Validator
// This script validates a Firebase service account JSON file without displaying sensitive information

const fs = require('fs');
const path = require('path');

// Function to validate a service account
function validateServiceAccount(serviceAccountPath) {
  console.log(`\n========== FIREBASE SERVICE ACCOUNT VALIDATOR ==========`);
  console.log(`Checking service account file: ${serviceAccountPath}`);
  
  try {
    // Check if the file exists
    if (!fs.existsSync(serviceAccountPath)) {
      console.log('❌ ERROR: Service account file does not exist.');
      return false;
    }
    
    // Try to parse the file
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    // Check required fields
    const requiredFields = [
      'type', 'project_id', 'private_key_id', 'private_key',
      'client_email', 'client_id', 'auth_uri', 'token_uri'
    ];
    
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);
    
    if (missingFields.length > 0) {
      console.log(`❌ ERROR: Missing required fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    // Check for placeholder values
    if (serviceAccount.type !== 'service_account') {
      console.log('❌ ERROR: Invalid "type" value. Must be "service_account".');
      return false;
    }
    
    if (serviceAccount.private_key === 'YOUR_PRIVATE_KEY' || 
        !serviceAccount.private_key.includes('BEGIN PRIVATE KEY')) {
      console.log('❌ ERROR: Private key contains placeholder or invalid value.');
      return false;
    }
    
    if (serviceAccount.private_key_id === 'YOUR_PRIVATE_KEY_ID') {
      console.log('❌ ERROR: Private key ID contains placeholder value.');
      return false;
    }
    
    if (serviceAccount.client_id === 'YOUR_CLIENT_ID') {
      console.log('❌ ERROR: Client ID contains placeholder value.');
      return false;
    }
    
    // Validate project_id format
    if (!/^[a-z0-9-]+$/.test(serviceAccount.project_id)) {
      console.log('❌ ERROR: Invalid project_id format.');
      return false;
    }
    
    // Validate client_email format
    if (!serviceAccount.client_email.includes('@') || 
        !serviceAccount.client_email.endsWith('.gserviceaccount.com')) {
      console.log('❌ ERROR: Invalid client_email format.');
      return false;
    }
    
    // All checks pass
    console.log('✅ SUCCESS: Service account file appears valid.');
    console.log('📋 Service account details:');
    console.log(`   - Project ID: ${serviceAccount.project_id}`);
    console.log(`   - Client Email: ${serviceAccount.client_email}`);
    console.log(`   - Private Key ID: ${serviceAccount.private_key_id.substring(0, 4)}...`); // Show only first few characters
    console.log(`   - Private Key: Valid`);
    
    return true;
    
  } catch (error) {
    console.log(`❌ ERROR: Failed to parse service account file: ${error.message}`);
    return false;
  } finally {
    console.log(`========== VALIDATION COMPLETE ==========\n`);
  }
}

// Path to service account
const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

// Validate
const isValid = validateServiceAccount(serviceAccountPath);

if (!isValid) {
  console.log('\nIMPORTANT: Your Firebase service account is invalid or contains placeholder values.');
  console.log('Please follow these steps to fix the issue:');
  console.log('1. Go to Firebase Console (https://console.firebase.google.com)');
  console.log('2. Select your project: money-transfering');
  console.log('3. Go to Project Settings > Service accounts');
  console.log('4. Click "Generate new private key"');
  console.log('5. Save the downloaded file as "firebase-service-account.json" in your project root');
  console.log('\nFor detailed instructions, see FIREBASE-SERVICE-ACCOUNT-SETUP.md\n');
}

module.exports = { validateServiceAccount };
