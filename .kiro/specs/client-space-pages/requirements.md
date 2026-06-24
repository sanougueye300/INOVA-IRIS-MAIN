# Document de Requirements

## Introduction

Cette feature ajoute 3 nouvelles pages/sections dans l'espace client de la plateforme SOC INOVA IRIS, accessible depuis `/clients/$clientId`. L'espace client existe déjà et propose des onglets (Vue générale, PC Connectés, Contrats & Facturation). Les 3 nouvelles sections étendent cet espace avec :

1. **Gestion des Agents EDR/Wazuh** — supervision et actions sur les agents déployés sur les machines du client.
2. **Topologie de Protection Endpoint** — carte visuelle des postes de travail et de leur état de protection EDR.
3. **Alertes Client** — vue filtrée par client des alertes SOC, distincte de la page globale `/alertes`.

Le projet utilise React/TypeScript avec TanStack Router, Tailwind CSS + shadcn/ui (Radix UI) et Supabase (PostgreSQL) comme backend. Les données EDR sont simulées via `localStorage` avec la fonction `getClientExtendedData`, et les alertes proviennent de la table Supabase `alerts` (filtrées par `organization`).

---

## Glossaire

- **Agent_EDR** : Instance du logiciel Wazuh installée sur un poste client, identifiée par un `wazuhId` (ex. `WZ-001`). Remonte les événements de sécurité au Wazuh Manager.
- **Client_Space** : Ensemble des pages accessibles depuis `/clients/$clientId` pour superviser un client spécifique.
- **Endpoint** : Poste de travail (PC, serveur, MacBook) d'un client couvert par l'agent EDR.
- **ClientId** : Identifiant unique du client dans Supabase (UUID ou identifiant de démo).
- **ExtData** : Objet `ClientExtendedData` stocké dans `localStorage`, contenant les PCs, le score cyber, et les informations de contrat du client.
- **Topologie_Map** : Représentation visuelle des endpoints d'un client sous forme de nœuds graphiques montrant leur état de protection.
- **Alert_SOC** : Enregistrement de la table Supabase `alerts` comportant : `id`, `title`, `severity`, `status`, `agent_name`, `organization`, `detected_at`, `rule_id`.
- **SOAR_Action** : Action de remédiation automatisée déclenchée depuis l'interface (playbook Shuffle, isolation, ticket TheHive).
- **Wazuh_Manager** : Serveur central Wazuh recevant les évènements des agents EDR (IP : `10.0.0.1`, port `1514`).
- **Coverage_Score** : Pourcentage de machines du client couvertes par un agent EDR actif ou en alerte, par rapport au total des machines déclarées dans le contrat.
- **Status_Agent** : État opérationnel d'un agent parmi : `active` (en ligne), `disconnected` (hors ligne), `alert` (alerte active), `isolated` (quarantaine réseau).

---

## Requirements

### Requirement 1 : Onglet Gestion des Agents EDR

**User Story :** En tant qu'analyste SOC, je veux voir et gérer les agents EDR/Wazuh déployés sur les machines d'un client spécifique, afin de superviser leur état, leur version et d'effectuer des actions de remédiation à distance.

#### Critères d'acceptation

1. THE `Client_Space` SHALL afficher un nouvel onglet "Agents EDR" dans la barre de navigation de l'espace client (après l'onglet "Contrats & Facturation").
2. WHEN l'onglet "Agents EDR" est actif, THE `Client_Space` SHALL présenter un tableau listant tous les `Agent_EDR` associés au client, avec les colonnes : Nom de l'endpoint, `wazuhId`, système d'exploitation, adresse IP, `Status_Agent`, version de l'agent, uptime simulé, et actions disponibles.
3. WHEN un `Agent_EDR` a le `Status_Agent` `active`, THE `Client_Space` SHALL afficher le statut en vert avec un indicateur lumineux animé (pulsant).
4. WHEN un `Agent_EDR` a le `Status_Agent` `disconnected`, THE `Client_Space` SHALL afficher le statut en gris sans indicateur lumineux.
5. WHEN un `Agent_EDR` a le `Status_Agent` `alert`, THE `Client_Space` SHALL afficher le statut en orange avec un indicateur d'alerte animé.
6. WHEN un `Agent_EDR` a le `Status_Agent` `isolated`, THE `Client_Space` SHALL afficher le statut en rouge avec le libellé "Quarantaine".
7. WHEN l'analyste clique sur l'action "Redémarrer" pour un agent, THE `Client_Space` SHALL déclencher une simulation de redémarrage (toast de chargement puis confirmation) et mettre à jour le statut de l'agent à `active` après 3 secondes.
8. WHEN l'analyste clique sur l'action "Mettre à jour" pour un agent, THE `Client_Space` SHALL déclencher une simulation de mise à jour (barre de progression) et afficher la nouvelle version simulée (ex. `v4.8.0`) une fois terminée.
9. WHEN l'analyste clique sur l'action "Désinstaller" pour un agent avec `Status_Agent` `disconnected`, THE `Client_Space` SHALL afficher une boîte de dialogue de confirmation avant de supprimer l'agent de la liste et de mettre à jour l'`ExtData` dans `localStorage`.
10. IF l'analyste tente de désinstaller un agent avec `Status_Agent` `active` ou `alert`, THEN THE `Client_Space` SHALL afficher un message d'erreur indiquant que la désinstallation est impossible sur un agent en ligne.
11. THE `Client_Space` SHALL afficher en haut de l'onglet une bannière de statistiques globales : nombre d'agents actifs, en alerte, déconnectés, et le `Coverage_Score` du client.
12. WHEN l'uptime d'un agent est inférieur à 24 heures, THE `Client_Space` SHALL afficher un badge "Récemment installé" à côté du nom de l'agent.

---

### Requirement 2 : Onglet Topologie de Protection Endpoint

**User Story :** En tant qu'analyste SOC, je veux visualiser graphiquement les postes de travail d'un client et leur état de protection EDR, afin d'identifier rapidement les machines non couvertes ou compromises.

#### Critères d'acceptation

1. THE `Client_Space` SHALL afficher un nouvel onglet "Topologie Endpoint" dans la barre de navigation de l'espace client.
2. WHEN l'onglet "Topologie Endpoint" est actif, THE `Client_Space` SHALL afficher une `Topologie_Map` sous forme de grille de cartes (card grid) représentant chaque `Endpoint` du client, avec le nom de la machine, le système d'exploitation (icône), l'adresse IP, et le `Status_Agent`.
3. WHEN un `Endpoint` a le `Status_Agent` `active`, THE `Client_Space` SHALL afficher sa carte avec une bordure verte et un badge de statut "Protégé".
4. WHEN un `Endpoint` a le `Status_Agent` `disconnected`, THE `Client_Space` SHALL afficher sa carte avec une bordure grise et un badge "Non connecté".
5. WHEN un `Endpoint` a le `Status_Agent` `alert`, THE `Client_Space` SHALL afficher sa carte avec une bordure orange animée (pulsante) et un badge "En alerte".
6. WHEN un `Endpoint` a le `Status_Agent` `isolated`, THE `Client_Space` SHALL afficher sa carte avec une bordure rouge et un badge "Quarantaine".
7. THE `Client_Space` SHALL afficher une barre de `Coverage_Score` en haut de la `Topologie_Map`, indiquant le pourcentage d'endpoints couverts par un agent actif ou en alerte.
8. WHEN le `Coverage_Score` est supérieur ou égal à 80%, THE `Client_Space` SHALL afficher la barre de couverture en vert avec le libellé "Couverture satisfaisante".
9. WHEN le `Coverage_Score` est compris entre 50% et 79%, THE `Client_Space` SHALL afficher la barre de couverture en orange avec le libellé "Couverture partielle".
10. WHEN le `Coverage_Score` est inférieur à 50%, THE `Client_Space` SHALL afficher la barre de couverture en rouge avec le libellé "Couverture insuffisante".
11. WHEN l'analyste clique sur la carte d'un `Endpoint`, THE `Client_Space` SHALL afficher un panneau latéral (drawer ou panel) avec les détails de la machine : CPU, RAM, dernière connexion, `wazuhId`, processus simulés actifs.
12. THE `Client_Space` SHALL afficher un résumé chiffré sous la `Topologie_Map` : nombre total d'endpoints, nombre protégés, nombre en alerte, nombre déconnectés.
13. WHERE le nombre d'endpoints du client dépasse 6, THE `Client_Space` SHALL afficher un filtre par statut permettant de n'afficher que les machines d'un `Status_Agent` spécifique.

---

### Requirement 3 : Onglet Alertes Client

**User Story :** En tant qu'analyste SOC, je veux consulter les alertes de sécurité filtrées pour un client spécifique dans son espace dédié, afin de ne voir que les incidents le concernant et d'y répondre rapidement.

#### Critères d'acceptation

1. THE `Client_Space` SHALL afficher un nouvel onglet "Alertes" dans la barre de navigation de l'espace client, avec un badge affichant le nombre d'alertes actives (statut `new` ou `investigating`) du client.
2. WHEN l'onglet "Alertes" est actif, THE `Client_Space` SHALL charger et afficher uniquement les alertes dont le champ `organization` correspond à l'organisation du client courant (filtre par `profile.organization`).
3. WHEN aucune alerte n'existe pour le client dans la base Supabase, THE `Client_Space` SHALL afficher un message "Aucune alerte pour ce client" avec une icône de bouclier vert.
4. THE `Client_Space` SHALL afficher les alertes dans un tableau avec les colonnes : Sévérité (badge coloré), Titre, Règle Wazuh, Agent hôte, Statut, Date de détection, et Actions SOAR.
5. WHEN la sévérité d'une alerte est supérieure ou égale à 12, THE `Client_Space` SHALL afficher un badge rouge "CRITIQUE" avec une animation de pulsation pour cette alerte.
6. WHEN la sévérité d'une alerte est comprise entre 8 et 11, THE `Client_Space` SHALL afficher un badge orange "ÉLEVÉE" pour cette alerte.
7. WHEN la sévérité d'une alerte est comprise entre 5 et 7, THE `Client_Space` SHALL afficher un badge jaune "MOYENNE" pour cette alerte.
8. WHEN la sévérité d'une alerte est inférieure à 5, THE `Client_Space` SHALL afficher un badge gris "FAIBLE" pour cette alerte.
9. THE `Client_Space` SHALL permettre à l'analyste de filtrer les alertes du client par sévérité (Toutes, Critique, Élevée, Moyenne, Faible) et par statut (`new`, `investigating`, `closed`).
10. THE `Client_Space` SHALL permettre à l'analyste de rechercher dans les alertes du client par titre ou nom d'agent via un champ de recherche textuelle.
11. WHEN l'analyste clique sur "Playbook Shuffle" pour une alerte, THE `Client_Space` SHALL simuler le déclenchement du playbook avec un toast de progression (chargement puis succès).
12. WHEN l'analyste clique sur "Pivoter TheHive" pour une alerte, THE `Client_Space` SHALL simuler la création d'un brouillon de cas TheHive avec un toast de confirmation incluant l'identifiant de l'alerte.
13. THE `Client_Space` SHALL afficher en haut de l'onglet des indicateurs de synthèse : nombre total d'alertes du client, nombre de critiques, nombre en cours d'investigation, et nombre résolues.
14. WHEN l'analyste modifie le statut d'une alerte (ex. `new` → `investigating`), THE `Client_Space` SHALL mettre à jour le statut dans la table Supabase `alerts` et rafraîchir l'affichage.
15. THE `Client_Space` SHALL inclure les alertes injectées par la simulation SOC (`useSocSimulation`) dont l'`agent_name` correspond à l'un des endpoints du client, en complément des alertes réelles Supabase.

---

### Requirement 4 : Navigation et cohérence de l'espace client

**User Story :** En tant qu'analyste SOC, je veux que les 3 nouvelles sections soient accessibles de manière fluide depuis l'espace client existant, afin que la navigation soit cohérente avec les onglets déjà présents.

#### Critères d'acceptation

1. THE `Client_Space` SHALL intégrer les 3 nouveaux onglets ("Agents EDR", "Topologie Endpoint", "Alertes") dans la barre de navigation existante, après les onglets actuels ("Vue générale", "PC Connectés", "Contrats & Facturation").
2. WHEN l'un des 3 nouveaux onglets est actif, THE `Client_Space` SHALL conserver le même en-tête client (nom, organisation, badges de statut, bouton Activer/Suspendre) sans rechargement de page.
3. THE `Client_Space` SHALL mettre à jour le type d'onglet actif (`activeTab`) pour inclure les nouvelles valeurs : `"agents"`, `"topology"`, `"alerts"`, en plus des valeurs existantes (`"overview"`, `"pcs"`, `"contract"`).
4. WHEN les données `ExtData` du client sont modifiées depuis l'onglet "Agents EDR" (ex. désinstallation d'un agent), THE `Client_Space` SHALL répercuter ces modifications dans `localStorage` et rafraîchir tous les onglets qui dépendent de ces données.
5. IF le `clientId` dans l'URL ne correspond à aucun client existant (ni Supabase ni données de démo), THEN THE `Client_Space` SHALL rediriger vers la liste des clients (`/clients`) avec un toast d'erreur.
