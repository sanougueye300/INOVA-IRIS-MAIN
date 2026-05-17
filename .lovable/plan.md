## Objectif

Remplacer le dashboard actuel (simples cartes statistiques) par un véritable tableau de bord SOC inspiré de la capture "Inova-Iris" : layout avec **sidebar à gauche**, **topbar** (recherche, notifications, avatar) et zone principale **"SUIVI D'ACTIVITE"** comprenant des **raccourcis co
rés** vers les outils SOC + des **cartes statistiques avec graphiques**. Branding orange Sonatel.

## Périmètre

- Uniquement la zone connectée (`/dashboard`, `/alertes`, `/iocs`, `/admin`).
- La page d'accueil publique `/`, `/architecture`, `/outils`, etc. ne change pas.
- `SiteHeader` / `SiteFooter` existants restent pour les pages publiques mais sont **masqués** dans la zone connectée (remplacés par sidebar + topbar).

## Layout cible

```text
┌───────────────────────────────────────────────────────────────┐
│ [logo Sonatel] Inova-SOC   [search…]      🔔  ⚙  [👤 avatar] │  ← Topbar
├──────────┬────────────────────────────────────────────────────┤
│ Sidebar  │ SUIVI D'ACTIVITE                                   │
│ ──────── │ Voici l'état de votre SOC en temps réel            │
│ Dashboard│                                                    │
│ Alertes  │ ┌─Dashboard─┐ ┌─Alertes─┐ ┌─Wazuh─┐ ┌─TheHive─┐    │
│ IOC      │ └───────────┘ └─────────┘ └───────┘ └─────────┘    │
│ Wazuh    │ ┌─MISP──────┐ ┌─VirusTotal┐┌─Shuffle┐┌─Profil──┐   │
│ TheHive  │ └───────────┘ └───────────┘└────────┘└─────────┘   │
│ MISP     │                                                    │
│ Shuffle  │ ┌──── Alertes 7 derniers jours ─────┐ ┌─ IOC ──┐   │
│ VirusT.  │ │  ▮ ▮ ▮ ▮ ▮ ▮ ▮  (bar chart)       │ │ line   │   │
│ Admin    │ └────────────────────────────────────┘ └────────┘   │
│ ──────── │ ┌── Top règles Wazuh ─┐ ┌── Sévérité ─────────┐    │
│ Logout   │ │ table               │ │ pie chart           │    │
└──────────┴────────────────────────────────────────────────────┘
```

## Composants à créer

- `src/components/soc/SocLayout.tsx` — wrapper sidebar + topbar + `<Outlet />` zone, sticky sidebar fixe ≥ lg, drawer mobile.
- `src/components/soc/SocSidebar.tsx` — items: Dashboard, Alertes, IOC, Outils (Wazuh / TheHive / MISP / Shuffle / VirusTotal — liens externes ou pages internes existantes), Administration (visible si admin), Déconnexion. Active state via `useRouterState`.
- `src/components/soc/SocTopbar.tsx` — logo Sonatel + nom plateforme, champ recherche (UI uniquement pour l'instant), bouton notifications (badge = nb alertes nouvelles, popover liste les 5 dernières), avatar avec menu (profil, déconnexion).
- `src/components/soc/QuickLinkCard.tsx` — carte raccourci (icône colorée + titre + lien "Visiter").
- `src/components/soc/StatCard.tsx` — carte stat avec titre, badge variation, valeur, mini-graphique (recharts).

## Refactor des routes existantes

- Créer une **layout route** `src/routes/_soc.tsx` qui :
  - utilise `RequireAuth`,
  - rend `<SocLayout><Outlet /></SocLayout>`,
  - masque `SiteHeader/Footer` publics (en les conditionnant dans `__root.tsx` via `useMatches` pour ne pas les afficher si la route commence par `_soc`).
- Renommer/déplacer :
  - `src/routes/dashboard.tsx` → `src/routes/_soc.dashboard.tsx`
  - `src/routes/alertes.tsx` → `src/routes/_soc.alertes.tsx`
  - `src/routes/iocs.tsx` → `src/routes/_soc.iocs.tsx`
  - `src/routes/admin.tsx` → `src/routes/_soc.admin.tsx`
- Tous les liens (`<Link to="/dashboard">`, etc.) restent valides — les paths d'URL ne changent pas (le préfixe `_soc` est un layout invisible).

## Contenu du nouveau Dashboard

Section 1 — **Quick links** (8 cartes alignées sur la capture, déclinées orange/blanc) :
1. Dashboard → `/dashboard`
2. Alertes → `/alertes`
3. IOC → `/iocs`
4. Wazuh → `/outils#wazuh`
5. TheHive → `/outils#thehive`
6. MISP → `/outils#misp`
7. VirusTotal → `/outils#virustotal`
8. Shuffle → `/outils#shuffle`

Section 2 — **Statistiques** (cartes avec graphiques `recharts` déjà installé) :
- "Alertes — 7 derniers jours" : `BarChart` (groupage par jour, requête `alerts.created_at`).
- "Nouveaux IOC — 7 derniers jours" : `LineChart` (groupage `iocs.created_at`).
- "Répartition par sévérité" : `PieChart` (low / medium / high / critical depuis `alerts.severity`).
- "Top 5 règles Wazuh" : table simple (`rule_id`, count) issue de `alerts`.

Section 3 — **Activité récente** : liste des 5 dernières alertes avec sévérité, agent, date, lien vers `/alertes`.

## Données

- Toutes les requêtes via le client Supabase déjà en place (RLS s'applique : staff voit tout, client voit son organisation).
- Agrégations côté client : `select('created_at, severity, rule_id, status, agent_name')` puis `reduce` JS — volume faible en démo, suffisant. (Pas de RPC à créer pour l'instant.)
- Notifications topbar : `select count head` sur `alerts.status = 'new'`, refresh toutes les 30 s.

## Branding Sonatel

- Logo orange (carré arrondi avec lettre "S" stylisée) en SVG inline dans `SocTopbar` — pas besoin d'asset externe.
- Sidebar fond blanc, item actif sur fond `bg-accent` (orange clair) + bordure gauche `border-l-4 border-primary`.
- Badges variations : vert pour positif, orange pour négatif (cohérent avec la capture).

## Points hors périmètre (à confirmer si voulus plus tard)

- La barre de recherche n'est qu'UI (pas d'index full-text Wazuh côté DB).
- Pas de toggle dark/light dans cette itération (la capture montre un soleil — peut être ajouté ensuite).
- Mécanisme SMS de secours OTP : **pas inclus ici**, traité séparément dès qu'un fournisseur SMS sera choisi (Twilio refusé précédemment).

## Détails techniques

- Layout route TanStack : `_soc.tsx` exporte `Route = createFileRoute('/_soc')({ component: () => <RequireAuth><SocLayout><Outlet/></SocLayout></RequireAuth> })`.
- Masquer `SiteHeader/Footer` : dans `__root.tsx`, lire `useMatches()` et ne pas les rendre si une match commence par `/_soc`. Alternative plus propre : déplacer `SiteHeader/Footer` dans une **autre** layout route `_public.tsx` qui englobe `index`, `architecture`, `outils`, `deploiement`, `workflow`, `login`. Je recommande cette approche.
- `recharts` : déjà présent dans le projet (utilisé par `chart.tsx`).
- Responsive : sidebar transformée en drawer (`Sheet` shadcn) sous `lg`. Quick-links en grille `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`.

## Étapes d'implémentation

1. Créer `_public.tsx` (layout avec `SiteHeader/Footer`) et déplacer les routes publiques dessous.
2. Créer `_soc.tsx` + composants `SocLayout`, `SocSidebar`, `SocTopbar`.
3. Créer `QuickLinkCard`, `StatCard`.
4. Réécrire `_soc.dashboard.tsx` avec quick-links + 4 graphiques + activité récente.
5. Déplacer `alertes/iocs/admin` sous le préfixe `_soc.`.
6. Nettoyer `__root.tsx` (suppression du rendu direct `SiteHeader/Footer`).
7. Vérifier visuellement chaque page (dashboard, alertes, iocs, admin) puis l'accueil public.
