# 🇸🇳 INOVA CYBER SOC & EDR PLATFORM

> Plateforme SOC de dernière génération de détection et réponse aux incidents, enrichie d'une console d'administration et de supervision EDR pour les parcs d'équipements publics.

---

## 🚀 ACCÈS DIRECT À L'ADMINISTRATION (REDIRECTION RAPIDE)

Cliquez sur l'un des liens ci-dessous pour être automatiquement redirigé vers la console d'administration SOC en cours d'exécution :

### 💻 Depuis votre Ordinateur (Local)
👉 **[Accéder à la Page d'Administration SOC](http://localhost:8081/admin)**
👉 **[Accéder à la Gestion des Clients 360°](http://localhost:8081/clients)**

### 📱 Depuis votre Smartphone / iPhone (Wi-Fi local)
👉 **[Accéder à la Page d'Administration SOC sur Mobile](http://192.168.1.99:8081/admin)**
👉 **[Accéder à la Console Clients sur Mobile](http://192.168.1.99:8081/clients)**

*(Note : Votre serveur de développement doit être en cours d'exécution sur votre PC via `npm run dev` pour que ces redirections fonctionnent. Votre téléphone doit être connecté sur le même réseau Wi-Fi).*

---

## 🌟 Fonctionnalités Majeures de la Plateforme

### 1. Espace Clients Cyber 360° & EDR
- **3 Administrations Sénégalaises Seedées par Défaut** :
  - **Impôts et Domaines (DGID)** : 6 PC supervisés (incluant serveurs fiscaux, cadastre et terminaux), dont un poste présentant une alerte de sécurité active.
  - **Ageroute** : 4 terminaux supervisés (SIG et stations techniques d'ingénieurs).
  - **Trésorerie Publique** : 5 PC supervisés, dont le poste comptable principal (`tresor-pc-receveur`) configuré en état de **quarantaine réseau / isolé**.
- **Actions EDR Directes et Interactives** :
  - **Network Quarantine** : Isoler ou reconnecter n'importe quel ordinateur du réseau à distance avec animation visuelle d'alerte et sauvegarde locale.
  - **Scan de vulnérabilités** : Lancez des scans approfondis en direct avec barres de progression interactives.
  - **Rapports Forensic (DFIR)** : Téléchargement immédiat de fichiers logs forensiques techniques de diagnostic.
- **Gestion Administrative des Contrats** :
  - Zone de dépôt (drag-and-drop) de contrats signés mettant à jour le statut client en direct.
  - Prévisualiseur de contrat juridique officiel au style verre dépoli (glassmorphism) avec signatures électroniques en filigrane.
  - Générateur dynamique et téléchargement rapide de contrat juridique personnalisé d'un simple clic.

### 2. Intégration Threat Intelligence & SIEM
- Visualisation interactive de la carte des menaces mondiales et locales (**Threat Map**).
- Intégration de la suite SOC open-source :
  - **Wazuh** (SIEM/XDR)
  - **Shuffle** (SOAR Playbooks)
  - **TheHive** (Incident Case Management)
  - **MISP** (Threat Intelligence Share)
  - **VirusTotal** (Enrichissement)

---

## 🛠️ Démarrage Rapide en Local

1. **Installer les dépendances** :
   ```bash
   npm install
   ```

2. **Démarrer le serveur de développement (exposé sur le réseau)** :
   ```bash
   npm run dev
   ```

3. **Compiler pour la production** :
   ```bash
   npm run build
   ```
