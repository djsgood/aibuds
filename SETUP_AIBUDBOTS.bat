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
    echo ERROR: llama-cli was not found.
    echo Install llama.cpp before continuing.
    echo.
    pause
    exit /b 1
)

echo llama.cpp found.
echo.
echo Preparing business configuration...
echo.

if not exist "agent\config\business.json" (
    if not exist "agent\config\business.example.json" (
        echo ERROR: business.example.json is missing.
        echo.
        pause
        exit /b 1
    )

    copy "agent\config\business.example.json" "agent\config\business.json" >nul

    if errorlevel 1 (
        echo ERROR: Could not create business.json.
        echo.
        pause
        exit /b 1
    )

    echo Created agent\config\business.json
) else (
    echo Existing business.json preserved.
)

echo.
echo Checking Gmail configuration...
echo.

if not exist "agent\credentials.json" (
    echo WARNING: agent\credentials.json is missing.
    echo Gmail authorization cannot run until it is added.
    echo.
) else (
    echo Gmail OAuth credentials found.
)

echo.
echo ======================================
echo       AIBudBots Setup Complete
echo ======================================
echo.
echo NEXT STEP:
echo Edit:
echo agent\config\business.json
echo.
echo Enter the customer's business information.
echo Then run START_AIBUDBOTS.bat
echo.
pause