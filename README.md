# Payroll System with Firebase Authentication

This application uses a modern split deployment architecture with Firebase Authentication:
- **Frontend**: Static assets hosted on **Firebase Hosting** (optimized global CDN)
- **Backend**: Express.js API hosted on **Vercel** (serverless Node.js environment)
- **Authentication**: Firebase Authentication with role-based access control

## 🚀 Quick Start

### Prerequisites

- Node.js 14.x or higher
- npm 6.x or higher
- Firebase account with:
  - Firebase Authentication enabled (Email/Password provider)
  - Firestore database created
  - Firebase Admin SDK service account
- Vercel account

### Initial Setup

To set up the deployment environment:

```powershell
npm run setup
```

This will:
1. Install the Firebase CLI globally
2. Install the Vercel CLI globally
3. Guide you through login for both services
4. Configure your project for deployment

### Local Development

Run the application in development mode:

```powershell
npm run dev
```

## 🔐 Firebase Authentication Setup

### 1. Firebase Project Configuration

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project or create a new one
3. Enable **Authentication** from the left sidebar
4. Set up the **Email/Password** sign-in method
5. Create your first admin user through the Authentication panel

### 2. Firestore User Database

Create a `users` collection in Firestore with documents for each user:

```
users/
  ├── USER_UID_1/
  │   ├── email: "user@example.com"
  │   ├── role: "admin"
  │   └── permissions: ["bank", "hawala", "add-market", "add-bank", "add-account"]
  └── USER_UID_2/
      ├── email: "user2@example.com"
      ├── role: "bank-manager"
      └── permissions: ["bank"]
```

Available roles and their default permissions:
- `admin`: Full access to all features
- `bank-manager`: Access to bank management
- `hawala-manager`: Access to hawala management
- `data-entry`: Access to add markets, banks, and accounts
- `bank-hawala-manager`: Access to both bank and hawala systems

### 3. Service Account Setup

1. Go to Project Settings > Service accounts in your Firebase project
2. Generate a new private key
3. Rename the downloaded file to `firebase-service-account.json`
4. Place this file in the project root
5. For production, set this as an environment variable in Vercel:
   ```
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
   ```

## 📤 Deployment

### Complete Deployment (Frontend + Backend)

```powershell
npm run deploy
```

This interactive script will:
1. Deploy your backend to Vercel
2. Ask for the Vercel deployment URL
3. Prepare static files for Firebase Hosting
4. Update configuration with your Vercel URL
5. Deploy the frontend to Firebase Hosting

### Deploy Only Frontend

```powershell
npm run deploy:firebase
```

### Deploy Only Backend

```powershell
npm run deploy:vercel
```

## 🔧 Configuration Files

The deployment process uses several key configuration files:

- `firebase.json` - Firebase Hosting settings including rewrites to Vercel
- `vercel.json` - Vercel deployment configuration for Express.js
- `deploy.js` - Unified deployment script
- `setup.js` - Environment setup script
- `prepare-firebase.js` - Script to prepare files for Firebase Hosting
- `.env.production.json` - Production environment configuration

## 📚 Detailed Documentation

For comprehensive deployment instructions, see our detailed guides:
- [FIREBASE-VERCEL-DEPLOYMENT.md](FIREBASE-VERCEL-DEPLOYMENT.md) - Step-by-step hosting instructions
- [DEPLOYMENT.md](DEPLOYMENT.md) - General deployment information

## 🔑 Environment Variables

When deploying to Vercel, the following environment variables are configured:
- `NODE_ENV`: Set to `production`
- Firebase configuration
- Session secrets 
- CORS settings

## 🛠️ Firebase Project

This application uses the Firebase project `money-transfering` for:
- Frontend hosting
- Authentication
- Firestore database

## ⚠️ Important Notes

1. The frontend and backend are configured to work together but are hosted separately
2. CORS is properly configured to allow communication between Firebase and Vercel
3. Session management is configured for cross-origin authentication

## 🔍 Troubleshooting

If you encounter issues with deployment:

1. Verify Firebase and Vercel credentials with `firebase login` and `vercel login`
2. Check CORS configuration in `app.js` 
3. Review the Firebase and Vercel console logs for errors
4. Ensure environment variables are properly set in Vercel

## 📋 Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run start` | Start the application in production mode |
| `npm run dev` | Start the application in development mode |
| `npm run setup` | Install and configure deployment tools |
| `npm run deploy` | Deploy the full application (both frontend and backend) |
| `npm run prepare:firebase` | Prepare files for Firebase Hosting |
| `npm run deploy:firebase` | Deploy only the frontend to Firebase |
| `npm run deploy:vercel` | Deploy only the backend to Vercel |
