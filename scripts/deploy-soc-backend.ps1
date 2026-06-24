# =============================================================================
# Déploiement du backend SOC INOVA-IRIS (Supabase) — INFRA étape 0 (commune)
# Applique les migrations + déploie toutes les Edge Functions des connecteurs.
#
# Prérequis : npx supabase login  (une fois)
# Usage     : powershell -ExecutionPolicy Bypass -File scripts/deploy-soc-backend.ps1
# =============================================================================
$ErrorActionPreference = "Stop"
$ProjectRef = "bolhdnirahvcppejhcyw"

Write-Host "==> 1/4  Vérification de l'authentification Supabase" -ForegroundColor Cyan
$check = npx supabase projects list 2>&1 | Out-String
if ($check -match "Access token not provided") {
  Write-Host "!! Pas authentifié. Lancez d'abord :  npx supabase login" -ForegroundColor Red
  exit 1
}
Write-Host "   OK." -ForegroundColor Green

Write-Host "==> 2/4  Liaison du projet ($ProjectRef)" -ForegroundColor Cyan
npx supabase link --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) { Write-Host "!! Échec du link." -ForegroundColor Red; exit 1 }

Write-Host "==> 3/4  Application des migrations (db push)" -ForegroundColor Cyan
npx supabase db push
if ($LASTEXITCODE -ne 0) { Write-Host "!! Échec db push." -ForegroundColor Red; exit 1 }

Write-Host "==> 4/4  Déploiement des Edge Functions" -ForegroundColor Cyan
$functions = @(
  "check-connector",
  "sync-wazuh-alerts",
  "get-wazuh-agents",
  "sync-thehive-cases",
  "sync-misp-iocs",
  "sync-shuffle-runs",
  "soar-enrich-alert"
)
foreach ($fn in $functions) {
  Write-Host "   -> deploy $fn" -ForegroundColor DarkCyan
  npx supabase functions deploy $fn
  if ($LASTEXITCODE -ne 0) { Write-Host "!! Échec deploy $fn" -ForegroundColor Red; exit 1 }
}

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Green
Write-Host " Backend déployé. Prochaine étape : poser les secrets des outils" -ForegroundColor Green
Write-Host "   npx supabase secrets set VIRUSTOTAL_API_KEY=..." -ForegroundColor Green
Write-Host "   npx supabase secrets set WAZUH_CLOUD_API_KEY=..." -ForegroundColor Green
Write-Host " Puis : page Connecteurs & API -> Tester tous" -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Green
