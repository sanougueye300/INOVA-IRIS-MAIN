Set objShell = CreateObject("Shell.Application")
objShell.ShellExecute "cmd.exe", "/c netsh advfirewall firewall delete rule name=""INOVA-IRIS Dev 8080"" & netsh advfirewall firewall add rule name=""INOVA-IRIS Dev 8080"" dir=in action=allow protocol=TCP localport=8080 & netsh advfirewall firewall add rule name=""INOVA-IRIS Dev 8080 OUT"" dir=out action=allow protocol=TCP localport=8080 & echo [OK] Port 8080 ouvert avec succes!", "", "runas", 1
WScript.Sleep 3000
MsgBox "Port 8080 ouvert ! L'application est maintenant accessible sur le reseau.", 64, "INOVA-IRIS - Succes"
