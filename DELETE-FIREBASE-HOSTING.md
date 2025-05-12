# Delete Firebase Hosting

This guide will help you completely delete Firebase hosting for your project.

## Step 1: Log Out and Log In to Firebase CLI

First, make sure you're using the right Firebase account:

```powershell
# Log out of current account
firebase logout

# Log in again to ensure you have the correct credentials
firebase login
```

## Step 2: List Firebase Projects

Check which Firebase projects you have access to:

```powershell
firebase projects:list
```

## Step 3: Delete Firebase Hosting Site

There are two ways to delete Firebase hosting:

### Option 1: Using Firebase CLI

Run the following command to disable hosting:

```powershell
# Make sure you're in your project directory
cd "c:\Users\DarinGame\Desktop\payroll-d8ab939e794c4f112a1950c3eccd91db11e72498"

# Disable hosting for the project
firebase hosting:disable
```

### Option 2: Using Firebase Console (Recommended)

1. Go to the Firebase Console: https://console.firebase.google.com/
2. Select your project: "money-transfering"
3. In the left sidebar menu, click on "Hosting"
4. Click on the site you want to delete (money-transfering.web.app)
5. Click the three dots menu (⋮) in the upper right corner
6. Select "Delete site"
7. Confirm by typing the site name when prompted

## Step 4: Verify Deletion

To verify that the hosting has been deleted:

```powershell
# Check if hosting still exists for your project
firebase hosting:sites:list
```

## Step 5: Uninstall Firebase Tools (Optional)

If you no longer need Firebase Tools:

```powershell
npm uninstall -g firebase-tools
```

## Important Notes

1. Deleting Firebase hosting doesn't delete your Firebase project
2. Your Firebase Authentication, Firestore and other Firebase services remain intact
3. Only the hosting service (the web content) is removed
