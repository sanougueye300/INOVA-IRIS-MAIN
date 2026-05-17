# 🎯 Guide Rapide — Accéder aux Nouvelles Fonctionnalités

## 🚀 Pour les Utilisateurs (Analyste SOC)

### Où Trouver Quoi ?

#### **1. WAZUH** → `/outils#wazuh`

| Besoin | Allez à | Action |
|--------|---------|--------|
| Lister les agents | **Onglet Agents** | Voir statut, version, dernières logs |
| Gérer les règles de détection | **Onglet Règles** | Activer/Désactiver, toggle règles |
| Voir les logiciels installés | **Onglet Inventaire** 🆕 | Identifier les CVE critiques |
| Auditer la conformité | **Onglet Configuration** 🆕 | Vérifier CIS, PCI-DSS, GDPR |
| Générer des rapports | **Onglet Rapports** 🆕 | PDF, HTML, CSV de conformité |

#### **2. THEHIVE** → `/outils#thehive`

| Besoin | Allez à | Action |
|--------|---------|--------|
| Gérer les cas d'incidents | **Onglet Kanban** | Voir tous les cas (ouvert, en cours, résolu) |
| Créer un cas rapidement | **Onglet Templates** 🆕 | Choisir template (Malware, Phishing, etc.) |
| Lier alertes externes | **Onglet Intégrations** 🆕 | Wazuh, Elastic, CrowdStrike |
| Exporter des IOCs | **Onglet Intégrations** 🆕 | Vers MISP, pare-feu, SIEM |
| Configurer l'authentification | **Onglet API & Rôles** 🆕 | OAuth2, LDAP, MFA, clés API |

#### **3. MISP** → `/outils#misp`

| Besoin | Allez à | Action |
|--------|---------|--------|
| Chercher des IOCs | **Onglet Événements** | Filtrer par type de menace |
| Générer des règles de détection | **Onglet Génération de Règles** 🆕 | YARA, Sigma, Suricata, Snort |
| Analyser un malware | **Onglet Analyse Malware** 🆕 | Soumettre à Cuckoo, VirusTotal |
| Partager l'intelligence | **Onglet Partage & API** 🆕 | Définir TLP, visualiser graphe |

#### **4. SHUFFLE (SOAR)** → `/outils#orchestrator`

| Besoin | Allez à | Action |
|--------|---------|--------|
| Vérifier la santé des connecteurs | **Onglet Connecteurs** | Statut 🟢🟡🔴, latence, sync |
| Créer un playbook d'orchestration | **Onglet Playbooks & Workflows** 🆕 | Choisir template, assembler actions |
| Voir les actions automatisées | **Onglet Actions Automatisées** 🆕 | Blocage, isolation, notifications |
| Consulter les métriques | **Onglet Métriques** 🆕 | MTTD, MTTR, taux réussite, ROI |

---

## 👨‍💻 Pour les Développeurs (Intégration API)

### Structure des Onglets Enrichis

Tous les nouveaux onglets utilisent cette structure :

```typescript
<Tabs defaultValue="onglet1" className="space-y-4">
  <TabsList className="flex h-auto min-h-10 flex-wrap justify-start gap-1">
    <TabsTrigger value="onglet1">Onglet 1</TabsTrigger>
    <TabsTrigger value="onglet2">Onglet 2 🆕</TabsTrigger>
  </TabsList>

  <TabsContent value="onglet1">
    {/* Contenu Card avec icônes + descriptions */}
  </TabsContent>

  <TabsContent value="onglet2">
    {/* Contenu Card avec icônes + descriptions */}
  </TabsContent>
</Tabs>
```

### Icônes Utilisées

- **Settings** → Configuration
- **Package** → Logiciels/Inventaire
- **Webhook** → Intégrations d'alertes
- **LayoutTemplate** → Templates
- **Download** → Export
- **Lock** → Authentification
- **Zap** → Règles/Actions
- **Brain** → Analyse
- **Network** → Partage/Réseau
- **Workflow** → Playbooks
- **TrendingUp** → Métriques

### API à Brancher

Fichiers clés pour intégration API réelle :

1. **src/integrations/supabase/** - Appels API Wazuh, TheHive, MISP
2. **supabase/functions/** - Webhooks Shuffle
3. **src/lib/soc-mock.ts** - Mock data → API réelle
4. **env.local** - Variables d'environnement API

---

## 🔄 Flux d'Usage Type

### Scénario : "Je détecte une menace et je veux répondre"

**Étape 1** → Wazuh détecte l'alerte
```
Allez à : /outils#wazuh (Onglet Règles)
Voir : Règle qui a déclenché l'alerte
Niveau : 8+ = alerte critique
```

**Étape 2** → Shuffle orchestre la réponse
```
Allez à : /outils#orchestrator (Onglet Playbooks)
Voir : Quel playbook a été déclenché
Vérifier : Statut d'exécution (success/failed)
```

**Étape 3** → Créez un cas dans TheHive
```
Allez à : /outils#thehive (Onglet Templates)
Choisir : Template correspondant à l'incident
Crée automatiquement : Cas avec observables + tâches
```

**Étape 4** → Enrichissez avec MISP
```
Allez à : /outils#misp (Onglet Partage & API)
Exportez : IOCs découverts vers blocklist
Générés : Règles YARA/Sigma pour IDS
```

**Étape 5** → Suivez l'automatisation
```
Allez à : /outils#orchestrator (Onglet Métriques)
Consultez : MTTD, MTTR, taux réussite
Validez : Actions qui ont eu un impact
```

---

## ❓ FAQ — Questions Fréquentes

### Q: Comment accéder aux nouvelles fonctionnalités ?
**R:** Naviguez vers `/outils` et cliquez sur l'onglet correspondant. Les onglets marqués 🆕 sont les nouveaux.

### Q: Puis-je créer un cas TheHive directement depuis Wazuh ?
**R:** Oui ! Via **Onglet Intégrations (TheHive)** → Alertes multi-sources avec mapping automatique.

### Q: Comment générer des règles YARA depuis MISP ?
**R:** **Onglet Génération de Règles (MISP)** → Choisir le format (YARA, Sigma, Suricata).

### Q: Où voir l'impact de l'automatisation ?
**R:** **Onglet Métriques (Shuffle)** → KPIs (MTTD, MTTR, ROI, coûts évités).

### Q: Comment exporter des IOCs de TheHive ?
**R:** **Onglet Intégrations (TheHive)** → Bouton "Exporter" vers MISP/pare-feu/SIEM.

### Q: Puis-je configurer l'authentification AD dans TheHive ?
**R:** Oui ! **Onglet API & Rôles (TheHive)** → LDAP/Active Directory supporté.

---

## 📱 Raccourcis Rapides

Utilisez ces URLs directes pour sauter aux onglets :

```
/outils#wazuh → Wazuh (agents, règles)
/outils#wazuh#inventory → Wazuh - Inventaire
/outils#wazuh#config → Wazuh - Configuration
/outils#wazuh#reports → Wazuh - Rapports

/outils#thehive → TheHive (kanban)
/outils#thehive#templates → TheHive - Templates
/outils#thehive#integrations → TheHive - Intégrations
/outils#thehive#api → TheHive - API & Rôles

/outils#misp → MISP (événements)
/outils#misp#rules → MISP - Génération de Règles
/outils#misp#analysis → MISP - Analyse Malware
/outils#misp#sharing → MISP - Partage & API

/outils#orchestrator → Shuffle (connecteurs)
/outils#orchestrator#workflows → Shuffle - Playbooks
/outils#orchestrator#automation → Shuffle - Actions
/outils#orchestrator#metrics → Shuffle - Métriques
```

---

## 🎓 Formation Rapide (5 min)

### Wazuh
- ✅ Liste agents : **Onglet Agents**
- ✅ Règles actives : **Onglet Règles** (toggle on/off)
- ✅ Logiciels vulnérables : **Onglet Inventaire** (CVE badge)

### TheHive
- ✅ Tous les cas : **Onglet Kanban** (4 colonnes)
- ✅ Créer cas rapide : **Onglet Templates** (choix type)
- ✅ Intégrer alertes : **Onglet Intégrations** (multi-source)

### MISP
- ✅ Chercher IOC : **Onglet Événements** (barre recherche)
- ✅ Règles de détection : **Onglet Génération de Règles** (YARA/Sigma)
- ✅ Graphe menace : **Onglet Partage & API** (relations IOC)

### Shuffle
- ✅ Santé outils : **Onglet Connecteurs** (statut + latence)
- ✅ Playbooks : **Onglet Playbooks & Workflows** (templates)
- ✅ Impact auto : **Onglet Métriques** (MTTD, ROI)

---

## 📚 Documentation Complète

Pour plus de détails, consultez :

1. **`docs/SOC_TOOLS_DOCUMENTATION.md`** (900 lignes)
   - Architecture complète
   - Tous les détails techniques
   - Intégrations possibles

2. **`docs/INTEGRATION_GUIDE.md`** (350 lignes)
   - Guide d'intégration API
   - Exemples de code
   - Checklist d'implémentation

3. **`ENRICHMENT_SUMMARY.md`** (ce dossier)
   - Vue d'ensemble du projet
   - Statut des fonctionnalités
   - Flux E2E

---

## ✨ Besoin d'Aide ?

- **Erreur d'API ?** → Vérifiez env.local et vos credentials
- **Onglet ne s'affiche pas ?** → Rafraîchissez le navigateur
- **Intégration ne fonctionne pas ?** → Consultez INTEGRATION_GUIDE.md
- **Besoin d'ajouter une fonctionnalité ?** → Copiez la structure Tabs existante

---

**Vous êtes prêt ! Explorez les nouvelles fonctionnalités ! 🚀**
