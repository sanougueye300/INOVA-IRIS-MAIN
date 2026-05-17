/**
 * Données de démonstration SOC — prêtes à être remplacées par des appels API
 * (Wazuh, TheHive, MISP, Shuffle, VirusTotal, DFIR-IRIS).
 */

export type ConnectorId = "wazuh" | "thehive" | "misp" | "shuffle" | "virustotal" | "iris";

export type ConnectorStatus = "up" | "degraded" | "down";

export interface SocConnector {
  id: ConnectorId;
  label: string;
  status: ConnectorStatus;
  latencyMs: number;
  lastSync: string;
}

export interface SocHealthScore {
  score: number;
  avgAlertHandlingMin: number;
  iocFreshnessPct: number;
  connectorsOk: number;
  connectorsTotal: number;
}

export interface MitreTacticCount {
  tactic: string;
  tacticId: string;
  count: number;
}

export interface IncidentTimelineItem {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  at: string;
  caseRef: string;
}

export interface CountryTraffic {
  country: string;
  code: string;
  intensity: number;
}

export interface MttdMttr {
  mttdMin: number;
  mttrMin: number;
}

export interface RssItem {
  id: string;
  title: string;
  link: string;
  publishedAt: string;
  source: string;
}

export interface MockAlertNode {
  id: string;
  title: string;
  severity: number;
  status: string;
  ruleId: string;
  mitreTactic: string;
  sourceIp: string;
  hostname: string;
  detectedAt: string;
  agentName: string | null;
}

export interface ShuffleRun {
  id: string;
  workflow: string;
  status: "success" | "failed" | "running";
  startedAt: string;
  durationSec: number;
}

export interface WazuhAgentNode {
  id: string;
  name: string;
  status: "active" | "disconnected" | "pending";
  version: string;
  lastLogAt: string;
}

export interface WazuhRule {
  id: string;
  description: string;
  level: number;
  enabled: boolean;
}

export interface TheHiveCase {
  id: string;
  title: string;
  stage: "open" | "in_progress" | "resolved" | "closed";
  severity: number;
  createdAt: string;
  closedAt: string | null;
  type: string;
}

export interface MispEventNode {
  id: string;
  info: string;
  threatLevel: 1 | 2 | 3 | 4;
  date: string;
  org: string;
}

export interface AttackFlow {
  sourceCountry: string;
  targetCountry: string;
  sourceLat: number;
  sourceLng: number;
  targetLat: number;
  targetLng: number;
  volume: number;
  at: string;
}

export interface IrisInvestigation {
  id: string;
  name: string;
  artifacts: { name: string; type: string }[];
  timeline: { at: string; label: string }[];
  evidenceCount: number;
}

/** Connecteurs — à mapper sur /health de chaque service en production. */
export const mockConnectors: SocConnector[] = [
  { id: "wazuh", label: "Wazuh", status: "up", latencyMs: 42, lastSync: new Date(Date.now() - 60_000).toISOString() },
  { id: "thehive", label: "TheHive", status: "up", latencyMs: 118, lastSync: new Date(Date.now() - 120_000).toISOString() },
  { id: "misp", label: "MISP", status: "degraded", latencyMs: 890, lastSync: new Date(Date.now() - 900_000).toISOString() },
  { id: "shuffle", label: "Shuffle", status: "up", latencyMs: 210, lastSync: new Date(Date.now() - 30_000).toISOString() },
  { id: "virustotal", label: "VirusTotal", status: "up", latencyMs: 340, lastSync: new Date(Date.now() - 45_000).toISOString() },
  { id: "iris", label: "DFIR-IRIS", status: "up", latencyMs: 156, lastSync: new Date(Date.now() - 180_000).toISOString() },
];

export function computeSocHealth(
  avgAlertHandlingMin: number,
  iocFreshnessPct: number,
  connectors: SocConnector[],
): SocHealthScore {
  const connectorsOk = connectors.filter((c) => c.status === "up").length;
  const handlingScore = Math.max(0, 100 - avgAlertHandlingMin * 2);
  const iocScore = iocFreshnessPct;
  const connScore = (connectorsOk / connectors.length) * 100;
  const score = Math.round(handlingScore * 0.35 + iocScore * 0.35 + connScore * 0.3);
  return {
    score: Math.min(100, Math.max(0, score)),
    avgAlertHandlingMin,
    iocFreshnessPct,
    connectorsOk,
    connectorsTotal: connectors.length,
  };
}

export const mockMitreTactics: MitreTacticCount[] = [
  { tactic: "Initial Access", tacticId: "TA0001", count: 28 },
  { tactic: "Execution", tacticId: "TA0002", count: 44 },
  { tactic: "Persistence", tacticId: "TA0003", count: 19 },
  { tactic: "Privilege Escalation", tacticId: "TA0004", count: 12 },
  { tactic: "Defense Evasion", tacticId: "TA0005", count: 31 },
  { tactic: "Credential Access", tacticId: "TA0006", count: 22 },
  { tactic: "Discovery", tacticId: "TA0007", count: 56 },
  { tactic: "Lateral Movement", tacticId: "TA0008", count: 9 },
  { tactic: "Collection", tacticId: "TA0009", count: 14 },
  { tactic: "Command and Control", tacticId: "TA0011", count: 37 },
  { tactic: "Impact", tacticId: "TA0040", count: 6 },
];

export const mockIncidentTimeline: IncidentTimelineItem[] = [
  { id: "1", title: "Bruteforce SSH — DMZ", severity: "high", at: new Date(Date.now() - 20 * 60_000).toISOString(), caseRef: "TH-4821" },
  { id: "2", title: "PowerShell encodé — Finance", severity: "critical", at: new Date(Date.now() - 3 * 3600_000).toISOString(), caseRef: "TH-4819" },
  { id: "3", title: "IOC MISP correlés — Emotet", severity: "medium", at: new Date(Date.now() - 8 * 3600_000).toISOString(), caseRef: "TH-4812" },
  { id: "4", title: "Scan réseau interne", severity: "low", at: new Date(Date.now() - 26 * 3600_000).toISOString(), caseRef: "TH-4804" },
];

export const mockCountryTraffic: CountryTraffic[] = [
  { country: "France", code: "FR", intensity: 0.35 },
  { country: "Sénégal", code: "SN", intensity: 0.72 },
  { country: "États-Unis", code: "US", intensity: 0.55 },
  { country: "Russie", code: "RU", intensity: 0.88 },
  { country: "Chine", code: "CN", intensity: 0.62 },
  { country: "Brésil", code: "BR", intensity: 0.28 },
  { country: "Allemagne", code: "DE", intensity: 0.41 },
  { country: "Royaume-Uni", code: "GB", intensity: 0.48 },
];

export const mockMttdMttr: MttdMttr = { mttdMin: 8.4, mttrMin: 94 };

/** Flux type veille — en prod : proxy RSS ou API dédiée. */
export const mockCyberRss: RssItem[] = [
  {
    id: "rss1",
    title: "Critical OpenSSL patch addresses authentication bypass",
    link: "https://thehackernews.com",
    publishedAt: new Date(Date.now() - 45 * 60_000).toISOString(),
    source: "The Hacker News",
  },
  {
    id: "rss2",
    title: "New ransomware strain targets ESXi hypervisors in EMEA",
    link: "https://thehackernews.com",
    publishedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    source: "The Hacker News",
  },
  {
    id: "rss3",
    title: "CISA adds three actively exploited bugs to KEV catalog",
    link: "https://thehackernews.com",
    publishedAt: new Date(Date.now() - 10 * 3600_000).toISOString(),
    source: "The Hacker News",
  },
];

export const mockAlertGraphNodes: MockAlertNode[] = [
  {
    id: "a1",
    title: "Multiple failed SSH logins",
    severity: 10,
    status: "new",
    ruleId: "5710",
    mitreTactic: "TA0006",
    sourceIp: "203.0.113.44",
    hostname: "srv-dmz-01",
    detectedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
    agentName: "dmz-01",
  },
  {
    id: "a2",
    title: "Suspicious outbound connection",
    severity: 8,
    status: "investigating",
    ruleId: "80790",
    mitreTactic: "TA0011",
    sourceIp: "203.0.113.44",
    hostname: "wkstn-finance-12",
    detectedAt: new Date(Date.now() - 25 * 60_000).toISOString(),
    agentName: "fin-12",
  },
  {
    id: "a3",
    title: "Windows Defender tampering",
    severity: 12,
    status: "new",
    ruleId: "62151",
    mitreTactic: "TA0005",
    sourceIp: "198.51.100.2",
    hostname: "wkstn-finance-12",
    detectedAt: new Date(Date.now() - 40 * 60_000).toISOString(),
    agentName: "fin-12",
  },
  {
    id: "a4",
    title: "DNS tunneling pattern",
    severity: 11,
    status: "new",
    ruleId: "92050",
    mitreTactic: "TA0011",
    sourceIp: "192.0.2.18",
    hostname: "srv-dns-02",
    detectedAt: new Date(Date.now() - 55 * 60_000).toISOString(),
    agentName: "dns-02",
  },
  {
    id: "a5",
    title: "Local admin added",
    severity: 9,
    status: "closed",
    ruleId: "60122",
    mitreTactic: "TA0004",
    sourceIp: "10.0.4.22",
    hostname: "wkstn-hr-03",
    detectedAt: new Date(Date.now() - 120 * 60_000).toISOString(),
    agentName: "hr-03",
  },
];

/** Arêtes du graphe de corrélation : indices partagés (IP ou hostname). */
export const mockAlertGraphEdges: { from: string; to: string; reason: string }[] = [
  { from: "a1", to: "a2", reason: "IP 203.0.113.44" },
  { from: "a2", to: "a3", reason: "hostname wkstn-finance-12" },
  { from: "a4", to: "a2", reason: "tactic C2 / proxy" },
];

export const mockShuffleRuns24h: ShuffleRun[] = [
  { id: "s1", workflow: "Wazuh → TheHive (critique)", status: "success", startedAt: new Date(Date.now() - 20 * 60_000).toISOString(), durationSec: 12 },
  { id: "s2", workflow: "MISP enrichissement IOC", status: "success", startedAt: new Date(Date.now() - 2 * 3600_000).toISOString(), durationSec: 45 },
  { id: "s3", workflow: "Slack notify + ticket Jira", status: "failed", startedAt: new Date(Date.now() - 5 * 3600_000).toISOString(), durationSec: 8 },
  { id: "s4", workflow: "Isolation endpoint Wazuh", status: "running", startedAt: new Date(Date.now() - 2 * 60_000).toISOString(), durationSec: 0 },
];

export const mockWazuhAgents: WazuhAgentNode[] = [
  { id: "001", name: "dmz-01", status: "active", version: "4.9.2", lastLogAt: new Date(Date.now() - 30_000).toISOString() },
  { id: "002", name: "fin-12", status: "active", version: "4.9.2", lastLogAt: new Date(Date.now() - 120_000).toISOString() },
  { id: "003", name: "dns-02", status: "disconnected", version: "4.8.1", lastLogAt: new Date(Date.now() - 3600_000).toISOString() },
  { id: "004", name: "hr-03", status: "active", version: "4.9.2", lastLogAt: new Date(Date.now() - 15_000).toISOString() },
];

export const mockWazuhRules: WazuhRule[] = [
  { id: "5710", description: "sshd: brute force trying to get access", level: 10, enabled: true },
  { id: "80790", description: "Suspicious network activity", level: 8, enabled: true },
  { id: "92050", description: "DNS tunneling", level: 12, enabled: true },
];

export const mockMitreTechniques = [
  { id: "T1110", name: "Brute Force", count: 18 },
  { id: "T1059.001", name: "PowerShell", count: 11 },
  { id: "T1071.004", name: "DNS", count: 7 },
  { id: "T1562.001", name: "Disable or Modify Tools", count: 5 },
];

export const mockTheHiveCases: TheHiveCase[] = [
  { id: "TH-4821", title: "SSH bruteforce DMZ", stage: "in_progress", severity: 3, createdAt: new Date(Date.now() - 4 * 3600_000).toISOString(), closedAt: null, type: "intrusion" },
  { id: "TH-4819", title: "PowerShell encodé Finance", stage: "open", severity: 4, createdAt: new Date(Date.now() - 8 * 3600_000).toISOString(), closedAt: null, type: "malware" },
  { id: "TH-4804", title: "Scan interne bénin", stage: "resolved", severity: 2, createdAt: new Date(Date.now() - 200 * 3600_000).toISOString(), closedAt: new Date(Date.now() - 24 * 3600_000).toISOString(), type: "recon" },
  { id: "TH-4790", title: "Phishing ciblé RH", stage: "closed", severity: 3, createdAt: new Date(Date.now() - 400 * 3600_000).toISOString(), closedAt: new Date(Date.now() - 380 * 3600_000).toISOString(), type: "phishing" },
];

export const mockMispEvents: MispEventNode[] = [
  { id: "evt-101", info: "Emotet C2 domains — batch 14", threatLevel: 4, date: new Date(Date.now() - 2 * 86400_000).toISOString(), org: "CERT-FR" },
  { id: "evt-98", info: "Qakbot hashes IoC", threatLevel: 3, date: new Date(Date.now() - 20 * 86400_000).toISOString(), org: "MISP Community" },
  { id: "evt-77", info: "Stale test event (review)", threatLevel: 1, date: new Date(Date.now() - 120 * 86400_000).toISOString(), org: "Lab" },
];

export const mockAttackFlows: AttackFlow[] = [
  { sourceCountry: "RU", targetCountry: "SN", sourceLat: 55.75, sourceLng: 37.62, targetLat: 14.72, targetLng: -17.47, volume: 42, at: new Date(Date.now() - 10 * 60_000).toISOString() },
  { sourceCountry: "CN", targetCountry: "FR", sourceLat: 39.9, sourceLng: 116.4, targetLat: 48.86, targetLng: 2.35, volume: 28, at: new Date(Date.now() - 25 * 60_000).toISOString() },
  { sourceCountry: "US", targetCountry: "DE", sourceLat: 40.71, sourceLng: -74.01, targetLat: 52.52, targetLng: 13.41, volume: 15, at: new Date(Date.now() - 40 * 60_000).toISOString() },
];

export const mockIrisInvestigation: IrisInvestigation = {
  id: "IRIS-2026-014",
  name: "Incident Finance — PowerShell",
  artifacts: [
    { name: "powershell_transcript.txt", type: "text" },
    { name: "memory.dmp", type: "memory" },
    { name: "network.pcapng", type: "pcap" },
  ],
  timeline: [
    { at: new Date(Date.now() - 8 * 3600_000).toISOString(), label: "Première alerte Wazuh" },
    { at: new Date(Date.now() - 7.5 * 3600_000).toISOString(), label: "Cas TheHive créé" },
    { at: new Date(Date.now() - 6 * 3600_000).toISOString(), label: "Collecte DFIR-IRIS" },
  ],
  evidenceCount: 14,
};

export const mockIocWeeklyTrend = [
  { week: "S-4", newIoc: 12, expired: 2 },
  { week: "S-3", newIoc: 18, expired: 1 },
  { week: "S-2", newIoc: 9, expired: 4 },
  { week: "S-1", newIoc: 22, expired: 3 },
];

export function mockShuffleWorkflowTemplates() {
  return [
    { id: "tpl1", name: "Isoler un endpoint Wazuh", blocks: ["Webhook", "Wazuh Active Response", "Slack"] },
    { id: "tpl2", name: "Créer un cas TheHive automatique", blocks: ["Wazuh", "Normalizer", "TheHive", "Email"] },
    { id: "tpl3", name: "Enrichir IOC → MISP + VT", blocks: ["IOC", "MISP", "VirusTotal", "IRIS"] },
  ];
}

/** Score VT factice déterministe pour la démo (remplacer par API VT). */
export function demoVtScore(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 45) + 25;
}

export function demoMitreTag(seed: string): string {
  const tags = ["T1071", "T1059", "T1110", "T1566", "—"];
  return tags[(seed.length + (seed.charCodeAt(0) ?? 0)) % tags.length];
}

export function mockVtRecentSearches() {
  return [
    { query: "sha256:a3f2…9c1", engines: "42/72", at: new Date(Date.now() - 15 * 60_000).toISOString() },
    { query: "evil-update.net", engines: "8/72", at: new Date(Date.now() - 2 * 3600_000).toISOString() },
  ];
}
