@echo off
title AIBudBots Setup
cd /d "%~dp0"

echo ======================================
echo           AIBudBots Setup
echo ======================================
echo.
echo Checking installation requirements...
echo.

where python >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or is not available in PATH.
    echo Install Python before continuing.
    echo.
    pause
    exit /b 1
)

if not exist "requirements.txt" (
    echo ERROR: requirements.txt is missing.
    echo.
    pause
    exit /b 1
)

echo Python found.
echo.
echo Installing AIBudBots Python dependencies...
echo.

python -m pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo ERROR: Python dependency installation failed.
    echo.
    pause
    exit /b 1
)

echo.
echo Python dependencies installed successfully.
echo.

where llama-cli >nul 2>&1
if errorlevel 1 (
    echo WARNING: llama-cli was not found.
    echo AIBudBots still needs llama.cpp before it can run.
    echo.
    pause
    exit /b 1
)

echo llama.cpp found.
echo.
echo ======================================
echo       AIBudBots Setup Complete
echo ======================================
echo.
echo You can now run START_AIBUDBOTS.bat
echo.
pause