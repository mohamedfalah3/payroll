# PowerShell script to set up Firebase service account
# This script will guide you through obtaining and setting up a Firebase service account

Write-Host "`n========== FIREBASE SERVICE ACCOUNT SETUP ==========`n" -ForegroundColor Cyan

# Check if firebase-service-account.json exists
$serviceAccountPath = Join-Path $PSScriptRoot "firebase-service-account.json"
$hasServiceAccount = Test-Path $serviceAccountPath

if ($hasServiceAccount) {
    Write-Host "A service account file already exists at:" -ForegroundColor Yellow
    Write-Host $serviceAccountPath
    Write-Host "Current file appears to contain placeholder values.`n"
}

Write-Host "Let's set up a proper Firebase service account for your application!`n" -ForegroundColor Green

# Guide the user through generating a new service account
Write-Host "STEP 1: Generate a new Firebase service account" -ForegroundColor Cyan
Write-Host "----------------------------------------"
Write-Host "1. Open your browser and go to: https://console.firebase.google.com/"
Write-Host "2. Select your project: 'money-transfering'"
Write-Host "3. Click the gear icon (⚙️) near 'Project Overview' to access Project Settings"
Write-Host "4. Go to the 'Service accounts' tab"
Write-Host "5. Click 'Generate new private key' button"
Write-Host "6. Save the downloaded JSON file`n"

$downloadPath = Read-Host "Enter the full path to the downloaded service account file (or drag and drop the file here)"
$downloadPath = $downloadPath.Trim('"') # Remove quotes if the path was dragged

if (-not (Test-Path $downloadPath)) {
    Write-Host "Error: File not found at specified path." -ForegroundColor Red
    Write-Host "Please try again with the correct file path.`n"
    exit 1
}

# Check if the file is valid JSON and contains necessary fields
try {
    $serviceAccountJson = Get-Content $downloadPath -Raw | ConvertFrom-Json

    # Validate required fields
    $requiredFields = @("project_id", "private_key", "client_email")
    $missingFields = @()
    
    foreach ($field in $requiredFields) {
        if (-not $serviceAccountJson.$field) {
            $missingFields += $field
        }
    }
    
    if ($missingFields.Count -gt 0) {
        throw "Service account file is missing required fields: $($missingFields -join ', ')"
    }
    
    # Check for placeholder values
    if ($serviceAccountJson.private_key -eq "YOUR_PRIVATE_KEY") {
        throw "Service account contains placeholder values"
    }
    
    # Basic validation for private key format
    if (-not $serviceAccountJson.private_key.Contains("-----BEGIN PRIVATE KEY-----")) {
        throw "Private key appears to be in an invalid format"
    }
    
    # Validate project ID
    if ($serviceAccountJson.project_id -ne "money-transfering") {
        Write-Host "Warning: The service account's project_id ($($serviceAccountJson.project_id)) doesn't match 'money-transfering'" -ForegroundColor Yellow
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne "y") {
            Write-Host "Setup aborted. Please download the correct service account." -ForegroundColor Red
            exit 1
        }
    }
    
    # Copy the file to the project root
    Copy-Item -Path $downloadPath -Destination $serviceAccountPath -Force
    Write-Host "Service account file successfully validated and copied to project root!" -ForegroundColor Green
    
    # Prepare for Vercel deployment
    Write-Host "`nSTEP 2: Prepare service account for Vercel deployment" -ForegroundColor Cyan
    Write-Host "----------------------------------------"
    
    $vercelFormat = $serviceAccountJson | ConvertTo-Json -Compress
    $vercelPath = Join-Path $PSScriptRoot "firebase-service-account-for-vercel.txt"
    Set-Content -Path $vercelPath -Value $vercelFormat -NoNewline
    
    Write-Host "Vercel-ready service account saved to:" -ForegroundColor Green
    Write-Host $vercelPath
    Write-Host "`nCopy the contents of this file to set as FIREBASE_SERVICE_ACCOUNT environment variable in Vercel.`n"
    
    # Test the new service account
    Write-Host "STEP 3: Testing the new service account" -ForegroundColor Cyan
    Write-Host "----------------------------------------"
    Write-Host "Starting the application to test Firebase Admin SDK initialization..."
    
    $env:NODE_ENV = "development"
    $nodeProcess = Start-Process -FilePath "node" -ArgumentList "app.js" -NoNewWindow -PassThru -RedirectStandardOutput "logs\firebase-test-output.log"
    
    # Wait a bit for the server to start
    Start-Sleep -Seconds 3
    
    if (-not $nodeProcess.HasExited) {
        Write-Host "Application started successfully! Check logs\firebase-test-output.log for details." -ForegroundColor Green
        Write-Host "Press any key to stop the server and continue..."
        $null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        Stop-Process -Id $nodeProcess.Id -Force
    } else {
        Write-Host "Application failed to start. Check logs\firebase-test-output.log for details." -ForegroundColor Red
    }
    
    Write-Host "`n========== SETUP COMPLETE ==========`n" -ForegroundColor Cyan
    Write-Host "Next steps:"
    Write-Host "1. Deploy to Vercel by running: npm run deploy:vercel"
    Write-Host "2. Add the FIREBASE_SERVICE_ACCOUNT environment variable in Vercel dashboard"
    Write-Host "3. Deploy to Firebase by running: npm run deploy:firebase"
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Setup failed. Please ensure you've downloaded a valid Firebase service account JSON file.`n"
    exit 1
}
