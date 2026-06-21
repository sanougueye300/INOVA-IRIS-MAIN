#!/usr/bin/env bash
# =============================================================================
# Préparation de l'hôte VPS pour la stack SOC INOVA-IRIS
# A lancer UNE FOIS sur le VPS Ubuntu, avant `docker compose up -d`.
#   chmod +x install.sh && ./install.sh
# =============================================================================
set -euo pipefail

echo "==> 1/5  Installation de Docker + Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi

echo "==> 2/5  Réglages kernel requis par Elasticsearch / OpenSearch"
# vm.max_map_count : sinon ES/OpenSearch refusent de démarrer
if ! grep -q "vm.max_map_count" /etc/sysctl.conf; then
  echo "vm.max_map_count=262144" >> /etc/sysctl.conf
fi
sysctl -w vm.max_map_count=262144

echo "==> 3/5  Vérification du fichier .env"
if [ ! -f .env ]; then
  echo "!! .env absent. Copie depuis .env.example ..."
  cp .env.example .env
  echo "!! ÉDITEZ .env et remplacez TOUS les CHANGEME avant de continuer."
  exit 1
fi
if grep -q "CHANGEME" .env; then
  echo "!! Des valeurs CHANGEME restent dans .env — remplacez-les d'abord."
  exit 1
fi

echo "==> 4/5  Pare-feu (ufw) — ouverture des ports SOC"
if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp        # SSH
  ufw allow 9000/tcp      # TheHive
  ufw allow 9001/tcp      # Cortex
  ufw allow 8443/tcp      # MISP
  ufw allow 3001/tcp      # Shuffle UI
  echo "   (Pensez à 'ufw enable' si le pare-feu est inactif)"
fi

echo "==> 5/5  Démarrage de la stack"
docker compose pull
docker compose up -d

cat <<'EOF'

=============================================================================
 Stack démarrée. Patientez 3-5 min (init OpenSearch/Cassandra), puis :

   TheHive  : http://<VPS_HOST>:9000   (admin@thehive.local / secret)
   Cortex   : http://<VPS_HOST>:9001
   MISP     : https://<VPS_HOST>:8443  (cf. .env ADMIN_EMAIL/PASSWORD)
   Shuffle  : http://<VPS_HOST>:3001   (créer le compte admin au 1er accès)

 Ensuite, dans chaque UI : générer une clé API, puis la pousser dans Supabase
 (depuis votre poste de dev, dans le repo) :

   npx supabase secrets set THEHIVE_URL=http://<VPS_HOST>:9000 THEHIVE_API_KEY=...
   npx supabase secrets set MISP_URL=https://<VPS_HOST>:8443   MISP_API_KEY=...
   npx supabase secrets set SHUFFLE_URL=http://<VPS_HOST>:3001 SHUFFLE_API_KEY=...
   npx supabase secrets set VIRUSTOTAL_API_KEY=...

 Puis tester via la page "Connecteurs & API" de la plateforme.
=============================================================================
EOF
