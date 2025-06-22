# Enhanced Trading Control App Startup Script
# Fixes all dependency issues and starts the app

Write-Host "Starting Trading Control App..." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

# Check current directory
$currentDir = Get-Location
Write-Host "Current directory: $currentDir" -ForegroundColor Yellow

# Ensure we're in the right directory
if (-not (Test-Path "trading_control_app_enhanced.py")) {
    Write-Host "Error: trading_control_app_enhanced.py not found!" -ForegroundColor Red
    Write-Host "Please run this script from the cival-dashboard directory" -ForegroundColor Yellow
    exit 1
}

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python version: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Python not found!" -ForegroundColor Red
    exit 1
}

# Install missing dependencies
Write-Host "Checking dependencies..." -ForegroundColor Yellow

$dependencies = @("flet", "aiohttp", "asyncio")
$missingDeps = @()

foreach ($dep in $dependencies) {
    try {
        python -c "import $dep" 2>$null
        Write-Host "  ✓ $dep installed" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ $dep missing" -ForegroundColor Red
        $missingDeps += $dep
    }
}

# Install missing dependencies
if ($missingDeps.Count -gt 0) {
    Write-Host "Installing missing dependencies..." -ForegroundColor Yellow
    
    # Install flet with desktop support
    if ($missingDeps -contains "flet") {
        pip install "flet[desktop]" --upgrade
    }
    
    # Install aiohttp
    if ($missingDeps -contains "aiohttp") {
        pip install aiohttp --upgrade
    }
    
    Write-Host "Dependencies installed!" -ForegroundColor Green
}

# Install all requirements
if (Test-Path "trading-control-requirements.txt") {
    Write-Host "Installing from requirements file..." -ForegroundColor Yellow
    pip install -r trading-control-requirements.txt --upgrade
}

# Check if dashboard is running
Write-Host "Checking dashboard connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Dashboard is running at http://localhost:8080" -ForegroundColor Green
} catch {
    Write-Host "⚠ Dashboard not running - start it first with:" -ForegroundColor Orange
    Write-Host "    ./start-enhanced-dashboard.ps1" -ForegroundColor Cyan
}

# Start the trading control app
Write-Host "" -ForegroundColor White
Write-Host "Starting Trading Control App..." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Features:" -ForegroundColor White
Write-Host "  • AI-Enhanced Trading Controls" -ForegroundColor Cyan
Write-Host "  • Real-time Dashboard Integration" -ForegroundColor Cyan
Write-Host "  • PydanticAI Symbol Analysis" -ForegroundColor Cyan
Write-Host "  • System Status Monitoring" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "Press Ctrl+C to stop the app" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

try {
    python trading_control_app_enhanced.py
} catch {
    Write-Host "Error starting app: $_" -ForegroundColor Red
    Write-Host "" -ForegroundColor White
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Ensure you're in the cival-dashboard directory" -ForegroundColor White
    Write-Host "2. Install dependencies: pip install -r trading-control-requirements.txt" -ForegroundColor White
    Write-Host "3. Start dashboard first: ./start-enhanced-dashboard.ps1" -ForegroundColor White
}