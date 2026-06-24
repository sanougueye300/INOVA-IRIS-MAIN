# INOVA-IRIS - Diagnostic & Correctif Wazuh Agent
# Usage (PowerShell Admin) : .\scripts\fix-wazuh-agent-endpoint.ps1

$ENDPOINT   = "3a1uer3pl3hr.cloud.wazuh.com"
$CONF_PATH  = "C:\Program Files (x86)\ossec-agent\ossec.conf"
$LOG_PATH   = "C:\Program Files (x86)\ossec-agent\ossec.log"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  INOVA-IRIS - Diagnostic Wazuh Agent" -ForegroundColor Cyan
Write-Host "  Endpoint cible : $ENDPOINT" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# -- Verification installation --
if (-not (Test-Path $CONF_PATH)) {
    Write-Host "[ERREUR] Agent Wazuh non installe. Chemin introuvable :" -ForegroundColor Red
    Write-Host "  $CONF_PATH" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Agent Wazuh detecte." -ForegroundColor Green

# -- Test connectivite reseau --
Write-Host ""
Write-Host "[NET] Test connectivite vers $ENDPOINT ..." -ForegroundColor Yellow
$port1514 = Test-NetConnection -ComputerName $ENDPOINT -Port 1514 -WarningAction SilentlyContinue
$port1515 = Test-NetConnection -ComputerName $ENDPOINT -Port 1515 -WarningAction SilentlyContinue

if ($port1514.TcpTestSucceeded) {
    Write-Host "  [OK] Port 1514 (agent events) : accessible" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Port 1514 : inaccessible - verifiez le pare-feu" -ForegroundColor Yellow
}
if ($port1515.TcpTestSucceeded) {
    Write-Host "  [OK] Port 1515 (enrollment)    : accessible" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Port 1515 : inaccessible - verifiez le pare-feu" -ForegroundColor Yellow
}

# -- Lire ossec.conf --
Write-Host ""
Write-Host "[CONF] Lecture de ossec.conf ..." -ForegroundColor Yellow
$content = Get-Content $CONF_PATH -Raw

$currentAddr = ([regex]'<address>(.*?)</address>').Match($content).Groups[1].Value
Write-Host "  Adresse actuelle dans ossec.conf : $currentAddr" -ForegroundColor Gray

# -- Corriger si necessaire --
if ($currentAddr -ne $ENDPOINT) {
    Write-Host ""
    Write-Host "[FIX] Correction de l'endpoint ..." -ForegroundColor Yellow
    NET STOP WazuhSvc 2>$null
    Start-Sleep -Seconds 2

    $updated = $content -replace '<address>[^<]*</address>', "<address>$ENDPOINT</address>"
    Set-Content -Path $CONF_PATH -Value $updated -Encoding UTF8 -NoNewline
    Write-Host "  [OK] ossec.conf mis a jour : $ENDPOINT" -ForegroundColor Green
} else {
    Write-Host "  [OK] Endpoint deja correct." -ForegroundColor Green
    NET STOP WazuhSvc 2>$null
    Start-Sleep -Seconds 2
}

# -- Supprimer l'ancienne cle d'enregistrement pour forcer re-enrollment --
$clientKeys = "C:\Program Files (x86)\ossec-agent\client.keys"
if (Test-Path $clientKeys) {
    $keysContent = Get-Content $clientKeys -Raw
    if ($keysContent.Trim() -ne "") {
        Write-Host ""
        Write-Host "[ENROLL] Suppression de l'ancienne cle pour re-enregistrement ..." -ForegroundColor Yellow
        Clear-Content $clientKeys
        Write-Host "  [OK] client.keys reinitialise." -ForegroundColor Green
    }
}

# -- Redemarrer l'agent --
Write-Host ""
Write-Host "[START] Demarrage du service WazuhSvc ..." -ForegroundColor Yellow
NET START WazuhSvc
Start-Sleep -Seconds 5

$svc = Get-Service WazuhSvc -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -eq "Running") {
    Write-Host "  [OK] Service WazuhSvc : ACTIF" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Service non actif." -ForegroundColor Yellow
}

# -- Afficher les derniers logs --
Write-Host ""
Write-Host "[LOGS] Derniers evenements ossec.log :" -ForegroundColor Yellow
if (Test-Path $LOG_PATH) {
    Get-Content $LOG_PATH -Tail 10 | ForEach-Object {
        if ($_ -match "error|ERROR") {
            Write-Host "  $_" -ForegroundColor Red
        } elseif ($_ -match "connected|Connected|registered|Registered") {
            Write-Host "  $_" -ForegroundColor Green
        } else {
            Write-Host "  $_" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  Log non disponible." -ForegroundColor Gray
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Correctif termine !" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Attendez 30 secondes puis actualisez la console Wazuh Cloud." -ForegroundColor White
Write-Host "URL : https://3a1uer3pl3hr.cloud.wazuh.com/app/wz-home" -ForegroundColor Gray
Write-Host ""
