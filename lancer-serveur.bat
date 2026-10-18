@echo off
echo ================================================
echo   INOVA-IRIS - Demarrage du serveur de dev
echo ================================================
cd /d "%~dp0"
echo [INFO] Demarrage sur http://localhost:8080
echo [INFO] Acces reseau sur http://192.168.195.1:8080
echo.
npm run dev
