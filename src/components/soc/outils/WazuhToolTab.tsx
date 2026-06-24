import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockWazuhRules, mockWazuhAgents, mockMitreTechniques } from "@/lib/soc-mock";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  Server, Shield, Settings, Package, Network, PlugZap, FileText,
  RefreshCw, Cloud, Activity, Monitor, ArrowRight, CheckCircle2,
  Laptop, AlertTriangle, Zap, Lock, Globe, Database, Copy
} from "lucide-react";
import { DEFAULT_OFFERS, loadOffers } from "@/lib/offers";

interface WazuhAgent {
  id: string;
  name: string;
  status: string;
  version: string;
  ip: string;
  lastKeepAlive: string | null;
  os?: string;
}

interface AlertStats {
  total: number;
  newCount: number;
  critical: number;
}

const OFFER_WAZUH_QUOTA: Record<string, { maxAgents: number; mttd: string; features: string[] }> = {
  "inova-secure": {
    maxAgents: 10,
    mttd: "< 30 min",
    features: ["Wazuh EDR de base", "FIM basique", "Scan de vulnérabilités", "Tableau de bord SOC"],
  },
  "terranga-secure": {
    maxAgents: 25,
    mttd: "< 15 min",
    features: ["Wazuh EDR avancé", "FIM temps réel", "MITRE ATT&CK mapping", "Corrélation SOAR", "Enrichissement VirusTotal"],
  },
  "gainde-secure": {
    maxAgents: 50,
    mttd: "< 10 min",
    features: ["Wazuh EDR Premium", "FIM + Rootkit detection", "Threat Intel MISP", "Playbooks automatisés", "Analyste SOC dédié", "Investigation DFIR-IRIS"],
  },
};

export function WazuhToolTab() {
  const [rules, setRules] = useState(mockWazuhRules);
  const [agents, setAgents] = useState<WazuhAgent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [alertStats, setAlertStats] = useState<AlertStats | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const offers = loadOffers();

  const fetchAlertStats = useCallback(async () => {
    try {
      const [{ count: total }, { count: newCount }, { count: critical }] = await Promise.all([
        supabase.from("alerts").select("*", { count: "exact", head: true }).eq("source", "wazuh"),
        supabase.from("alerts").select("*", { count: "exact", head: true }).eq("source", "wazuh").eq("status", "new"),
        supabase.from("alerts").select("*", { count: "exact", head: true }).eq("source", "wazuh").gte("severity", 12),
      ]);
      setAlertStats({ total: total ?? 0, newCount: newCount ?? 0, critical: critical ?? 0 });
    } catch {
      // Silently fail
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    setAgentsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-wazuh-agents");
      if (error) throw error;
      const list: WazuhAgent[] = data?.agents ?? [];
      if (list.length > 0) {
        setAgents(list);
        setConnected(true);
      } else {
        setAgents(mockWazuhAgents as unknown as WazuhAgent[]);
        setConnected(false);
      }
    } catch {
      setAgents(mockWazuhAgents as unknown as WazuhAgent[]);
      setConnected(false);
    } finally {
      setAgentsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    fetchAlertStats();
  }, [fetchAgents, fetchAlertStats]);

  const triggerSync = async () => {
    setSyncLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-wazuh-alerts");
      if (error) throw error;
      toast.success("Synchronisation terminée", {
        description: `${data?.imported ?? 0} alertes importées (mode : ${data?.mode ?? "inconnu"})`,
      });
      fetchAlertStats();
    } catch (e) {
      toast.error("Erreur de synchronisation", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const copyCmd = (cmd: string, key: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(key);
    toast.success("Commande copiée !");
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const toggleRule = (id: string, enabled: boolean) => {
    setRules((r) => r.map((x) => (x.id === id ? { ...x, enabled } : x)));
    toast.message(`Règle ${id}`, { description: enabled ? "Réactivée" : "Désactivée temporairement" });
  };

  const exportToHive = () => {
    toast.success("Export vers TheHive", { description: "Simulation : cas brouillon TH-XXXX créé." });
  };

  const generateReport = () => {
    toast.success("Rapport généré", { description: "Rapport de conformité CIS Benchmark (PDF) — télécharger." });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Wazuh
            {connected === true && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-xs">
                <Cloud className="h-3 w-3" /> Cloud connecté
              </Badge>
            )}
            {connected === false && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                Démo
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            SIEM & détection : agents, règles, corrélation MITRE, inventaire, conformité.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={triggerSync} disabled={syncLoading} className="shrink-0 gap-2">
          {syncLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Synchroniser alertes
        </Button>
      </div>

      {/* Métriques rapides */}
      {alertStats && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{alertStats.total}</p>
            <p className="text-xs text-muted-foreground">Alertes totales</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{alertStats.newCount}</p>
            <p className="text-xs text-muted-foreground">Nouvelles</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-rose-600">{alertStats.critical}</p>
            <p className="text-xs text-muted-foreground">Critiques</p>
          </Card>
        </div>
      )}

      <Tabs defaultValue="scenario" className="space-y-4">
        <TabsList className="flex h-auto min-h-10 flex-wrap justify-start gap-1">
          <TabsTrigger value="scenario">Scénario de supervision</TabsTrigger>
          <TabsTrigger value="overview">Présentation</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="rules">Règles</TabsTrigger>
          <TabsTrigger value="inventory">Inventaire</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="reports">Rapports</TabsTrigger>
        </TabsList>

        {/* ─── SCÉNARIO DE SUPERVISION ─── */}
        <TabsContent value="scenario" className="space-y-6">

          {/* Offres disponibles et quota agents */}
          <div className="grid gap-4 md:grid-cols-3">
            {offers.map((offer) => {
              const quota = OFFER_WAZUH_QUOTA[offer.id] ?? { maxAgents: offer.maxPcs, mttd: offer.mttd, features: offer.features };
              const themeColor = offer.theme === "orange" ? "border-orange-400/50 from-orange-500/8" :
                                 offer.theme === "blue"   ? "border-blue-400/50 from-blue-500/8" :
                                 offer.theme === "gold"   ? "border-amber-400/50 from-amber-500/8" : "border-slate-400/50 from-slate-500/8";
              const badgeColor = offer.theme === "orange" ? "bg-orange-500/10 text-orange-600 border-orange-500/20" :
                                 offer.theme === "blue"   ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                                 offer.theme === "gold"   ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-slate-500/10 text-slate-600 border-slate-500/20";
              return (
                <Card key={offer.id} className={`p-4 border bg-gradient-to-br ${themeColor} to-transparent space-y-3`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm">{offer.name}</h4>
                    <Badge variant="outline" className={`text-xs ${badgeColor}`}>
                      {offer.value.toLocaleString("fr-FR")} FCFA/mois
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Laptop className="h-3.5 w-3.5" />
                    <span>Jusqu'à <strong className="text-foreground">{quota.maxAgents} machines</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="h-3.5 w-3.5" />
                    <span>MTTD : <strong className="text-foreground">{quota.mttd}</strong></span>
                  </div>
                  <ul className="space-y-1">
                    {quota.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>

          {/* Flux de supervision */}
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                <Network className="h-5 w-5 text-primary" />
                Flux de supervision des machines client
              </h3>
              <p className="text-sm text-muted-foreground">Comment chaque machine du client est surveillée en temps réel.</p>
            </div>

            {/* Flow diagram */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 overflow-x-auto pb-2">
              {[
                { icon: Laptop, label: "Machine client", sub: "PC / Serveur / Mac", color: "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300" },
                { icon: Shield, label: "Agent Wazuh", sub: "Installé sur la machine", color: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300" },
                { icon: Lock, label: "TLS 1.3", sub: "Tunnel chiffré", color: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300", arrow: false },
                { icon: Cloud, label: "Wazuh Cloud", sub: "api.cloud.wazuh.com", color: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300" },
                { icon: Database, label: "INOVA-IRIS", sub: "Plateforme SOC", color: "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300" },
                { icon: AlertTriangle, label: "Alerte SOC", sub: "Analyste notifié", color: "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300" },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex items-center gap-3 shrink-0">
                  <div className={`flex flex-col items-center text-center gap-2 rounded-xl border border-border/50 p-3 w-28 ${step.color}`}>
                    <step.icon className="h-6 w-6" />
                    <div>
                      <p className="text-xs font-bold">{step.label}</p>
                      <p className="text-[10px] opacity-70">{step.sub}</p>
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Étapes détaillées */}
            <div className="grid gap-3 md:grid-cols-2">
              {[
                {
                  step: "1",
                  title: "Installation de l'agent sur la machine",
                  desc: "L'agent Wazuh est déployé sur chaque machine cliente (Windows/Linux/macOS). Il collecte les logs système, surveille les fichiers, et analyse les processus.",
                  color: "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300",
                },
                {
                  step: "2",
                  title: "Connexion chiffrée au Wazuh Cloud",
                  desc: "L'agent ouvre un canal TLS 1.3 vers api.cloud.wazuh.com (port 1514). Toutes les données sont chiffrées de bout en bout avec AES-256.",
                  color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
                },
                {
                  step: "3",
                  title: "Analyse et corrélation des événements",
                  desc: "Wazuh Cloud applique + de 3000 règles de détection, corrèle avec les techniques MITRE ATT&CK, et génère des alertes classifiées par niveau de sévérité.",
                  color: "bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300",
                },
                {
                  step: "4",
                  title: "Synchronisation vers INOVA-IRIS",
                  desc: "La plateforme synchronise automatiquement les alertes Wazuh via l'API Cloud (x-api-key). Les analystes SOC voient les alertes en temps réel sur le dashboard.",
                  color: "bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-300",
                },
              ].map((item) => (
                <div key={item.step} className={`rounded-xl border p-4 ${item.color}`}>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 h-6 w-6 rounded-full bg-current/20 flex items-center justify-center text-xs font-bold">
                      {item.step}
                    </span>
                    <div>
                      <p className="font-semibold text-sm mb-1">{item.title}</p>
                      <p className="text-xs opacity-80">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Commandes d'installation agent */}
          <Card className="p-5 space-y-4">
            <h3 className="font-bold flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              Commandes d'installation de l'agent sur les machines client
            </h3>
            <p className="text-xs text-muted-foreground">Copiez et exécutez la commande sur chaque machine à superviser. L'agent se connecte automatiquement à votre environnement Wazuh Cloud.</p>
            {/* Alerte endpoint */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
              <div className="text-xs text-blue-800 dark:text-blue-300">
                <p className="font-bold mb-0.5">Obtenez votre endpoint Wazuh Cloud avant d'installer</p>
                <p>Allez sur <strong>console.cloud.wazuh.com → Endpoints → Add new endpoint → Windows/Linux/macOS</strong>. La console génère le script complet avec votre endpoint et votre clé d'enrôlement déjà renseignés.</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  os: "windows",
                  label: "🪟 Windows — PowerShell (Administrateur)",
                  steps: [
                    { num: "1", title: "Télécharger le fichier .msi", cmd: `Invoke-WebRequest -Uri "https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.5-1.msi" -OutFile "$env:TEMP\\wazuh-agent.msi"` },
                    { num: "2", title: "Installer l'agent", cmd: `msiexec.exe /i "$env:TEMP\\wazuh-agent.msi" WAZUH_MANAGER="3a1uer3pl3hr.cloud.wazuh.com" WAZUH_REGISTRATION_SERVER="3a1uer3pl3hr.cloud.wazuh.com" WAZUH_AGENT_GROUP="groupe-client" /q` },
                    { num: "3", title: "Démarrer le service", cmd: `NET START WazuhSvc` },
                  ],
                },
                {
                  os: "linux",
                  label: "🐧 Linux Debian/Ubuntu — Terminal (root)",
                  steps: [
                    { num: "1", title: "Ajouter le dépôt Wazuh", cmd: `curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import\necho "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee /etc/apt/sources.list.d/wazuh.list && apt-get update` },
                    { num: "2", title: "Installer l'agent", cmd: `WAZUH_MANAGER="3a1uer3pl3hr.cloud.wazuh.com" WAZUH_AGENT_GROUP="groupe-client" apt-get install -y wazuh-agent` },
                    { num: "3", title: "Activer et démarrer", cmd: `systemctl enable --now wazuh-agent` },
                  ],
                },
                {
                  os: "macos",
                  label: "🍎 macOS — Terminal (Admin)",
                  steps: [
                    { num: "1", title: "Télécharger le fichier .pkg", cmd: `curl -so /tmp/wazuh-agent.pkg https://packages.wazuh.com/4.x/macos/wazuh-agent-4.14.5-1.intel64.pkg` },
                    { num: "2", title: "Installer l'agent", cmd: `WAZUH_MANAGER="3a1uer3pl3hr.cloud.wazuh.com" WAZUH_AGENT_GROUP="groupe-client" installer -pkg /tmp/wazuh-agent.pkg -target /` },
                    { num: "3", title: "Démarrer l'agent", cmd: `/Library/Ossec/bin/wazuh-control start` },
                  ],
                },
              ].map((item) => (
                <div key={item.os} className="rounded-lg border border-border/60 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border/40">
                    <span className="text-sm font-semibold">{item.label}</span>
                    <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs"
                      onClick={() => {
                        const all = item.steps.map(s => s.cmd).join("\n\n");
                        copyCmd(all, item.os);
                      }}>
                      {copiedCmd === item.os ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedCmd === item.os ? "Copié !" : "Tout copier"}
                    </Button>
                  </div>
                  <div className="divide-y divide-border/30">
                    {item.steps.map((step) => (
                      <div key={step.num} className="p-3 space-y-1.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Étape {step.num} — {step.title}
                        </p>
                        <div className="flex items-start gap-2">
                          <code className="flex-1 block text-[11px] font-mono bg-muted/60 p-2 rounded overflow-x-auto whitespace-pre text-foreground">
                            {step.cmd}
                          </code>
                          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 mt-0.5"
                            onClick={() => copyCmd(step.cmd, `${item.os}-${step.num}`)}>
                            {copiedCmd === `${item.os}-${step.num}`
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ─── PRÉSENTATION ─── */}
        <TabsContent value="overview">
          <Card className="p-6">
            <h3 className="text-2xl font-bold text-primary mb-2">Wazuh : Plateforme de Sécurité Unifiée</h3>
            <p className="text-muted-foreground mb-8">Wazuh est une solution open-source complète de SIEM et XDR, constituant le cœur de la détection pour votre SOC.</p>
            <div className="grid gap-6 md:grid-cols-2">
              {[
                { icon: FileText, title: "Collecte & Analyse de Logs", items: ["Surveillance temps réel des journaux systèmes, applications et réseau.", "Normalisation, enrichissement et corrélation automatique des événements."] },
                { icon: Shield, title: "Intégrité des Fichiers (FIM)", items: ["Détection des modifications non autorisées (fichiers, base de registre).", "Alerte immédiate en cas de changement ou de suppression suspecte."] },
                { icon: Network, title: "Détection des Vulnérabilités", items: ["Scan automatisé des systèmes pour détecter les logiciels obsolètes (CVE).", "Comparaison en continu avec les bases de données de vulnérabilités globales."] },
                { icon: Server, title: "Détection Malware & Rootkits", items: ["Analyse comportementale des processus, des ports ouverts et des fichiers cachés.", "Utilisation de signatures croisées et d'heuristiques avancées."] },
                { icon: PlugZap, title: "Réponse aux Incidents", items: ["Exécution d'actions de réponse prédéfinies (Active Response).", "Intégration fluide pour l'automatisation et l'orchestration des workflows."] },
                { icon: Settings, title: "Conformité & Audits", items: ["Aide à la conformité aux standards du marché (PCI DSS, GDPR, NIS2, CIS).", "Génération de rapports et tableaux de bord d'audit consolidés."] },
              ].map(({ icon: Icon, title, items }) => (
                <div key={title} className="space-y-2">
                  <h4 className="font-semibold text-lg flex items-center gap-2"><Icon className="w-5 h-5 text-primary"/> {title}</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {items.map((i) => <li key={i}>{i}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ─── AGENTS ─── */}
        <TabsContent value="agents">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">
                  Arbre des agents
                  {connected === true && <span className="ml-2 text-xs font-normal text-emerald-600">(données réelles)</span>}
                </h3>
              </div>
              <Button size="sm" variant="ghost" onClick={fetchAgents} disabled={agentsLoading}>
                <RefreshCw className={`h-3.5 w-3.5 ${agentsLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            {agentsLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                <Activity className="h-4 w-4 animate-pulse" /> Chargement des agents…
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>État</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Dernière activité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.id}</TableCell>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === "active" || a.status === "Active" ? "secondary" : "destructive"}>
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.version}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.lastKeepAlive ? new Date(a.lastKeepAlive).toLocaleString("fr-FR") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* ─── RÈGLES ─── */}
        <TabsContent value="rules" className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Règles actives</h3>
              </div>
              <Button size="sm" variant="outline" onClick={exportToHive}>Exporter alertes → TheHive</Button>
            </div>
            <ul className="space-y-3">
              {rules.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs">{r.id}</p>
                    <p className="text-sm">{r.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">niv. {r.level}</span>
                    <Switch checked={r.enabled} onCheckedChange={(v) => toggleRule(r.id, v)} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 font-semibold">Techniques MITRE détectées</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockMitreTechniques}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="id" stroke="currentColor" fontSize={10} />
                  <YAxis allowDecimals={false} stroke="currentColor" fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        {/* ─── INVENTAIRE ─── */}
        <TabsContent value="inventory" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Inventaire des logiciels</h3>
            </div>
            <div className="space-y-2">
              {[
                { name: "OpenSSL", version: "1.1.1a", vulnerable: true, cve: "CVE-2023-1255" },
                { name: "Apache2", version: "2.4.52", vulnerable: false, cve: null },
                { name: "Python", version: "3.8.10", vulnerable: true, cve: "CVE-2021-3737" },
                { name: "Node.js", version: "14.21.3", vulnerable: true, cve: "CVE-2022-43548" },
              ].map((pkg) => (
                <div key={pkg.name} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <div><p className="font-medium text-sm">{pkg.name}</p><p className="text-xs text-muted-foreground">{pkg.version}</p></div>
                  {pkg.vulnerable && <Badge variant="destructive" className="text-xs">{pkg.cve}</Badge>}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ─── CONFIG ─── */}
        <TabsContent value="config" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Gestion de configuration & Durcissement</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { benchmark: "CIS Benchmark (Linux)", compliance: 87 },
                { benchmark: "PCI-DSS 3.2", compliance: 92 },
                { benchmark: "GDPR Readiness", compliance: 78 },
                { benchmark: "SSH Hardening", compliance: 95 },
              ].map((item) => (
                <Card key={item.benchmark} className="p-3 border-border/60">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium">{item.benchmark}</p>
                    <Badge variant="secondary">{item.compliance}%</Badge>
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${item.compliance}%` }} />
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ─── RAPPORTS ─── */}
        <TabsContent value="reports" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Génération de rapports personnalisés</h3>
            </div>
            <div className="space-y-2">
              {[
                { title: "Rapport hebdomadaire de sécurité", format: "PDF" },
                { title: "Métriques de conformité CIS", format: "HTML" },
                { title: "Alertes par technique MITRE", format: "CSV" },
                { title: "Résumé exécutif", format: "PDF" },
              ].map((report) => (
                <div key={report.title} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <div>
                    <p className="text-sm font-medium">{report.title}</p>
                    <p className="text-xs text-muted-foreground">{report.format}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={generateReport}>Générer</Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
