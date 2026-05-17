# Documentation Complète des Outils SOC

## 1. WAZUH — SIEM & Détection de Menaces

### Possibilités Principales

#### Collecte & Détection
- **Collecte des logs centralisés** : Aggrégation des logs systèmes, applicatifs et réseau de milliers d'endpoints (Linux, Windows, macOS).
- **Règles de détection MITRE ATT&CK** : Détection basée sur les tactiques et techniques du framework MITRE ATT&CK pour identifier les comportements malveillants.
- **File Integrity Monitoring (FIM)** : Surveillance en temps réel des modifications de fichiers critiques et alertes immédiates en cas de modification non autorisée.
- **Détection d'anomalies comportementales** : Identification des écarts par rapport aux patterns normaux de l'utilisateur et du système.

#### **Gestion de la Configuration et Automatisation (Configuration Management)** ⭐
- **Audit de configuration** : Évaluation de la conformité des systèmes (CIS Benchmarks, PCI-DSS, HIPAA, GDPR).
- **Durcissement de système d'exploitation (OS Hardening)** : Déploiement automatisé de configurations sécurisées sur les agents.
- **Gestion centralisée des policies** : Définition et application de règles de sécurité cohérentes sur tous les endpoints.
- **Remediation automatisée** : Actions correctives automatiques (redémarrage de service, blocage de connexion, etc.).

#### **Inventaire des actifs (Asset Inventory)** ⭐
- **Gestion des logiciels installés** : Maintenance d'une liste complète des applications et paquets sur chaque endpoint.
- **Détection des versions vulnérables** : Identification automatique des logiciels ou versions exposés à des vulnérabilités connues (CVE).
- **Suivi du cycle de vie des paquets** : Alertes sur les installations non autorisées ou suppressions de logiciels critiques.
- **Génération d'inventaire actif** : Export d'inventaires détaillés pour conformité et audit.

#### **Collecte de Données Réseau et Analyse du Trafic (Network Integration)** ⭐
- **Nature HIDS (Host Intrusion Detection System)** : Wazuh fonctionne principalement comme un HIDS focalisé sur les événements au niveau de l'hôte.
- **Intégration avec solutions NTA** : Connecteurs disponibles pour envoyer les IOCs détectés vers des outils de Network Traffic Analysis (Suricata, Zeek, Snort).
- **Logs réseau centralisés** : Agrégation des logs de switches, routeurs et firewalls (syslog, NetFlow).
- **Détection de scanners réseau** : Identification des activités de reconnaissance réseau (port scans, vulnerability scans).

#### **Intégration SIEM (SIEM Integration)** ⭐
- **Webhooks REST API** : Envoi d'alertes à des SIEM externes (Splunk, Elastic Security, Qradar) avec enrichissement automatique.
- **Formatage CEF/Syslog** : Conformité des logs exportés aux standards CEF (Common Event Format) et Syslog RFC5424.
- **Corrélation inter-outils** : Synchronisation bidirectionnelle avec des plateformes de réponse (TheHive, Shuffle, SOAR).
- **Dashboards intégrés** : Visualisation native des métriques et alertes au sein du gestionnaire centralisé.

#### **Génération de Rapports Personnalisés (Custom Reporting)** ⭐
- **Rapports de sécurité automatisés** : Génération de rapports exécutifs, techniques et de conformité (hebdomadaires, mensuels, annuels).
- **Métriques de conformité** : Suivi des scores de conformité (CIS, PCI-DSS, HIPAA, GDPR) avec tendances.
- **Tableaux de bord personnalisés** : Création de dashboards adaptés aux rôles (CISO, équipe SOC, auditeurs).
- **Export multi-formats** : Rapports disponibles en PDF, HTML, CSV pour faciliter la distribution et l'archivage.

### Architecture Déploiement
- **Mode distribué** : Agents légers sur endpoints → Collecteur local (optionnel) → Gestionnaire centralisé.
- **Scalabilité** : Support de milliers d'agents sans dégradation de performance.

---

## 2. THEHIVE — Gestion d'Incidents & Cas

### Possibilités Principales

#### Gestion de Cas
- **Création rapide de cas** : Ouverture de dossiers d'investigation à partir d'alertes ou manuellement.
- **Cycle de vie du cas** : Transitions fluides entre statuts (ouvert → en cours → résolu → fermé).
- **Assignation intelligente** : Routage automatique aux analystes compétents selon le type d'incident.

#### **Intégration d'Alertes (Alert Integration)** ⭐
- **Multi-source ingestion** : Réception d'alertes depuis Wazuh, SIEM (Splunk, Elastic), EDR (Falcon, Defender), IDS/IPS.
- **Mapping automatique** : Transformation des alertes brutes en observables structurés (IP, domaine, hash, etc.).
- **Déduplica

tion d'alertes** : Fusion intelligente d'alertes similaires pour éviter les cas dupliqués.
- **Déclenchement de flux** : Conversion d'alertes en cas automatiquement selon des règles prédéfinies.

#### **Modèles de Cas (Case Templates)** ⭐
- **Flux de travail prédéfinis** : Templates pour incidents courants (malware, phishing, intrusion, données sensibles, attaque DDoS).
- **Tâches pré-remplies** : Checklist d'investigation automatique (collecte logs, analyse mémoire, corrélation MISP, etc.).
- **Observables préconfigurés** : Ajout automatique d'IOCs pertinents basés sur le type d'incident.
- **Assignation basée sur template** : Routage vers les équipes spécialisées selon le type de cas.

#### Gestion des Observables
- **Enrichissement contextuel** : Ajout d'informations d'intelligence de menace sur chaque observable (réputation, historique, géolocalisation).
- **Liens entre observables** : Modélisation des relations (IP → domaine → hash → malware).

#### **Exportation d'IOCs (IOC Export)** ⭐
- **Export vers MISP** : Partage automatique d'IOCs découverts dans TheHive vers MISP pour distribution communautaire.
- **Blocklists externes** : Intégration avec pare-feu, proxies et SIEM pour blocage immédiat.
- **Format standard** : Export en STIX/OpenIOC pour compatibilité cross-platform.
- **Contrôle de partage** : Gestion granulaire des permissions (interne, trusted partners, communauté).

#### Tâches & Collaboration
- **Workflows multi-étapes** : Décomposition de l'investigation en sous-tâches assignables.
- **Timeline d'audit** : Historique complet des actions effectuées par chaque utilisateur.

#### **API & Extensibilité (API & Extensibility)** ⭐
- **REST API robuste** : Intégration programmatique via webhooks et appels API (création de cas, ajout d'observables, transitions de statut).
- **Connecteurs natifs** : Plugins pour Wazuh, MISP, Shuffle, Elasticsearch, Cortex (analyse automatisée).
- **Custom webhooks** : Déclenchement d'actions externes (notifications Slack, création de tickets JIRA, invocation SOAR).
- **SDK multilingues** : Bibliothèques Python, JavaScript, Go pour automatisation personnalisée.

#### **Authentification & Gestion des Rôles (Authentication & Access Control)** ⭐
- **LDAP/Active Directory** : Intégration avec infrastructure d'entreprise existante.
- **OAuth2/OIDC** : Support des fournisseurs d'identité modernes (Okta, Google Workspace, Azure AD).
- **Contrôle d'accès basé sur les rôles (RBAC)** : Rôles granulaires (analyst, admin, viewer) avec permissions par cas/observable.
- **Multi-factor authentication (MFA)** : Sécurisation des comptes analystes critiques.
- **Audit des accès** : Logging de qui a accédé à quels cas et à quel moment.

### Architecture Déploiement
- **Stockage NoSQL** : Elasticsearch pour interrogations rapides.
- **Docker-native** : Déploiement containerisé pour intégration facile.

---

## 3. MISP — Plateforme de Partage d'Intelligence sur les Menaces

### Possibilités Principales

#### Intelligence de Menace
- **Centralisation d'IOCs** : Agrégation d'indicateurs de compromise (IP, domaine, hash, URL) provenant de sources internes et externes.
- **Partage sécurisé** : Distribution contrôlée d'intelligence aux parties prenantes (gouvernements, secteur privé, CERT).
- **Corrélation d'événements** : Groupement d'IOCs liés pour identifier des campagnes coordonnées.

#### **Génération de Règles de Détection (Rule Generation & Export)** ⭐
- **Export YARA** : Conversion automatique d'IOCs en règles YARA pour scanning statique de malwares.
- **Export Sigma** : Génération de règles Sigma (format agnostique) pour SIEM et outils d'analyse.
- **Export Suricata/Snort** : Création de règles IDS/IPS pour détection en temps réel du trafic réseau.
- **Livehunt integration** : Intégration avec VirusTotal Livehunt pour détection proactive de samples suspects.
- **Personnalisation de règles** : Ajustement des seuils et conditions selon l'environnement spécifique.

#### **Analyse de Malware (Malware Analysis Integration)** ⭐
- **Intégration Cuckoo Sandbox** : Soumission automatique de spécimens suspects pour analyse comportementale.
- **Extraction d'IOCs** : Récupération automatisée des hashes, IPs et domaines générés durant l'analyse.
- **Intégration VirusTotal** : Consultation des scanners antivirus et recherche de contexte sur les hashes/URLs.
- **Timeline du malware** : Historique des variantes et versions découvertes dans le temps.

#### **Connectivité API (API Connectivity)** ⭐
- **API REST complète** : Accès programmatique à tous les événements et IOCs (création, modification, recherche, suppression).
- **Feed MISP natif** : Distribution d'IOCs via format MISP JSON directement dans les outils clients.
- **Webhooks bidirectionnels** : Récupération d'alertes externes et déclenchement d'actions (ex. : notify SOAR, update firewall).
- **Authentification par clés API** : Intégration sécurisée multi-applications sans mots de passe.
- **Rate limiting & quotas** : Gestion des accès pour éviter les surcharges.

#### **Interface d'Administration & Gouvernance (Admin Interface & User Management)** ⭐
- **Gestion des organisations** : Création de groupes de partage (intra-organisationnel, secteur public, secteur privé, financier).
- **Niveaux de partage (TLP)** : Classification Traffic Light Protocol (white, green, amber, red) pour contrôler la distribution.
- **Gestion des utilisateurs** : Rôles (admin, analyst, viewer) avec audit trail complet.
- **Pistes d'audit détaillées** : Logging de chaque modification pour conformité et investigations.
- **Backup & restauration** : Stratégies de sauvegarde pour protection des données critiques.

#### **Visualisation des Relations (Graph Visualization)** ⭐
- **Graphes de relation** : Représentation visuelle des liens entre IOCs (une IP peut être liée à plusieurs domaines, hashes, etc.).
- **Analyse de campagne** : Identification de patterns d'attaque commons à travers plusieurs événements et organisations.
- **Clustering automatique** : Regroupement d'IOCs apparentés pour réduire le bruit et identifier des menaces coordonnées.
- **Explorer interactif** : Navigation fluide dans le graphe pour investigation approfondie.

### Intégrations Courantes
- **Cortex** : Analyse automatisée d'observables.
- **Elasticsearch** : Indexation pour recherches rapides.
- **TheHive** : Synchronisation bidirectionnelle de cas et observables.

---

## 4. IRIS (DFIR-IRIS) — Réponse aux Incidents & Intelligence

**Note : IRIS est un terme qui peut revêtir plusieurs formes (composant interne, plateforme CTI, ou outil SOAR). Ci-dessous, nous couvrons le cas le plus courant : IRIS comme plateforme DFIR + SOAR hybride.**

### Possibilités Principales (Version SOAR/DFIR)

#### Investigation Numérique Légale
- **Collecte d'artefacts** : Récupération sécurisée d'éléments de preuve depuis endpoints (mémoire, disque, logs, navigateur).
- **Timeline forensique** : Construction d'une chronologie détaillée des événements pour reconstruction d'attaque.
- **Chaîne de garde** : Documentation stricte des preuves pour garantir admissibilité légale.

#### **Orchestration des Workflows (Workflow Orchestration)** ⭐
- **Construction visuelle de playbooks** : Interface drag-and-drop pour créer des workflows sans code.
- **Bibliothèque de playbooks** : Templates prêts à l'emploi (malware detection, ransomware response, data exfiltration).
- **Déclenchement conditionnel** : Exécution basée sur règles (ex. : IF severity > 8 THEN escalate + block IP).
- **Exécution parallèle** : Simultanéité d'actions indépendantes pour réduire le MTTD.

#### **Automatisation des Actions de Réponse (Automated Response Actions)** ⭐
- **Blocage réseau** : Blocage automatique d'IPs malveillantes sur pare-feu (Fortinet, Palo Alto, Cisco).
- **Isolation de machine** : Déconnexion d'un endpoint du réseau ou restriction de sa bande passante.
- **Mise en quarantaine de fichier** : Suppression ou isolation de fichiers malveillants détectés.
- **Enrichissement d'alerte** : Ajout automatique de contexte de menace (réputation, MITRE, références).
- **Notification et escalade** : Alertes progressives (Slack → Email → SMS → PagerDuty) selon la sévérité.

#### **Intégration Bi-Directionnelle (Bidirectional Integration)** ⭐
- **Orchestration SIEM** : Envoi/réception d'alertes vers Splunk, Elastic, Qradar avec enrichissement mutuel.
- **Commandes EDR** : Exécution de commandes sur endpoints via agents Falcon, Defender, CrowdStrike.
- **Contrôle de pare-feu** : Modification dynamique de règles (blocage IP, quarantine de subnet).
- **Synchronisation TheHive** : Mise à jour bidirectionnelle de statuts de cas et observables.
- **Feedback de correction** : Rapport du succès/échec des remédiation vers le SIEM pour fermeture de cas.

#### **Gestion des Playbooks (Playbook Management)** ⭐
- **Versioning & contrôle de source** : Historique des versions, rollback en cas de problème.
- **Test de playbook** : Environnement de test pour validation avant déploiement en production.
- **Mapping intégration** : Configuration des authentifications et endpoints pour chaque intégration.
- **Documentation automatique** : Génération de documentation pour chaque playbook.

#### **Tableaux de Bord & Métriques (Dashboards & Metrics)** ⭐
- **KPIs d'automatisation** : Taux de couverture automatique, réduction du MTTD/MTTR, nombre de cas auto-résolus.
- **Historique d'exécution** : Logs détaillés de chaque exécution de playbook (entrées, sorties, durée, erreurs).
- **Rapports de performance** : Efficacité des playbooks, coûts évités par automation, ROI de la plateforme.
- **Alertes SLA** : Suivi des objectifs de temps de réponse et escalades automatiques.

#### Modélisation des Menaces (si mode CTI activé)
- **Analyse de campagne** : Regroupement d'attaques liées pour identifier des tendances et acteurs.
- **Profiling d'attaquant** : Construction de profils de menace (TTPs, motivations, cibles).
- **Prédiction de menaces** : Analyse prédictive basée sur l'historique de l'attaquant.

#### Génération de Rapports Stratégiques
- **Rapports exécutifs** : Synthèse en langage non-technique pour la direction.
- **Rapports techniques** : Détails d'IOCs, TTPs, recommandations de remédiation.
- **Métriques de sécurité** : Évolution du posture de sécurité sur le temps.

### Architecture Déploiement
- **Extensibilité** : Support des intégrations custom via SDKs (Python, Go, TypeScript).
- **High Availability** : Clustering pour résilience et scalabilité.

---

## 5. SHUFFLE — Orchestrateur SOAR (Security Orchestration, Automation & Response)

### Possibilités Principales

#### Orchestration Centralisée
- **Ingestion d'alertes** : Réception depuis Wazuh, SIEM, EDR, threat intel via webhooks.
- **Décorrelation** : Agrégation de multiples alertes liées en un événement unique.
- **Routage intelligent** : Envoi vers TheHive, IRIS ou queue opérationnelle selon la criticité.

#### Automation des Playbooks
- **Workflows visuels** : Construction sans code de chaînes d'actions complexes.
- **Actions parallèles** : Exécution simultanée d'enrichissements (MISP, VirusTotal, géolocalisation).
- **Conditions & branches** : Logique décisionnelle pour adapter la réponse au contexte.
- **Intégration enrichissement** : Appels automatiques aux sources de threat intel pour scoring de risque.

#### Réponse Automatisée
- **Notifications multi-canaux** : Email, Slack, Teams, webhooks personnalisés.
- **Actions de correction** : Blocage IP/domaine, isolation machine, suppression de fichier.
- **Création de cas** : Génération automatique de cas TheHive/IRIS avec observables et tâches.

#### Intégrations
- **50+ connecteurs** : Wazuh, SIEM, EDR, pare-feu, cloud, endpoints.
- **Connectors custom** : API REST pour intégrations propriétaires.

---

## Synthèse : Flux d'Incident Type (E2E)

1. **Détection (Wazuh)** : Agent détecte SSH bruteforce → Alerte générée
2. **Notification (Shuffle)** : Webhook Wazuh → Shuffle reçoit alerte
3. **Enrichissement (Shuffle)** : 
   - Interrogue MISP : IP connue ?
   - Interrogue VirusTotal : réputation, historique
   - Calcule score de risque
4. **Création de cas (Shuffle → TheHive)** : 
   - Si malveillant : création de cas automatique
   - Observables : IP, hostname, user
   - Tâches : collecter logs, isoler machine
5. **Investigation (TheHive)** : 
   - Analyste affecté
   - Enrichissement via Cortex (analyse mémoire, sandbox)
   - Lien vers MISP pour intelligence additionnelle
6. **Réponse (Shuffle → pare-feu/EDR)** : 
   - Blocage IP confirmé
   - Isolation de la machine
   - Export IOCs vers MISP
7. **Clôture (IRIS/TheHive)** : 
   - Feedback et lessons learned
   - Métriques : MTTD, MTTR, coûts évités
   - Mise à jour des règles Wazuh/MISP

---

## Meilleures Pratiques de Configuration

- **Centralisation des logs** : Tous les outils envoient données à Wazuh/SIEM central
- **Corrélation multi-source** : Croiser alertes Wazuh + IDS + cloud + EDR
- **Playbooks documentés** : Chaque workflow a runbook et points de décision clairs
- **Feedback loop** : Les actions de réponse informent les règles de détection futures
- **Audit & conformité** : Logging exhaustif pour démonstration de contrôles de sécurité
