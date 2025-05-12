const { execSync } = require('child_process');

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

// Main setup function
async function setup() {
  log('🚀 Starting setup process...', colors.bright + colors.cyan);

  try {
    // Step 1: Install Firebase CLI
    log('\n🔥 Installing Firebase CLI...', colors.bright + colors.cyan);
    try {
      execSync('firebase --version', { stdio: 'ignore' });
      log('✅ Firebase CLI is already installed', colors.green);
    } catch (error) {
      execute('npm install -g firebase-tools');
      log('✅ Firebase CLI successfully installed', colors.green);
    }

    // Step 2: Install Vercel CLI
    log('\n🚀 Installing Vercel CLI...', colors.bright + colors.cyan);
    try {
      execSync('vercel --version', { stdio: 'ignore' });
      log('✅ Vercel CLI is already installed', colors.green);
    } catch (error) {
      execute('npm install -g vercel');
      log('✅ Vercel CLI successfully installed', colors.green);
    }

    // Step 3: Login to Firebase
    log('\n🔥 Setting up Firebase...', colors.bright + colors.cyan);
    log('Please log in to Firebase:');
    execute('firebase login');

    // Initialize Firebase project
    log('Initializing Firebase project...');
    execute('firebase use --add money-transfering');

    // Step 4: Login to Vercel
    log('\n🚀 Setting up Vercel...', colors.bright + colors.cyan);
    log('Please log in to Vercel:');
    execute('vercel login');

    // Step 5: Add deployment scripts to package.json
    log('\n📝 Adding deployment scripts to package.json...', colors.bright + colors.cyan);
    execute('npm pkg set scripts.deploy="node deploy.js"');
    execute('npm pkg set scripts.deploy:firebase="firebase deploy --only hosting"');
    execute('npm pkg set scripts.deploy:vercel="vercel --prod"');
    
    log('\n✅ Setup complete!', colors.bright + colors.green);
    log('\n📋 Next Steps:', colors.bright + colors.cyan);
    log('1. Update the vercel.json and firebase.json files with your specific configuration if needed.');
    log('2. Run `npm run deploy` to deploy both frontend and backend.');
    log('3. Alternatively, run `npm run deploy:firebase` to deploy only the frontend or `npm run deploy:vercel` for only the backend.');

  } catch (error) {
    log(`❌ Setup failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Run the setup
setup();
