@echo off
setlocal EnableExtensions
title AI Poker Face
cd /d "%~dp0"

echo.
echo   ==================================================
echo     AI POKER FACE  -  Keep Your Face. Beat the Laugh.
echo   ==================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [error] Node.js was not found on this computer.
  echo           Install Node.js 22 LTS ^(or 20.19+^) from https://nodejs.org
  echo           then run this file again.
  goto :fail
)
for /f "delims=" %%v in ('node -v') do set "NODE_VERSION=%%v"
echo   Node.js %NODE_VERSION% found.

if not exist "node_modules\@mediapipe\tasks-vision\package.json" (
  echo.
  echo   Dependencies are not installed yet. Running "npm install" now.
  echo   This is a one-time step and needs an internet connection.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo   [error] "npm install" failed. Read the messages above, fix the problem,
    echo           then run this file again.
    goto :fail
  )
)

echo.
echo   Starting the local game server...
echo   The game opens at  http://localhost:5173  ^(use Chrome or Edge^).
echo   Keep this window open while playing. Press Ctrl+C here to stop the game.
echo.
call npm run dev -- --open
if errorlevel 1 (
  echo.
  echo   [error] The game server stopped with an error. Read the messages above.
  echo           If AI assets are missing, run:  npm run setup-assets
  goto :fail
)
exit /b 0

:fail
echo.
pause
exit /b 1
