# Simple Enhanced Dashboard Startup - Bypass Dependency Conflicts
Write-Host "Starting Enhanced Civil Dashboard (Simple Mode)" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "src/app/dashboard")) {
    Write-Host "Error: Not in cival-dashboard directory!" -ForegroundColor Red
    Write-Host "Please run: cd C:\TradingFarm\cival-dashboard" -ForegroundColor Yellow
    exit 1
}

# Check if Python AI services are ready
if (Test-Path "python-ai-services/venv") {
    Write-Host "Python AI services: Ready" -ForegroundColor Green
} else {
    Write-Host "Setting up Python AI services..." -ForegroundColor Yellow
    Set-Location "python-ai-services"
    python -m venv venv
    & "venv\Scripts\Activate.ps1"
    pip install -r requirements.txt
    Set-Location ".."
    Write-Host "Python AI services: Ready" -ForegroundColor Green
}

# Start Redis if needed
Write-Host "Starting Redis..." -ForegroundColor Yellow
try {
    docker run -d --name redis-cival-simple -p 6379:6379 redis:alpine 2>$null
    Write-Host "Redis: Started" -ForegroundColor Green
} catch {
    Write-Host "Redis: Already running or started" -ForegroundColor Green
}

# Check if node_modules exists, if not, install with safe options
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Node.js dependencies (safe mode)..." -ForegroundColor Yellow
    npm install --legacy-peer-deps --silent
} else {
    Write-Host "Node.js dependencies: Ready" -ForegroundColor Green
}

# Set up environment if needed
if (-not (Test-Path ".env.local")) {
    Copy-Item ".env.template" ".env.local"
    Write-Host "Environment: Created .env.local" -ForegroundColor Green
}

Write-Host "" -ForegroundColor White
Write-Host "Starting services..." -ForegroundColor Green
Write-Host "Dashboard: http://localhost:8080" -ForegroundColor Cyan
Write-Host "AI Enhanced: http://localhost:8080/dashboard/ai-enhanced" -ForegroundColor Cyan
Write-Host "AI Services: http://localhost:9000" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan

# Start AI services in background
Write-Host "Starting PydanticAI services..." -ForegroundColor Yellow
$aiJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location "python-ai-services"
    & "venv\Scripts\Activate.ps1"
    python main.py
}

# Wait a moment
Start-Sleep -Seconds 2

# Start dashboard
Write-Host "Starting Next.js dashboard..." -ForegroundColor Yellow
npm run dev:safe

# Cleanup when stopped
Stop-Job $aiJob -ErrorAction SilentlyContinue
Remove-Job $aiJob -ErrorAction SilentlyContinue