#!/bin/bash
# Deployment script for Firebase and Vercel

echo "========== Starting Deployment Process =========="

# Variables
PROJECT_ROOT=$(pwd)
FIREBASE_PUBLIC="firebase-public"
VERCEL_API_DIR=".vercel/output/functions/index.func"

# Check for necessary tools
echo "Checking for required tools..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js and try again."
    exit 1
fi

# Check for Firebase CLI
if ! command -v firebase &> /dev/null; then
    echo "Firebase CLI is not installed. Installing..."
    npm install -g firebase-tools
fi

# Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI is not installed. Installing..."
    npm install -g vercel
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Check for Firebase service account file
if [ ! -f "./firebase-service-account.json" ]; then
    echo "Warning: firebase-service-account.json file not found."
    echo "Please make sure to create this file with valid Firebase Admin SDK credentials before deployment."
fi

# Create production build and prepare for deployment
echo "Creating production build..."

# Prepare for Firebase Hosting (frontend)
echo "Preparing Firebase hosting files..."

# Create Firebase public directory if it doesn't exist
mkdir -p $FIREBASE_PUBLIC

# Copy static files and views
cp -r public/* $FIREBASE_PUBLIC/
echo "Copied public assets to Firebase hosting directory"

# Create Firebase hosting configuration if it doesn't exist
if [ ! -f "./firebase.json" ]; then
    echo "Creating Firebase configuration files..."
    cat > firebase.json <<EOL
{
  "hosting": {
    "public": "${FIREBASE_PUBLIC}",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
EOL

    cat > .firebaserc <<EOL
{
  "projects": {
    "default": "money-transfering"
  }
}
EOL

    echo "Firebase configuration created"
fi

# Create a simple index.html for Firebase hosting that redirects to backend
cat > $FIREBASE_PUBLIC/index.html <<EOL
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payroll System</title>
  <script>
    // Redirect to backend
    window.location.href = '${VERCEL_URL}';
  </script>
</head>
<body>
  <h1>Redirecting to Payroll System...</h1>
  <p>If you are not redirected automatically, <a href="${VERCEL_URL}">click here</a>.</p>
</body>
</html>
EOL

echo "Firebase hosting files ready"

# Prepare for Vercel deployment (backend)
echo "Preparing Vercel deployment files..."

# Create or update vercel.json if it doesn't exist
if [ ! -f "./vercel.json" ]; then
    cat > vercel.json <<EOL
{
  "version": 2,
  "builds": [
    {
      "src": "app.js",
      "use": "@vercel/node",
      "config": {
        "includeFiles": [
          "firebase-service-account.json",
          "views/**",
          "config/**",
          "middleware/**",
          "controller/**",
          "model/**"
        ]
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
EOL
    echo "Vercel configuration created"
fi

# Deploy to Firebase
echo "Deploying to Firebase Hosting..."
firebase deploy --only hosting

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel --prod

echo "========== Deployment Complete =========="
echo ""
echo "Your application has been deployed:"
echo "Frontend: https://money-transfering.web.app"
echo "Backend: Check the Vercel deployment URL above"
echo ""
echo "Don't forget to set these environment variables in your Vercel project:"
echo "- FIREBASE_SERVICE_ACCOUNT: contains the JSON content of your firebase-service-account.json file"
echo ""
echo "To view your deployments, visit:"
echo "Firebase: https://console.firebase.google.com/project/money-transfering/hosting"
echo "Vercel: https://vercel.com/dashboard"

