@echo off
echo Stopping any running Node.js processes...
taskkill /f /im node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
  echo Successfully terminated existing Node.js processes.
) else (
  echo No Node.js processes were running.
)

echo Starting backend server...
start cmd /k "cd backend && npm start"

echo Waiting for backend to initialize...
timeout /t 5 /nobreak

echo Starting frontend server...
start cmd /k "cd frontend && npm start"

echo Both servers are starting. You can access the application at http://localhost:3000
