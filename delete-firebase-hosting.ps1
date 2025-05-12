# This script helps delete Firebase hosting configuration

# Display information about what the script will do
Write-Host "This script will help you delete Firebase hosting completely." -ForegroundColor Yellow
Write-Host "Note: Some steps require manual action in the Firebase Console." -ForegroundColor Yellow
Write-Host ""

# Step 1: Check if Firebase CLI is installed
Write-Host "Checking for Firebase CLI installation..." -ForegroundColor Green
$firebaseInstalled = $null
try {
    $firebaseInstalled = Invoke-Expression "firebase --version" -ErrorAction SilentlyContinue
} catch {
    # Do nothing, we'll handle the case below
}

if ($null -eq $firebaseInstalled) {
    Write-Host "Firebase CLI is not installed." -ForegroundColor Red
    Write-Host "Would you like to install it now? (Y/N)" -ForegroundColor Yellow
    $installFirebase = Read-Host
    
    if ($installFirebase -eq "Y" -or $installFirebase -eq "y") {
        Write-Host "Installing Firebase CLI..." -ForegroundColor Green
        npm install -g firebase-tools
    } else {
        Write-Host "You need Firebase CLI to delete hosting via command line." -ForegroundColor Red
        Write-Host "Please follow the manual steps in DELETE-FIREBASE-HOSTING.md" -ForegroundColor Yellow
        exit
    }
} else {
    Write-Host "Firebase CLI is installed: $firebaseInstalled" -ForegroundColor Green
}

# Step 2: Log out and log in to Firebase
Write-Host ""
Write-Host "To ensure you're using the correct account, we should logout and login to Firebase." -ForegroundColor Yellow
Write-Host "Would you like to logout and login to Firebase? (Y/N)" -ForegroundColor Yellow
$relogin = Read-Host

if ($relogin -eq "Y" -or $relogin -eq "y") {
    Write-Host "Logging out from Firebase..." -ForegroundColor Green
    firebase logout
    
    Write-Host "Please log in to Firebase..." -ForegroundColor Green
    firebase login
}

# Step 3: List Firebase projects
Write-Host ""
Write-Host "Listing Firebase projects..." -ForegroundColor Green
firebase projects:list

# Step 4: Ask for project ID
Write-Host ""
Write-Host "Verify your project ID in the list above." -ForegroundColor Yellow
Write-Host "Your project ID should be 'money-transfering'." -ForegroundColor Yellow
Write-Host "Is 'money-transfering' your Firebase project ID? (Y/N)" -ForegroundColor Yellow
$correctProject = Read-Host

if ($correctProject -ne "Y" -and $correctProject -ne "y") {
    Write-Host "Please enter your correct Firebase project ID:" -ForegroundColor Yellow
    $projectId = Read-Host
} else {
    $projectId = "money-transfering"
}

# Step 5: List existing hosting sites
Write-Host ""
Write-Host "Checking hosting sites for project $projectId..." -ForegroundColor Green
firebase hosting:sites:list --project $projectId

# Step 6: Offer to disable hosting
Write-Host ""
Write-Host "Would you like to disable Firebase hosting via CLI? (Y/N)" -ForegroundColor Yellow
Write-Host "(Note: This may not completely delete the hosting site, just disable it)" -ForegroundColor Yellow
$disableHosting = Read-Host

if ($disableHosting -eq "Y" -or $disableHosting -eq "y") {
    Write-Host "Disabling Firebase hosting..." -ForegroundColor Green
    firebase hosting:disable --project $projectId
    
    # Check if firebase.json exists and update it
    if (Test-Path -Path "firebase.json") {
        Write-Host "Removing hosting configuration from firebase.json..." -ForegroundColor Green
        $firebaseJson = Get-Content -Path "firebase.json" -Raw | ConvertFrom-Json
        
        # Check if hosting property exists
        if ($firebaseJson.PSObject.Properties.Name -contains "hosting") {
            $firebaseJson.PSObject.Properties.Remove("hosting")
            $firebaseJson | ConvertTo-Json -Depth 10 | Set-Content -Path "firebase.json"
            Write-Host "Hosting configuration removed from firebase.json." -ForegroundColor Green
        } else {
            Write-Host "No hosting configuration found in firebase.json." -ForegroundColor Yellow
        }
    }
}

# Step 7: Provide manual steps for complete deletion
Write-Host ""
Write-Host "===== IMPORTANT: MANUAL STEPS REQUIRED =====" -ForegroundColor Magenta
Write-Host "To completely delete the Firebase hosting site, please follow these steps:" -ForegroundColor Yellow
Write-Host "1. Go to the Firebase Console: https://console.firebase.google.com/project/$projectId/hosting/sites" -ForegroundColor Cyan
Write-Host "2. Click on the site you want to delete (likely money-transfering.web.app)" -ForegroundColor White
Write-Host "3. Click the three dots menu (⋮) in the upper right corner" -ForegroundColor White
Write-Host "4. Select 'Delete site'" -ForegroundColor White
Write-Host "5. Confirm by typing the site name when prompted" -ForegroundColor White
Write-Host "================================================" -ForegroundColor Magenta

# Step 8: Verify deletion
Write-Host ""
Write-Host "After completing the manual steps in the Firebase Console," -ForegroundColor Yellow
Write-Host "would you like to verify the deletion by checking the hosting sites list? (Y/N)" -ForegroundColor Yellow
$verifyDeletion = Read-Host

if ($verifyDeletion -eq "Y" -or $verifyDeletion -eq "y") {
    Write-Host "Checking hosting sites for project $projectId..." -ForegroundColor Green
    firebase hosting:sites:list --project $projectId
}

# Final message
Write-Host ""
Write-Host "Firebase hosting deletion process completed!" -ForegroundColor Green
Write-Host "If you still see hosting sites in the list above, please follow the manual deletion steps." -ForegroundColor Yellow
Write-Host "For more information, see the DELETE-FIREBASE-HOSTING.md file." -ForegroundColor Cyan
