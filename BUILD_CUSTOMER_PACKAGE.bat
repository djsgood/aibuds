@echo off
title Build AIBudBots Customer Package
cd /d "%~dp0"

echo ======================================
echo    Building AIBudBots Customer Package
echo ======================================
echo.

if exist "customer_package" (
    echo Removing previous package...
    rmdir /s /q "customer_package"
)

echo Creating clean package...
mkdir "customer_package"
mkdir "customer_package\agent"
mkdir "customer_package\agent\config"

echo Copying AIBudBots files...

copy "agent\agent.py" "customer_package\agent\agent.py" >nul
copy "agent\config\business.example.json" "customer_package\agent\config\business.example.json" >nul
copy "requirements.txt" "customer_package\requirements.txt" >nul
copy "SETUP_AIBUDBOTS.bat" "customer_package\SETUP_AIBUDBOTS.bat" >nul
copy "START_AIBUDBOTS.bat" "customer_package\START_AIBUDBOTS.bat" >nul

if errorlevel 1 (
    echo.
    echo ERROR: Package build failed.
    echo.
    pause
    exit /b 1
)

echo.
echo ======================================
echo       Customer Package Created
echo ======================================
echo.
echo Location:
echo %~dp0customer_package
echo.
echo Personal Gmail tokens, credentials,
echo business.json, test data, and development
echo files were NOT included.
echo.
pause
copy "agent\credentials.json" "customer_package\agent\credentials.json" >nul