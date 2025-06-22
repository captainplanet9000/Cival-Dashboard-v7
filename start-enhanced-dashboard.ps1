# Enhanced Civil Dashboard Startup Script with PydanticAI Integration
# This script starts both the Next.js dashboard and PydanticAI services

Write-Host "Starting Enhanced Civil Dashboard with PydanticAI Integration" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python detected: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python not found. Please install Python 3.8+ first." -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed  
try {
    $nodeVersion = node --version 2>&1
    Write-Host "Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js not found. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check if Redis is running
Write-Host "Checking Redis connection..." -ForegroundColor Yellow
try {
    $redisCheck = redis-cli ping 2>&1
    if ($redisCheck -eq "PONG") {
        Write-Host "Redis is running" -ForegroundColor Green
    } else {
        Write-Host "Redis not detected. Starting Redis container..." -ForegroundColor Yellow
        docker run -d --name redis-cival -p 6379:6379 redis:alpine
        Start-Sleep -Seconds 3
        Write-Host "Redis container started" -ForegroundColor Green
    }
} catch {
    Write-Host "Redis CLI not found. Attempting to start Redis container..." -ForegroundColor Yellow
    try {
        docker run -d --name redis-cival -p 6379:6379 redis:alpine
        Start-Sleep -Seconds 3
        Write-Host "Redis container started" -ForegroundColor Green
    } catch {
        Write-Host "Failed to start Redis. Please install Redis or Docker." -ForegroundColor Red
        Write-Host "   Option 1: Install Redis: https://redis.io/download" -ForegroundColor Yellow
        Write-Host "   Option 2: Install Docker: https://docker.com/get-started" -ForegroundColor Yellow
        exit 1
    }
}

# Set up environment
Write-Host "Setting up environment..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Copy-Item ".env.template" ".env.local"
    Write-Host "Created .env.local from template" -ForegroundColor Green
    Write-Host "Please edit .env.local with your API keys before proceeding" -ForegroundColor Yellow
}

# Install Node.js dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install Node.js dependencies" -ForegroundColor Red
    Write-Host "Trying alternative installation method..." -ForegroundColor Yellow
    npm install --force
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Dependencies installation failed. Continuing anyway..." -ForegroundColor Orange
    }
}
Write-Host "Node.js dependencies installed" -ForegroundColor Green# Set up Python virtual environment and install dependencies
Write-Host "Setting up PydanticAI services..." -ForegroundColor Yellow
Set-Location "python-ai-services"

if (-not (Test-Path "venv")) {
    Write-Host "   Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "Python virtual environment created" -ForegroundColor Green
}

Write-Host "   Activating virtual environment..." -ForegroundColor Yellow
& "venv\Scripts\Activate.ps1"

Write-Host "   Installing PydanticAI dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install Python dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "PydanticAI dependencies installed" -ForegroundColor Green

Set-Location ".."

# Start services
Write-Host "Starting Enhanced Services..." -ForegroundColor Green
Write-Host "   Port 8080: Next.js Civil Dashboard" -ForegroundColor Cyan
Write-Host "   Port 9000: PydanticAI Enhanced Services" -ForegroundColor Cyan
Write-Host "   Port 6379: Redis Cache" -ForegroundColor Cyan

# Create a job to run PydanticAI services
Write-Host "Starting PydanticAI services on port 9000..." -ForegroundColor Yellow
$aiServiceJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location "python-ai-services"
    & "venv\Scripts\Activate.ps1"
    python main.py
}

# Wait a moment for AI services to start
Start-Sleep -Seconds 3

# Start the Next.js dashboard  
Write-Host "Starting Next.js dashboard on port 8080..." -ForegroundColor Yellow
$dashboardJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev
}

# Monitor services
Write-Host "" -ForegroundColor White
Write-Host "Enhanced Civil Dashboard is starting!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Dashboard URL: http://localhost:8080" -ForegroundColor Green  
Write-Host "AI Services URL: http://localhost:9000" -ForegroundColor Green
Write-Host "AI-Enhanced Page: http://localhost:8080/dashboard/ai-enhanced" -ForegroundColor Green
Write-Host "Health Check: http://localhost:9000/health" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan

# Wait for user to stop services
try {
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Check if jobs are still running
        if ($aiServiceJob.State -eq "Failed") {
            Write-Host "AI services failed. Check logs above." -ForegroundColor Red
            break
        }
        if ($dashboardJob.State -eq "Failed") {
            Write-Host "Dashboard failed. Check logs above." -ForegroundColor Red
            break
        }
    }
} finally {
    # Cleanup
    Write-Host "Stopping services..." -ForegroundColor Yellow
    Stop-Job $aiServiceJob -ErrorAction SilentlyContinue
    Stop-Job $dashboardJob -ErrorAction SilentlyContinue
    Remove-Job $aiServiceJob -ErrorAction SilentlyContinue  
    Remove-Job $dashboardJob -ErrorAction SilentlyContinue
    Write-Host "Services stopped" -ForegroundColor Green
}