// Catalogue des offres SOC — fichier utilitaire partagé (pas de dépendance route)

export interface Offer {
  id: string;
  name: string;
  value: number;
  currency: string;
  period: string;
  maxPcs: number;
  mttd: string;
  mttr: string;
  support: string;
  features: string[];
  isActive: boolean;
  description?: string;
  theme?: "orange" | "blue" | "gold" | "slate" | string;
}

export const DEFAULT_OFFERS: Offer[] = [
  {
    id: "inova-secure",
    name: "Inova Secure",
    value: 100000,
    currency: "FCFA",
    period: "mois",
    maxPcs: 10,
    mttd: "< 10 min",
    mttr: "< 30 min",
    support: "8h-18h L-V",
    description: "Protection essentielle pour les petites structures et PME",
    theme: "orange",
    features: [
      "SIEM Wazuh EDR de base",
      "Scan de réputation automatique",
      "Intégration d'IOC manuelle",
      "Support par e-mail standard",
      "Tableau de bord de sécurité",
    ],
    isActive: true,
  },
  {
    id: "terranga-secure",
    name: "Terranga Secure",
    value: 250000,
    currency: "FCFA",
    period: "mois",
    maxPcs: 25,
    mttd: "< 05 min",
    mttr: "< 15 min",
    support: "24h/7 L-V",
    description: "Surveillance avancée pour les entreprises en croissance",
    theme: "blue",
    features: [
      "SIEM Wazuh EDR avancé",
      "Orchestrateur SOAR Pipeline",
      "Gestion d'incidents TheHive",
      "Enrichissement automatique VT",
      "Support téléphonique & e-mail",
    ],
    isActive: true,
  },
  {
    id: "gainde-secure",
    name: "Gainde Secure",
    value: 500000,
    currency: "FCFA",
    period: "mois",
    maxPcs: 50,
    mttd: "< 03 min",
    mttr: "< 10 min",
    support: "24h/7/365 Dédié",
    description: "Solution premium avec analyste SOC dédié 24h/7/365",
    theme: "gold",
    features: [
      "SIEM Wazuh EDR Premium",
      "Orchestrateur SOAR Avancé",
      "Plateforme de Threat Intel MISP",
      "Plateforme d'investigation IRIS",
      "Analyste SOC Dédié",
      "Playbooks d'automatisation standard",
    ],
    isActive: true,
  },
];

/** Charge les offres depuis localStorage avec fallback sur DEFAULT_OFFERS */
export function loadOffers(): Offer[] {
  try {
    const stored = localStorage.getItem("soc_catalogues_offres");
    if (stored) {
      const parsed = JSON.parse(stored) as Offer[];
      if (parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_OFFERS;
}

/** Retourne l'offre correspondant au tier contractuel */
export function getOfferForTier(tier: string, offers: Offer[]): Offer | undefined {
  const active = offers.filter((o) => o.isActive);
  const map: Record<string, number> = { Bronze: 0, Argent: 1, Or: 2, Platine: 3 };
  const idx = map[tier] ?? 0;
  return active[idx] ?? active[0];
}

/** Calcule les statistiques du catalogue */
export function computeCatalogStats(offers: Offer[]) {
  const active = offers.filter((o) => o.isActive);
  const total = offers.length;
  const totalMonthly = active.reduce((acc, o) => acc + o.value, 0);
  const avgValue = total > 0 ? Math.round(offers.reduce((acc, o) => acc + o.value, 0) / total) : 0;
  const occupancyRate = total > 0 ? Math.round((active.length / total) * 100) : 0;
  return { total, active: active.length, totalMonthly, avgValue, occupancyRate };
}
