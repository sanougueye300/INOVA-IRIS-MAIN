import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  LayoutDashboard,
  AlertTriangle,
  Database,
  Shield,
  Bug,
  Workflow,
  ScanSearch,
  ServerCog,
  TrendingUp,
  TrendingDown,
  Brain,
  Globe2,
  Share2,
  Power,
  RefreshCw,
  Search,
  CheckCircle2,
  Terminal,
  ArrowRight,
  Sparkles,
  Lock,
  Download,
  AlertOctagon,
  Globe,
  Radio,
  FileCode,
  FileText,
  Activity,
  Cpu,
  Server,
  Network,
  Maximize2,
  CornerDownLeft,
  ChevronRight,
  Gauge
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QuickLinkCard } from "@/components/soc/QuickLinkCard";
import { TopRegionsCard } from "@/components/soc/TopRegionsCard";
import { ThreatMap } from "@/components/soc/ThreatMap";
import { SocHealthScoreCard } from "@/components/soc/SocHealthScoreCard";
import { SocMitreTacticsChart } from "@/components/soc/SocMitreTacticsChart";
import { SocIncidentTimeline } from "@/components/soc/SocIncidentTimeline";
import { SocCountryHeatMini } from "@/components/soc/SocCountryHeatMini";
import { SocMttdMttrGauge } from "@/components/soc/SocMttdMttrGauge";
import { SocCyberRssCard } from "@/components/soc/SocCyberRssCard";
import { SocTimeRangeTabs } from "@/components/soc/SocTimeRangeTabs";
import { useSocPreferences } from "@/lib/soc-preferences";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "SaaS Cyber Command - Inova-Iris SOC" }] }),
  component: Dashboard,
});

const SEVERITY_COLORS = ["#10b981", "#eab308", "#f97316", "#ef4444"];
const SEVERITY_LABELS = ["Faible", "Moyenne", "Élevée", "Critique"];

function bucket(severity: number) {
  if (severity >= 12) return 3;
  if (severity >= 8) return 2;
  if (severity >= 5) return 1;
  return 0;
}

function lastNDays(n: number, language: string = "fr") {
  const days: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(
        language === "fr" ? "fr-FR" : language === "en" ? "en-US" : language === "wo" ? "fr-FR" : "ar-EG", 
        { weekday: "short" }
      ),
    });
  }
  return days;
}

// Integration items status metadata
const STACK_STATUS = [
  { id: "wazuh", name: "Wazuh SIEM/EDR", desc: "Logs, conformité & EDR agents", icon: Shield, ver: "v4.8.0", stats: "142 Agents Actifs", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20 hover:border-blue-500/40" },
  { id: "shuffle", name: "Shuffle SOAR", desc: "Orchestration & Playbooks autonomes", icon: Workflow, ver: "v1.2.0", stats: "14 Playbooks • 98.6%", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20 hover:border-amber-500/40" },
  { id: "vt", name: "VirusTotal", desc: "Réputation hash & fichiers", icon: Bug, ver: "API Premium", stats: "Quota API 82%", color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20 hover:border-cyan-500/40" },
  { id: "misp", name: "MISP Threat Intel", desc: "Flux d'IOCs mondiaux", icon: Database, ver: "v2.4.192", stats: "2,450 IOCs Actifs", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20 hover:border-red-500/40" },
  { id: "thehive", name: "TheHive 5", desc: "Gestion collaborative d'incidents", icon: Share2, ver: "v5.2.4", stats: "18 Cas ouverts", color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20 hover:border-purple-500/40" },
  { id: "iris", name: "DFIR-IRIS", desc: "Forensics, preuves & rapports", icon: ServerCog, ver: "v2.3.1", stats: "4 Enquêtes Actives", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20 hover:border-rose-500/40" },
];

// SaaS pipeline steps metadata
const PIPELINE_STEPS = [
  { id: "step-wazuh", name: "1. Détection EDR", tool: "Wazuh", icon: Shield, color: "text-blue-500", action: "Détection host/réseau", payload: `{ "alert": { "rule": { "level": 12, "id": "100200" }, "agent": { "name": "Prod-Srv-04" }, "description": "Suspicious shellcode execution detected" } }` },
  { id: "step-shuffle", name: "2. Trigger SOAR", tool: "Shuffle", icon: Workflow, color: "text-amber-500", action: "Interception & Webhook", payload: `{ "playbook": "VT_Reputation_Scan", "action": "Triggered", "payload_source": "Wazuh-Alert-100200" }` },
  { id: "step-vt", name: "3. Enrichissement", tool: "VirusTotal", icon: Bug, color: "text-cyan-500", action: "Réputation Fichier/Hash", payload: `{ "hash": "9f83ea018c...02", "positives": 54, "total": 72, "status": "MALICIOUS" }` },
  { id: "step-misp", name: "4. Threat Correlation", tool: "MISP", icon: Database, color: "text-red-500", action: "Vérification Flux Menaces", payload: `{ "match": true, "campaign": "APT29_CozyBear", "threat_level": "High", "confidence": 95 }` },
  { id: "step-thehive", name: "5. Escalade Incident", tool: "TheHive", icon: Share2, color: "text-purple-500", action: "Création de Cas & Alerte", payload: `{ "case": { "title": "TH-4829: APT29 CozyBear on Prod-Srv-04", "severity": "Critical", "owner": "Sanou Gueye" } }` },
  { id: "step-iris", name: "6. Forensics & Rapport", tool: "DFIR-IRIS", icon: ServerCog, color: "text-rose-500", action: "Chambre des Preuves DFIR", payload: `{ "case_id": "IRIS-4829", "evidence_locker": "🔒 SECURE_CHAIN_LOCKED", "export": "PDF_Ready" }` }
];

export function Dashboard() {
  const [alerts, setAlerts] = useState<{ created_at: string; severity: number; rule_id: string | null; agent_name: string | null; title: string; id: string; status: string }[]>([]);
  const [iocs, setIocs] = useState<{ created_at: string }[]>([]);
  const { t, language, themeColor } = useSocPreferences();

  // SaaS states
  const [tenant, setTenant] = useState("sonatel-group");
  const [activeTab, setActiveTab] = useState<"orchestration" | "maps" | "siem">("orchestration");
  const [selectedStep, setSelectedStep] = useState<typeof PIPELINE_STEPS[number] | null>(PIPELINE_STEPS[0]);
  const [enrichInput, setEnrichInput] = useState("193.56.28.14");
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichResult, setEnrichResult] = useState<any | null>(null);

  // Terminal Simulator State
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalHistory, setTerminalHistory] = useState<{ type: "input" | "output" | "error" | "info" | "success"; text: string }[]>([
    { type: "info", text: "🛡️ INOVA-IRIS CYBERCOMMAND SHIELD PROTOCOL v4.8 [ONLINE]" },
    { type: "info", text: `🔑 TENANT ACTIF: ${tenant.toUpperCase()}` },
    { type: "output", text: "Tapez 'help' pour lister les commandes de cyber-réponse disponibles." },
  ]);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // SOAR mock real-time playbooks ticker
  const [playbookLogs, setPlaybookLogs] = useState<string[]>([
    "🤖 [SOAR] Playbook 'Wazuh_VT_Enrichment' initialisé avec succès.",
    "🔍 [Wazuh] Agent Prod-Web-02: détection d'activité Shellcode non autorisée (Règle 100412).",
    "🤖 [SOAR] Playbook 'Auto_Incident_Response' déclenché par webhook Wazuh.",
    "🛡️ [VirusTotal] Envoi du hash pour vérification réputation... Résultat: MALVEILLANT (58/74).",
    "💾 [MISP] Corrélation de l'indicateur effectuée. Campagne identifiée: APT29 / CozyBear.",
    "🐝 [TheHive] Escalade automatique: Cas d'incident créé (TH-8241) et attribué à Sanou Gueye.",
    "📁 [DFIR-IRIS] Création automatique de la chambre d'enquête IRIS-8241. Preuves scellées."
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const logs = [
        "🔍 [Wazuh] Nouvel événement SIEM collecté: Connexion SSH brute-force bloquée sur Prod-DB-01.",
        "🤖 [SOAR] Lancement du playbook 'SSH_BruteForce_Mitigation' pour bloquer IP suspecte.",
        "🛡️ [VirusTotal] Scan IP 185.220.101.4: IP reconnue comme nœud de sortie Tor malveillant.",
        "💾 [MISP] IOC inséré automatiquement dans le flux de veille global.",
        "📁 [DFIR-IRIS] Exportation de la preuve légale scellée pour le cas IRIS-1290.",
        "🐝 [TheHive] Alerte escaladée: Activité anormale suspectée sur EDR Agent Prod-Dev-09."
      ];
      const randomLog = logs[Math.floor(Math.random() * logs.length)];
      setPlaybookLogs(prev => [randomLog, ...prev.slice(0, 9)]);
      
      // Mirror in simulated terminal
      setTerminalHistory(prev => [
        ...prev,
        { type: "info", text: `[SOAR ENGINE] ${randomLog}` }
      ].slice(-50));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom of terminal whenever history updates
  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalHistory]);

  // Fetch alerts & IOCs
  useEffect(() => {
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const sinceIso = since.toISOString();
      const [{ data: a }, { data: i }] = await Promise.all([
        supabase
          .from("alerts")
          .select("id,title,created_at,severity,rule_id,agent_name,status")
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("iocs")
          .select("created_at")
          .gte("created_at", sinceIso)
          .limit(500),
      ]);
      setAlerts(a ?? []);
      setIocs(i ?? []);
    })();
  }, []);

  // Run mock VirusTotal/MISP scan
  const executeEnrichScan = (ipTarget: string) => {
    const target = ipTarget.trim();
    if (!target) return;
    setEnrichLoading(true);
    setEnrichResult(null);

    setTerminalHistory(prev => [
      ...prev,
      { type: "info", text: `📡 [VT/MISP API] Initialisation de la requête pour ${target}...` },
      { type: "output", text: "-> Analyse heuristique des signatures de réputation active." }
    ]);

    setTimeout(() => {
      setEnrichLoading(false);
      if (target.includes("193") || target.includes("185") || target.toLowerCase().includes("apt") || target.toLowerCase().includes("cozy")) {
        const payloadResult = {
          source: target,
          vt: {
            status: "DANGEROUS / MALICIOUS",
            positives: 58,
            total: 74,
            scanDate: new Date().toLocaleString(),
            harmless: 2,
            suspicious: 14,
            category: "Trojan.Downloader / Command & Control"
          },
          misp: {
            match: "CORRELATION TROUVÉE",
            threatLevel: "HAUTE",
            campaign: "APT29 / CozyBear (Fancy Bear)",
            tags: ["APT", "State-Sponsored", "CobaltStrike", "C2-Server"],
            confidence: "98%"
          }
        };
        setEnrichResult(payloadResult);
        toast.error(`Menace critique détectée sur ${target} !`);
        setTerminalHistory(prev => [
          ...prev,
          { type: "error", text: `💥 ALERTE: Corrélation trouvée dans la base de Threat Intelligence !` },
          { type: "error", text: `   • VirusTotal: DANGEROUS (${payloadResult.vt.positives}/${payloadResult.vt.total})` },
          { type: "error", text: `   • MISP: match campagne ${payloadResult.misp.campaign}` }
        ]);
      } else {
        const payloadResult = {
          source: target,
          vt: {
            status: "CLEAN / SAFE",
            positives: 0,
            total: 74,
            scanDate: new Date().toLocaleString(),
            harmless: 74,
            suspicious: 0,
            category: "Clean / No threat detected"
          },
          misp: {
            match: "AUCUN MATCH (PROPRE)",
            threatLevel: "NULLE",
            campaign: "Aucune",
            tags: ["Clean-IP", "Safe-Domain"],
            confidence: "100%"
          }
        };
        setEnrichResult(payloadResult);
        toast.success(`Scan terminé: ${target} est sain.`);
        setTerminalHistory(prev => [
          ...prev,
          { type: "success", text: `✅ SCAN PROPRE: Aucune menace détectée pour la cible ${target}.` },
          { type: "success", text: `   • VirusTotal: 0/${payloadResult.vt.total} engins` },
          { type: "success", text: `   • MISP: Aucun match IOC.` }
        ]);
      }
    }, 1200);
  };

  const handleEnrich = () => {
    if (!enrichInput) return;
    executeEnrichScan(enrichInput);
  };

  // Terminal commands interpreter
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const command = terminalInput.trim();
    if (!command) return;

    setTerminalHistory(prev => [...prev, { type: "input", text: `> ${command}` }]);
    setTerminalInput("");

    const parts = command.toLowerCase().split(" ");
    const cmd = parts[0];
    const arg = parts.slice(1).join(" ");

    switch (cmd) {
      case "help":
        setTerminalHistory(prev => [
          ...prev,
          { type: "output", text: "Commandes de Cyber-Réponse SOC Iris disponibles:" },
          { type: "output", text: "  help                  - Affiche cette aide." },
          { type: "output", text: "  scan <ip/domain/hash> - Enrichit une cible via VirusTotal & MISP (ex: scan 193.56.28.14)." },
          { type: "output", text: "  playbook <run>        - Lance instantanément un pipeline SOAR simulé (ex: playbook run)." },
          { type: "output", text: "  status                - Affiche l'état opérationnel et de santé du SaaS SOC." },
          { type: "output", text: "  clear                 - Vide la console du terminal." }
        ]);
        break;
      
      case "clear":
        setTerminalHistory([]);
        break;

      case "status":
        setTerminalHistory(prev => [
          ...prev,
          { type: "output", text: `--- RAPPORT D'ÉTAT DU SOC ---` },
          { type: "output", text: `Tenant Actif       : ${tenant.toUpperCase()}` },
          { type: "output", text: `Wazuh SIEM Status  : CONNECTED (142 Agents en ligne)` },
          { type: "output", text: `Shuffle SOAR Engine: OPERATIONAL (14 Playbooks chargés)` },
          { type: "output", text: `Chambre Forensics  : SECURE (100% Intégrité scellée)` },
          { type: "success", text: `Système Global     : SÉCURISÉ & STABLE` }
        ]);
        break;

      case "scan":
        if (!arg) {
          setTerminalHistory(prev => [...prev, { type: "error", text: "Erreur: Spécifiez une cible valide (ex: scan 185.220.101.4)" }]);
        } else {
          setEnrichInput(arg);
          executeEnrichScan(arg);
        }
        break;

      case "playbook":
        if (arg !== "run") {
          setTerminalHistory(prev => [...prev, { type: "error", text: "Syntaxe incorrecte. Utilisez: playbook run" }]);
        } else {
          setTerminalHistory(prev => [...prev, { type: "info", text: "🤖 SOAR: Lancement du playbook de cyber-remédiation global..." }]);
          let delay = 300;
          
          const stepsToSimulate = [
            { t: "info", txt: "🔍 Step 1 [Wazuh]: Capture de l'alerte rule 100200 sur Prod-Srv-04..." },
            { t: "info", txt: "🤖 Step 2 [Shuffle]: Interception Webhook et routage du Hash de fichier..." },
            { t: "error", txt: "🛡️ Step 3 [VirusTotal]: Réputation malveillante (54/72 positives) !" },
            { t: "error", txt: "💾 Step 4 [MISP]: Corrélation établie. Attribution: APT29 CozyBear." },
            { t: "success", txt: "🐝 Step 5 [TheHive]: Escalade du cas TH-4829 et assignation à Sanou Gueye." },
            { t: "success", txt: "🔒 Step 6 [DFIR-IRIS]: Chambre forensique scellée. Export PDF disponible." },
            { t: "success", txt: "🎉 PLAYBOOK EXÉCUTÉ AVEC SUCCÈS - Menace isolée." }
          ];

          stepsToSimulate.forEach((s) => {
            setTimeout(() => {
              setTerminalHistory(prev => [...prev, { type: s.t as any, text: s.txt }]);
            }, delay);
            delay += 400;
          });
        }
        break;

      default:
        setTerminalHistory(prev => [
          ...prev,
          { type: "error", text: `Instruction '${cmd}' non reconnue. Saisissez 'help' pour voir les commandes disponibles.` }
        ]);
    }
  };

  const stats = useMemo(() => {
    const total = alerts.length;
    const critical = alerts.filter((x) => x.severity >= 12).length;
    const open = alerts.filter((x) => x.status === "new").length;
    return { total, critical, open, iocs: iocs.length };
  }, [alerts, iocs]);

  const alertsByDay = useMemo(() => {
    const days = lastNDays(7, language);
    const map = new Map(days.map((d) => [d.key, 0]));
    alerts.forEach((a) => {
      const k = a.created_at.slice(0, 10);
      if (map.has(k)) map.set(k, (map.get(k) ?? 0) + 1);
    });
    return days.map((d) => ({ day: d.label, count: map.get(d.key) ?? 0 }));
  }, [alerts, language]);

  const iocsByDay = useMemo(() => {
    const days = lastNDays(7, language);
    const map = new Map(days.map((d) => [d.key, 0]));
    iocs.forEach((a) => {
      const k = a.created_at.slice(0, 10);
      if (map.has(k)) map.set(k, (map.get(k) ?? 0) + 1);
    });
    return days.map((d) => ({ day: d.label, count: map.get(d.key) ?? 0 }));
  }, [iocs, language]);

  const severityData = useMemo(() => {
    const buckets = [0, 0, 0, 0];
    alerts.forEach((a) => {
      buckets[bucket(a.severity)]++;
    });
    return SEVERITY_LABELS.map((label, i) => ({ name: t(label), value: buckets[i] }));
  }, [alerts, t]);

  const topRules = useMemo(() => {
    const counts = new Map<string, number>();
    alerts.forEach((a) => {
      const k = a.rule_id ?? "—";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([rule, count]) => ({ rule, count }));
  }, [alerts]);

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8 bg-transparent text-foreground min-h-screen">
      
      {/* SaaS Premium Header Banner with Dynamic Accent Theme color overlay */}
      <div className="relative rounded-2xl border border-border/80 dark:border-white/5 bg-card/65 dark:bg-card/35 backdrop-blur-xl p-6 overflow-hidden shadow-sm transition-all duration-300">
        
        {/* Animated Cyber-matrix background grid */}
        <div className="absolute inset-0 bg-grid/5 opacity-20 pointer-events-none" />
        
        {/* Soft glowing ambient radial light from selected theme primary */}
        <div className="absolute -top-[10%] -left-[10%] w-[30%] h-[50%] rounded-full bg-primary/10 blur-[60px] pointer-events-none" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[25%] h-[40%] rounded-full bg-primary/5 blur-[50px] pointer-events-none" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/25 border-primary/20 uppercase font-mono text-[9px] tracking-widest px-2 py-0.5">
                SaaS COMMAND CENTER
              </Badge>
              <div className="flex items-center gap-1 font-mono text-[9px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                SECURE RUNNING
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Shield className="h-5 w-5 animate-pulse" />
              </div>
              {t("CENTRE D'ORCHESTRATION ET DE RÉPONSE INCIDENTS") || "Command War Room SOC"}
            </h1>
            
            <p className="text-xs text-muted-foreground max-w-2xl">
              {t("Pilote d'automatisation SOAR & Plateforme Incident Response — Wazuh, TheHive, MISP, VT, Shuffle, IRIS")}
            </p>
          </div>
          
          {/* Multi-Tenant SaaS Organization Switcher with sleek card format */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-background/50 border border-border/80 dark:border-white/5 backdrop-blur-sm self-start sm:self-center font-mono w-full sm:w-auto min-w-[240px]">
            <label className="text-[9px] text-muted-foreground uppercase tracking-widest pl-1 font-black flex justify-between">
              <span>TENANT ACTIF</span>
              <span className="text-primary font-bold">ORANGE GROUP</span>
            </label>
            <div className="relative">
              <select 
                value={tenant} 
                onChange={(e) => {
                  setTenant(e.target.value);
                  toast.info(`Commutation de Tenant : ${e.target.value.toUpperCase()}`);
                  setTerminalHistory(prev => [
                    ...prev,
                    { type: "info", text: `🔑 TENANT CHANGÉ : ${e.target.value.toUpperCase()}` }
                  ]);
                }}
                className="w-full bg-card hover:bg-accent/50 text-xs border border-border text-foreground font-black rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
              >
                <option value="sonatel-group">Sonatel Group (Sénégal)</option>
                <option value="sonatel-mali">Sonatel Mali (Orange Mali)</option>
                <option value="sonatel-guinee">Sonatel Guinée Enterprise</option>
                <option value="orange-civ">Orange Côte d'Ivoire</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                <ChevronRight className="h-4 w-4 rotate-90" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 1: SaaS Stack Connected Integrations Status */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {STACK_STATUS.map((item) => (
          <Card key={item.id} className="p-4 border border-border/80 dark:border-white/5 bg-card/65 dark:bg-card/35 backdrop-blur-xl shadow-sm flex flex-col justify-between hover:translate-y-[-4px] hover:shadow-md transition-all duration-300 relative group overflow-hidden">
            {/* Top tiny glowing theme color line */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg bg-background/80 ${item.color} shadow-inner`}>
                <item.icon className="h-4 w-4" />
              </div>
              <Badge variant="outline" className="text-[8px] font-mono bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 text-emerald-500 flex items-center gap-1 px-1.5 py-0.5">
                <span className="h-1 w-1 rounded-full bg-emerald-500 animate-ping" />
                ONLINE
              </Badge>
            </div>
            
            <div>
              <h4 className="font-extrabold text-xs text-foreground group-hover:text-primary transition-colors">{item.name}</h4>
              <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1">{item.desc}</p>
              
              <div className="mt-3 pt-2.5 border-t border-border/40 dark:border-white/5 flex items-center justify-between text-[9px] font-mono">
                <span className="text-primary font-extrabold">{item.stats}</span>
                <span className="text-muted-foreground">{item.ver}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 3-Tab Command Center Switcher - Styled with gorgeous glossy cybernetic lines */}
      <div className="flex border-b border-border/60 dark:border-white/5 gap-1 select-none font-mono text-xs overflow-x-auto pb-px">
        <button 
          onClick={() => setActiveTab("orchestration")}
          className={`px-5 py-3 flex items-center gap-2 border-b-2 font-bold transition-all relative shrink-0 ${
            activeTab === "orchestration" 
              ? "border-primary text-primary bg-primary/5 rounded-t-lg" 
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-t-lg"
          }`}
        >
          <Workflow className="h-3.5 w-3.5" />
          ⚡ {t("Orchestration & SOAR Pipeline") || "Orchestration & SOAR"}
        </button>
        
        <button 
          onClick={() => setActiveTab("maps")}
          className={`px-5 py-3 flex items-center gap-2 border-b-2 font-bold transition-all relative shrink-0 ${
            activeTab === "maps" 
              ? "border-primary text-primary bg-primary/5 rounded-t-lg" 
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-t-lg"
          }`}
        >
          <Globe2 className="h-3.5 w-3.5" />
          🌐 {t("Cartographie Live & 3D") || "Cartographie 3D"}
        </button>
        
        <button 
          onClick={() => setActiveTab("siem")}
          className={`px-5 py-3 flex items-center gap-2 border-b-2 font-bold transition-all relative shrink-0 ${
            activeTab === "siem" 
              ? "border-primary text-primary bg-primary/5 rounded-t-lg" 
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-t-lg"
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          📊 {t("SIEM Wazuh & Métriques SOC") || "SIEM & Métriques"}
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "orchestration" && (
        <div className="space-y-6">
          
          {/* INTERACTIVE COMPONENT: Automated SOAR Incident Response Pipeline */}
          <Card className="p-5 border border-border/80 dark:border-white/5 bg-card/65 dark:bg-card/35 backdrop-blur-xl shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-2 uppercase tracking-wider text-foreground">
                  <Activity className="h-4.5 w-4.5 text-primary animate-pulse" />
                  Cycle d'automatisation incident SOAR
                </h3>
                <p className="text-[11px] text-muted-foreground">Cliquez sur une étape de l'orchestration pour analyser l'API Payload de communication inter-outils.</p>
              </div>
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary font-mono text-[9px] uppercase tracking-wider self-start sm:self-center">
                SOAR Pipeline Active
              </Badge>
            </div>

            {/* Glowing Interactive Flow Cards Grid */}
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 relative">
              
              {/* Pipeline connecting laser line */}
              <div className="hidden lg:block absolute top-[50%] left-[8%] right-[8%] h-[2px] bg-gradient-to-r from-blue-500/20 via-amber-500/20 via-cyan-500/20 via-red-500/20 via-purple-500/20 to-rose-500/20 pointer-events-none -z-10 animate-pulse" />

              {PIPELINE_STEPS.map((step, idx) => {
                const active = selectedStep?.id === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => {
                      setSelectedStep(step);
                      toast.success(`Étape : ${step.tool} - Payload API chargé.`);
                    }}
                    className={`flex flex-col items-center p-4 rounded-xl border text-center transition-all duration-300 relative ${
                      active 
                        ? "bg-primary/10 dark:bg-primary/5 border-primary shadow-[0_0_15px_rgba(var(--primary-color),0.15)] scale-[1.03]" 
                        : "bg-background/45 border-border/80 dark:border-white/5 hover:border-primary/30 hover:bg-accent/40"
                    }`}
                  >
                    {/* Connector arrows */}
                    {idx < PIPELINE_STEPS.length - 1 && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 hidden lg:flex h-6 w-6 items-center justify-center rounded-full bg-background border border-border text-muted-foreground z-10 shadow-sm">
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    )}
                    <div className={`p-3 rounded-full bg-background border shadow-inner mb-3 transition-transform ${active ? 'animate-bounce text-primary border-primary' : 'border-border text-muted-foreground'}`}>
                      <step.icon className={`h-5 w-5 ${active ? 'text-primary' : step.color}`} />
                    </div>
                    <span className="font-extrabold text-[11px] text-foreground">{step.name}</span>
                    <Badge variant="secondary" className="mt-2 bg-background border border-border text-[8px] uppercase font-mono text-muted-foreground tracking-wider">{step.tool}</Badge>
                  </button>
                );
              })}
            </div>

            {/* Interactive payload box below */}
            {selectedStep && (
              <div className="mt-6 border border-border/60 dark:border-white/5 bg-background/50 rounded-xl p-4 grid lg:grid-cols-2 gap-5 relative">
                <div>
                  <h4 className="font-extrabold text-xs text-primary flex items-center gap-2 uppercase tracking-wide">
                    <Sparkles className="h-3.5 w-3.5" />
                    Focus Technique - {selectedStep.tool}
                  </h4>
                  <div className="mt-3 space-y-2 text-[11px] text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Action menée :</strong> {selectedStep.action}
                    </p>
                    <p>
                      <strong className="text-foreground">Rôle Stack :</strong> Dans cette architecture SaaS, <span className="text-primary font-bold">{selectedStep.tool}</span> assure la phase de <span className="text-foreground font-semibold">{selectedStep.action.toLowerCase()}</span>.
                    </p>
                    <p>
                      Les alertes Wazuh sont captées via les webhooks Shuffle SOAR, analysées contre VirusTotal et MISP avant d'ouvrir un dossier d'investigation TheHive et de chiffrer les rapports de preuves forensiques DFIR-IRIS.
                    </p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <Terminal className="h-3 w-3" />
                      Payload API echange JSON ({selectedStep.tool})
                    </span>
                    <Badge variant="outline" className="text-[8px] font-mono bg-background border-border text-primary">REST API v2</Badge>
                  </div>
                  <pre className="font-mono text-[10px] bg-zinc-950 text-emerald-400 dark:text-emerald-300 rounded-lg p-3 overflow-x-auto max-h-40 border border-zinc-900 shadow-inner">
                    <code>{selectedStep.payload}</code>
                  </pre>
                </div>
              </div>
            )}
          </Card>

          {/* Row 3: SOAR Real-time playbooks logs & Interactive Command-Line Terminal Simulator */}
          <div className="grid gap-6 lg:grid-cols-5">
            
            {/* Left: Interactive Cyber-Command Terminal Simulator (Masterpiece of functionality) */}
            <div className="lg:col-span-3">
              <Card className="border border-border/80 dark:border-white/5 bg-zinc-950 text-zinc-300 shadow-2xl rounded-xl overflow-hidden flex flex-col h-[380px]">
                
                {/* Terminal Header */}
                <div className="bg-zinc-900 px-4 py-2 flex items-center justify-between border-b border-zinc-800 font-mono text-xs select-none">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                    </div>
                    <span className="text-[10px] text-zinc-400 font-extrabold uppercase ml-2 flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5 text-primary" />
                      SOC-COMMAND-SHELL.sh [TENANT: {tenant.toUpperCase()}]
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-zinc-500">
                    <Badge className="bg-zinc-800 text-zinc-400 hover:bg-zinc-700 font-mono text-[8px] px-1.5 border-zinc-700">AES-256</Badge>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                </div>

                {/* Terminal Screens/Logs history */}
                <div className="p-4 flex-1 overflow-y-auto font-mono text-[11px] space-y-1.5 scrollbar-thin select-text">
                  {terminalHistory.map((log, idx) => {
                    let colorClass = "text-zinc-300";
                    if (log.type === "input") colorClass = "text-amber-400 font-bold";
                    else if (log.type === "error") colorClass = "text-rose-500 font-semibold bg-rose-950/20 px-1 rounded";
                    else if (log.type === "success") colorClass = "text-emerald-400 font-semibold bg-emerald-950/20 px-1 rounded";
                    else if (log.type === "info") colorClass = "text-primary/95";

                    return (
                      <div key={idx} className="flex gap-2 items-start leading-relaxed border-b border-white/[0.01] pb-0.5">
                        <span className="text-zinc-600 select-none">[{new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}]</span>
                        <p className={`${colorClass} flex-1 whitespace-pre-wrap`}>{log.text}</p>
                      </div>
                    );
                  })}
                  <div ref={terminalBottomRef} />
                </div>

                {/* Terminal Command Input Form */}
                <form onSubmit={handleTerminalSubmit} className="bg-zinc-900/90 border-t border-zinc-800 p-2.5 flex items-center gap-2">
                  <span className="font-mono text-xs text-primary font-extrabold pl-1.5 select-none">$</span>
                  <Input 
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    placeholder="Saisissez une cyber-instruction (ex: scan 193.56.28.14, status, help)..." 
                    className="flex-1 bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-100 focus:border-primary focus:ring-0 focus:outline-none h-8"
                  />
                  <Button 
                    type="submit"
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xs px-3 h-8 gap-1 shadow-sm"
                  >
                    Send <CornerDownLeft className="h-3 w-3" />
                  </Button>
                </form>
              </Card>
            </div>

            {/* Right: VirusTotal & MISP Search Enrichment Interactive Sandbox Tool */}
            <div className="lg:col-span-2">
              <Card className="p-5 border border-border/80 dark:border-white/5 bg-card/65 dark:bg-card/35 backdrop-blur-xl shadow-sm flex flex-col justify-between h-[380px]">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 shadow-inner">
                      <ScanSearch className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xs text-foreground uppercase tracking-wider">Threat Sandbox Enrichment</h3>
                      <p className="text-[10px] text-muted-foreground font-mono">ENRICHISSEMENT API DE MENACES GLOBAL</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input 
                      placeholder="IP, Hash ou cible (ex: 193.56.28.14)..." 
                      value={enrichInput}
                      onChange={(e) => setEnrichInput(e.target.value)}
                      className="bg-background border-border text-xs font-mono focus-visible:ring-primary focus-visible:ring-1 focus-visible:border-primary"
                    />
                    <Button 
                      onClick={handleEnrich} 
                      disabled={enrichLoading}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs gap-1 px-4 shadow-sm"
                    >
                      {enrichLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                      Scan
                    </Button>
                  </div>
                </div>

                {/* Enrichment Output results box - Glassy beautiful panel */}
                <div className="mt-4 flex-1 flex flex-col justify-center overflow-y-auto">
                  {enrichLoading && (
                    <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground text-xs font-mono">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                      <span className="animate-pulse">Appels APIs Threat-Intelligence...</span>
                    </div>
                  )}

                  {!enrichLoading && !enrichResult && (
                    <div className="text-center py-8 text-muted-foreground text-xs border border-dashed border-border/80 dark:border-white/5 rounded-xl bg-background/35 font-mono flex flex-col items-center justify-center gap-2">
                      <Radio className="h-5 w-5 text-muted-foreground/50 animate-pulse" />
                      <span>Saisissez une IP suspecte ou lancez un scan via le terminal interactif.</span>
                    </div>
                  )}

                  {!enrichLoading && enrichResult && (
                    <div className="bg-background/60 border border-border/80 dark:border-white/5 p-4 rounded-xl text-[11px] font-mono space-y-3.5 shadow-inner">
                      <div className="flex justify-between border-b border-border/40 dark:border-white/5 pb-2">
                        <span className="text-muted-foreground">Indicateur Cible :</span>
                        <span className="text-foreground font-black underline decoration-primary decoration-2">{enrichResult.source}</span>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-cyan-500 font-bold uppercase text-[9px] tracking-wider">
                          <span>🛡️ Rapport VirusTotal</span>
                          <Badge variant="outline" className={`text-[8px] h-4 font-bold border-0 px-2 ${enrichResult.vt.positives > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{enrichResult.vt.status}</Badge>
                        </div>
                        <p className="text-muted-foreground text-[10px] pl-2.5">Moteurs Positifs: <span className="text-foreground font-bold">{enrichResult.vt.positives}/{enrichResult.vt.total} engins</span></p>
                        <p className="text-muted-foreground text-[10px] pl-2.5">Type de malware: <span className="text-foreground font-bold">{enrichResult.vt.category}</span></p>
                      </div>
                      
                      <div className="space-y-1.5 pt-2 border-t border-border/40 dark:border-white/5">
                        <div className="flex justify-between text-red-500 font-bold uppercase text-[9px] tracking-wider">
                          <span>💾 Base Threat Intel (MISP)</span>
                          <Badge variant="outline" className={`text-[8px] h-4 font-bold border-0 px-2 ${enrichResult.misp.threatLevel === 'HAUTE' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{enrichResult.misp.match}</Badge>
                        </div>
                        <p className="text-muted-foreground text-[10px] pl-2.5">Campagne Cible: <span className="text-foreground font-bold">{enrichResult.misp.campaign}</span></p>
                        <div className="flex flex-wrap gap-1 pl-2.5 pt-1">
                          {enrichResult.misp.tags.map((t: string) => (
                            <span key={t} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[8px] font-bold">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

          </div>

          {/* Row 4: Forensic Cases (DFIR-IRIS & TheHive) & EDR Logs (Wazuh) */}
          <div className="grid gap-6 lg:grid-cols-5">
            
            {/* Left: DFIR-IRIS Investigation Cases list */}
            <div className="lg:col-span-3">
              <Card className="p-5 border border-border/80 dark:border-white/5 bg-card/65 dark:bg-card/35 backdrop-blur-xl shadow-sm h-full font-sans">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shadow-inner">
                      <ServerCog className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xs text-foreground uppercase tracking-wider">Enquêtes et Forensics (DFIR-IRIS)</h3>
                      <p className="text-[10px] text-muted-foreground">Preuves numériques scellées sous chaîne cryptographique</p>
                    </div>
                  </div>
                  <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-0 text-[9px] font-bold uppercase font-mono">DFIR Locker</Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl bg-background border border-border/80 dark:border-white/5 px-4 py-3 hover:border-primary/30 transition-all font-mono text-xs group">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">IRIS-8241 : CozyBear APT29</span>
                        <Badge variant="outline" className="text-[8px] font-bold text-red-500 border-red-500/20 bg-red-500/5 h-4 uppercase">CRITIQUE</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Collecté par Wazuh • Analysé par Sanou Gueye</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[8px] font-bold"><Lock className="h-2 w-2 mr-1" /> CHAÎNE SÉCURISÉE</Badge>
                      <Button size="icon" variant="ghost" onClick={() => toast.success("Rapport IRIS téléchargé.")} className="h-8 w-8 hover:text-primary text-muted-foreground"><Download className="h-4.5 w-4.5" /></Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-background border border-border/80 dark:border-white/5 px-4 py-3 hover:border-primary/30 transition-all font-mono text-xs group">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">IRIS-1290 : SSH Brute-Force Block</span>
                        <Badge variant="outline" className="text-[8px] font-bold text-amber-500 border-amber-500/20 bg-amber-500/5 h-4 uppercase">MOYENNE</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Collecté par Wazuh • Résolution SOAR Automatique</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[8px] font-bold"><Lock className="h-2 w-2 mr-1" /> CHAÎNE SÉCURISÉE</Badge>
                      <Button size="icon" variant="ghost" onClick={() => toast.success("Rapport IRIS téléchargé.")} className="h-8 w-8 hover:text-primary text-muted-foreground"><Download className="h-4.5 w-4.5" /></Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-background border border-border/80 dark:border-white/5 px-4 py-3 hover:border-primary/30 transition-all font-mono text-xs group">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">IRIS-0941 : Suspicious PowerShell Script</span>
                        <Badge variant="outline" className="text-[8px] font-bold text-blue-500 border-blue-500/20 bg-blue-500/5 h-4 uppercase">FAIBLE</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">En attente de review analyste niveau 2</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-muted text-muted-foreground border-0 text-[8px] font-bold"><Lock className="h-2 w-2 mr-1" /> EN COURS</Badge>
                      <Button size="icon" variant="ghost" onClick={() => toast.info("Le cas n'est pas finalisé.")} className="h-8 w-8 text-muted-foreground hover:text-foreground"><Download className="h-4.5 w-4.5" /></Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right: Wazuh Security Event Logs Stream */}
            <div className="lg:col-span-2">
              <Card className="p-5 border border-border/80 dark:border-white/5 bg-card/65 dark:bg-card/35 backdrop-blur-xl shadow-sm h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 animate-pulse shadow-inner">
                        <Shield className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-xs text-foreground uppercase tracking-wider">SIEM Logs (Wazuh EDR)</h3>
                        <p className="text-[10px] text-muted-foreground font-mono">ÉVÉNEMENTS RÉCENTS DE SÉCURITÉ</p>
                      </div>
                    </div>
                    <Link to="/alertes" className="text-[10px] font-bold font-mono text-primary hover:underline transition-colors uppercase">{t("Tout voir")}</Link>
                  </div>
                  
                  {alerts.length === 0 && <p className="text-xs text-muted-foreground font-mono">{t("Aucune alerte récente.")}</p>}
                  
                  <ul className="space-y-2 max-h-[170px] overflow-y-auto pr-1 font-mono text-xs">
                    {alerts.slice(0, 4).map((a) => (
                      <li key={a.id} className="flex items-start gap-2.5 border-b border-border/40 dark:border-white/5 pb-2 last:border-b-0 last:pb-0 group">
                        <span
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full animate-ping"
                          style={{ background: SEVERITY_COLORS[bucket(a.severity)] }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-foreground group-hover:text-primary transition-colors cursor-pointer">{a.title}</p>
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-0.5">
                            <span>EDR : {a.agent_name ?? "—"}</span>
                            <span>{new Date(a.created_at).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </div>

          </div>

        </div>
      )}

      {activeTab === "maps" && (
        <div className="space-y-6">
          {/* Row 2: Cyber Command War Room (Kaspersky 3D WebGL Globe & Radware Live Threat Map side-by-side) */}
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <Card className="p-5 border border-border/80 bg-card/65 dark:bg-card/35 backdrop-blur-xl shadow-xl flex flex-col justify-between overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary animate-pulse">
                      <Globe2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-sm uppercase tracking-wider text-foreground">Kaspersky Cybermap 3D Widget</h2>
                      <p className="text-[10px] text-muted-foreground font-mono">LIVE WEBGL INTERACTIVE CYBER GLOBE EXPERT</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary font-mono text-[9px] uppercase tracking-wider self-start sm:self-center">
                    WebGL 3D Active
                  </Badge>
                </div>
                
                {/* 3D Globe with beautiful overlay targeting info */}
                <div className="relative w-full rounded-xl overflow-hidden border border-border bg-zinc-950 shadow-inner">
                  <iframe 
                    src="https://cybermap.kaspersky.com/en/widget/" 
                    className="w-full h-[450px] border-0 rounded-xl bg-zinc-950"
                    allowFullScreen
                  />
                  
                  {/* Cyber war room console panel layout */}
                  <div className="absolute top-4 left-4 p-3 bg-zinc-950/80 backdrop-blur-md rounded-lg border border-white/10 font-mono text-[9px] text-emerald-400 space-y-1 select-none pointer-events-none hidden md:block">
                    <div>🛰️ RADAR SCAN: ACTIVE</div>
                    <div>🎯 TARGETS MONITORED: 12.4k</div>
                    <div>📡 FREQUENCY: 4.8 GHz</div>
                    <div>📍 COORDS: Lat: 14.716 • Lon: -17.467</div>
                  </div>
                </div>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              <ThreatMap />
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <SocCountryHeatMini />
            <TopRegionsCard />
          </div>
        </div>
      )}

      {activeTab === "siem" && (
        <div className="space-y-6">
          
          {/* Row 3: Security Posture & Operations (MTTD/MTTR, Health Score) */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            
            {/* Custom Premium Health Score Card with SVG Circular Dial */}
            <Card className="p-5 border border-border/80 bg-card/65 dark:bg-card/35 backdrop-blur-xl shadow-sm flex flex-col justify-between min-h-[220px] group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-primary" />
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-foreground">Score de santé SOC</h3>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold font-mono">SaaS Live</Badge>
              </div>

              <div className="flex items-center justify-around gap-4 flex-1">
                {/* Custom glowing circular SVG Progress Gauge */}
                <div className="relative h-28 w-28 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      className="text-muted/10 dark:text-white/5"
                      strokeWidth="8"
                      stroke="currentColor"
                      fill="transparent"
                      r="40"
                      cx="56"
                      cy="56"
                    />
                    <circle
                      className="text-primary transition-all duration-500 ease-in-out drop-shadow-[0_0_8px_rgba(var(--primary-color),0.5)]"
                      strokeWidth="8"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (92 / 100) * 251.2}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="40"
                      cx="56"
                      cy="56"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black tracking-tight text-foreground">92%</span>
                    <span className="text-[7px] uppercase tracking-wider text-muted-foreground font-mono font-black">EXCELLENT</span>
                  </div>
                </div>

                <div className="space-y-1.5 font-mono text-[10px] text-muted-foreground flex-1">
                  <div className="flex justify-between border-b border-border/30 pb-0.5">
                    <span>Agents EDR:</span>
                    <span className="font-bold text-foreground">142 Actifs</span>
                  </div>
                  <div className="flex justify-between border-b border-border/30 pb-0.5">
                    <span>Temps Traitement:</span>
                    <span className="font-bold text-foreground">18 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connecteurs:</span>
                    <span className="font-bold text-foreground">6/6 OK</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Premium MTTD/MTTR Gauge Wrap */}
            <SocMttdMttrGauge />
            
            {/* Stat Summary Row */}
            <Card className="p-5 border border-border/80 bg-card/65 dark:bg-card/35 backdrop-blur-xl shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground mb-4">Indicateurs de Performance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-muted-foreground">Taux faux-positifs EDR :</span>
                    <span className="text-emerald-500 font-bold">1.2% (SOC AI filter)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-muted-foreground">Playbooks Auto (SOAR) :</span>
                    <span className="text-amber-500 font-bold">94% active response</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-muted-foreground">MTTD Moyen (Détection) :</span>
                    <span className="text-cyan-500 font-bold">4.2 secondes</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-muted-foreground">MTTR Moyen (Réponse) :</span>
                    <span className="text-rose-500 font-bold">12.5 minutes</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Row 4: Deep Security Incident & Target Analysis (MITRE ATT&CK) */}
          <div className="grid gap-6">
            <SocMitreTacticsChart />
          </div>

          {/* Row 5: Real-time Timeline & Alerts Trends Analysis */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2 border border-border/80 bg-card/65 dark:bg-card/35 backdrop-blur-xl shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-extrabold text-sm uppercase tracking-wider text-foreground">{t("Alertes — 7 derniers jours")}</h2>
                  <p className="text-xs text-muted-foreground">Volume quotidien des incidents de sécurité détectés</p>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold uppercase font-mono">Wazuh SIEM</Badge>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alertsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.06} />
                    <XAxis dataKey="day" stroke="currentColor" fontSize={10} className="text-muted-foreground font-mono" />
                    <YAxis stroke="currentColor" fontSize={10} allowDecimals={false} className="text-muted-foreground font-mono" />
                    <Tooltip contentStyle={{ background: "var(--color-card)", borderRadius: "12px", borderColor: "var(--color-border)", color: "var(--color-foreground)" }} />
                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            <SocIncidentTimeline />
          </div>

          {/* Row 6: Threat Vectors & Indicators Analysis */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-5 border border-border/80 bg-card/65 dark:bg-card/35 backdrop-blur-xl shadow-sm">
              <div className="mb-3">
                <h2 className="font-extrabold text-sm uppercase tracking-wider text-foreground">{t("Nouveaux IOC — 7 derniers jours")}</h2>
                <p className="text-xs text-muted-foreground">Volume de nouveaux indicateurs compromis insérés</p>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={iocsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.06} />
                    <XAxis dataKey="day" stroke="currentColor" fontSize={10} className="text-muted-foreground font-mono" />
                    <YAxis stroke="currentColor" fontSize={10} allowDecimals={false} className="text-muted-foreground font-mono" />
                    <Tooltip contentStyle={{ background: "var(--color-card)", borderRadius: "12px", borderColor: "var(--color-border)", color: "var(--color-foreground)" }} />
                    <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5 border border-border/80 bg-card/65 dark:bg-card/35 backdrop-blur-xl shadow-sm">
              <div className="mb-3">
                <h2 className="font-extrabold text-sm uppercase tracking-wider text-foreground">{t("Top règles Wazuh")}</h2>
                <p className="text-xs text-muted-foreground">Règles de sécurité les plus fréquemment déclenchées</p>
              </div>
              {topRules.length === 0 && <p className="text-xs text-muted-foreground">{t("Aucune donnée pour cette période.")}</p>}
              <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {topRules.map((r) => (
                  <li key={r.rule} className="flex items-center justify-between rounded-xl bg-background border border-border/60 hover:border-primary/20 px-3.5 py-2.5 transition-colors">
                    <span className="font-mono text-xs text-foreground font-semibold">{r.rule}</span>
                    <Badge className="bg-primary/10 text-primary border-0 font-bold">{r.count}</Badge>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5 border border-border/80 bg-card/65 dark:bg-card/35 backdrop-blur-xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-extrabold text-sm uppercase tracking-wider text-foreground">{t("Sévérité")}</h2>
                    <p className="text-xs text-muted-foreground">{t("Répartition")}</p>
                  </div>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold font-mono">Ratio</Badge>
                </div>
                <div className="h-40 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={60} paddingAngle={3}>
                        {severityData.map((_, i) => (
                          <Cell key={i} fill={SEVERITY_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--color-card)", borderRadius: "12px", borderColor: "var(--color-border)", color: "var(--color-foreground)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-border/40 dark:border-white/5 pt-4">
                {severityData.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: SEVERITY_COLORS[i] }} />
                    <span className="text-muted-foreground truncate">{s.name}</span>
                    <span className="ml-auto font-bold text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

        </div>
      )}

      {/* Row 7: Cyber RSS Threat Intelligence & Modern Action Center Shortcuts */}
      <div className="grid gap-6 lg:grid-cols-2 font-sans">
        <SocCyberRssCard />
        <Card className="p-5 border border-border/80 dark:border-white/5 bg-card/65 dark:bg-card/35 backdrop-blur-xl shadow-sm">
          <div className="mb-4">
            <h2 className="font-extrabold text-sm uppercase tracking-wider text-foreground">{t("Raccourcis étendus")}</h2>
            <p className="text-xs text-muted-foreground">{t("Threat Map dédiée, Assistant IA page complète, DFIR-IRIS.")}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickLinkCard to="/threat-map" label={t("Threat Map")} icon={Globe2} tone="sky" />
            <QuickLinkCard to="/assistant" label={t("Djib'son IA")} icon={Brain} tone="violet" />
            <QuickLinkCard to="/iris" label={t("DFIR-IRIS")} icon={ServerCog} tone="rose" />
            <QuickLinkCard to="/outils" hash="orchestrator" label={t("Orchestrateur")} icon={Workflow} tone="orange" />
          </div>
        </Card>
      </div>

    </div>
  );
}