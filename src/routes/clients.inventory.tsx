import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
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
  RefreshCw, PowerOff, ShieldCheck, Database, ListFilter,
  CheckCircle, AlertTriangle, XCircle, Info
} from "lucide-react";

export const Route = createFileRoute("/clients/inventory")({
  head: () => ({ meta: [{ title: "Parc & Inventaire EDR — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><InventoryPage /></RequireAuth>,
});

interface EdrDevice {
  id: string; hostname: string; clientName: string; ip: string;
  os: "windows" | "linux" | "macos"; status: "active" | "disconnected" | "alert" | "isolated";
  cpu: number; ram: number; version: string; lastSeen: string;
}

const SEED_DEVICES: EdrDevice[] = [
  { id: "d1", hostname: "desktop-ageroute-01", clientName: "Ageroute Sénégal", ip: "192.168.1.102", os: "windows", status: "active",       cpu: 12, ram: 42, version: "v4.7.2", lastSeen: "À l'instant" },
  { id: "d2", hostname: "srv-prod-sonabhy-01", clientName: "SONABHY",          ip: "10.0.4.15",    os: "linux",   status: "active",       cpu: 45, ram: 78, version: "v4.7.2", lastSeen: "À l'instant" },
  { id: "d3", hostname: "macbook-minfin-02",   clientName: "Min. Finances",    ip: "172.16.8.50",  os: "macos",   status: "alert",        cpu: 92, ram: 95, version: "v4.7.1", lastSeen: "2 min plus tôt" },
  { id: "d4", hostname: "desktop-orange-12",   clientName: "Orange Burkina",   ip: "10.20.30.40",  os: "windows", status: "isolated",     cpu: 0,  ram: 0,  version: "v4.7.2", lastSeen: "5h plus tôt" },
  { id: "d5", hostname: "srv-db-bis-01",       clientName: "BIS Group",        ip: "192.168.10.5", os: "linux",   status: "active",       cpu: 28, ram: 61, version: "v4.7.2", lastSeen: "À l'instant" },
  { id: "d6", hostname: "desktop-cfao-03",     clientName: "Groupe CFAO",      ip: "192.168.4.12", os: "windows", status: "disconnected", cpu: 0,  ram: 0,  version: "v4.7.0", lastSeen: "12h plus tôt" },
  { id: "d7", hostname: "srv-web-ageroute-02", clientName: "Ageroute Sénégal", ip: "192.168.1.105", os: "linux",   status: "active",       cpu: 18, ram: 35, version: "v4.7.2", lastSeen: "À l'instant" },
];

const SHELL_COMMANDS: Record<string, string> = {
  help: "Commandes disponibles :\n  wazuh-status    : Vérifier l'état de l'agent Wazuh\n  sys-info        : Obtenir les détails système de base\n  netstat         : Lister les ports et connexions actives\n  scan-malware    : Lancer un scan rapide de réputation\n  clear           : Effacer la console",
  "wazuh-status": "wazuh-agent.service - L'agent de sécurité Wazuh\n   Loaded: loaded (/lib/systemd/system/wazuh-agent.service; enabled)\n   Active: active (running) since Wed 2026-05-20 08:00:00 UTC\n   Tasks: 4 (limit: 512)\n   CGroup: /system.slice/wazuh-agent.service\n           └─3055 /var/ossec/bin/wazuh-agentd",
  "sys-info": "OS: Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-88-generic x86_64)\nHostname: srv-prod-sonabhy-01\nUptime: 14 days, 3 hours\nCPU: Intel(R) Xeon(R) Gold (4 Cores)\nMemory: 16 GB (Used: 78%)",
  netstat: "Connexions actives :\n  Proto  Adresse locale        Adresse externe       État\n  TCP    127.0.0.1:5432        127.0.0.1:49220       ESTABLISHED\n  TCP    10.0.4.15:22          192.168.1.50:52410     ESTABLISHED\n  TCP    10.0.4.15:1514        10.0.4.1:55000        ESTABLISHED (Wazuh SIEM)",
  "scan-malware": "=== DEBUT DU SCAN DE REPUTATION ===\n[+] Scan des processus en cours... OK\n[+] Vérification des hashs système via VirusTotal... OK\n[+] Analyse de l'intégrité des fichiers (FIM)... OK\n[RESULTAT] Aucun indicateur de compromission détecté."
};

function InventoryPage() {
  const [devices, setDevices] = useState<EdrDevice[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [terminalDevice, setTerminalDevice] = useState<EdrDevice | null>(null);
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    "=== CONSOLE WAZUH REMOTE EDR v4.7.2 ===",
    "Sélectionnez un poste pour ouvrir une session sécurisée.",
  ]);
  const [termInput, setTermInput] = useState("");

  useEffect(() => {
    setDevices(SEED_DEVICES);
  }, []);

  const total = devices.length;
  const active = devices.filter(d => d.status === "active").length;
  const alert = devices.filter(d => d.status === "alert").length;
  const isolated = devices.filter(d => d.status === "isolated").length;

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? devices.map(d => d.id) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  const executeMassAction = (action: "scan" | "update" | "isolate") => {
    if (selectedIds.length === 0) {
      toast.error("Aucune machine sélectionnée");
      return;
    }
    const targetNames = devices.filter(d => selectedIds.includes(d.id)).map(d => d.hostname).join(", ");
    
    if (action === "scan") {
      toast.success("Scan lancé !", { description: `Antivirus démarré sur : ${targetNames}` });
    } else if (action === "update") {
      toast.success("Mise à jour poussée", { description: `Mise à jour de l'agent Wazuh initiée sur : ${targetNames}` });
    } else if (action === "isolate") {
      setDevices(prev => prev.map(d => selectedIds.includes(d.id) ? { ...d, status: "isolated" as const } : d));
      toast.warning("Isolation réseau ordonnée", { description: `Réseau coupé pour : ${targetNames}` });
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
      if (cmd === "clear") {
        setTerminalHistory([]);
      } else if (SHELL_COMMANDS[cmd]) {
        setTerminalHistory(prev => [...prev, SHELL_COMMANDS[cmd]]);
      } else {
        setTerminalHistory(prev => [...prev, `Commande inconnue: "${cmd}". Tapez 'help' pour lister les commandes.`]);
      }
    }, 200);
  };

  const filtered = devices.filter(d => {
    const matchSearch = d.hostname.toLowerCase().includes(search.toLowerCase()) || d.clientName.toLowerCase().includes(search.toLowerCase()) || d.ip.includes(search);
    const matchStatus = filterStatus === "all" || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const osIcon = (os: string) => {
    return <Laptop className="h-4 w-4 text-slate-500" />;
  };

  const statusBadge = (s: string) => {
    const classes: Record<string, string> = {
      active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      disconnected: "bg-slate-500/10 text-slate-600 border-slate-500/20",
      alert: "bg-red-500/10 text-red-600 border-red-500/20 animate-pulse",
      isolated: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    };
    return classes[s] || "bg-slate-100 text-slate-700";
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0b0c10] relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
              <Laptop className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-amber-600 to-amber-800 dark:from-white dark:via-amber-400 dark:to-yellow-500 bg-clip-text text-transparent">
                Inventaire EDR & Wazuh Global
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Console de gestion centralisée des agents · Télémétrie · Actions de masse</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { label: "Total Machines EDR", value: total, icon: Database, color: "blue" },
            { label: "Agents Actifs", value: active, icon: ShieldCheck, color: "emerald" },
            { label: "Alertes Critiques", value: alert, icon: ShieldAlert, color: "red" },
            { label: "Postes Isolés", value: isolated, icon: PowerOff, color: "amber" },
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

        {/* Table & Terminal Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Inventory Table */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800 shadow-xl rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-zinc-850 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Rechercher machine, client, IP..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="max-w-xs rounded-xl text-xs h-9"
                  />
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
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => executeMassAction("scan")} variant="outline" className="text-[10px] font-black rounded-lg uppercase">Scan Antivirus</Button>
                  <Button size="sm" onClick={() => executeMassAction("isolate")} variant="destructive" className="text-[10px] font-black rounded-lg uppercase">Isoler Réseau</Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-zinc-950">
                      <TableHead className="w-12 py-3"><Checkbox checked={selectedIds.length === devices.length} onCheckedChange={handleSelectAll} /></TableHead>
                      {["Machine", "Client", "OS / IP", "Statut", "Ressources", "Console"].map(h => (
                        <TableHead key={h} className="text-[9px] font-black uppercase tracking-wider text-muted-foreground py-3">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(dev => (
                      <TableRow key={dev.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 border-b border-slate-100 dark:border-zinc-850">
                        <TableCell className="py-3"><Checkbox checked={selectedIds.includes(dev.id)} onCheckedChange={(c) => handleSelectOne(dev.id, !!c)} /></TableCell>
                        <TableCell className="py-3">
                          <div className="text-xs font-black text-slate-800 dark:text-zinc-100">{dev.hostname}</div>
                          <div className="text-[9px] text-muted-foreground font-mono">Agent: {dev.version}</div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300">{dev.clientName}</div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5">
                            {osIcon(dev.os)}
                            <span className="text-[10px] font-mono text-muted-foreground">{dev.ip}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${statusBadge(dev.status)}`}>
                            {dev.status}
                          </span>
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

          {/* EDR Secure Terminal Console */}
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
                  <input
                    type="text"
                    value={termInput}
                    onChange={e => setTermInput(e.target.value)}
                    placeholder="Entrez une commande..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                  />
                  <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black h-8 px-3 rounded text-[10px]">EXEC</Button>
                </form>
              )}
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
