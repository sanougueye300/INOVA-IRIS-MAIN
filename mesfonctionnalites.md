# INOVA-IRIS — Documentation Complète du Projet
> **Dernière mise à jour :** 30 mai 2026  
> **Auteur :** Sonatel Group — Direction Cybersécurité SOC  
> **Repository GitHub :** `sanougueye300/INOVA-IRIS-MAIN`  
> **URL Vercel :** `inova-iris-main-f3ek.vercel.app`

---

## 1. Ce que fait l'application

**INOVA-IRIS** est une **plateforme SOC (Security Operations Center) de cyberdéfense nouvelle génération** déployée pour le groupe **Sonatel/Orange Sénégal**. Elle centralise la détection, l'analyse et la réponse aux incidents de cybersécurité en intégrant plusieurs outils open-source leaders du marché.

### Mission principale
- **Détecter** les cyberattaques et anomalies en temps réel via Wazuh SIEM
- **Analyser** et qualifier les incidents avec TheHive et MISP
- **Répondre** et automatiser les playbooks de sécurité avec Shuffle SOAR
- **Enrichir** les indicateurs de compromission (IOC) via VirusTotal et MISP
- **Gérer** les utilisateurs, clients, SLA et facturation des services SOC
- **Visualiser** les menaces globales sur une cartographie cyber 3D interactive

---

## 2. Fonctionnalités implémentées

### 2.1 Authentification complète (`/auth/*`)
| Route | Description |
|-------|-------------|
| `/auth/login` | Page de connexion SOC avec email + mot de passe, biométrie simulée et SSO Active Directory |
| `/auth/signup` | Création d'un nouveau compte organisation client |
| `/auth/2fa` | Authentification à double facteur (OTP) |
| `/auth/forgot-password` | Réinitialisation du mot de passe |
| `/auth/reset-password` | Saisie du nouveau mot de passe via lien OTP |
| `/auth/lock` | Écran de verrouillage de session |
| `/auth/logout` | Déconnexion sécurisée |

> ⚠️ **IMPORTANT :** La route `/` redirige automatiquement vers `/auth/login` (via `beforeLoad` + `redirect` TanStack Router ET via `vercel.json` au niveau CDN Vercel).

### 2.2 Tableau de bord SOC (`/dashboard`)
- Métriques temps réel : alertes 7j, critiques, IOC, alertes ouvertes
- Graphiques Recharts : sévérité, répartition, tendance IOC
- Pipeline SOAR Orchestration (Wazuh → TheHive → Shuffle → MISP)
- Cartographie Live 3D du globe (SocCyberGlobe)
- Timeline d'attaque (SocAttackTimeline)
- Corrélation visuelle des alertes (SocAlertCorrelationGraph)
- Score de santé SOC (SocHealthScoreCard)
- Indicateurs MTTD/MTTR (SocMttdMttrGauge)
- Top régions d'attaque (TopRegionsCard)
- Raccourcis rapides vers Threat Map, AI Assistant, DFIR-IRIS

### 2.3 Gestion des alertes (`/alertes`)
- Liste paginée des alertes Wazuh avec filtres dynamiques
- Filtres : sévérité (critique ≥12, élevée 8-11, moyenne 5-7, faible <5), statut, règle, tactique MITRE
- Recherche globale (titre, agent, règle)
- Pivot vers TheHive (création de cas depuis une alerte)
- Score IA de faux positifs (IA FP)
- Synchronisation manuelle avec Wazuh
- Simulation RedTeam
- Onglets : Liste & actions | Corrélation visuelle | Chronologie d'attaque

### 2.4 Indicateurs de compromission — IOC (`/iocs`)
- Table complète des IOC (IP, hash, domaine, URL, email)
- Enrichissement VirusTotal (score VT)
- Intégration MISP (synchronisation bidirectionnelle)
- IOC Hunter (détection automatique sur 7 jours)
- Export et Push vers Wazuh CDB
- Alertes IOC dormants (> 30 jours sans activité)
- Graphique Nouveaux vs Expirés par semaine
- Filtres par type, niveau de menace, organisation

### 2.5 Cartographie des menaces (`/threat-map`)
- Globe 3D interactif avec attaques en temps réel simulées
- Heatmap par pays (SocCountryHeatMini)
- Fil RSS cyber (SocCyberRssCard)
- Tactiques MITRE ATT&CK (SocMitreTacticsChart)
- Page dédiée plein écran (ThreatMapPage)

### 2.6 Assistant IA Djib'son (`/assistant` et `/iris`)
- Interface de chat IA pour les analystes SOC
- Questions sur les alertes, IOC, recommandations de réponse
- Suggestions de playbooks automatiques
- Page IRIS dédiée (DFIR-IRIS intégration)
- Palette de commandes (CommandPalette)

### 2.7 Outils SOC intégrés (`/outils`)
6 onglets d'outils cybersécurité avec interfaces détaillées :
| Outil | Fichier | Fonctionnalité |
|-------|---------|----------------|
| **Wazuh** | `WazuhToolTab.tsx` | SIEM, agents, règles, événements |
| **TheHive** | `TheHiveToolTab.tsx` | Gestion des cas et incidents |
| **MISP** | `MispToolTab.tsx` | Partage d'intelligence sur les menaces |
| **VirusTotal** | `VirusTotalToolTab.tsx` | Scan et enrichissement d'IOC |
| **Shuffle** | `ShuffleToolTab.tsx` | Playbooks SOAR et automatisation |
| **Orchestrateur** | `OrchestratorTab.tsx` | Vue unifiée pipeline de réponse |

### 2.8 Gestion des clients (`/clients/*`)
| Route | Description |
|-------|-------------|
| `/clients` | Liste des clients Sonatel SOC |
| `/clients/new` | Créer un nouveau client (formulaire complet) |
| `/clients/:clientId` | Fiche client détaillée |
| `/clients/inventory` | Parc et inventaire EDR des clients |
| `/clients/satisfaction` | NPS et satisfaction client |
| `/clients/sla` | SLA et performance des services |

### 2.9 Administration RH (`/admin/*`)
| Route | Description |
|-------|-------------|
| `/admin` | Dashboard admin : liste des agents, statistiques |
| `/admin/new` | **Créer un nouvel agent RH** (formulaire 4 étapes) |
| `/admin/:userId` | Fiche détaillée d'un agent |
| `/admin/offres` | Catalogue des offres SOC |
| `/admin/profiles` | Gestion des profils |

#### Détail formulaire `/admin/new` (4 étapes) :
1. **Identité & Adresse** — Prénom, nom, email, téléphone, matricule + **dropdown Organisation/Direction** (DSI, DDE, CYBER, DTI…) + **dropdown Site physique** (Technopole, Liberté 6, agences régionales…) avec auto-remplissage ville
2. **Accès & Rôles** — Rôle (Client/Analyste/Manager/Admin), version applicative, politique d'étiquetage
3. **Services & Permissions** — Habilitations cyber, dispatching, expériences, statut compte
4. **Validation** — Récapitulatif complet + création avec envoi OTP

### 2.10 Module Facturation (`/facturation`)
- Factures et échéancier
- Contrats clients
- Relances et rappels
- Catalogue des offres

### 2.11 Paramètres et réglages (`/settings`)
- Thème : orange (défaut), bleu, vert, violet, rose
- Mode clair/sombre
- Langue : 🇫🇷 Français, 🇬🇧 English, 🇸🇳 Wolof, 🇸🇦 Arabe
- Préférences utilisateur persistées via localStorage (`soc-preferences`)
- Personnalisateur de thème (ThemeCustomizer)

### 2.12 Intégrations externes (`/integrations`)
- Connexion et statut des outils tiers
- Configuration des webhooks

### 2.13 Journal d'audit (`/audit`)
- Log complet des actions utilisateurs
- Filtres par type d'action, utilisateur, date

### 2.14 Déploiement et Architecture (`/deploiement`, `/architecture`, `/workflow`)
- Schéma d'architecture Wazuh + TheHive + MISP + Shuffle
- Scénario E2E de réponse à incident
- Vue de déploiement infrastructure

---

## 3. Structure des fichiers

```
inova-iris-main/
│
├── src/
│   ├── routes/                          ← Pages (File-based routing TanStack)
│   │   ├── __root.tsx                   ← Layout racine (SocShell/Auth/Landing)
│   │   ├── index.tsx                    ← Redirect vers /auth/login
│   │   ├── login.tsx                    ← Redirect vers /auth/login
│   │   │
│   │   ├── auth.tsx                     ← Layout auth (fond sombre split-screen)
│   │   ├── auth.login.tsx               ← Page de connexion
│   │   ├── auth.signup.tsx              ← Inscription
│   │   ├── auth.2fa.tsx                 ← Double facteur OTP
│   │   ├── auth.forgot-password.tsx     ← Mot de passe oublié
│   │   ├── auth.reset-password.tsx      ← Réinitialisation
│   │   ├── auth.lock.tsx                ← Écran de verrouillage
│   │   ├── auth.logout.tsx              ← Déconnexion
│   │   │
│   │   ├── dashboard.tsx                ← Tableau de bord SOC
│   │   ├── alertes.tsx                  ← Gestion des alertes Wazuh
│   │   ├── iocs.tsx                     ← Indicateurs de compromission
│   │   ├── threat-map.tsx               ← Cartographie cyber
│   │   ├── assistant.tsx                ← Assistant IA (wrapper)
│   │   ├── iris.tsx                     ← DFIR-IRIS
│   │   ├── outils.tsx                   ← Outils SOC (6 onglets)
│   │   ├── settings.tsx                 ← Paramètres et thème
│   │   ├── integrations.tsx             ← Intégrations externes
│   │   ├── audit.tsx                    ← Journal d'audit
│   │   ├── facturation.tsx              ← Facturation et contrats
│   │   ├── deploiement.tsx              ← Vue déploiement
│   │   ├── architecture.tsx             ← Schéma architecture
│   │   ├── workflow.tsx                 ← Scénario E2E
│   │   │
│   │   ├── admin.tsx                    ← Layout admin
│   │   ├── admin.index.tsx              ← Dashboard admin
│   │   ├── admin.new.tsx                ← Créer agent RH (4 étapes)
│   │   ├── admin.$userId.tsx            ← Fiche agent
│   │   ├── admin.offres.tsx             ← Catalogue offres
│   │   ├── admin.profiles.tsx           ← Profils
│   │   │
│   │   ├── clients.index.tsx            ← Liste clients
│   │   ├── clients.new.tsx              ← Nouveau client
│   │   ├── clients.$clientId.tsx        ← Fiche client
│   │   ├── clients.inventory.tsx        ← Inventaire EDR
│   │   ├── clients.satisfaction.tsx     ← NPS et satisfaction
│   │   └── clients.sla.tsx              ← SLA et performance
│   │
│   ├── components/
│   │   ├── RequireAuth.tsx              ← Guard d'authentification
│   │   ├── SiteHeader.tsx               ← En-tête landing page
│   │   ├── SiteFooter.tsx               ← Pied de page landing
│   │   │
│   │   ├── landing/
│   │   │   ├── LandingHero.tsx          ← Section héro landing
│   │   │   └── LandingStack.tsx         ← Stack technologique landing
│   │   │
│   │   ├── soc/
│   │   │   ├── SocShell.tsx             ← Layout coquille SOC
│   │   │   ├── SocSidebar.tsx           ← Barre latérale (20KB) — navigation complète
│   │   │   ├── SocTopbar.tsx            ← Barre du haut (18KB) — recherche, notifications, profil
│   │   │   ├── AIAssistant.tsx          ← Composant assistant IA
│   │   │   ├── AssistantPage.tsx        ← Page assistant complète
│   │   │   ├── IrisPage.tsx             ← Page IRIS
│   │   │   ├── CommandPalette.tsx       ← Palette de commandes (Ctrl+K)
│   │   │   ├── SocCyberGlobe.tsx        ← Globe 3D interactif (13KB)
│   │   │   ├── ThreatMap.tsx            ← Cartographie des menaces (18KB)
│   │   │   ├── ThreatMapPage.tsx        ← Page Threat Map dédiée
│   │   │   ├── ThemeCustomizer.tsx      ← Panneau de personnalisation thème
│   │   │   ├── SocAlertCorrelationGraph.tsx ← Graphe corrélation
│   │   │   ├── SocAttackTimeline.tsx    ← Timeline d'attaque
│   │   │   ├── SocCountryHeatMini.tsx   ← Heatmap pays
│   │   │   ├── SocCyberRssCard.tsx      ← Fil RSS cyber
│   │   │   ├── SocHealthScoreCard.tsx   ← Score santé SOC
│   │   │   ├── SocIncidentTimeline.tsx  ← Timeline incidents
│   │   │   ├── SocMitreTacticsChart.tsx ← Tactiques MITRE
│   │   │   ├── SocMttdMttrGauge.tsx     ← Jauges MTTD/MTTR
│   │   │   ├── SocTimeRangeTabs.tsx     ← Sélecteur fenêtre temporelle
│   │   │   ├── TopRegionsCard.tsx       ← Top régions attaque
│   │   │   ├── QuickLinkCard.tsx        ← Raccourcis rapides
│   │   │   ├── SonatelLogo.tsx          ← Logo Sonatel SVG
│   │   │   │
│   │   │   └── outils/
│   │   │       ├── WazuhToolTab.tsx     ← Interface Wazuh SIEM
│   │   │       ├── TheHiveToolTab.tsx   ← Interface TheHive
│   │   │       ├── MispToolTab.tsx      ← Interface MISP
│   │   │       ├── VirusTotalToolTab.tsx ← Interface VirusTotal
│   │   │       ├── ShuffleToolTab.tsx   ← Interface Shuffle SOAR
│   │   │       └── OrchestratorTab.tsx  ← Orchestrateur unifié
│   │   │
│   │   └── ui/                          ← Composants Shadcn/UI (40+ composants)
│   │       └── [button, card, select, dialog, table, badge, avatar, switch, checkbox…]
│   │
│   ├── lib/
│   │   ├── auth-context.tsx             ← Contexte React d'authentification
│   │   ├── soc-mock.ts                  ← Données mock SOC (alertes, IOC, agents)
│   │   ├── soc-preferences.tsx          ← Gestion préférences (thème, langue)
│   │   ├── soc-simulation.tsx           ← Simulation RedTeam
│   │   ├── translations.ts              ← i18n : FR, EN, Wolof, Arabe (25KB)
│   │   ├── error-capture.ts             ← Capture d'erreurs SSR
│   │   ├── error-page.ts                ← Page d'erreur HTML brute
│   │   └── utils.ts                     ← Utilitaires (cn helper)
│   │
│   ├── integrations/supabase/           ← Client Supabase auto-généré
│   │   └── client.ts
│   │
│   ├── assets/
│   │   └── orange-logo.png              ← Logo Orange/Sonatel
│   │
│   ├── styles.css                       ← Design system complet (Tailwind v4 + OKLCH)
│   ├── router.tsx                       ← Configuration routeur TanStack
│   ├── routeTree.gen.ts                 ← Arbre de routes auto-généré
│   ├── server.ts                        ← Entrée serveur SSR (Web Fetch API)
│   └── start.ts                         ← Bootstrap TanStack Start
│
├── supabase/
│   ├── functions/
│   │   ├── admin-create-user/           ← Edge Function : création d'agent
│   │   ├── soc-ai-chat/                 ← Edge Function : chat IA
│   │   ├── sync-misp-iocs/              ← Edge Function : sync IOC MISP
│   │   └── sync-wazuh-alerts/           ← Edge Function : sync alertes Wazuh
│   └── migrations/
│       └── 20260508041157_*.sql         ← Schéma complet (profiles, alerts, iocs, roles)
│
├── scripts/
│   └── vercel-build.mjs                 ← Post-build Vercel (génère .vercel/output/)
│
├── docs/                                ← Documentation technique
├── vercel.json                          ← Config déploiement Vercel
├── vite.config.ts                       ← Config Vite + TanStack Start (preset vercel)
├── tsconfig.json                        ← TypeScript strict
├── package.json                         ← Dépendances npm
└── .env / .env.local                    ← Variables d'environnement Supabase
```

---

## 4. Technologies utilisées

### Frontend
| Technologie | Version | Rôle |
|-------------|---------|------|
| **React** | 19.2 | Framework UI |
| **TanStack Start** | 1.167.x | Framework SSR full-stack |
| **TanStack Router** | 1.168.x | Routing file-based avec type-safety |
| **TypeScript** | 5.8 | Typage statique strict |
| **Tailwind CSS** | 4.2 | Styling utilitaire |
| **Shadcn/UI** | Latest | Composants UI accessibles (Radix) |
| **Recharts** | 2.15 | Graphiques et visualisations |
| **Lucide React** | 0.575 | Icônes SVG |
| **Sonner** | 2.0 | Toasts/notifications |

### Backend & Database
| Technologie | Version | Rôle |
|-------------|---------|------|
| **Supabase** | 2.105 | Backend-as-a-Service (PostgreSQL + Auth) |
| **PostgreSQL** | 15+ | Base de données principale (via Supabase) |
| **Row Level Security** | — | Isolation des données par organisation |
| **Supabase Edge Functions** | — | Fonctions serverless (Deno runtime) |

### Outils SOC intégrés (simulés + API prévues)
| Outil | Rôle |
|-------|------|
| **Wazuh** | SIEM — détection d'intrusion et collecte d'événements |
| **TheHive** | Plateforme de gestion des incidents de sécurité |
| **MISP** | Partage d'intelligence sur les menaces (IOC) |
| **Shuffle** | SOAR — automatisation et orchestration des playbooks |
| **VirusTotal** | Enrichissement et analyse des IOC |
| **DFIR-IRIS** | Gestion forensique et réponse sur incident |

### Infrastructure & Déploiement
| Technologie | Rôle |
|-------------|------|
| **Vercel** | Hébergement production (Edge Network) |
| **GitHub** (`sanougueye300/INOVA-IRIS-MAIN`) | Dépôt source + CI/CD automatique |
| **@lovable.dev/vite-tanstack-config** | Wrapper Vite personnalisé (Lovable) |
| **scripts/vercel-build.mjs** | Script post-build générant `.vercel/output/` |

---

## 5. Schéma de base de données (Supabase PostgreSQL)

```sql
-- Enum des rôles
CREATE TYPE app_role AS ENUM ('admin', 'analyste', 'manager', 'client');

-- Profils utilisateurs
CREATE TABLE profiles (
  id UUID PRIMARY KEY,          -- = auth.users.id
  email TEXT,
  full_name TEXT,
  organization TEXT,            -- Ex: "SONATEL/DSI"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Rôles utilisateurs (many-to-one)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Alertes Wazuh
CREATE TABLE alerts (
  id UUID PRIMARY KEY,
  external_id TEXT,             -- ID Wazuh original
  title TEXT NOT NULL,
  description TEXT,
  severity INTEGER DEFAULT 5,   -- 1-15 (Wazuh scale)
  source TEXT DEFAULT 'wazuh',
  status TEXT DEFAULT 'new',    -- new|in_progress|resolved|false_positive
  agent_name TEXT,
  rule_id TEXT,
  organization TEXT,
  raw_data JSONB,
  detected_at TIMESTAMPTZ
);

-- Indicateurs de compromission
CREATE TABLE iocs (
  id UUID PRIMARY KEY,
  ioc_type TEXT NOT NULL,       -- ip|hash|domain|url|email
  value TEXT NOT NULL,
  threat_name TEXT,
  threat_level TEXT DEFAULT 'medium',
  source TEXT DEFAULT 'misp',
  tags TEXT[],
  organization TEXT,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ
);
```

### Politiques RLS (Row Level Security)
- **admin** : accès complet à toutes les données
- **analyste/manager** : accès à toutes les alertes et IOC
- **client** : accès uniquement aux données de son `organization`

---

## 6. Design System

### Couleurs (OKLCH — Sonatel Orange)
```css
/* Mode clair */
--primary: oklch(0.72 0.20 50)    /* Orange Sonatel */
--background: oklch(1 0 0)         /* Blanc pur */
--foreground: oklch(0.18 0.02 50)  /* Quasi-noir */

/* Mode sombre */
--background: oklch(0.129 0.042 264.695)  /* Bleu nuit profond */
--foreground: oklch(0.984 0.003 247.858)  /* Blanc cassé */
```

### Thèmes disponibles
- 🟠 **Orange** (défaut Sonatel) — `--primary: oklch(0.72 0.20 50)`
- 🔵 **Bleu** — `theme-blue`
- 🟢 **Vert** — `theme-green`
- 🟣 **Violet** — `theme-violet`
- 🔴 **Rose** — `theme-rose`

### Typographie
- Police système par défaut + Tailwind
- Hiérarchie : `font-black` (titres) → `font-bold` → `font-semibold` → `font-medium`

### Animations CSS personnalisées
```
float-slow    → Flottement 6s (éléments hero)
shimmer       → Reflet lumineux sur gradients
scan-line     → Ligne de scan cyber (effet terminal)
gradient-shift → Dégradé animé (texte gradient)
fade-up       → Apparition bas→haut (5 délais staggered)
pulse-glow    → Pulsation lumineuse
```

### Patterns de design premium
- **Glassmorphism** : `bg-white/80 backdrop-blur-xl border border-white`
- **Gradient accents** : `bg-gradient-to-r from-amber-500 to-orange-500`
- **Glow effects** : `shadow-[0_0_20px_rgba(245,158,11,0.5)]`
- **Grid mesh background** : motif grille SVG en arrière-plan à faible opacité
- **Animated step ping** : `animate-ping` sur l'étape active du stepper

---

## 7. Décisions de design

### 7.1 Architecture routing
- **TanStack Router** (file-based) : chaque fichier dans `src/routes/` = une URL
- **`__root.tsx`** gère 3 layouts différents via `AppFrame()` :
  - `/dashboard/*`, `/alertes/*`, etc. → `SocShell` (sidebar + topbar SOC)
  - `/auth/*`, `/login` → Layout auth plein écran (pas de sidebar)
  - `/` → Landing page avec SiteHeader + SiteFooter (redirigée vers `/auth/login`)

### 7.2 Authentification
- **La page d'accueil `/` redirige TOUJOURS vers `/auth/login`**
  - Niveau app : `beforeLoad: () => { throw redirect({ to: "/auth/login" }) }` dans `index.tsx`
  - Niveau CDN Vercel : `"redirects": [{ "source": "/", "destination": "/auth/login" }]` dans `vercel.json`
- `RequireAuth` component protège les routes SOC et admin
- Rôles : `admin` > `manager` > `analyste` > `client`

### 7.3 Internationalisation (i18n)
- Système custom `translations.ts` avec 4 langues : **Français, Anglais, Wolof, Arabe**
- Clé = texte français, valeur = traduction
- Wolof et Arabe = décision culturelle pour l'Afrique de l'Ouest / monde arabe
- Hook `useSocPreferences()` expose `t()` pour traduire

### 7.4 Données mock vs données réelles
- `src/lib/soc-mock.ts` (14KB) : données simulées pour démo (alertes, agents, IOC, clients)
- Les Edge Functions Supabase (`sync-wazuh-alerts`, `sync-misp-iocs`) permettent la connexion aux vrais outils
- L'application fonctionne en mode démo sans backend

### 7.5 Admin.new — Formulaire agent (4 étapes)
- **Supprimé** : étape "Données & Facturation" (code budgétaire, réseaux sociaux)
- **Ajouté** : dropdown `ORGANISATION / DIRECTION` avec 9 directions Sonatel
- **Ajouté** : dropdown `Site / Adresse physique` avec 10 sites (auto-remplissage ville)
- **Design** : glassmorphism premium, stepper animé avec ping, preview live droite

### 7.6 Déploiement Vercel
- Problème : `@lovable.dev/vite-tanstack-config` génère `dist/server/` et `dist/client/` mais pas `.vercel/output/`
- Solution : script post-build `scripts/vercel-build.mjs` qui crée manuellement `.vercel/output/` avec :
  - `static/` ← copie de `dist/client/`
  - `functions/index.func/` ← copie de `dist/server/` (Edge Function Web Fetch API)
  - `config.json` ← routing rules (redirect `/` → `/auth/login`, assets statiques, SSR catch-all)

---

## 8. Variables d'environnement requises

```env
# Supabase
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]

# Optionnel : outils SOC réels
WAZUH_API_URL=https://wazuh-manager:55000
WAZUH_API_USER=wazuh-wui
WAZUH_API_PASSWORD=...
THEHIVE_URL=https://thehive.sonatel.sn
THEHIVE_API_KEY=...
MISP_URL=https://misp.sonatel.sn
MISP_API_KEY=...
VIRUSTOTAL_API_KEY=...
```

---

## 9. Instructions pour un futur modèle IA

### 9.1 Conventions de code à respecter ABSOLUMENT
1. **Toujours** utiliser `setForm({ ...form, champ: valeur })` pour les mises à jour de formulaire
2. **Ne jamais** modifier `routeTree.gen.ts` — il est auto-généré par TanStack Router
3. **Ne jamais** ajouter `tailwindcss`, `tanstackStart`, `viteReact` dans `vite.config.ts` — déjà inclus dans le wrapper Lovable
4. **Toujours** envelopper les pages admin avec `<RequireAuth requireAdmin>` 
5. **Utiliser** `useNavigate()` de TanStack Router (pas `useRouter` de Next.js)
6. **Toujours** utiliser `createFileRoute("/path/to/route")` pour déclarer une route

### 9.2 Pattern de création d'une nouvelle route
```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/ma-route")({
  head: () => ({ meta: [{ title: "Titre — SOC Platform" }] }),
  component: MaPage,
});

function MaPage() {
  return <div>...</div>;
}
```

### 9.3 Pattern d'accès aux données Supabase
```tsx
import { supabase } from "@/integrations/supabase/client";

// Lecture
const { data, error } = await supabase
  .from("alerts")
  .select("*")
  .order("detected_at", { ascending: false });

// Appel Edge Function
const { error } = await supabase.functions.invoke("admin-create-user", {
  body: { email, fullName, organization, role, generation }
});
```

### 9.4 Composants UI disponibles (Shadcn)
```
Button, Card/CardHeader/CardContent/CardTitle/CardDescription,
Input, Label, Select/SelectTrigger/SelectValue/SelectContent/SelectItem,
Switch, Checkbox, Badge, Avatar/AvatarFallback/AvatarImage,
Dialog/DialogHeader/DialogContent, Sheet, Tabs, Separator,
Table/TableHeader/TableRow/TableCell, Tooltip, Popover, DropdownMenu
```
Importation : `import { Button } from "@/components/ui/button"`

### 9.5 Utilisation du contexte auth
```tsx
import { useAuth } from "@/lib/auth-context";

function MonComposant() {
  const { user, isAdmin, isStaff, organization, signOut } = useAuth();
  if (!isAdmin) return <div>Accès refusé</div>;
}
```

### 9.6 Utilisation des traductions
```tsx
import { useSocPreferences } from "@/lib/soc-preferences";

function MonComposant() {
  const { t } = useSocPreferences();
  return <h1>{t("Tableau de bord")}</h1>; // clé = texte FR
}
```

### 9.7 Icônes disponibles
- Toutes les icônes viennent de `lucide-react`
- Import : `import { Shield, AlertTriangle, User } from "lucide-react"`
- Usage : `<Shield className="h-4 w-4 text-amber-500" />`

### 9.8 Classes utilitaires custom
```css
.glass-card       → Fond verre sombre (landing)
.landing-dark     → Background #050a15 (landing page)
.text-gradient-cyber → Texte gradient orange animé
.scan-line::after → Effet ligne de scan cyber
.animate-float-slow → Flottement lent
.animate-shimmer  → Reflet lumineux
.animate-fade-up  → Apparition bas→haut
```

### 9.9 Comment ajouter une direction Sonatel dans admin.new
Modifier le tableau `ORGANIZATIONS` dans `src/routes/admin.new.tsx` :
```tsx
const ORGANIZATIONS = [
  { value: "SONATEL/DSI",   label: "SONATEL / DSI",   sub: "Direction des Systèmes d'Information" },
  // Ajouter ici :
  { value: "SONATEL/NOUVEAU", label: "SONATEL / NOUVEAU", sub: "Description de la direction" },
];
```

### 9.10 Comment ajouter un site physique dans admin.new
Modifier le tableau `SITES` dans `src/routes/admin.new.tsx` :
```tsx
const SITES = [
  { value: "technopole", label: "Technopole, Immeuble Sonatel", city: "Dakar" },
  // Ajouter ici :
  { value: "nouveau-site", label: "Nouveau Site — Description", city: "Ville" },
];
```

### 9.11 Pièges connus / Gotchas

| Problème | Cause | Solution |
|----------|-------|----------|
| 404 sur Vercel | Build SSR incompatible Vercel | Utiliser `scripts/vercel-build.mjs` |
| Redirection `/` ne fonctionne pas | Config manquante | Vérifier `vercel.json` ET `index.tsx` |
| `routeTree.gen.ts` désynchronisé | Hot reload parfois échoue | Relancer `npm run dev` |
| Import `@/` ne résout pas | tsconfig.json paths | Vérifier `compilerOptions.paths` |
| Données non filtrées par org | RLS Supabase mal configuré | Vérifier les policies `organization = get_user_org(uid)` |
| `useAuth()` retourne null | Provider manquant | Vérifier que `AuthProvider` entoure l'app dans `__root.tsx` |

---

## 10. Commandes utiles

```bash
# Développement local
npm run dev          # Lance le serveur de dev (port 8080)

# Build
npm run build        # Build SSR complet (dist/client + dist/server)
node scripts/vercel-build.mjs  # Post-build pour Vercel (.vercel/output/)

# Git
git add .
git commit -m "feat: description"
git push origin main  # Déclenche le redéploiement Vercel automatiquement

# Vérifier les routes générées
cat src/routeTree.gen.ts | grep "createRoute"
```

---

## 11. Roadmap et fonctionnalités prévues

- [ ] Connexion réelle Wazuh API (alertes en temps réel)
- [ ] Connexion réelle TheHive API (création de cas automatique)
- [ ] Connexion réelle MISP API (IOC bidirectionnels)
- [ ] Notifications push WebSocket (alertes critiques)
- [ ] Export PDF des rapports SOC
- [ ] Module de reporting automatique (hebdomadaire/mensuel)
- [ ] Intégration Supabase Auth réelle (OTP par email fonctionnel)
- [ ] Dashboard client dédié (vue limitée par organisation)
- [ ] Module de formation SOC e-learning
- [ ] API publique Sonatel SOC (endpoints REST documentés)

---

*Document généré par Antigravity AI — Pour toute modification, mettre à jour ce fichier et le pousser sur GitHub.*
