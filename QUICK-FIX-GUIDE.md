# Firebase Service Account Quick Fix

This guide provides a quick solution to fix your Firebase service account issue.

## Current Issue
Your Firebase Admin SDK is failing to initialize because your `firebase-service-account.json` file contains placeholder values instead of actual credentials.

## Quick Fix Instructions

1. **Generate a New Service Account**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project: `money-transfering`
   - Click the gear icon ⚙️ to access Project settings
   - Go to the "Service accounts" tab
   - Click "Generate new private key"
   - Save the downloaded JSON file

2. **Run Our Setup Script**:
   ```powershell
   npm run setup:firebase-credentials
   ```
   - When prompted, provide the path to the downloaded service account file
   - The script will:
     - Validate the service account file
     - Copy it to your project root
     - Prepare a version for Vercel deployment
     - Test the configuration

3. **Restart Your Application**:
   ```powershell
   npm start
   ```

4. **For Vercel Deployment**:
   - Go to your [Vercel Dashboard](https://vercel.com/dashboard)
   - Select your project
   - Go to Settings → Environment Variables
   - Add `FIREBASE_SERVICE_ACCOUNT` variable with the content from `firebase-service-account-for-vercel.txt`
   - Redeploy your application:
   ```powershell
   npm run deploy:vercel
   ```

## Verifying the Fix

After applying the fix:
- The error message should no longer appear
- The console should show "Firebase Admin SDK Status: Initialized"
- Authentication features should work correctly

## Important Security Note

Never commit your Firebase service account JSON file to public repositories as it contains sensitive credentials. Ensure:
- `firebase-service-account.json` is in your `.gitignore` file
- Only share the credential with authorized team members
