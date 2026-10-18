@echo off
echo ================================================
echo   INOVA-IRIS - Ouverture du port 8080
echo ================================================
netsh advfirewall firewall delete rule name="INOVA-IRIS Dev 8080" >nul 2>&1
netsh advfirewall firewall add rule name="INOVA-IRIS Dev 8080" dir=in action=allow protocol=TCP localport=8080
netsh advfirewall firewall add rule name="INOVA-IRIS Dev 8080 OUT" dir=out action=allow protocol=TCP localport=8080
echo.
echo [OK] Regles de pare-feu ajoutees pour le port 8080
echo [OK] Vous pouvez maintenant acceder a l'application
echo     depuis n'importe quel appareil sur le reseau
echo.
pause
