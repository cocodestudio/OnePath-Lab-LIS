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
if %ERRORLEVEL% equ 0 goto NODE_FOUND

echo [ERROR] Node.js is NOT installed on this computer.
echo Node.js is required to receive data streams from your laboratory machine.
echo.
echo Please download and install Node.js from: https://nodejs.org/
echo.
pause
exit /b 1

:NODE_FOUND
echo [OK] Node.js detected.

:: 2. Check if onepath-bridge.js exists locally; if not, fetch it automatically
if exist "%~dp0onepath-bridge.js" goto SCRIPT_READY

echo [INFO] onepath-bridge.js not found in current folder (%~dp0).
echo [FETCHING] Checking local LIS application...

:: Try copying from local repo if nearby
if exist "d:\OnePath Lab - A Laboratory information system software\OnePath-Lab-LIS\public\onepath-bridge.js" (
    copy /y "d:\OnePath Lab - A Laboratory information system software\OnePath-Lab-LIS\public\onepath-bridge.js" "%~dp0onepath-bridge.js" >nul 2>&1
    if exist "%~dp0onepath-bridge.js" goto SCRIPT_READY
)

:: Try downloading from local running LIS server
curl.exe -f -s -o "%~dp0onepath-bridge.js" "http://127.0.0.1:3000/onepath-bridge.js" >nul 2>&1
if exist "%~dp0onepath-bridge.js" goto SCRIPT_READY

curl.exe -f -s -o "%~dp0onepath-bridge.js" "http://localhost:3000/onepath-bridge.js" >nul 2>&1
if exist "%~dp0onepath-bridge.js" goto SCRIPT_READY

:: Try powershell fallback from local server
powershell -Command "try { Invoke-WebRequest -Uri 'http://127.0.0.1:3000/onepath-bridge.js' -OutFile '%~dp0onepath-bridge.js' -UseBasicParsing } catch {}" >nul 2>&1
if exist "%~dp0onepath-bridge.js" goto SCRIPT_READY

:: Try cloud fallback
curl.exe -f -s -o "%~dp0onepath-bridge.js" "https://lis.onepathlab.com/onepath-bridge.js" >nul 2>&1
if exist "%~dp0onepath-bridge.js" goto SCRIPT_READY

echo.
echo [ERROR] Could not find or download onepath-bridge.js automatically.
echo Please copy onepath-bridge.js into this same folder.
echo.
pause
exit /b 1

:SCRIPT_READY
echo [OK] onepath-bridge.js is ready.
echo.
echo ====================================================================
echo   🔬 Universal Instrument Bridge is Starting on Port 5100...
echo   Keep this window OPEN while testing samples on your machine.
echo   Press Ctrl+C at any time to stop.
echo ====================================================================
echo.

node "%~dp0onepath-bridge.js"

echo.
echo [INFO] Bridge stopped.
pause
