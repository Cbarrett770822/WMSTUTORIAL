@echo off
echo Stopping any running frontend Node.js processes...

:: Find if there's a React dev server running on port 3000 and kill only that process
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
  taskkill /F /PID %%a 2>nul
  if %ERRORLEVEL% EQU 0 (
    echo Successfully terminated existing frontend process.
  )
)

echo Starting frontend server...
cd frontend
npm start
