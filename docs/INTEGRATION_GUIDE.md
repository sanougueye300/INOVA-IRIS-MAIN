# Guide d'Intégration — Fonctionnalités Enrichies des Outils SOC

## Vue d'Ensemble

Ce guide documente les fonctionnalités enrichies intégrées aux composants UI des outils SOC (Wazuh, TheHive, MISP, Shuffle).

---

## 1. **WAZUH** — Fonctionnalités Enrichies

### Onglets Disponibles

#### 1.1 Agents
- **Arbre des agents** : Tableau complet avec statut, version, dernières logs
- Filtrage par statut (active, disconnected, pending)

#### 1.2 Règles
- **Règles actives** : Affichage avec niveau de sévérité, toggle activation/désactivation
- **Techniques MITRE** : Graphique en barres des techniques détectées
- **Export vers TheHive** : Bouton pour envoyer les alertes à TheHive

#### 1.3 Inventaire (NEW)
- **Liste des logiciels installés** : Affichage des packages avec versions
- **Détection des CVE** : Identification des versions vulnérables
- **Badges de sévérité** : Mise en évidence des packages critiques

#### 1.4 Configuration (NEW)
- **Gestion de configuration** : Audit de conformité (CIS, PCI-DSS, GDPR)
- **Indicateurs de conformité** : Barres de progression pour chaque benchmark
- **Durcissement OS** : Policies de sécurisation appliquées

#### 1.5 Rapports (NEW)
- **Génération de rapports** : Rapports hebdomadaires, conformité, métriques MITRE
- **Formats multiples** : PDF, HTML, CSV
- **Export automatique** : Téléchargement direct depuis la UI

### API & Intégration
```javascript
// Exemple : Export des alertes Wazuh
POST /api/wazuh/alerts/export
{
  "format": "pdf",
  "benchmark": "CIS",
  "date_range": "last_week"
}
```

---

## 2. **THEHIVE** — Fonctionnalités Enrichies

### Onglets Disponibles

#### 2.1 Kanban
- **Tableau Kanban** : Colonnes (Ouvert → En cours → Résolu → Fermé)
- **Observables** : Affichage des IOCs liés à chaque cas
- **Timeline** : Historique détaillé des actions et commentaires

#### 2.2 Templates (NEW)
- **Cas Templates** : Workflows prédéfinis pour incident types
  - Malware Detection : 8 tâches
  - Phishing Campaign : 6 tâches
  - Intrusion Attempt : 10 tâches
  - Data Exfiltration : 12 tâches
- **Création rapide** : Un clic pour lancer un template

#### 2.3 Intégrations (NEW)
- **Alert Integration** : Réception depuis Wazuh, Elastic, CrowdStrike, Suricata
- **Status des connecteurs** : Affichage du taux d'alertes par source
- **IOC Export** : Vers MISP, pare-feu, SIEM avec formats standard (STIX, CSV, JSON)

#### 2.4 API & Rôles (NEW)
- **Authentification** : OAuth2/OIDC, LDAP, MFA, Clés API
- **RBAC** : Admin, Analyst, Viewer, Custom roles
- **Webhooks REST** : Intégration avec Shuffle, Cortex, MISP
- **SDKs** : Python, JavaScript, Go disponibles

### Données Mock & Endpoints
```javascript
// Format d'alerte intégrée
{
  "id": "alert-123",
  "source": "wazuh",
  "observables": [
    { "type": "ip", "value": "192.168.1.100" },
    { "type": "domain", "value": "evil.com" }
  ],
  "severity": 8,
  "tlp": "amber"
}
```

---

## 3. **MISP** — Fonctionnalités Enrichies

### Onglets Disponibles

#### 3.1 Événements
- **Recherche d'IOCs** : Filtrage en temps réel
- **Niveaux de menace** : L1-L4 avec couleurs
- **Corrélation Wazuh** : Lien bidirectionnel avec les alertes

#### 3.2 Génération de Règles (NEW)
- **Export YARA** : Règles de scanning malware
- **Export Sigma** : Format standard SIEM-agnostique
- **Export Suricata/Snort** : Règles IDS/IPS
- **VirusTotal Livehunt** : Intégration détection proactive

#### 3.3 Analyse de Malware (NEW)
- **Cuckoo Sandbox** : Soumission de samples, extraction IOCs
- **VirusTotal** : Scans antivirus et YARA matches
- **ANY.RUN** : Analyse interactive (premium)
- **Historique variants** : Suivi des évolutions du malware

#### 3.4 Partage & API (NEW)
- **TLP Levels** : WHITE, GREEN, AMBER, RED avec distribution cible
- **Graph Visualization** : Relations IOC → Domaine → Hash → Malware
- **Campaign Analysis** : Regroupement d'attaques liées
- **Attacker Profiling** : TTPs et cibles associées
- **REST API** : CRUD complet, Feed MISP JSON, Webhooks

### Formats de Règles Supportés
```yaml
# YARA
rule emotet_c2 {
  meta: author = "MISP"
  strings: $a = "emotet" nocase
  condition: $a
}

# Sigma (SIEM-agnostique)
detection:
  selection:
    EventID: 4688
    CommandLine|contains: 'powershell'
```

---

## 4. **SHUFFLE (SOAR)** — Fonctionnalités Enrichies

### Onglets Disponibles

#### 4.1 Connecteurs
- **Statut des connecteurs** : 🟢 up, 🟡 degraded, 🔴 down
- **Latence & Sync** : Historique des synchronisations
- **Alertes enrichies** : % d'alertes avec MISP + VirusTotal (72% mock)

#### 4.2 Playbooks & Workflows (NEW)
- **Orchestration visuelle** : Construction drag-and-drop
- **Templates de playbooks** :
  - Malware Detection : Wazuh → MISP → VT → TheHive
  - SSH Bruteforce Response : IP block → Isolate → SIEM notify
  - Phishing Investigation : URL analysis → Email extraction → Report
  - Ransomware Containment : Process kill → Backup verify → Escalate
- **Statuts** : active, testing, draft

#### 4.3 Actions Automatisées (NEW)
- **Blocage réseau** : Firewall, Proxy, EDR
- **Isolation machine** : Network, EDR, VM
- **Mise en quarantaine** : Fichiers, Processus, Contacts
- **Enrichissement** : SIEM, SOAR, Case
- **Notifications** : Slack, Email, SMS, PagerDuty
- **Exports** : MISP, Threat feeds, Blocklists

#### 4.4 Métriques (NEW)
- **KPIs d'automatisation** :
  - Cas auto-créés (7j) : 156
  - Alertes auto-enrichies : 87%
  - MTTD moyen : 4.2 min
  - MTTR moyen : 28 min
  - Taux de succès : 94.3%
  - Coûts évités (est.) : $847k/année

---

## Flux Intégré E2E

```
1. WAZUH (Détection)
   └─ Agent détecte SSH bruteforce → Alerte niveau 10

2. SHUFFLE (Orchestration)
   ├─ Reçoit webhook Wazuh
   ├─ Exécute playbook en parallèle:
   │  ├─ MISP : IP connue ?
   │  ├─ VirusTotal : réputation IP
   │  └─ Calcul score risque

3. THEHIVE (Gestion de cas)
   ├─ Création automatique si malveillant
   ├─ Observable enrichis (IP, hostname, user)
   └─ Tâches préremplies (collecte logs, isolation)

4. MISP (Intelligence)
   ├─ Partage IOCs découverts
   ├─ Export vers pare-feu/SIEM
   └─ Alimenté par feedback TheHive

5. IRIS/SOAR (Réponse)
   ├─ Blocage IP automatique
   ├─ Isolation machine
   └─ Notifications & escalade
```

---

## Brancher les API Réelles

### Fichiers à Modifier

1. **src/integrations/supabase/** : Appels API réels
2. **supabase/functions/** : Edge functions pour webhooks
3. **src/lib/soc-mock.ts** : Remplacer mock data par API calls

### Exemple : Wazuh API

```typescript
import axios from 'axios';

const wazuhApi = axios.create({
  baseURL: process.env.WAZUH_API_URL,
  auth: {
    username: process.env.WAZUH_USER,
    password: process.env.WAZUH_PASS
  }
});

// Récupérer les agents
export const fetchWazuhAgents = async () => {
  const { data } = await wazuhApi.get('/agents');
  return data.data.affected_items;
};
```

### Webhooks Shuffle

```typescript
// Configurer webhook dans Wazuh
POST /integrations/webhooks
{
  "url": "https://your-shuffle.instance/api/webhooks/wazuh",
  "format": "json",
  "alert_level": 5
}
```

---

## Checklist d'Implémentation

- [ ] Documentation créée (✅ SOC_TOOLS_DOCUMENTATION.md)
- [ ] Composants enrichis (✅ WazuhToolTab, TheHiveToolTab, MispToolTab, OrchestratorTab)
- [ ] API Wazuh intégrée
- [ ] API TheHive intégrée
- [ ] API MISP intégrée
- [ ] Webhooks Shuffle configurés
- [ ] Authentification sécurisée (OAuth2, API keys)
- [ ] Tests E2E de playbooks
- [ ] Documentation API (OpenAPI/Swagger)
- [ ] Logs & monitoring configurés

---

## Ressources Complémentaires

- **[SOC_TOOLS_DOCUMENTATION.md](./SOC_TOOLS_DOCUMENTATION.md)** : Documentation détaillée des outils
- **[/routes/outils.tsx](./routes/outils.tsx)** : Page d'accès aux outils
- **[/routes/architecture.tsx](./routes/architecture.tsx)** : Architecture complète
- **[/routes/workflow.tsx](./routes/workflow.tsx)** : Scénario de réponse
