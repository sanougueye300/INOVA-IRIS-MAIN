# =============================================================
# INOVA-IRIS — Setup Wazuh Cloud API Key dans Supabase
# Projet : bolhdnirahvcppejhcyw
# =============================================================
# Usage :
#   .\scripts\setup-wazuh-cloud.ps1 -WazuhApiKey "VOTRE_CLE" -SupabasePat "VOTRE_PAT"
#
# Où obtenir le PAT Supabase :
#   https://supabase.com/dashboard/account/tokens → "Generate new token"
# =============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$WazuhApiKey,

    [Parameter(Mandatory=$true)]
    [string]$SupabasePat
)

$PROJECT_REF = "bolhdnirahvcppejhcyw"
$API_BASE    = "https://api.supabase.com/v1"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  INOVA-IRIS — Configuration Wazuh Cloud" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Projet Supabase : $PROJECT_REF" -ForegroundColor Gray
Write-Host ""

# --- Étape 1 : Définir WAZUH_CLOUD_API_KEY ---
Write-Host "[1/3] Définition du secret WAZUH_CLOUD_API_KEY..." -ForegroundColor Yellow

$secretsBody = @(
    @{ name = "WAZUH_CLOUD_API_KEY"; value = $WazuhApiKey }
) | ConvertTo-Json

$headers = @{
    Authorization  = "Bearer $SupabasePat"
    "Content-Type" = "application/json"
}

try {
    $resp = Invoke-RestMethod `
        -Uri "$API_BASE/projects/$PROJECT_REF/secrets" `
        -Method POST `
        -Headers $headers `
        -Body $secretsBody `
        -ErrorAction Stop

    Write-Host "  [OK] Secret WAZUH_CLOUD_API_KEY défini avec succès." -ForegroundColor Green
} catch {
    Write-Host "  [ERREUR] Impossible de définir le secret : $_" -ForegroundColor Red
    Write-Host "  Vérifiez votre PAT Supabase et réessayez." -ForegroundColor Red
    exit 1
}

# --- Étape 2 : Déployer les Edge Functions ---
Write-Host ""
Write-Host "[2/3] Déploiement des Edge Functions Wazuh..." -ForegroundColor Yellow

$env:SUPABASE_ACCESS_TOKEN = $SupabasePat

$functions = @("sync-wazuh-alerts", "get-wazuh-agents", "check-connector")
foreach ($fn in $functions) {
    Write-Host "  Déploiement de $fn..." -NoNewline
    $result = npx supabase functions deploy $fn --project-ref $PROJECT_REF 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " [OK]" -ForegroundColor Green
    } else {
        Write-Host " [AVERTISSEMENT] $result" -ForegroundColor Yellow
    }
}

# --- Étape 3 : Tester la connexion ---
Write-Host ""
Write-Host "[3/3] Test de connexion à l'API Wazuh Cloud..." -ForegroundColor Yellow

try {
    $testResp = Invoke-RestMethod `
        -Uri "https://api.cloud.wazuh.com/v2/info" `
        -Headers @{ "x-api-key" = $WazuhApiKey } `
        -Method GET `
        -ErrorAction Stop

    Write-Host "  [OK] Connexion Wazuh Cloud réussie !" -ForegroundColor Green
    Write-Host "  Réponse : $($testResp | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "  [AVERTISSEMENT] Test de connexion échoué : $_" -ForegroundColor Yellow
    Write-Host "  Vérifiez que la clé API est valide dans la console Wazuh Cloud." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Configuration terminée !" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prochaines étapes :" -ForegroundColor White
Write-Host "  1. Sur la plateforme INOVA-IRIS : Outils → Wazuh → 'Synchroniser alertes'" -ForegroundColor Gray
Write-Host "  2. Connecteurs & API → Wazuh → 'Tester' pour vérifier le statut" -ForegroundColor Gray
Write-Host "  3. Installez l'agent sur les machines client (onglet 'Scénario de supervision')" -ForegroundColor Gray
Write-Host ""
