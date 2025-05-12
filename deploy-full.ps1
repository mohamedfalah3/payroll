# Deploy script for Payroll System (Firebase + Vercel)
# This script automates the deployment process for both Vercel backend and Firebase frontend

# Set error handling
$ErrorActionPreference = "Stop"

# Function to show step headers
function Show-Step {
    param([string]$StepNumber, [string]$StepTitle)
    Write-Host ""
    Write-Host "Step $StepNumber`: $StepTitle" -ForegroundColor Green
    Write-Host "----------------------------------------------------------------------" -ForegroundColor Green
}

# Show banner
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "         PAYROLL SYSTEM DEPLOYMENT (FIREBASE + VERCEL)" -ForegroundColor Cyan 
Write-Host "=====================================================================" -ForegroundColor Cyan

# Get latest Vercel URL
$VercelUrlFileName = "vercel-deployment-url.txt"
$VercelUrl = ""

if (Test-Path $VercelUrlFileName) {
    $VercelUrl = Get-Content $VercelUrlFileName -Raw
    Write-Host "Found previous Vercel URL: $VercelUrl" -ForegroundColor Yellow
    $useExistingUrl = Read-Host "Use this URL? (yes/no)"
    if ($useExistingUrl -ne "yes") {
        $VercelUrl = Read-Host "Enter new Vercel deployment URL"
    }
} else {
    $VercelUrl = Read-Host "Enter your Vercel deployment URL"
}

# Step 1: Fix relative paths
Show-Step 1 "Fixing relative paths in EJS templates"
npm run fix:paths

# Step 2: Prepare Firebase service account for Vercel
Show-Step 2 "Preparing Firebase service account for Vercel"
npm run prepare:vercel-env

# Step 3: Update Firebase hosting redirect
Show-Step 3 "Updating Firebase hosting redirect URL"
$firebaseIndexPath = "firebase-public/index.html"
$firebaseIndexContent = Get-Content $firebaseIndexPath -Raw
$pattern = '(window\.location\.href = ")([^"]+)(")'
$updatedContent = $firebaseIndexContent -replace $pattern, "`$1$VercelUrl`$3"
Set-Content -Path $firebaseIndexPath -Value $updatedContent
Write-Host "Updated Firebase hosting to redirect to: $VercelUrl" -ForegroundColor Green

# Step 4: Deploy to Vercel
Show-Step 4 "Deploying to Vercel"
Write-Host "Remember to set FIREBASE_SERVICE_ACCOUNT environment variable in Vercel!" -ForegroundColor Yellow
Write-Host "Press Enter to continue with deployment or Ctrl+C to cancel..."
Read-Host

# Run Vercel deployment
npm run deploy:vercel

# Save the URL for next time
Set-Content -Path $VercelUrlFileName -Value $VercelUrl

# Step 5: Deploy to Firebase Hosting
Show-Step 5 "Deploying to Firebase Hosting"
npm run deploy:firebase

# Show completion message
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "                  DEPLOYMENT COMPLETED!" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Vercel Backend: $VercelUrl" -ForegroundColor Green
Write-Host "Firebase Hosting: https://money-transfering.web.app" -ForegroundColor Green
Write-Host ""
Write-Host "Don't forget to set these environment variables in Vercel:" -ForegroundColor Yellow
Write-Host "- NODE_ENV: production" -ForegroundColor Yellow
Write-Host "- FIREBASE_SERVICE_ACCOUNT: [Service Account JSON]" -ForegroundColor Yellow
Write-Host ""
Write-Host "Testing Instructions:"
Write-Host "1. Try logging in at https://money-transfering.web.app"
Write-Host "2. Verify all CSS/JS is loading correctly"
Write-Host "3. Test core functionality (transactions, etc.)"
Write-Host "=====================================================================" -ForegroundColor Cyan

