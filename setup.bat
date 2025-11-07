@echo off
echo ===============================================
echo J&J Trini Island Treats Business Manager v2.0
echo Database Setup Script
echo ===============================================
echo.

echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install dependencies!
    echo Please make sure Node.js is installed.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Initializing database...
npm run init-db
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to initialize database!
    pause
    exit /b 1
)

echo.
echo ===============================================
echo Setup completed successfully!
echo ===============================================
echo.
echo To start the application:
echo   1. Run: npm start
echo   2. Open your browser to: http://localhost:3000
echo.
echo To migrate existing localStorage data:
echo   1. Export your data from the old version
echo   2. Run: node scripts/migrate-localstorage.js your-backup.json
echo.
pause
