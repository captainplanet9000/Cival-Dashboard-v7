@echo off
echo ================================================================
echo Enhanced Civil Dashboard with PydanticAI Integration
echo ================================================================

echo Checking dependencies...

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.8+
    pause
    exit /b 1
)
echo ✓ Python detected

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)
echo ✓ Node.js detected

:: Start Redis if needed
echo Starting Redis...
docker run -d --name redis-cival -p 6379:6379 redis:alpine >nul 2>&1
echo ✓ Redis container started (or already running)

:: Set up environment
if not exist ".env.local" (
    copy ".env.template" ".env.local"
    echo ✓ Created .env.local from template
    echo Please edit .env.local with your API keys
)

:: Install dependencies
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install Node.js dependencies
    pause
    exit /b 1
)

:: Set up Python environment
echo Setting up PydanticAI services...
cd python-ai-services
if not exist "venv" (
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt
cd ..

echo ================================================================
echo Starting Enhanced Services...
echo Dashboard: http://localhost:8080
echo AI Services: http://localhost:9000  
echo AI-Enhanced Page: http://localhost:8080/dashboard/ai-enhanced
echo ================================================================

:: Start services concurrently
start "PydanticAI Services" /d "python-ai-services" cmd /c "venv\Scripts\activate.bat && python main.py"
timeout /t 3 /nobreak >nul
start "Civil Dashboard" cmd /c "npm run dev"

echo Services are starting...
echo Press any key to stop all services
pause >nul

:: Cleanup (this won't run automatically when closing windows)
echo Stopping services...
taskkill /f /im python.exe /fi "WINDOWTITLE eq PydanticAI Services*" >nul 2>&1
taskkill /f /im node.exe /fi "WINDOWTITLE eq Civil Dashboard*" >nul 2>&1