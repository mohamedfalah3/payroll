const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Firebase Authentication deployment configuration
const FIREBASE_AUTH_ENABLED = true;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

// Log with color
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Execute command and return output
function execute(command) {
  log(`Executing: ${colors.yellow}${command}`, colors.cyan);
  try {
    const output = execSync(command, { stdio: 'inherit' });
    return output;
  } catch (error) {
    log(`Error executing command: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Create readline interface for user input
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Prompt user for input
async function prompt(question) {
  const rl = createReadlineInterface();
  return new Promise(resolve => {
    rl.question(`${colors.cyan}${question}${colors.reset}`, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// Main deployment function
async function deploy() {
  log('🚀 Starting deployment process...', colors.bright + colors.cyan);

  try {
    // Step 1: Check if Firebase CLI is installed
    try {
      execSync('firebase --version', { stdio: 'ignore' });
      log('✅ Firebase CLI is installed', colors.green);
    } catch (error) {
      log('❌ Firebase CLI is not installed. Installing now...', colors.yellow);
      execute('npm install -g firebase-tools');
    }

    // Step 2: Check if Vercel CLI is installed
    try {
      execSync('vercel --version', { stdio: 'ignore' });
      log('✅ Vercel CLI is installed', colors.green);
    } catch (error) {
      log('❌ Vercel CLI is not installed. Installing now...', colors.yellow);
      execute('npm install -g vercel');
    }

    // Step 3: Deploy backend to Vercel
    log('\n📤 Deploying backend to Vercel...', colors.bright + colors.cyan);
    
    // Check if user is logged into Vercel
    try {
      execSync('vercel whoami', { stdio: 'ignore' });
      log('✅ Already logged into Vercel', colors.green);
    } catch (error) {
      log('⚠️ Please log into Vercel:', colors.yellow);
      execute('vercel login');
    }

    // Deploy to Vercel
    log('🚀 Deploying to Vercel...', colors.cyan);
    execute('vercel --prod');
    
    // Get deployment URL from user
    const vercelUrl = await prompt('Please enter your Vercel deployment URL (e.g., https://your-app.vercel.app): ');
    if (!vercelUrl || !vercelUrl.startsWith('https://')) {
      throw new Error('Invalid Vercel URL. Please provide a valid URL starting with https://');
    }
    
    log(`✅ Using Vercel URL: ${vercelUrl}`, colors.green);
    
    // Step 4: Prepare Firebase hosting files
    log('\n📦 Preparing Firebase hosting files...', colors.bright + colors.cyan);
    execute('npm run prepare:firebase');
    
    // Step 5: Update index.html with Vercel URL
    log('\n🔄 Updating Firebase hosting files with Vercel URL...', colors.bright + colors.cyan);
    const indexHtmlPath = path.join(__dirname, 'firebase-public', 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
      let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
      indexHtml = indexHtml.replace('https://[YOUR-VERCEL-URL].vercel.app', vercelUrl);
      fs.writeFileSync(indexHtmlPath, indexHtml);
      log('✅ Updated index.html with Vercel URL', colors.green);
    } else {
      log('⚠️ Could not find index.html in firebase-public directory', colors.yellow);
    }
    
    // Update firebase.json with Vercel URL
    const firebaseJsonPath = path.join(__dirname, 'firebase.json');
    if (fs.existsSync(firebaseJsonPath)) {
      const firebaseJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
      if (firebaseJson.hosting && firebaseJson.hosting.rewrites && firebaseJson.hosting.rewrites.length > 0) {
        firebaseJson.hosting.rewrites[0].destination = vercelUrl;
        fs.writeFileSync(firebaseJsonPath, JSON.stringify(firebaseJson, null, 2));
        log('✅ Updated firebase.json with Vercel URL', colors.green);
      }
    }

    // Step 6: Deploy frontend to Firebase
    log('\n📤 Deploying frontend to Firebase...', colors.bright + colors.cyan);
    
    // Check if user is logged into Firebase
    try {
      execSync('firebase projects:list', { stdio: 'ignore' });
      log('✅ Already logged into Firebase', colors.green);
    } catch (error) {
      log('⚠️ Please log into Firebase:', colors.yellow);
      execute('firebase login');
    }

    // Deploy to Firebase
    log('🚀 Deploying to Firebase...', colors.cyan);
    execute('firebase deploy --only hosting');

    log('\n✅ Deployment complete!', colors.bright + colors.green);
    log(`🌐 Frontend: https://money-transfering.firebaseapp.com`, colors.cyan);
    log(`🌐 Backend: ${vercelUrl}`, colors.cyan);
    
    log('\n⚠️ Important Notes:', colors.yellow);
    log('1. Make sure your backend CORS settings allow requests from your Firebase domain.', colors.reset);
    log('2. If authentication doesn\'t work, check session cookie settings for cross-domain use.', colors.reset);
    log('3. To update only the frontend: npm run deploy:firebase', colors.reset);
    log('4. To update only the backend: npm run deploy:vercel', colors.reset);

  } catch (error) {
    log(`❌ Deployment failed: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run the deployment
deploy();

