@echo off
REM ============================================================
REM  AWAIS X MD - Windows 24/7 launcher (restarts the bot after a crash)
REM  Usage:  start.bat                 menu on the first start, then runs forever
REM          start.bat --terminal      skip the menu: personal mode, code shown here
REM          start.bat --telegram      skip the menu: Telegram bot mode
REM  Stop with CTRL+C (answer Y). Keep the PC awake: Windows Settings, System, Power, Sleep = Never,
REM  and the lid-close action = Do nothing (Control Panel, Power Options).
REM ============================================================
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title AWAIS X MD

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js is not installed - the bot needs Node.js 18 or newer.
  echo     Run install-windows.bat first, or install it from https://nodejs.org
  pause
  exit /b 2
)

set AWAIS_RESTART=

:loop
node index.js %*
set CODE=%errorlevel%

REM exit codes 0 = normal, 2 = config error, 130 = CTRL+C: do not loop
if "%CODE%"=="0" goto :done
if "%CODE%"=="2" goto :done
if "%CODE%"=="130" goto :done

REM after the first start, restarts never open the menu again
set AWAIS_RESTART=1
echo.
echo [!] The bot stopped (exit code %CODE%). Restarting in 5 seconds... (CTRL+C to stop)
timeout /t 5 /nobreak >nul
goto :loop

:done
echo.
echo Bot stopped (exit code %CODE%).
pause
exit /b %CODE%
