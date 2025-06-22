# Setup script for Cival Dashboard AI Services
# This script installs all necessary dependencies for the Python AI services

Write-Host "🚀 Setting up Cival Dashboard AI Services..." -ForegroundColor Cyan

# Check if Python is installed
try {
    $pythonVersion = python --version
    Write-Host "✅ Python detected: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.9+ before continuing." -ForegroundColor Red
    exit 1
}

# Create a virtual environment if it doesn't exist
if (-not (Test-Path ".\python-ai-services\venv")) {
    Write-Host "🔧 Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv .\python-ai-services\venv
    Write-Host "✅ Virtual environment created successfully." -ForegroundColor Green
} else {
    Write-Host "✅ Virtual environment already exists." -ForegroundColor Green
}

# Activate the virtual environment
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Yellow
& .\python-ai-services\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "📦 Installing Python dependencies..." -ForegroundColor Yellow
pip install -r .\python-ai-services\requirements.txt

# Setup npm dependencies if not already installed
if (-not (Test-Path ".\node_modules")) {
    Write-Host "📦 Installing npm dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "✅ npm dependencies installed successfully." -ForegroundColor Green
} else {
    Write-Host "✅ npm dependencies already installed." -ForegroundColor Green
}

# Create necessary directories
$directories = @(
    ".\python-ai-services\logs",
    ".\python-ai-services\data"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        Write-Host "📁 Creating directory: $dir" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
}

Write-Host "✨ Setup complete! You can now run the AI services using 'python-ai-services\venv\Scripts\python.exe python-ai-services\main.py'" -ForegroundColor Green
