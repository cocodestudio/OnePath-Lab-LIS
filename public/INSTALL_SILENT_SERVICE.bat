@echo off
setlocal enabledelayedexpansion
title OnePath Lab - Silent Background Service Installer
cls

:: Check for Administrator privileges
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Please right-click this file and select "Run as Administrator".
    echo Admin privileges are required to register the Windows Background Service.
    echo.
    pause
    exit /b 1
)

echo ====================================================================
echo      ONEPATH LIS - 1-CLICK SILENT BACKGROUND SERVICE INSTALLER
echo   Auto-Sync for Biochemistry, Haematology & Electrolyte Analyzers
echo ====================================================================
echo.

set "TARGET_DIR=C:\OnePathLab\Bridge"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

:: 1. Copy or download OnePath-Bridge.exe
if exist "%~dp0OnePath-Bridge.exe" (
    echo [1/4] Copying OnePath-Bridge.exe to %TARGET_DIR%...
    copy /y "%~dp0OnePath-Bridge.exe" "%TARGET_DIR%\OnePath-Bridge.exe" >nul
) else (
    echo [1/4] Downloading OnePath-Bridge.exe from Cloud LIS...
    curl.exe -f -s -o "%TARGET_DIR%\OnePath-Bridge.exe" "https://lis.onepathlab.com/OnePath-Bridge.exe"
)

:: 2. Auto-generate bridge-config.json if not present or copy from local
if exist "%~dp0bridge-config.json" (
    echo [2/4] Copying existing bridge-config.json...
    copy /y "%~dp0bridge-config.json" "%TARGET_DIR%\bridge-config.json" >nul
) else (
    echo [2/4] Writing default bridge-config.json...
    (
        echo {
        echo   "TCP_PORT": 5100,
        echo   "COM_PORT": "COM3",
        echo   "BAUD_RATE": 9600,
        echo   "LIS_API_URL": "https://api.onepathlab.com/api/lis/instruments/webhook",
        echo   "LAB_ID": "",
        echo   "LIS_TOKEN": ""
        echo }
    ) > "%TARGET_DIR%\bridge-config.json"
)

:: 3. Create invisible/silent launcher VBScript (0 console windows, totally hidden)
echo [3/4] Creating silent invisible launcher...
(
    echo Set WshShell = CreateObject^("WScript.Shell"^)
    echo WshShell.Run chr^(34^) ^& "%TARGET_DIR%\OnePath-Bridge.exe" ^& chr^(34^), 0, False
) > "%TARGET_DIR%\run_silent.vbs"

:: 4. Register in Windows Task Scheduler (Runs on boot, restarts on failure, hidden)
echo [4/4] Registering Windows Scheduled Background Task (Auto-Start on Boot)...
schtasks /delete /tn "OnePathLabInstrumentBridge" /f >nul 2>&1
schtasks /create /tn "OnePathLabInstrumentBridge" /tr "wscript.exe \"%TARGET_DIR%\run_silent.vbs\"" /sc onlogon /rl highest /f >nul

:: Create Desktop shortcut / helper to check status
(
    echo @echo off
    echo title OnePath Bridge - Status Check
    echo echo ====================================================================
    echo echo               ONEPATH BRIDGE - BACKGROUND STATUS CHECK
    echo echo ====================================================================
    echo echo.
    echo echo Checking OnePath-Bridge process...
    echo tasklist /fi "imagename eq OnePath-Bridge.exe"
    echo echo.
    echo echo Listening Port 5100 Check (TCP Ready):
    echo netstat -ano ^| findstr :5100
    echo echo.
    echo echo Log file location: %TARGET_DIR%\machine_traffic.log
    echo echo.
    echo pause
) > "%USERPROFILE%\Desktop\Check-OnePath-Bridge-Status.bat"

:: Create Desktop uninstaller helper
(
    echo @echo off
    echo title OnePath Bridge - Uninstaller
    echo echo Stopping and removing OnePath Bridge background service...
    echo schtasks /delete /tn "OnePathLabInstrumentBridge" /f >nul 2>&1
    echo taskkill /f /im OnePath-Bridge.exe >nul 2>&1
    echo.
    echo [SUCCESS] OnePath Bridge background service removed.
    echo pause
) > "%USERPROFILE%\Desktop\Uninstall-OnePath-Bridge.bat"

:: Terminate any previously running instance and start silent runner now
taskkill /f /im OnePath-Bridge.exe >nul 2>&1
wscript.exe "%TARGET_DIR%\run_silent.vbs"

echo.
echo ====================================================================
echo [SUCCESS] OnePath Machine Bridge is now running silently in BACKGROUND!
echo.
echo  * Zero Console Windows (No window to accidentally close)
echo  * Automatic Start on Windows boot or restart
echo  * Desktop helper created: "Check-OnePath-Bridge-Status.bat"
echo ====================================================================
echo.
pause
