# Simple Integration Test Script
Write-Host "Testing PydanticAI Integration Files..." -ForegroundColor Green

# Test required files
$files = @(
    "python-ai-services/main.py",
    "python-ai-services/requirements.txt", 
    "src/app/api/ai/trading/route.ts",
    "src/app/dashboard/ai-enhanced/page.tsx"
)

$allGood = $true
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "PASS: $file exists" -ForegroundColor Green
    } else {
        Write-Host "FAIL: $file missing" -ForegroundColor Red
        $allGood = $false
    }
}

# Test directories
$dirs = @(
    "python-ai-services/types",
    "python-ai-services/services",
    "src/app/api/ai",
    "src/components/enhanced"
)

foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Write-Host "PASS: $dir directory exists" -ForegroundColor Green
    } else {
        Write-Host "FAIL: $dir directory missing" -ForegroundColor Red
        $allGood = $false
    }
}

if ($allGood) {
    Write-Host "" -ForegroundColor White
    Write-Host "SUCCESS: All integration files present!" -ForegroundColor Green
    Write-Host "Ready to run: ./start-enhanced-dashboard.ps1" -ForegroundColor Cyan
} else {
    Write-Host "" -ForegroundColor White
    Write-Host "ISSUES: Some files missing. Check the integration." -ForegroundColor Red
}