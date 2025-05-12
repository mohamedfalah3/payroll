# Firebase Service Account Setup Guide

This guide will help you set up the Firebase Service Account for your Payroll System application.

## Why Service Accounts Are Needed

The Firebase Admin SDK requires a service account to perform server-side operations like:
- Verifying Firebase ID tokens
- Managing users
- Accessing Firestore with admin privileges

## How to Generate a Service Account

1. **Go to the Firebase Console**
   - Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Select your project: `money-transfering`

2. **Navigate to Project Settings**
   - Click the gear icon ⚙️ next to "Project Overview" in the left sidebar
   - Select "Project settings"

3. **Generate a Service Account Key**
   - Go to the "Service accounts" tab
   - Under "Firebase Admin SDK", click "Generate new private key"
   - Click "Generate key" in the confirmation dialog
   - This will download a JSON file with your service account credentials

4. **Use the Service Account in Your Application**
   - Rename the downloaded file to `firebase-service-account.json`
   - Place it in the root directory of your project
   - **IMPORTANT**: Never commit this file to public repositories as it contains sensitive credentials

## For Vercel Deployment

1. **Format the Service Account for Vercel Environment Variables**
   - Open the downloaded JSON file
   - Copy all contents
   - Remove all line breaks to create a single-line JSON string
   - Set this as the value for the `FIREBASE_SERVICE_ACCOUNT` environment variable in your Vercel project settings

## Troubleshooting

If you see error messages like:
```
Firebase Admin SDK initialization failed: Firebase service account private_key is invalid or contains placeholder values
```

This means you're using placeholder values instead of actual credentials. Make sure to:
1. Generate a real service account key from Firebase Console
2. Replace the placeholder file with the downloaded one
3. For Vercel: Ensure the environment variable contains valid JSON without line breaks

## Security Notes

- Keep your service account credentials secure
- Use appropriate Firebase security rules
- Consider using different service accounts for development and production
