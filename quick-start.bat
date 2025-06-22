@echo off
echo ============================================
echo Civil Dashboard - Quick Start (Windows)
echo ============================================

cd /d C:\TradingFarm\cival-dashboard

echo Checking if we're in the right directory...
if not exist "src\app\dashboard" (
    echo ERROR: Not in cival-dashboard directory!
    echo Please navigate to C:\TradingFarm\cival-dashboard
    pause
    exit /b 1
)

echo ✓ In correct directory

echo Starting Redis...
docker run -d --name redis-quick -p 6379:6379 redis:alpine >nul 2>&1
echo ✓ Redis started

echo Setting up environment...
if not exist ".env.local" (
    copy ".env.template" ".env.local" >nul
    echo ✓ Created .env.local
)

echo Installing dependencies (safe mode)...
npm install --legacy-peer-deps --silent
echo ✓ Dependencies ready

echo ============================================
echo Starting Enhanced Dashboard...
echo Dashboard: http://localhost:8080
echo AI Enhanced: http://localhost:8080/dashboard/ai-enhanced
echo ============================================
echo Press Ctrl+C to stop

start "PydanticAI Services" /d "python-ai-services" cmd /c "venv\Scripts\activate && python main.py"
timeout /t 2 /nobreak >nul
npm run dev:safe