@echo off
REM ============================================================
REM  AWAIS X MD - Windows installer (CMD / PowerShell)
REM  Usage: double-click, or run:  install-windows.bat
REM  Installs Node.js LTS and FFmpeg with winget (only if winget exists),
REM  runs npm install, then starts the bot.
REM ============================================================
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ==== AWAIS X MD - Windows setup starting... ====

set HASWINGET=0
where winget >nul 2>nul && set HASWINGET=1

REM ---- Node.js 18+ ----
set NODEMAJOR=0
where node >nul 2>nul
if errorlevel 1 goto :nonode
for /f %%v in ('node -p "parseInt(process.versions.node)"') do set NODEMAJOR=%%v
:nonode
if %NODEMAJOR% GEQ 18 goto :nodeok

echo [!] Node.js 18 or newer was not found.
if "%HASWINGET%"=="1" goto :wingetnode
echo [X] winget is not available on this PC.
echo     Install Node.js LTS manually from https://nodejs.org  then run this script again.
echo     FFmpeg ^(optional^): https://www.gyan.dev/ffmpeg/builds/
pause
exit /b 2

:wingetnode
echo Installing Node.js LTS with winget...
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
if errorlevel 1 (
  echo [X] winget could not install Node.js. Install it manually from https://nodejs.org and run this script again.
  pause
  exit /b 2
)
echo.
echo [OK] Node.js installed. Windows needs a NEW terminal to see it.
echo      Close this window, open a new CMD, and run install-windows.bat again.
pause
exit /b 0

:nodeok
for /f %%v in ('node -v') do echo [OK] Node.js %%v

REM ---- FFmpeg (optional but recommended) ----
where ffmpeg >nul 2>nul
if not errorlevel 1 goto :ffok
if "%HASWINGET%"=="1" (
  echo Installing FFmpeg with winget...
  winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements
  echo [i] If ffmpeg is not found later, open a new terminal so PATH is refreshed.
) else (
  echo [!] FFmpeg not found and winget is missing. Manual download: https://www.gyan.dev/ffmpeg/builds/
  echo     The bot still starts; sticker/audio/video commands may need it.
)
:ffok

REM ---- npm packages ----
echo.
echo Installing npm packages...
set NPM_CONFIG_ALLOW_GIT=all
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo [X] npm install failed. Check your internet, then try: npm cache clean --force
  pause
  exit /b 2
)
if not exist sessions mkdir sessions
if not exist temp mkdir temp
if not exist tmp mkdir tmp

echo.
echo ==== INSTALL COMPLETE ====
echo  24/7 + auto-restart:       start.bat       ^(menu on first start, then runs forever^)
echo  Personal mode, no Telegram: start.bat --terminal
echo  Change settings:           npm run setup
echo  Keep the laptop awake:     Settings ^> System ^> Power ^> Sleep = Never,
echo                             and lid close = Do nothing ^(Control Panel ^> Power Options^)
echo.
echo Starting the bot ^(24/7 launcher^)...
call start.bat
pause
