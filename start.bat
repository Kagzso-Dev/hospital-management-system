@echo off
echo Starting Hospital Management System...

cd /d "%~dp0backend"
if not exist node_modules (
    echo Installing backend dependencies...
    npm install
)

cd /d "%~dp0frontend"
if not exist node_modules (
    echo Installing frontend dependencies...
    npm install
)

echo.
echo Starting backend on port 5000...
start "Hospital Backend" cmd /k "cd /d "%~dp0backend" && node server.js"

timeout /t 4 >nul

echo Starting frontend...
start "Hospital Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Starting OCR service on port 5001...
start "Hospital OCR Service" cmd /k "cd /d "%~dp0ocr-service" && call start_ocr.bat"

echo.
echo ========================================
echo  Backend API:   http://localhost:5000
echo  OCR Service:   http://localhost:5001
echo  Reception:     http://localhost:5173/reception
echo  Doctor Panel:  http://localhost:5173/doctor
echo  Token Display: http://localhost:5173/token/1
echo  Admin Panel:   http://localhost:5173/admin
echo ========================================
echo  (Frontend may use 5174 or 5175 if 5173 is taken)
echo  NOTE: First OCR startup downloads ~200MB models
echo ========================================
pause
