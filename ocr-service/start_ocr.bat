@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   Hospital OCR Service - Python Setup
echo ============================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Install Python 3.9+ from https://python.org
    pause
    exit /b 1
)

python --version
echo.

cd /d "%~dp0"

:: Create virtual environment if missing
if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
    echo Virtual environment created.
    echo.
)

:: Activate venv
call .venv\Scripts\activate.bat

:: Upgrade pip
python -m pip install --upgrade pip --quiet

echo Installing OCR dependencies (this may take several minutes on first run)...
echo  - FastAPI + Uvicorn
echo  - PaddleOCR + PaddlePaddle
echo  - OpenCV
echo.
pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo [ERROR] Some packages failed to install.
    echo Try manually: pip install paddlepaddle paddleocr opencv-python-headless fastapi uvicorn
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Setup complete! Starting OCR service...
echo ============================================
echo.
echo OCR Service URL: http://localhost:5001
echo Health check:    http://localhost:5001/health
echo.
echo NOTE: First startup downloads PaddleOCR models (~200MB)
echo.

python main.py

pause
