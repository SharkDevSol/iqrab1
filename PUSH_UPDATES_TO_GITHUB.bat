@echo off
echo ========================================
echo  Push Updates to GitHub
echo ========================================
echo.

REM Add all changes
echo [1/4] Adding all changes...
git add .
if errorlevel 1 (
    echo ERROR: Failed to add files
    pause
    exit /b 1
)
echo ✓ Files added successfully
echo.

REM Commit changes
echo [2/4] Committing changes...
git commit -m "Fix: AI06 WebSocket port changed to 7789 to avoid conflict with iqrab3 system"
if errorlevel 1 (
    echo WARNING: Nothing to commit or commit failed
    echo Checking if there are changes...
    git status
)
echo.

REM Push to GitHub
echo [3/4] Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo ERROR: Failed to push to GitHub
    echo.
    echo Trying to set upstream...
    git push -u origin main
    if errorlevel 1 (
        echo ERROR: Still failed. Check your connection and credentials.
        pause
        exit /b 1
    )
)
echo ✓ Pushed to GitHub successfully
echo.

REM Show status
echo [4/4] Checking status...
git status
echo.

echo ========================================
echo  ✓ Upload Complete!
echo ========================================
echo.
echo Repository: https://github.com/SharkDevSol/bilal.git
echo.
echo Next: Run these commands on VPS to update:
echo.
echo   cd /var/www/bilal-school
echo   git pull origin main
echo   cd backend
echo   sed -i 's/AI06_WEBSOCKET_PORT=7788/AI06_WEBSOCKET_PORT=7789/' .env
echo   node server.js
echo.
pause
