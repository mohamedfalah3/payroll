// Migrate hardcoded users to Firebase Authentication
const { getAuth, createUser } = require('firebase-admin/auth');
const { db } = require('../config/firebase');
const { doc, setDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Reference to old auth middleware to get hardcoded users
const oldAuth = require('../middleware/auth');

// Role permissions mapping
const rolePermissions = {
    admin: ['bank', 'hawala', 'add-market', 'add-bank', 'add-account'],
    'bank-manager': ['bank'],
    'hawala-manager': ['hawala'],
    'data-entry': ['add-market', 'add-bank', 'add-account'],
    'bank-hawala-manager': ['bank', 'hawala']
};

// Helper function to determine role based on permissions
function getRoleFromPermissions(permissions) {
    if (!permissions || !Array.isArray(permissions)) return 'user';
    
    // Check if permissions match a specific role
    for (const [role, rolePerms] of Object.entries(rolePermissions)) {
        // Check if arrays are the same (ignoring order)
        const samePerms = 
            permissions.length === rolePerms.length && 
            permissions.every(p => rolePerms.includes(p)) &&
            rolePerms.every(p => permissions.includes(p));
        
        if (samePerms) return role;
    }
    
    // If permissions don't match any role exactly
    if (permissions.includes('bank') && permissions.includes('hawala')) {
        return 'bank-hawala-manager';
    } else if (permissions.includes('bank')) {
        return 'bank-manager';
    } else if (permissions.includes('hawala')) {
        return 'hawala-manager';
    } else if (permissions.some(p => p.startsWith('add-'))) {
        return 'data-entry';
    }
    
    // Default role
    return 'user';
}

// Function to generate a random password
function generateSecurePassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let password = '';
    
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    
    return password;
}

// Migration function
async function migrateUsers() {
    try {
        console.log('Starting user migration to Firebase Authentication...');
        
        // Get users from old authentication system
        const users = oldAuth.users;
        if (!users || users.length === 0) {
            console.log('No users found in old authentication system.');
            return;
        }
        
        console.log(`Found ${users.length} users to migrate.`);
        
        // Keep track of created users for reporting
        const createdUsers = [];
        const errors = [];
        
        // Process each user
        for (const user of users) {
            try {
                const email = `${user.username}@example.com`; // Create dummy email
                const password = generateSecurePassword();
                const role = getRoleFromPermissions(user.permissions);
                
                console.log(`Migrating user: ${user.username} (${email})`);
                
                // Create user in Firebase Authentication
                const userRecord = await getAuth().createUser({
                    email,
                    password,
                    displayName: user.username,
                    disabled: false
                });
                
                // Store user data in Firestore
                await setDoc(doc(db, 'users', userRecord.uid), {
                    email,
                    username: user.username,
                    role,
                    permissions: user.permissions || rolePermissions[role] || []
                });
                
                createdUsers.push({
                    username: user.username,
                    email,
                    password,
                    role,
                    uid: userRecord.uid,
                    permissions: user.permissions || rolePermissions[role] || []
                });
                
                console.log(`Created user with UID: ${userRecord.uid}`);
                
            } catch (error) {
                console.error(`Error creating user ${user.username}:`, error);
                errors.push({
                    username: user.username,
                    error: error.message
                });
            }
        }
        
        // Write results to a file for reference
        const result = {
            createdUsers,
            errors,
            timestamp: new Date().toISOString()
        };
        
        const resultFilePath = path.join(__dirname, 'user-migration-results.json');
        fs.writeFileSync(resultFilePath, JSON.stringify(result, null, 2));
        
        console.log(`Migration completed. Created ${createdUsers.length} users with ${errors.length} errors.`);
        console.log(`Results saved to: ${resultFilePath}`);
        
        // Additional instructions
        console.log('\nIMPORTANT:');
        console.log('1. The generated passwords are random and saved in the result file.');
        console.log('2. Users will need to reset their passwords on first login.');
        console.log('3. You should implement a password reset flow for users.');
        
    } catch (error) {
        console.error('User migration failed:', error);
        throw error;
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    migrateUsers()
        .then(() => {
            console.log('User migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('User migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateUsers };
