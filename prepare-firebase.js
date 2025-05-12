const fs = require('fs');
const path = require('path');
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

function copyDirectory(source, destination) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  // Get all files/folders in the source directory
  const entries = fs.readdirSync(source, { withFileTypes: true });

  // Process each entry
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    // If directory, recursively copy its contents
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } 
    // If file, copy it
    else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

// Main function to prepare Firebase hosting
async function prepareFirebaseHosting() {
  try {
    log('🔄 Preparing Firebase hosting files...', colors.bright + colors.cyan);

    // Create firebase-public directory if it doesn't exist
    const firebasePublicDir = path.join(__dirname, 'firebase-public');
    if (fs.existsSync(firebasePublicDir)) {
      log('🗑️ Cleaning existing firebase-public directory...', colors.yellow);
      fs.rmSync(firebasePublicDir, { recursive: true, force: true });
    }
    fs.mkdirSync(firebasePublicDir, { recursive: true });
    log('✅ Created firebase-public directory', colors.green);

    // Copy static assets from public directory
    const publicDir = path.join(__dirname, 'public');
    log('📂 Copying static assets from public directory...', colors.cyan);
    copyDirectory(publicDir, firebasePublicDir);
    log('✅ Copied static assets', colors.green);    // Create index.html with redirect logic and Firebase Auth
    log('📝 Creating index.html with redirect to Vercel backend...', colors.cyan);
    const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payroll System</title>
    <!-- Firebase SDK -->
    <script src="https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js" type="module"></script>
    <script src="https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js" type="module"></script>
    <script type="module">
        // Firebase configuration
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
        import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
        
        const firebaseConfig = {
          apiKey: "AIzaSyA8BfGknaD7K8cualdLXq7aBBVtWWbxlgo",
          authDomain: "money-transfering.firebaseapp.com",
          projectId: "money-transfering",
          storageBucket: "money-transfering.firebasestorage.app",
          messagingSenderId: "1090188586001",
          appId: "1:1090188586001:web:a16689b5b9f7e73e2f95b0",
          measurementId: "G-FKEDK8EEX4"
        };
        
        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        
        // Check if user is logged in
        onAuthStateChanged(auth, (user) => {
          if (user) {
            // User is signed in, redirect to Vercel backend
            window.location.href = "https://[YOUR-VERCEL-URL].vercel.app";
          } else {
            // No user is signed in, redirect to login page
            window.location.href = "https://[YOUR-VERCEL-URL].vercel.app/login";
          }
        });
    </script>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
        }
        .loading {
            text-align: center;
        }
        .loading h1 {
            color: #0d9488;
            margin-bottom: 20px;
        }
        .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border-left-color: #0d9488;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loading">
        <h1>Payroll System</h1>
        <div class="spinner"></div>
        <p>Loading application...</p>
    </div>
</body>
</html>
    `;

    fs.writeFileSync(path.join(firebasePublicDir, 'index.html'), indexHtml);
    log('✅ Created index.html', colors.green);
    
    // Create 404.html
    log('📝 Creating 404.html...', colors.cyan);
    const notFoundHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found - Payroll System</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
            color: #333;
        }
        .not-found {
            text-align: center;
            max-width: 500px;
            padding: 40px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .not-found h1 {
            color: #ef4444;
            margin-bottom: 20px;
        }
        .not-found p {
            margin-bottom: 30px;
            font-size: 16px;
            line-height: 1.6;
        }
        .not-found a {
            display: inline-block;
            background-color: #0d9488;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 5px;
            font-weight: 600;
        }
        .not-found a:hover {
            background-color: #0f766e;
        }
        .icon {
            font-size: 60px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="not-found">
        <div class="icon">😕</div>
        <h1>404 - Page Not Found</h1>
        <p>The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>
        <a href="/">Go to Homepage</a>
    </div>
</body>
</html>
    `;
    fs.writeFileSync(path.join(firebasePublicDir, '404.html'), notFoundHtml);
    log('✅ Created 404.html', colors.green);
    
    // Update firebase.json to use firebase-public
    log('📝 Updating firebase.json to use firebase-public directory...', colors.cyan);
    const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase.json'), 'utf8'));
    firebaseConfig.hosting.public = 'firebase-public';
    fs.writeFileSync(path.join(__dirname, 'firebase.json'), JSON.stringify(firebaseConfig, null, 2));
    log('✅ Updated firebase.json', colors.green);
    
    log('\n✅ Firebase hosting files prepared successfully!', colors.bright + colors.green);
    log('Next steps:', colors.bright);
    log('1. Update the Vercel URL in firebase-public/index.html', colors.reset);
    log('2. Run "npm run deploy:firebase" to deploy to Firebase Hosting', colors.reset);
    
  } catch (error) {
    log(`❌ Error preparing Firebase hosting files: ${error.message}`, colors.red);
    console.error(error);
  }
}

// Run the function
prepareFirebaseHosting();
