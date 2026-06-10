# Guide Infrastructure SOC — INOVA-IRIS

## Architecture cible

```
Internet
   │
   ├── Vercel (frontend inova-iris)
   │       ↕ HTTPS
   ├── Supabase (DB PostgreSQL + Edge Functions Deno)
   │       ↕ HTTPS / API REST
   └── VPS Linux dédié (ex: Hetzner, OVH, DigitalOcean)
           ├── Wazuh Manager + API REST  :55000
           ├── TheHive 5                 :9000
           ├── MISP                      :443
           ├── Shuffle SOAR              :3001
           └── DFIR-IRIS                 :443
```

> **Important :** Les outils SOC doivent être sur un serveur Linux accessible depuis internet.  
> Ne jamais les installer sur votre machine de développement Windows locale.

---

## Prérequis VPS

- OS : **Ubuntu 22.04 LTS** (recommandé)
- CPU : 4 vCPU minimum (8 pour tout installer)
- RAM : 8 GB minimum (16 GB recommandé)
- Disque : 100 GB SSD
- IP publique fixe

Fournisseurs recommandés :
| Fournisseur | Specs | Prix | Lien |
|-------------|-------|------|------|
| Hetzner CPX31 | 4 vCPU / 8 GB | ~15€/mois | https://hetzner.com |
| OVH VPS Value | 4 vCPU / 8 GB | ~20€/mois | https://ovhcloud.com |
| DigitalOcean General | 4 vCPU / 8 GB | ~24$/mois | https://digitalocean.com |

---

## 1. Installation Wazuh (All-in-one)

```bash
# Sur le VPS (Ubuntu 22.04), en tant que root
curl -sO https://packages.wazuh.com/4.9/wazuh-install.sh
curl -sO https://packages.wazuh.com/4.9/config.yml

# Éditer config.yml : remplacer <your_IP> par l'IP publique du VPS
nano config.yml

# Lancer l'installation complète (Manager + Indexer + Dashboard)
bash wazuh-install.sh -a

# Conserver le mot de passe admin affiché à la fin de l'installation !
```

### Activer l'API REST Wazuh

```bash
# Ouvrir le port API dans le firewall
ufw allow 55000/tcp
ufw allow 1514/tcp   # agents
ufw allow 1515/tcp   # enrollment agents

# Vérifier que l'API répond
curl -k -u "wazuh-wui:wazuh-wui" \
  https://localhost:55000/security/user/authenticate -X POST

# Changer le mot de passe par défaut (OBLIGATOIRE en production)
curl -k -u "wazuh-wui:wazuh-wui" \
  -X PUT "https://localhost:55000/security/users/1" \
  -H "Content-Type: application/json" \
  -d '{"password": "NOUVEAU_MOT_DE_PASSE_FORT"}'
```

### Variables Supabase pour Wazuh

```bash
npx supabase secrets set WAZUH_URL=https://VPS_IP:55000
npx supabase secrets set WAZUH_USER=wazuh-wui
npx supabase secrets set WAZUH_PASSWORD=VOTRE_MOT_DE_PASSE
```

---

## 2. Installation TheHive 5

```bash
# Prérequis : Java 11
apt install -y openjdk-11-jre-headless

# Ajouter le dépôt TheHive
wget -qO- https://raw.githubusercontent.com/StrangebeeHQ/TheHive/main/PGPkey.pub | gpg --dearmor -o /usr/share/keyrings/strangebee-archive-keyring.gpg
echo 'deb [arch=all signed-by=/usr/share/keyrings/strangebee-archive-keyring.gpg] https://deb.strangebee.com thehive-5.x main' \
  > /etc/apt/sources.list.d/strangebee.list
apt update
apt install -y thehive

# Démarrer TheHive
systemctl enable thehive
systemctl start thehive

# Ouvrir le port
ufw allow 9000/tcp
```

### Récupérer la clé API TheHive

1. Ouvrir `http://VPS_IP:9000`
2. Se connecter (admin / secret par défaut, à changer !)
3. Menu : **Administration → Users → votre compte → Create API Key**

```bash
npx supabase secrets set THEHIVE_URL=http://VPS_IP:9000
npx supabase secrets set THEHIVE_API_KEY=VOTRE_CLE_API
```

---

## 3. Installation MISP

```bash
# Installation automatisée via script officiel
wget -O /tmp/INSTALL.sh https://raw.githubusercontent.com/MISP/MISP/2.4/INSTALL/INSTALL.sh
bash /tmp/INSTALL.sh -A  # installation automatique Ubuntu

# Ouvrir le port
ufw allow 443/tcp
ufw allow 80/tcp
```

### Récupérer la clé API MISP

1. Ouvrir `https://VPS_IP`
2. Connexion : admin@admin.test / admin (à changer !)
3. Menu : **Event Actions → Automation** → copier l'auth key

```bash
npx supabase secrets set MISP_URL=https://VPS_IP
npx supabase secrets set MISP_API_KEY=VOTRE_AUTH_KEY
```

---

## 4. VirusTotal (API cloud — pas d'installation serveur)

1. Créer un compte sur https://www.virustotal.com
2. Aller dans **My API key** (compte gratuit : 500 requêtes/jour)

```bash
npx supabase secrets set VIRUSTOTAL_API_KEY=VOTRE_CLE_API
```

---

## 5. Installation Shuffle SOAR

```bash
# Prérequis : Docker + Docker Compose
apt install -y docker.io docker-compose

# Récupérer Shuffle
git clone https://github.com/Shuffle/Shuffle
cd Shuffle

# Démarrer
docker-compose up -d

# Ouvrir le port
ufw allow 3001/tcp
```

### Récupérer la clé API Shuffle

1. Ouvrir `http://VPS_IP:3001`
2. Créer un compte admin
3. Menu : **Settings → API Key → Generate**

```bash
npx supabase secrets set SHUFFLE_URL=http://VPS_IP:3001
npx supabase secrets set SHUFFLE_API_KEY=VOTRE_CLE_API
```

---

## 6. Déployer les Edge Functions Supabase

```bash
# Depuis le dossier du projet inova-iris
npx supabase login
npx supabase link --project-ref pdzxabmqrlukhngnrkki

# Déployer toutes les fonctions SOC
npx supabase functions deploy check-connector
npx supabase functions deploy sync-wazuh-alerts
npx supabase functions deploy sync-misp-iocs
npx supabase functions deploy sync-thehive-cases
npx supabase functions deploy sync-shuffle-runs

# Appliquer les migrations DB
npx supabase db push
```

---

## 7. Tester les connexions

```bash
# Test manuel de la fonction check-connector
curl -X POST "https://pdzxabmqrlukhngnrkki.supabase.co/functions/v1/check-connector" \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"connector": "all"}'

# Résultat attendu :
# {"results":[
#   {"id":"wazuh","status":"online","latencyMs":42,"message":"OK (42ms)"},
#   {"id":"thehive","status":"online","latencyMs":118,"message":"OK (118ms)"},
#   ...
# ]}
```

Ou utiliser directement la page `/integrations` de la plateforme → bouton **Vérifier tous**.

---

## 8. Automatiser la synchronisation (cron)

Dans Supabase Dashboard → **Database → Extensions**, activer `pg_cron`, puis :

```sql
-- Synchroniser les alertes Wazuh toutes les 5 minutes
SELECT cron.schedule(
  'sync-wazuh-5min',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url := 'https://pdzxabmqrlukhngnrkki.supabase.co/functions/v1/sync-wazuh-alerts',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  )$$
);

-- Synchroniser les IOCs MISP toutes les heures
SELECT cron.schedule(
  'sync-misp-1h',
  '0 * * * *',
  $$SELECT net.http_post(
    url := 'https://pdzxabmqrlukhngnrkki.supabase.co/functions/v1/sync-misp-iocs',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  )$$
);

-- Synchroniser les cas TheHive toutes les 10 minutes
SELECT cron.schedule(
  'sync-thehive-10min',
  '*/10 * * * *',
  $$SELECT net.http_post(
    url := 'https://pdzxabmqrlukhngnrkki.supabase.co/functions/v1/sync-thehive-cases',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  )$$
);
```

---

## Flux de données complet

```
Endpoints surveillés
      │ agents Wazuh (port 1514)
      ▼
VPS Linux
  Wazuh Manager ──────────────────────────────────────────────┐
  TheHive 5 ──────────────────────────────────────────────────┤
  MISP ───────────────────────────────────────────────────────┤
  Shuffle SOAR ───────────────────────────────────────────────┤
      │                                                        │
      │ API REST (HTTPS)                                       │
      ▼                                                        │
Supabase Edge Functions (Deno)                                │
  sync-wazuh-alerts ──→ Table alerts                          │
  sync-misp-iocs ─────→ Table iocs                            │
  sync-thehive-cases ─→ Table thehive_cases                  │
  sync-shuffle-runs ──→ Table shuffle_runs                    │
  check-connector ────→ Statuts temps réel ◄──────────────────┘
      │
      │ Supabase JS SDK
      ▼
Vercel (inova-iris frontend)
  Dashboard SOC ← données réelles
  Page /integrations ← statuts connecteurs temps réel
```
