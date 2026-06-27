import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Laptop, ShieldAlert, Cpu, HardDrive, Terminal, Search, Play,
  RefreshCw, PowerOff, ShieldCheck, Database, CheckCircle,
  AlertTriangle, XCircle, Info, Download, Shield, Check, Copy,
  Monitor, Activity, ChevronDown, ChevronUp, KeyRound, Plus,
  Lock, ArrowRight, Wifi, CheckCircle2, Sparkles,
} from "lucide-react";
import { getClientExtendedData, OFFER_MAX_PCS } from "./clients.index";
import type { ClientExtendedData } from "./clients.index";

export const Route = createFileRoute("/clients/inventory")({
  head: () => ({ meta: [{ title: "Parc & Inventaire EDR — SOC Platform" }] }),
  component: () => <RequireAuth><InventoryPage /></RequireAuth>,
});

interface EdrDevice {
  id: string; hostname: string; clientName: string; ip: string;
  os: "windows" | "linux" | "macos"; status: "active" | "disconnected" | "alert" | "isolated";
  cpu: number; ram: number; version: string; lastSeen: string;
}

const SEED_DEVICES: EdrDevice[] = [
  { id: "d1", hostname: "desktop-ageroute-01", clientName: "Ageroute Sénégal", ip: "192.168.1.102", os: "windows", status: "active",       cpu: 12, ram: 42, version: "v4.14.5", lastSeen: "À l'instant" },
  { id: "d2", hostname: "srv-prod-sonabhy-01", clientName: "SONABHY",          ip: "10.0.4.15",    os: "linux",   status: "active",       cpu: 45, ram: 78, version: "v4.14.5", lastSeen: "À l'instant" },
  { id: "d3", hostname: "macbook-minfin-02",   clientName: "Min. Finances",    ip: "172.16.8.50",  os: "macos",   status: "alert",        cpu: 92, ram: 95, version: "v4.7.1",  lastSeen: "2 min plus tôt" },
  { id: "d4", hostname: "desktop-orange-12",   clientName: "Orange Burkina",   ip: "10.20.30.40",  os: "windows", status: "isolated",     cpu: 0,  ram: 0,  version: "v4.14.5", lastSeen: "5h plus tôt" },
  { id: "d5", hostname: "srv-db-bis-01",       clientName: "BIS Group",        ip: "192.168.10.5", os: "linux",   status: "active",       cpu: 28, ram: 61, version: "v4.14.5", lastSeen: "À l'instant" },
  { id: "d6", hostname: "desktop-cfao-03",     clientName: "Groupe CFAO",      ip: "192.168.4.12", os: "windows", status: "disconnected", cpu: 0,  ram: 0,  version: "v4.7.0",  lastSeen: "12h plus tôt" },
  { id: "d7", hostname: "srv-web-ageroute-02", clientName: "Ageroute Sénégal", ip: "192.168.1.105", os: "linux",  status: "active",       cpu: 18, ram: 35, version: "v4.14.5", lastSeen: "À l'instant" },
];

const SHELL_COMMANDS: Record<string, string> = {
  help: "Commandes disponibles :\n  wazuh-status    : Vérifier l'état de l'agent Wazuh\n  sys-info        : Obtenir les détails système de base\n  netstat         : Lister les ports et connexions actives\n  scan-malware    : Lancer un scan rapide de réputation\n  clear           : Effacer la console",
  "wazuh-status": "wazuh-agent.service - L'agent de sécurité Wazuh\n   Loaded: loaded (/lib/systemd/system/wazuh-agent.service; enabled)\n   Active: active (running) since Wed 2026-05-20 08:00:00 UTC\n   CGroup: /system.slice/wazuh-agent.service\n           └─3055 /var/ossec/bin/wazuh-agentd",
  "sys-info": "OS: Ubuntu 22.04.3 LTS\nHostname: srv-prod-01\nUptime: 14 days, 3 hours\nCPU: Intel Xeon Gold (4 Cores)\nMemory: 16 GB (Used: 78%)",
  netstat: "Connexions actives :\n  TCP    10.0.4.15:22       192.168.1.50:52410  ESTABLISHED\n  TCP    10.0.4.15:1514     10.0.4.1:55000      ESTABLISHED (Wazuh SIEM)",
  "scan-malware": "=== DEBUT DU SCAN ===\n[+] Scan des processus... OK\n[+] Vérification FIM... OK\n[RESULTAT] Aucun IOC détecté.",
};

const WAZUH_URL = "https://wucy2fi80s80.cloud.wazuh.com";

const OS_SCRIPTS = {
  windows: {
    label: "Windows",
    badge: "PowerShell",
    steps: [
      { comment: "# 1. Télécharger l'agent Wazuh (PowerShell en tant qu'Administrateur)", cmd: `Invoke-WebRequest -Uri 'https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.5-1.msi' -OutFile 'wazuh-agent.msi'` },
      { comment: "# 2. Installer et enregistrer l'agent sur votre Cloud Wazuh", cmd: `msiexec.exe /i wazuh-agent.msi /q WAZUH_MANAGER='${WAZUH_URL.replace("https://", "")}' WAZUH_REGISTRATION_PASSWORD='VOTRE_MOT_DE_PASSE_ENROLLMENT'` },
      { comment: "# 3. Démarrer le service Wazuh", cmd: `NET START WazuhSvc` },
    ],
  },
  linux: {
    label: "Linux",
    badge: "Bash",
    steps: [
      { comment: "# 1. Ajouter le dépôt Wazuh et installer l'agent", cmd: `curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/wazuh.gpg\necho "deb https://packages.wazuh.com/4.x/apt/ stable main" | sudo tee /etc/apt/sources.list.d/wazuh.list\nsudo apt-get update && sudo apt-get install -y wazuh-agent` },
      { comment: "# 2. Configurer le manager Cloud", cmd: `sudo sed -i 's/MANAGER_IP/${WAZUH_URL.replace("https://", "")}/g' /var/ossec/etc/ossec.conf` },
      { comment: "# 3. Activer et démarrer le service", cmd: `sudo systemctl daemon-reload\nsudo systemctl enable wazuh-agent\nsudo systemctl start wazuh-agent` },
    ],
  },
  macos: {
    label: "macOS",
    badge: "Terminal",
    steps: [
      { comment: "# 1. Télécharger le package macOS", cmd: `curl -o wazuh-agent.pkg https://packages.wazuh.com/4.x/macos/wazuh-agent-4.14.5-1.intel64.pkg` },
      { comment: "# 2. Installer en définissant le manager Cloud", cmd: `sudo WAZUH_MANAGER='${WAZUH_URL.replace("https://", "")}' installer -pkg ./wazuh-agent.pkg -target /` },
      { comment: "# 3. Démarrer l'agent", cmd: `sudo /Library/Ossec/bin/wazuh-control start` },
    ],
  },
};

const TIER_ACCENT: Record<string, string> = {
  Bronze:  "border-orange-500/30 text-orange-400 bg-orange-500/10",
  Argent:  "border-blue-500/30 text-blue-400 bg-blue-500/10",
  Or:      "border-amber-500/30 text-amber-400 bg-amber-500/10",
  Platine: "border-violet-500/30 text-violet-400 bg-violet-500/10",
};
const TIER_GRADIENT: Record<string, string> = {
  Bronze:  "from-orange-950/60 via-zinc-900/80 to-zinc-950",
  Argent:  "from-blue-950/60 via-zinc-900/80 to-zinc-950",
  Or:      "from-amber-950/60 via-zinc-900/80 to-zinc-950",
  Platine: "from-violet-950/60 via-zinc-900/80 to-zinc-950",
};

function saveExt(data: ClientExtendedData) {
  localStorage.setItem(`client_ext_${data.clientId}`, JSON.stringify({ ...data, _v: 2 }));
}

function InventoryPage() {
  const { roles, organization, user } = useAuth();
  const isClientOnly = roles.includes("client") && !roles.includes("admin") && !roles.includes("analyste") && !roles.includes("manager");

  const [devices, setDevices] = useState<EdrDevice[]>([]);
  const [ext, setExt] = useState<ClientExtendedData | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [terminalDevice, setTerminalDevice] = useState<EdrDevice | null>(null);
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    "=== CONSOLE WAZUH REMOTE EDR v4.14.5 ===",
    "Sélectionnez un poste pour ouvrir une session sécurisée.",
  ]);
  const [termInput, setTermInput] = useState("");

  // EDR guide state
  const [deployOs, setDeployOs] = useState<"windows" | "linux" | "macos">("windows");
  const [guideOpen, setGuideOpen] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<number | null>(null);
  const [wazuhPassword, setWazuhPassword] = useState("");

  // Add machine modal
  const [addOpen, setAddOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [addForm, setAddForm] = useState({ hostname: "", ip: "", os: "windows" as "windows" | "linux" | "macos" });

  useEffect(() => {
    if (isClientOnly && user) {
      const orgName = organization || "Client";
      const extData = getClientExtendedData(user.id, orgName);
      setExt(extData);
      setDevices(extData.pcs.map(pc => ({
        id: pc.id, hostname: pc.name, clientName: orgName,
        ip: pc.ip, os: pc.os, status: pc.status,
        cpu: pc.cpu, ram: pc.ram, version: "v4.14.5", lastSeen: pc.lastSeen,
      })));
    } else {
      setDevices(SEED_DEVICES);
    }
  }, [isClientOnly, organization, user]);

  const maxPcs = ext ? (OFFER_MAX_PCS[ext.contractTier] ?? 10) : 10;
  const quotaReached = isClientOnly && ext && devices.length >= maxPcs;
  const accentCls = TIER_ACCENT[ext?.contractTier ?? "Bronze"];
  const gradientCls = TIER_GRADIENT[ext?.contractTier ?? "Bronze"];

  const total   = devices.length;
  const active  = devices.filter(d => d.status === "active").length;
  const alert   = devices.filter(d => d.status === "alert").length;
  const isolated = devices.filter(d => d.status === "isolated").length;

  const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? devices.map(d => d.id) : []);
  const handleSelectOne = (id: string, checked: boolean) =>
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));

  const executeMassAction = (action: "scan" | "update" | "isolate") => {
    if (selectedIds.length === 0) { toast.error("Aucune machine sélectionnée"); return; }
    const names = devices.filter(d => selectedIds.includes(d.id)).map(d => d.hostname).join(", ");
    if (action === "scan")    toast.success("Scan lancé !", { description: `Antivirus démarré sur : ${names}` });
    if (action === "update")  toast.success("Mise à jour poussée", { description: `Agent Wazuh mis à jour sur : ${names}` });
    if (action === "isolate") {
      setDevices(prev => prev.map(d => selectedIds.includes(d.id) ? { ...d, status: "isolated" as const } : d));
      toast.warning("Isolation réseau ordonnée", { description: `Réseau coupé pour : ${names}` });
    }
  };

  const openTerminal = (dev: EdrDevice) => {
    setTerminalDevice(dev);
    setTerminalHistory([
      `=== LOGGING INTO SECURE REMOTE EDR SHELL ===`,
      `Device   : ${dev.hostname}`,
      `IP       : ${dev.ip}`,
      `Agent ID : WAZUH-${dev.id.toUpperCase()}`,
      `Tapez 'help' pour lister les actions autorisées.`,
    ]);
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termInput.trim()) return;
    const cmd = termInput.trim().toLowerCase();
    setTerminalHistory(prev => [...prev, `$ ${termInput}`]);
    setTermInput("");
    setTimeout(() => {
      if (cmd === "clear") setTerminalHistory([]);
      else if (SHELL_COMMANDS[cmd]) setTerminalHistory(prev => [...prev, SHELL_COMMANDS[cmd]]);
      else setTerminalHistory(prev => [...prev, `Commande inconnue: "${cmd}". Tapez 'help'.`]);
    }, 200);
  };

  const copyCmd = (idx: number, cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(idx);
    toast.success("Commande copiée !");
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleAddMachine = async () => {
    if (!addForm.hostname.trim() || !addForm.ip.trim()) { toast.error("Nom d'hôte et IP requis"); return; }
    if (!ext || !user) return;
    if (devices.length >= maxPcs) { toast.error(`Quota atteint (${maxPcs} machines max pour votre offre ${ext.contractTier})`); return; }

    setInstalling(true);
    await new Promise(r => setTimeout(r, 1800)); // Simule la détection de l'agent

    const newPc = {
      id: `${user.id}-pc-${Date.now()}`,
      name: addForm.hostname.trim(),
      os: addForm.os,
      ip: addForm.ip.trim(),
      status: "active" as const,
      cpu: Math.floor(Math.random() * 30) + 5,
      ram: Math.floor(Math.random() * 40) + 20,
      lastSeen: "À l'instant",
      wazuhId: String(Math.floor(Math.random() * 900) + 100),
    };

    const updated: ClientExtendedData = { ...ext, pcs: [...ext.pcs, newPc] };
    saveExt(updated);
    setExt(updated);
    setDevices(prev => [...prev, {
      ...newPc, hostname: newPc.name, clientName: organization || "Client", version: "v4.14.5",
    }]);

    setInstalling(false);
    setAddOpen(false);
    setAddForm({ hostname: "", ip: "", os: "windows" });
    toast.success("✅ Machine enregistrée !", { description: `${newPc.name} est maintenant supervisée par le SOC.` });
  };

  const filtered = devices.filter(d => {
    const matchSearch = d.hostname.toLowerCase().includes(search.toLowerCase()) || d.ip.includes(search);
    const matchStatus = filterStatus === "all" || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusBadge = (s: string) => ({
    active:       "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    disconnected: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    alert:        "bg-red-500/10 text-red-600 border-red-500/20 animate-pulse",
    isolated:     "bg-amber-500/10 text-amber-600 border-amber-500/20",
  }[s] || "bg-slate-100 text-slate-700");

  const activeScript = OS_SCRIPTS[deployOs];

  // ── CLIENT EMPTY STATE → Full EDR Onboarding ──
  if (isClientOnly && devices.length === 0) {
    return (
      <div className="min-h-screen bg-[#0b0c10] relative overflow-hidden">
        <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 py-10 max-w-4xl relative z-10">

          {/* Hero Header */}
          <div className="text-center mb-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-2">
              <Shield className="h-4 w-4" />
              INOVA-IRIS SOC — Déploiement EDR
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              Bienvenue, {organization || "Client"} ! 👋
            </h1>
            <p className="text-zinc-400 text-base max-w-lg mx-auto">
              Aucune machine n'est encore supervisée. Suivez ce guide pour déployer l'agent Wazuh sur chaque PC que vous souhaitez protéger.
            </p>
            {ext && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold ${accentCls}`}>
                <Shield className="h-3.5 w-3.5" />
                Offre {ext.contractTier} · {maxPcs} machines max
              </div>
            )}
          </div>

          {/* EDR Guide Card */}
          <div className={`rounded-2xl border border-zinc-800 bg-gradient-to-br ${gradientCls} overflow-hidden shadow-2xl mb-6`}>

            {/* Hero Banner */}
            <div className="relative px-6 pt-6 pb-5 border-b border-white/5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-lg ${accentCls}`}>
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full border ${accentCls}`}>
                        {ext?.contractTier ?? "Bronze"}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">Wazuh Cloud v4.14.5</span>
                    </div>
                    <h2 className="text-lg font-black text-white">Guide de déploiement EDR</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">{organization || "Client"} · Agent Wazuh</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    Déploiement requis
                  </span>
                  <div className="flex items-center gap-2 justify-end mt-2">
                    <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-0 rounded-full bg-emerald-500" />
                    </div>
                    <span className="text-[11px] font-black text-zinc-300">0 / {maxPcs}</span>
                    <span className="text-[10px] text-zinc-500">machines</span>
                  </div>
                </div>
              </div>

              {/* Steps timeline */}
              <div className="relative mt-6 flex items-center gap-0">
                {[
                  { icon: CheckCircle2, label: "Compte créé", done: true },
                  { icon: Monitor,      label: "Machines à ajouter", done: false },
                  { icon: Download,     label: "Agent à déployer", done: false },
                  { icon: Activity,     label: "Supervision active", done: false },
                ].map((step, idx, arr) => (
                  <div key={idx} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-1.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${step.done ? `${accentCls} shadow-lg` : "border-white/10 bg-white/5 text-zinc-600"}`}>
                        <step.icon className="h-4 w-4" />
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-widest text-center ${step.done ? "text-white" : "text-zinc-600"}`}>{step.label}</p>
                    </div>
                    {idx < arr.length - 1 && <div className="flex-1 h-px mx-2 mb-5 bg-white/8" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Scripts Section */}
            <div className="p-6 space-y-5">
              {/* Enrollment password */}
              <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-rose-400" />
                  <span className="text-[11px] font-black text-rose-300">Mot de passe d'enrollment Wazuh Cloud</span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 font-mono">Requis</span>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Allez sur <strong className="text-zinc-300">console.cloud.wazuh.com → Deploy new agent → Windows</strong> — copiez la valeur <code className="font-mono text-rose-300 bg-rose-900/30 px-1 rounded">WAZUH_REGISTRATION_PASSWORD</code>.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Collez votre mot de passe d'enrollment..."
                    value={wazuhPassword}
                    onChange={e => setWazuhPassword(e.target.value)}
                    className="flex-1 h-8 text-xs font-mono bg-black/40 border border-rose-500/20 rounded-lg px-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50"
                  />
                  {wazuhPassword && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      <Check className="h-3 w-3" /> Défini
                    </span>
                  )}
                </div>
              </div>

              {/* OS Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/5 w-fit">
                {(["windows", "linux", "macos"] as const).map(os => (
                  <button key={os} onClick={() => setDeployOs(os)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${deployOs === os ? `${accentCls} shadow-md` : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    {os === "windows" ? "🪟" : os === "linux" ? "🐧" : "🍎"} {OS_SCRIPTS[os].label}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${deployOs === os ? "bg-black/20" : "bg-white/5 text-zinc-600"}`}>{OS_SCRIPTS[os].badge}</span>
                  </button>
                ))}
              </div>

              {/* Script Steps */}
              <div className="space-y-3">
                {activeScript.steps.map((step, idx) => (
                  <div key={idx} className="rounded-xl border border-white/5 bg-black/30 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                      <span className="text-[10px] text-zinc-500 font-mono">{step.comment}</span>
                      <button
                        onClick={() => copyCmd(idx, step.cmd)}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 hover:text-emerald-400 transition-colors px-2 py-1 rounded"
                      >
                        {copiedCmd === idx ? <><Check className="h-3 w-3 text-emerald-400" /> Copié</> : <><Copy className="h-3 w-3" /> Copier</>}
                      </button>
                    </div>
                    <pre className="p-4 text-[11px] font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">{step.cmd}</pre>
                  </div>
                ))}
              </div>

              {/* CTA — Validate install */}
              <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-center gap-3">
                <Button
                  onClick={() => setAddOpen(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black shadow-lg shadow-amber-500/20 rounded-xl px-6"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  J'ai installé l'agent — Enregistrer la machine
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-[10px] text-zinc-500 text-center">
                  L'agent doit être actif sur le poste avant de l'enregistrer.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Machine Modal */}
        {addOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Monitor className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Enregistrer une machine</h3>
                  <p className="text-[11px] text-zinc-400">Quota : {devices.length} / {maxPcs} machines</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 block">Nom d'hôte (hostname)</label>
                  <Input value={addForm.hostname} onChange={e => setAddForm(f => ({ ...f, hostname: e.target.value }))} placeholder="desktop-client-01" className="bg-black/40 border-zinc-700 text-white text-xs rounded-xl" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 block">Adresse IP</label>
                  <Input value={addForm.ip} onChange={e => setAddForm(f => ({ ...f, ip: e.target.value }))} placeholder="192.168.1.10" className="bg-black/40 border-zinc-700 text-white text-xs rounded-xl" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 block">Système d'exploitation</label>
                  <Select value={addForm.os} onValueChange={v => setAddForm(f => ({ ...f, os: v as any }))}>
                    <SelectTrigger className="bg-black/40 border-zinc-700 text-white text-xs rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="windows">🪟 Windows</SelectItem>
                      <SelectItem value="linux">🐧 Linux</SelectItem>
                      <SelectItem value="macos">🍎 macOS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1 rounded-xl border-zinc-700 text-zinc-300">Annuler</Button>
                <Button onClick={handleAddMachine} disabled={installing} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl">
                  {installing ? (
                    <span className="flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Détection...</span>
                  ) : (
                    <span className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5" /> Confirmer</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── NORMAL VIEW (machines already registered) ──
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0b0c10] relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
              <Laptop className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-amber-600 to-amber-800 dark:from-white dark:via-amber-400 dark:to-yellow-500 bg-clip-text text-transparent">
                {isClientOnly ? "Mes PC Connectés (EDR)" : "Inventaire EDR & Wazuh Global"}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isClientOnly
                  ? `Parc de ${organization || "votre organisation"} · Agents Wazuh · Télémétrie temps réel`
                  : "Console de gestion centralisée des agents · Télémétrie · Actions de masse"}
              </p>
            </div>
          </div>
          {isClientOnly && ext && (
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold ${accentCls}`}>
                <Shield className="h-3.5 w-3.5" />
                {devices.length} / {maxPcs} machines supervisées
              </div>
              {!quotaReached ? (
                <Button onClick={() => setAddOpen(true)} size="sm" className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl shadow-lg shadow-amber-500/20">
                  <Plus className="h-3.5 w-3.5" /> Ajouter un PC
                </Button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                  <Lock className="h-3.5 w-3.5" /> Quota atteint
                </div>
              )}
            </div>
          )}
        </div>

        {/* EDR Guide Accordion (for adding more machines) */}
        {isClientOnly && ext && (
          <div className="mb-6">
            <button
              onClick={() => setGuideOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 hover:bg-zinc-900/90 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${accentCls}`}>
                  <Download className="h-3.5 w-3.5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">Guide de déploiement EDR</p>
                  <p className="text-[11px] text-zinc-500">{devices.length}/{maxPcs} agents · Wazuh Cloud v4.14.5</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {quotaReached ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold">
                    <Lock className="h-3 w-3" /> Quota atteint
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Actif
                  </span>
                )}
                <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${guideOpen ? "rotate-180" : ""}`} />
              </div>
            </button>

            {guideOpen && (
              <div className={`mt-2 rounded-2xl border border-zinc-800 bg-gradient-to-br ${gradientCls} overflow-hidden shadow-xl`}>
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/5 w-fit">
                    {(["windows", "linux", "macos"] as const).map(os => (
                      <button key={os} onClick={() => setDeployOs(os)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${deployOs === os ? `${accentCls} shadow-md` : "text-zinc-500 hover:text-zinc-300"}`}
                      >
                        {os === "windows" ? "🪟" : os === "linux" ? "🐧" : "🍎"} {OS_SCRIPTS[os].label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {activeScript.steps.map((step, idx) => (
                      <div key={idx} className="rounded-xl border border-white/5 bg-black/30 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                          <span className="text-[10px] text-zinc-500 font-mono">{step.comment}</span>
                          <button onClick={() => copyCmd(idx, step.cmd)} className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 hover:text-emerald-400 transition-colors px-2 py-1 rounded">
                            {copiedCmd === idx ? <><Check className="h-3 w-3 text-emerald-400" /> Copié</> : <><Copy className="h-3 w-3" /> Copier</>}
                          </button>
                        </div>
                        <pre className="p-4 text-[11px] font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">{step.cmd}</pre>
                      </div>
                    ))}
                  </div>
                  {!quotaReached && (
                    <Button onClick={() => setAddOpen(true)} size="sm" className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl">
                      <CheckCircle2 className="h-3.5 w-3.5" /> J'ai installé l'agent — Enregistrer la machine
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* KPIs */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { label: "Total Machines EDR", value: total,    icon: Database,    color: "blue" },
            { label: "Agents Actifs",       value: active,   icon: ShieldCheck, color: "emerald" },
            { label: "Alertes Critiques",   value: alert,    icon: ShieldAlert, color: "red" },
            { label: "Postes Isolés",       value: isolated, icon: PowerOff,    color: "amber" },
          ].map((k, i) => (
            <Card key={i} className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800 shadow-xl rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{k.label}</span>
                <k.icon className={`h-4.5 w-4.5 text-${k.color}-500`} />
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">{k.value}</div>
            </Card>
          ))}
        </div>

        {/* Table & Terminal */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800 shadow-xl rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-zinc-850 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-2">
                  <Input placeholder="Rechercher machine, IP..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs rounded-xl text-xs h-9" />
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[140px] rounded-xl text-xs h-9"><SelectValue placeholder="Filtrer statut" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Tous les statuts</SelectItem>
                      <SelectItem value="active" className="text-xs">Actifs</SelectItem>
                      <SelectItem value="disconnected" className="text-xs">Déconnectés</SelectItem>
                      <SelectItem value="alert" className="text-xs">En alerte</SelectItem>
                      <SelectItem value="isolated" className="text-xs">Isolés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!isClientOnly && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => executeMassAction("scan")} variant="outline" className="text-[10px] font-black rounded-lg uppercase">Scan Antivirus</Button>
                    <Button size="sm" onClick={() => executeMassAction("isolate")} variant="destructive" className="text-[10px] font-black rounded-lg uppercase">Isoler Réseau</Button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-zinc-950">
                      {!isClientOnly && <TableHead className="w-12 py-3"><Checkbox checked={selectedIds.length === devices.length} onCheckedChange={handleSelectAll} /></TableHead>}
                      {["Machine", "OS / IP", "Statut", "Ressources", "Console"].map(h => (
                        <TableHead key={h} className="text-[9px] font-black uppercase tracking-wider text-muted-foreground py-3">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(dev => (
                      <TableRow key={dev.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 border-b border-slate-100 dark:border-zinc-850">
                        {!isClientOnly && <TableCell className="py-3"><Checkbox checked={selectedIds.includes(dev.id)} onCheckedChange={(c) => handleSelectOne(dev.id, !!c)} /></TableCell>}
                        <TableCell className="py-3">
                          <div className="text-xs font-black text-slate-800 dark:text-zinc-100">{dev.hostname}</div>
                          <div className="text-[9px] text-muted-foreground font-mono">Agent: {dev.version}</div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5">
                            <Laptop className="h-4 w-4 text-slate-500" />
                            <span className="text-[10px] font-mono text-muted-foreground">{dev.ip}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${statusBadge(dev.status)}`}>{dev.status}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          {dev.status === "active" || dev.status === "alert" ? (
                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600 dark:text-zinc-400">
                              <span className="flex items-center gap-0.5"><Cpu className="h-3 w-3" />{dev.cpu}%</span>
                              <span className="flex items-center gap-0.5"><HardDrive className="h-3 w-3" />{dev.ram}%</span>
                            </div>
                          ) : <span className="text-[10px] text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="py-3">
                          <Button size="sm" onClick={() => openTerminal(dev)} variant="ghost" className="h-7 w-7 p-0 rounded-lg">
                            <Terminal className="h-4.5 w-4.5 text-amber-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>

          {/* Terminal */}
          <div className="space-y-4">
            <Card className="bg-slate-950 text-slate-100 border border-zinc-800 shadow-xl rounded-2xl overflow-hidden font-mono flex flex-col h-[480px]">
              <div className="p-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-900">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-amber-500 font-extrabold text-[10px] uppercase tracking-wider">Wazuh EDR Secure Shell</span>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-2 text-[11px] leading-relaxed text-zinc-300">
                {terminalHistory.map((line, idx) => (
                  <div key={idx} className="whitespace-pre-wrap">{line}</div>
                ))}
              </div>
              {terminalDevice && (
                <form onSubmit={handleCommand} className="p-3 bg-zinc-900 border-t border-zinc-850 flex gap-2">
                  <span className="text-amber-500 font-extrabold self-center text-xs">$</span>
                  <input type="text" value={termInput} onChange={e => setTermInput(e.target.value)} placeholder="Entrez une commande..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-amber-400 font-mono focus:outline-none focus:border-amber-500" />
                  <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black h-8 px-3 rounded text-[10px]">EXEC</Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Add Machine Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Monitor className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Enregistrer une machine</h3>
                <p className="text-[11px] text-zinc-400">Quota : {devices.length} / {maxPcs} machines</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 block">Nom d'hôte (hostname)</label>
                <Input value={addForm.hostname} onChange={e => setAddForm(f => ({ ...f, hostname: e.target.value }))} placeholder="desktop-client-01" className="bg-black/40 border-zinc-700 text-white text-xs rounded-xl" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 block">Adresse IP</label>
                <Input value={addForm.ip} onChange={e => setAddForm(f => ({ ...f, ip: e.target.value }))} placeholder="192.168.1.10" className="bg-black/40 border-zinc-700 text-white text-xs rounded-xl" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 block">Système d'exploitation</label>
                <Select value={addForm.os} onValueChange={v => setAddForm(f => ({ ...f, os: v as any }))}>
                  <SelectTrigger className="bg-black/40 border-zinc-700 text-white text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="windows">🪟 Windows</SelectItem>
                    <SelectItem value="linux">🐧 Linux</SelectItem>
                    <SelectItem value="macos">🍎 macOS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1 rounded-xl border-zinc-700 text-zinc-300">Annuler</Button>
              <Button onClick={handleAddMachine} disabled={installing || !!quotaReached} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl">
                {installing ? <span className="flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Détection...</span>
                           : <span className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5" /> Confirmer</span>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
