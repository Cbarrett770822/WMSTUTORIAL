@echo off
echo Stopping any running Node.js processes...
taskkill /f /im node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
  echo Successfully terminated existing Node.js processes.
) else (
  echo No Node.js processes were running.
)

echo Starting backend server...
cd backend
npm start
