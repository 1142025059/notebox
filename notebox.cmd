@echo off
setlocal
cd /d "%~dp0"

set "EDGE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%EDGE%" set "EDGE=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

set "NODE=%~dp0node.exe"
if not exist "%NODE%" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not exist "%NODE%" set "NODE=C:\nvm4w\nodejs\node.exe"

if not exist "%NODE%" (
  echo Cannot find Node.js. Extract the portable zip ^(it bundles node.exe^), or install Node.js for a source checkout.
  pause
  exit /b 1
)

start "" /b "%NODE%" "--disable-warning=ExperimentalWarning" "%~dp0scripts\launcher.mjs"

rem Give the server a moment, then open the window from this console process.
rem Starting the browser from wscript delays the window to about 8 seconds.
timeout /t 2 /nobreak >nul

start "" "%EDGE%" "--app=http://127.0.0.1:8787/" "--user-data-dir=%~dp0profile" "--start-maximized" "--no-first-run" "--no-default-browser-check" "--disable-background-mode" "--disable-sync" "--disable-background-networking" "--disable-component-update" "--disable-default-apps" "--no-service-autorun" "--password-store=basic"

exit /b 0
