# ================================================================
# INOVA-IRIS - Installation complete Wazuh Agent (Windows)
# Usage (PowerShell Admin) :
#   .\scripts\install-wazuh-windows.ps1 -Group "nom-client" -Password "MOT_DE_PASSE"
#
# Ou trouver le mot de passe d'enrollment :
#   https://wucy2fi80s80.cloud.wazuh.com
#   -> Endpoints -> Deploy new agent -> Windows
#   -> Copier la valeur WAZUH_REGISTRATION_PASSWORD dans la commande generee
# ================================================================

param(
    [string]$Group    = "client-default",
    [string]$Password = ""
)

$ENDPOINT  = "wucy2fi80s80.cloud.wazuh.com"
$MSI_URL   = "https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.5-1.msi"
$MSI_PATH  = "$env:TEMP\wazuh-agent.msi"
$CONF_PATH = "C:\Program Files (x86)\ossec-agent\ossec.conf"
$KEYS_PATH = "C:\Program Files (x86)\ossec-agent\client.keys"
$LOG_PATH  = "C:\Program Files (x86)\ossec-agent\ossec.log"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  INOVA-IRIS - Installation Wazuh Agent 4.14.5" -ForegroundColor Cyan
Write-Host "  Manager  : $ENDPOINT" -ForegroundColor Cyan
Write-Host "  Groupe   : $Group" -ForegroundColor Cyan
if ($Password) {
    Write-Host "  Password : ****" -ForegroundColor Cyan
} else {
    Write-Host "  Password : [non fourni - recuperez-le dans Wazuh Cloud]" -ForegroundColor Yellow
}
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

if (-not $Password) {
    Write-Host "[ATTENTION] Mot de passe d'enrollment manquant !" -ForegroundColor Red
    Write-Host ""
    Write-Host "  1. Allez sur : https://$ENDPOINT" -ForegroundColor Yellow
    Write-Host "  2. Cliquez sur 'Deploy new agent' -> Windows" -ForegroundColor Yellow
    Write-Host "  3. Copiez la valeur de WAZUH_REGISTRATION_PASSWORD" -ForegroundColor Yellow
    Write-Host "  4. Relancez ce script avec -Password 'VOTRE_MOT_DE_PASSE'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Exemple :" -ForegroundColor Gray
    Write-Host "  .\install-wazuh-windows.ps1 -Group '$Group' -Password 'abc123xyz'" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# -- ETAPE 0 : Test connectivite et pare-feu --
Write-Host "[0/5] Test connectivite et pare-feu..." -ForegroundColor Yellow
foreach ($port in @(1514, 1515, 443)) {
    $ok = Test-NetConnection -ComputerName $ENDPOINT -Port $port -WarningAction SilentlyContinue -InformationLevel Quiet
    if ($ok) {
        Write-Host "  [OK] Port $port : ouvert" -ForegroundColor Green
    } else {
        Write-Host "  [FIX] Port $port ferme - ouverture dans le pare-feu..." -ForegroundColor Yellow
        netsh advfirewall firewall add rule name="Wazuh Agent $port" dir=out action=allow protocol=TCP remoteport=$port 2>$null
        Write-Host "  [OK] Regle pare-feu ajoutee pour le port $port" -ForegroundColor Green
    }
}

# -- ETAPE 1 : Arreter et desinstaller --
Write-Host ""
Write-Host "[1/5] Arret et desinstallation de l'ancien agent..." -ForegroundColor Yellow
NET STOP WazuhSvc 2>$null
Start-Sleep -Seconds 2
if (Test-Path $MSI_PATH) {
    Start-Process msiexec -ArgumentList "/x `"$MSI_PATH`" /q" -Wait 2>$null
}
Start-Sleep -Seconds 2
Write-Host "  [OK] Nettoyage effectue." -ForegroundColor Green

# -- ETAPE 2 : Telecharger --
Write-Host ""
Write-Host "[2/5] Telechargement de wazuh-agent-4.14.5-1.msi..." -ForegroundColor Yellow
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $MSI_URL -OutFile $MSI_PATH -UseBasicParsing -ErrorAction Stop
    $sizeMB = [math]::Round((Get-Item $MSI_PATH).Length / 1MB, 1)
    Write-Host "  [OK] Fichier telecharge ($sizeMB MB)" -ForegroundColor Green
} catch {
    Write-Host "  [ERREUR] Telechargement echoue : $_" -ForegroundColor Red
    exit 1
}

# -- ETAPE 3 : Installation avec mot de passe --
Write-Host ""
Write-Host "[3/5] Installation de l'agent avec enrollment password..." -ForegroundColor Yellow
$msiArgs = "/i `"$MSI_PATH`" WAZUH_MANAGER=`"$ENDPOINT`" WAZUH_REGISTRATION_SERVER=`"$ENDPOINT`" WAZUH_REGISTRATION_PASSWORD=`"$Password`" WAZUH_AGENT_GROUP=`"$Group`" /q"
$proc = Start-Process msiexec -ArgumentList $msiArgs -Wait -PassThru
if ($proc.ExitCode -eq 0) {
    Write-Host "  [OK] Installation reussie." -ForegroundColor Green
} else {
    Write-Host "  [WARN] Code retour msiexec : $($proc.ExitCode)" -ForegroundColor Yellow
}

# -- ETAPE 4 : Verifier et corriger ossec.conf --
Write-Host ""
Write-Host "[4/5] Verification de la configuration..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

if (Test-Path $CONF_PATH) {
    $conf = Get-Content $CONF_PATH -Raw

    # Corriger l'adresse si necessaire
    $addr = ([regex]'<address>(.*?)</address>').Match($conf).Groups[1].Value
    Write-Host "  [INFO] Adresse dans ossec.conf : $addr" -ForegroundColor Gray
    if ($addr -ne $ENDPOINT) {
        $conf = $conf -replace '<address>[^<]*</address>', "<address>$ENDPOINT</address>"
        Write-Host "  [FIX] Adresse corrigee -> $ENDPOINT" -ForegroundColor Yellow
    }

    # Vider client.keys pour re-enrollment
    if (Test-Path $KEYS_PATH) {
        Clear-Content $KEYS_PATH -ErrorAction SilentlyContinue
        Write-Host "  [OK] client.keys reinitialise (re-enrollment force)." -ForegroundColor Green
    }

    Set-Content $CONF_PATH $conf -Encoding UTF8 -NoNewline
    Write-Host "  [OK] Configuration validee." -ForegroundColor Green
}

# -- ETAPE 5 : Demarrer et verifier --
Write-Host ""
Write-Host "[5/5] Demarrage du service WazuhSvc..." -ForegroundColor Yellow
NET START WazuhSvc
Start-Sleep -Seconds 8

$svc = Get-Service WazuhSvc -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -eq "Running") {
    Write-Host "  [OK] WazuhSvc : ACTIF" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Service non actif." -ForegroundColor Yellow
}

# Logs
Write-Host ""
Write-Host "[LOGS] Verification de la connexion :" -ForegroundColor Yellow
Start-Sleep -Seconds 4
if (Test-Path $LOG_PATH) {
    Get-Content $LOG_PATH -Tail 15 | ForEach-Object {
        if ($_ -match "ERROR|error") { Write-Host "  $_" -ForegroundColor Red }
        elseif ($_ -match "connected|registered|enrollment|key received") { Write-Host "  $_" -ForegroundColor Green }
        else { Write-Host "  $_" -ForegroundColor Gray }
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Installation terminee !" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Attendez 30 secondes puis verifiez :" -ForegroundColor White
Write-Host "https://$ENDPOINT/app/endpoints-summary" -ForegroundColor Blue
Write-Host ""
