# Déploiement de la stack SOC — INOVA-IRIS

Guide pour déployer l'infrastructure backend que la plateforme SaaS pilote :
**Wazuh** (SIEM/EDR), **TheHive** (incidents), **MISP** (threat intel),
**Shuffle** (SOAR), **VirusTotal** (analyse).

> La plateforme React/Supabase ne *contient* pas ces outils : elle s'y connecte
> via des Edge Functions (`supabase/functions/sync-*`, `check-connector`). Ce
> dossier sert à faire tourner les outils eux-mêmes.

---

## Architecture cible

```
   ┌─────────────┐   alertes    ┌──────────────────┐
   │   Wazuh     │ ───────────► │ Supabase Edge Fn │ ──► table `alerts`
   │ (Cloud/VPS) │              │ sync-wazuh-alerts│
   └─────────────┘              └──────────────────┘
          │                              ▲
          │ webhook                       │ lecture
          ▼                              │
   ┌─────────────┐  enrichit   ┌─────────┴────────┐
   │   Shuffle   │ ──VT+MISP──►│  Plateforme SaaS │
   │   (SOAR)    │             │   (React + UI)   │
   └─────┬───────┘             └──────────────────┘
         │ crée case
         ▼
   ┌─────────────┐
   │   TheHive   │ ◄── analyste traite l'incident
   └─────────────┘
```

## Étapes

### 1. VirusTotal (5 min, gratuit)
- Compte sur https://www.virustotal.com → *API Key* dans le profil.
- Plan gratuit : 500 requêtes/jour, 4/min. Suffisant pour démarrer.

### 2. Wazuh — choisir UNE option
- **Cloud (recommandé)** : https://cloud.wazuh.com → clé API.
  → `npx supabase secrets set WAZUH_CLOUD_API_KEY=...`
- **Auto-hébergé** : suivre https://github.com/wazuh/wazuh-docker (séparé,
  car très gourmand). Ports `55000` (API) + `443` (dashboard).
  → `WAZUH_URL`, `WAZUH_USER`, `WAZUH_PASSWORD`

### 3. TheHive + MISP + Shuffle (ce dossier)
```bash
# Sur le VPS Ubuntu 22.04+
git clone <votre-repo> && cd inova-iris-main/deploy
cp .env.example .env
nano .env                 # remplacer TOUS les CHANGEME
chmod +x install.sh
./install.sh
```

### 4. Récupérer les clés API
| Outil   | Où trouver la clé API |
|---------|-----------------------|
| TheHive | Login admin → *Organisation* → créer un user service → *API key* |
| MISP    | *Administration → List Auth Keys → Add* |
| Shuffle | Avatar → *Settings → API key* |
| Cortex  | *Organization → Users → Create API key* (pour brancher dans TheHive) |

### 5. Pousser les secrets dans Supabase
Depuis votre poste de dev, à la racine du repo :
```bash
npx supabase secrets set THEHIVE_URL=http://<IP>:9000 THEHIVE_API_KEY=xxx
npx supabase secrets set MISP_URL=https://<IP>:8443    MISP_API_KEY=xxx
npx supabase secrets set SHUFFLE_URL=http://<IP>:3001  SHUFFLE_API_KEY=xxx
npx supabase secrets set VIRUSTOTAL_API_KEY=xxx
```

### 6. Déployer + tester les Edge Functions
```bash
npx supabase functions deploy check-connector sync-wazuh-alerts \
  sync-thehive-cases sync-misp-iocs sync-shuffle-runs get-wazuh-agents
```
Puis page **Connecteurs & API** → bouton **Tester tous**. Tout doit passer 🟢.

---

## Production : sécuriser

- Mettre un **reverse proxy** (Caddy/Traefik) avec HTTPS Let's Encrypt devant
  chaque service plutôt que d'exposer les ports en clair.
- Restreindre par IP (les Edge Functions Supabase ont des IP sortantes) ou
  utiliser un VPN/Tailscale entre Supabase et le VPS.
- Sauvegardes régulières des volumes (`cassandra-data`, `misp-db-data`, …).
- Surveiller la RAM : `docker stats`.

## Dépannage rapide
| Symptôme | Cause probable |
|----------|----------------|
| ES/OpenSearch crash au boot | `vm.max_map_count` non réglé → relancer `install.sh` |
| TheHive 500 au démarrage | Cassandra pas encore prêt — attendre 3-5 min |
| `check-connector` = offline | Port fermé (ufw) ou mauvaise URL/clé dans les secrets |
| MISP `getVersion` 403 | Auth Key MISP non activée / mauvais rôle |
| TheHive : erreur stockage S3 / bucket | Bucket MinIO `thehive` absent — voir ci-dessous |

### Créer le bucket MinIO `thehive` (une seule fois)

TheHive stocke les pièces jointes dans MinIO, mais le bucket n'est pas créé
automatiquement :

```bash
docker compose exec minio sh -c \
  "mc alias set local http://localhost:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD && \
   mc mb -p local/thehive"
```
