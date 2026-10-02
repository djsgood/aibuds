@echo off
title AIBudBots Lead Recovery
cd /d "%~dp0"

echo ======================================
echo        AIBudBots Lead Recovery
echo ======================================
echo.
echo Checking system...
echo.

where python >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or is not available in PATH.
    echo AIBudBots cannot start.
    echo.
    pause
    exit /b 1
)

where llama-cli >nul 2>&1
if errorlevel 1 (
    echo ERROR: llama.cpp is not installed or llama-cli is not available in PATH.
    echo AIBudBots cannot generate AI responses.
    echo.
    pause
    exit /b 1
)

if not exist "agent\agent.py" (
    echo ERROR: agent\agent.py is missing.
    echo AIBudBots cannot start.
    echo.
    pause
    exit /b 1
)

if not exist "agent\config\business.json" (
    echo ERROR: agent\config\business.json is missing.
    echo AIBudBots cannot start.
    echo.
    pause
    exit /b 1
)

echo System check passed.
echo.
echo Starting AIBudBots...
echo.

cd /d "%~dp0agent"
python agent.py

echo.
echo ======================================
echo AIBudBots has finished.
echo ======================================
echo.
pause