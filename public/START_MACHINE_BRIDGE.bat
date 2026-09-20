@echo off
setlocal enabledelayedexpansion
title OnePath LIS - Universal Instrument Bridge Receiver
cls

echo ====================================================================
echo        ONEPATH LIS - UNIVERSAL INSTRUMENT BRIDGE RECEIVER
echo     Auto-Sync for Aveacon, Mindray, Sysmex, Beacon, Erba Analyzers
echo ====================================================================
echo.

:: 1. Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is NOT installed on this computer.
    echo Node.js is required to receive data streams from your laboratory machine.
    echo.
    echo Please download and install Node.js (LTS version) from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Check if onepath-bridge.js exists locally; if not, download it automatically
if not exist "%~dp0onepath-bridge.js" (
    echo [INFO] onepath-bridge.js not found in current folder.
    echo [DOWNLOADING] Fetching latest bridge script from OnePath LIS...
    curl -f -s -o "%~dp0onepath-bridge.js" "https://lis.onepathlab.com/onepath-bridge.js" || (
        powershell -Command "Invoke-WebRequest -Uri 'https://lis.onepathlab.com/onepath-bridge.js' -OutFile '%~dp0onepath-bridge.js'"
    )
    if not exist "%~dp0onepath-bridge.js" (
        echo [ERROR] Could not download onepath-bridge.js automatically.
        echo Please ensure you place onepath-bridge.js in the same folder as this batch file.
        pause
        exit /b 1
    )
    echo [SUCCESS] Downloaded onepath-bridge.js successfully!
    echo.
)

:: 3. Check for Serial Port dependencies (Optional for RS-232)
if not exist "%~dp0node_modules\serialport" (
    echo [TIP] Running in Standard LAN TCP/IP Mode (Port 8080).
    echo If your machine connects via RS-232 Serial COM Cable, run 'npm install serialport' once.
    echo.
)

echo [STARTING] Launching Local Machine Bridge Receiver...
echo Press Ctrl+C at any time to stop the receiver.
echo ====================================================================
echo.

node "%~dp0onepath-bridge.js"

pause
