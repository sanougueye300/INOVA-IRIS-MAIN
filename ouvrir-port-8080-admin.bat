netsh advfirewall firewall delete rule name="INOVA-IRIS Dev 8080 IN" >nul 2>&1
netsh advfirewall firewall delete rule name="INOVA-IRIS Dev 8080 OUT" >nul 2>&1
netsh advfirewall firewall add rule name="INOVA-IRIS Dev 8080 IN" dir=in action=allow protocol=TCP localport=8080
netsh advfirewall firewall add rule name="INOVA-IRIS Dev 8080 OUT" dir=out action=allow protocol=TCP localport=8080
echo [OK] Port 8080 ouvert avec succes !
