@echo off
echo Starting WMS Tutorial App Backend on port 8889...

REM Set environment variables for MongoDB and authentication
set "MONGODB_URI=mongodb+srv://charlesbtt7722:8LwMaauBS4Opqody@cluster0.eslgbjq.mongodb.net/test?retryWrites=true&w=majority"
set DEBUG_DB_CONNECTION=true
set DISABLE_DEV_FALLBACK=false
set JWT_SECRET=wms-tutorial-app-secret-key

echo Environment variables set:
echo MONGODB_URI: %MONGODB_URI%
echo DEBUG_DB_CONNECTION: %DEBUG_DB_CONNECTION%
echo DISABLE_DEV_FALLBACK: %DISABLE_DEV_FALLBACK%
echo JWT_SECRET: %JWT_SECRET%

npm start
