import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Search, Play, ExternalLink, ThumbsUp, ThumbsDown, ShieldAlert, Network } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { ClientEndpointTopology } from "@/components/soc/ClientEndpointTopology";
import { toast } from "sonner";
import { SocAlertCorrelationGraph } from "@/components/soc/SocAlertCorrelationGraph";
import { SocAttackTimeline } from "@/components/soc/SocAttackTimeline";
import { useSocSimulation } from "@/lib/soc-simulation";
import { demoMitreTag } from "@/lib/soc-mock";
import type { MockAlertNode } from "@/lib/soc-mock";
import { SocTimeRangeTabs } from "@/components/soc/SocTimeRangeTabs";
import { useSocPreferences } from "@/lib/soc-preferences";

export const Route = createFileRoute("/alertes")({
  head: () => ({ meta: [{ title: "Alertes — SOC Platform" }] }),
  component: () => (
    <RequireAuth>
      <Alertes />
    </RequireAuth>
  ),
});

interface Alert {
  id: string;
  title: string;
  description: string | null;
  severity: number;
  source: string;
  status: string;
  agent_name: string | null;
  organization: string | null;
  detected_at: string;
  rule_id: string | null;
}

const sevBadge = (s: number) => {
  if (s >= 12) {
    return (
      <Badge className="bg-gradient-to-r from-rose-600 to-red-500 text-white font-extrabold shadow-[0_0_12px_rgba(239,68,68,0.45)] border-none px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-pulse text-[11px] tracking-wide">
        <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping shrink-0" />
        {s} — CRITIQUE
      </Badge>
    );
  }
  if (s >= 8) {
    return (
      <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-[0_0_10px_rgba(249,115,22,0.3)] border-none px-2.5 py-1 rounded-lg text-[11px] tracking-wide">
        {s} — ÉLEVÉE
      </Badge>
    );
  }
  if (s >= 5) {
    return (
      <Badge className="bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-900 font-bold shadow-[0_0_8px_rgba(234,179,8,0.2)] border-none px-2.5 py-1 rounded-lg text-[11px] tracking-wide">
        {s} — MOYENNE
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/60 font-bold px-2.5 py-1 rounded-lg text-[11px]">
      {s} — FAIBLE
    </Badge>
  );
};

const statusBadge = (status: string) => {
  switch (status) {
    case "new":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider">
          <span className="h-1 w-1 rounded-full bg-blue-500" />
          nouveau
        </span>
      );
    case "investigating":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase tracking-wider animate-pulse">
          <span className="h-1 w-1 rounded-full bg-purple-500 animate-ping" />
          analyse
        </span>
      );
    case "closed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">
          <span className="h-1 w-1 rounded-full bg-emerald-500" />
          résolu
        </span>
      );
    default:
      return <Badge variant="outline" className="text-[10px] uppercase font-bold">{status}</Badge>;
  }
};

function injectedToRow(n: MockAlertNode): Alert {
  return {
    id: n.id,
    title: n.title,
    description: null,
    severity: n.severity,
    source: "wazuh+simulation",
    status: n.status,
    agent_name: n.agentName,
    organization: null,
    detected_at: n.detectedAt,
    rule_id: n.ruleId,
  };
}

function Alertes() {
  const { injectedAlerts, injectionEpoch } = useSocSimulation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const { t } = useSocPreferences();
  const { roles } = useAuth();
  const isClientOnly = roles.includes("client") && !roles.includes("admin") && !roles.includes("analyste") && !roles.includes("manager");
  const [fpFeedback, setFpFeedback] = useState<Record<string, "up" | "down" | undefined>>({});

  const [fSev, setFSev] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fRule, setFRule] = useState<string>("all");
  const [fMitre, setFMitre] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("alerts").select("*").order("detected_at", { ascending: false }).limit(200);
    if (error) toast.error(error.message);
    setAlerts((data as Alert[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [injectionEpoch]);

  const merged = useMemo(() => {
    const inj = injectedAlerts.map(injectedToRow);
    const ids = new Set(alerts.map((a) => a.id));
    const uniqueInj = inj.filter((a) => !ids.has(a.id));
    return [...uniqueInj, ...alerts];
  }, [alerts, injectedAlerts]);

  const rules = useMemo(() => {
    const s = new Set<string>();
    merged.forEach((a) => {
      if (a.rule_id) s.add(a.rule_id);
    });
    return ["all", ...[...s].sort()];
  }, [merged]);

  const sync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-wazuh-alerts");
      if (error) throw error;
      toast.success(`${data?.imported ?? 0} alertes synchronisées`);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erreur";
      toast.error("Synchronisation échouée: " + msg);
    } finally {
      setSyncing(false);
    }
  };

  const filtered = useMemo(() => {
    return merged.filter((a) => {
      if (q && !a.title.toLowerCase().includes(q.toLowerCase()) && !(a.agent_name ?? "").toLowerCase().includes(q.toLowerCase()))
        return false;
      if (fSev !== "all") {
        if (fSev === "12" && a.severity < 12) return false;
        if (fSev === "8" && (a.severity < 8 || a.severity > 11)) return false;
        if (fSev === "5" && (a.severity < 5 || a.severity > 7)) return false;
        if (fSev === "0" && a.severity >= 5) return false;
      }
      if (fStatus !== "all" && a.status !== fStatus) return false;
      if (fRule !== "all" && (a.rule_id ?? "—") !== fRule) return false;
      if (fMitre !== "all" && demoMitreTag(`${a.rule_id}-${a.id}`) !== fMitre) return false;
      return true;
    });
  }, [merged, q, fSev, fStatus, fRule, fMitre]);

  const selectedIds = [...sel];
  const primarySelected = selectedIds[0];

  const runShuffle = () => {
    if (!primarySelected) {
      toast.message("Sélectionnez une alerte");
      return;
    }
    toast.promise(new Promise((r) => setTimeout(r, 1500)), {
      loading: "Déclenchement playbook Shuffle…",
      success: "Playbook « Enrichissement + ticket » lancé (démo).",
      error: "Échec",
    });
  };

  const pivotTheHive = () => {
    if (!primarySelected) {
      toast.message("Sélectionnez une alerte");
      return;
    }
    toast.success("TheHive", { description: `Brouillon de cas créé pour l'alerte ${primarySelected} (API à brancher).` });
  };

  const suggestFp = (id: string) => {
    const score = (id.charCodeAt(0) ?? 0) % 100;
    if (score > 62) return { label: "Faux positif probable", conf: score };
    return { label: "Incident plausible", conf: 100 - score };
  };

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* Background glowing decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-radial from-red-500/5 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-radial from-orange-400/5 via-transparent to-transparent blur-3xl" />
      </div>

      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-wider text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
              Supervision Temps Réel
            </span>
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-slate-900 via-red-500 to-orange-500 dark:from-white dark:via-red-400 dark:to-amber-400 bg-clip-text text-transparent tracking-tight">
            {t("Console des Alertes SOC")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 font-medium">
            {t("Corrélation d'évènements, analyse comportementale, playbooks SOAR et levée de doute par IA.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SocTimeRangeTabs />
          <Button 
            onClick={() => void sync()} 
            disabled={syncing}
            className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-bold shadow-lg shadow-red-500/15 cursor-pointer rounded-xl h-10 border-none px-4"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {t("Synchroniser Wazuh")}
          </Button>
        </div>
      </header>

      <Tabs defaultValue={isClientOnly ? "topology" : "liste"} className="space-y-6 relative z-10">
        <TabsList className="bg-slate-100/80 dark:bg-zinc-900/80 border border-slate-200/50 dark:border-zinc-800 rounded-2xl p-1 shadow-sm">
          {isClientOnly && (
            <TabsTrigger value="topology" className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950 data-[state=active]:shadow-sm flex items-center gap-1.5">
              <Network className="h-3.5 w-3.5" /> {t("PC Connectés")}
            </TabsTrigger>
          )}
          <TabsTrigger value="liste" className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950 data-[state=active]:shadow-sm">{t("Liste & actions")}</TabsTrigger>
          <TabsTrigger value="correlation" className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950 data-[state=active]:shadow-sm">{t("Corrélation visuelle")}</TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-xl px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950 data-[state=active]:shadow-sm">{t("Chronologie d'attaque")}</TabsTrigger>
        </TabsList>

        {isClientOnly && (
          <TabsContent value="topology" className="space-y-5 animate-in fade-in duration-300">
            <ClientEndpointTopology />
          </TabsContent>
        )}

        <TabsContent value="liste" className="space-y-5 animate-in fade-in duration-300">
          <Card className="p-6 bg-white/70 dark:bg-zinc-900/60 border border-white/80 dark:border-zinc-800/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 overflow-hidden">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="relative min-w-[220px] flex-1 max-w-md group">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                <Input 
                  value={q} 
                  onChange={(e) => setQ(e.target.value)} 
                  placeholder={t("Rechercher un titre, agent, IP...")} 
                  className="pl-10 pr-4 bg-slate-50/50 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800 rounded-xl focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:border-red-500 font-medium text-sm transition-all" 
                />
              </div>
              <Select value={fSev} onValueChange={setFSev}>
                <SelectTrigger className="w-[170px] bg-slate-50/50 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800 rounded-xl font-medium focus:ring-2 focus:ring-red-500/20">
                  <SelectValue placeholder={t("Sévérité")} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl">
                  <SelectItem value="all" className="cursor-pointer font-bold">{t("Toutes sévérités")}</SelectItem>
                  <SelectItem value="12" className="cursor-pointer text-red-500 font-bold">{t("Critique (≥12)")}</SelectItem>
                  <SelectItem value="8" className="cursor-pointer text-orange-500 font-bold">{t("Élevée (8–11)")}</SelectItem>
                  <SelectItem value="5" className="cursor-pointer text-yellow-500 dark:text-yellow-400 font-bold">{t("Moyenne (5–7)")}</SelectItem>
                  <SelectItem value="0" className="cursor-pointer text-slate-500 font-bold">{t("Faible (< 5)")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger className="w-[150px] bg-slate-50/50 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800 rounded-xl font-medium focus:ring-2 focus:ring-red-500/20">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl">
                  <SelectItem value="all" className="cursor-pointer font-bold">{t("Tous statuts")}</SelectItem>
                  <SelectItem value="new" className="cursor-pointer font-bold">new</SelectItem>
                  <SelectItem value="investigating" className="cursor-pointer font-bold">investigating</SelectItem>
                  <SelectItem value="closed" className="cursor-pointer font-bold">closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fRule} onValueChange={setFRule}>
                <SelectTrigger className="w-[190px] bg-slate-50/50 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800 rounded-xl font-medium focus:ring-2 focus:ring-red-500/20">
                  <SelectValue placeholder={t("Règle Wazuh")} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-h-[300px]">
                  {rules.map((r) => (
                    <SelectItem key={r} value={r} className="cursor-pointer font-semibold">
                      {r === "all" ? t("Toutes règles") : r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={fMitre} onValueChange={setFMitre}>
                <SelectTrigger className="w-[170px] bg-slate-50/50 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800 rounded-xl font-medium focus:ring-2 focus:ring-red-500/20">
                  <SelectValue placeholder="MITRE" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl">
                  <SelectItem value="all" className="cursor-pointer font-bold">{t("Toutes tactiques")}</SelectItem>
                  {["T1071", "T1059", "T1110", "T1566", "—"].map((t) => (
                    <SelectItem key={t} value={t} className="cursor-pointer font-semibold">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-slate-400 font-bold shrink-0 mb-3 ml-auto bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-zinc-700/50">{filtered.length} {t("alerte(s) filtrée(s)")}</span>
            </div>

            {/* Actions panel */}
            <div className="mb-5 flex flex-wrap gap-2.5 bg-slate-50/60 dark:bg-zinc-950/30 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/80 items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${primarySelected ? "bg-amber-500 animate-pulse" : "bg-slate-300 dark:bg-zinc-700"}`} />
                <span className="text-xs font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  {primarySelected ? `${sel.size} alerte(s) sélectionnée(s)` : "Aucune alerte sélectionnée"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-1.5 border-slate-200 dark:border-zinc-800 rounded-xl hover:border-amber-400 hover:bg-amber-500/5 transition-all text-xs font-bold cursor-pointer" 
                  onClick={runShuffle} 
                  disabled={!primarySelected}
                >
                  <Play className="h-3.5 w-3.5 text-amber-500" /> Playbook Shuffle
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="gap-1.5 border-slate-200 dark:border-zinc-800 rounded-xl hover:border-red-400 hover:bg-red-500/5 transition-all text-xs font-bold cursor-pointer" 
                  onClick={pivotTheHive} 
                  disabled={!primarySelected}
                >
                  <ExternalLink className="h-3.5 w-3.5 text-red-500" /> {t("Pivoter vers TheHive")}
                </Button>
              </div>
            </div>

            {/* Main alerts table */}
            <div className="border border-slate-100 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50/70 dark:bg-zinc-950/40">
                  <TableRow className="hover:bg-transparent border-b border-slate-100 dark:border-zinc-800">
                    <TableHead className="w-12 text-center" />
                    <TableHead className="w-40 font-black uppercase text-[10px] tracking-wider text-slate-400">{t("Sévérité")}</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-wider text-slate-400">{t("Titre & Signature")}</TableHead>
                    <TableHead className="w-28 font-black uppercase text-[10px] tracking-wider text-slate-400">{t("Règle")}</TableHead>
                    <TableHead className="w-28 font-black uppercase text-[10px] tracking-wider text-slate-400">MITRE</TableHead>
                    <TableHead className="w-36 font-black uppercase text-[10px] tracking-wider text-slate-400">{t("Agent Hôte")}</TableHead>
                    <TableHead className="w-32 font-black uppercase text-[10px] tracking-wider text-slate-400">Statut</TableHead>
                    <TableHead className="w-44 font-black uppercase text-[10px] tracking-wider text-slate-400">{t("Détectée le")}</TableHead>
                    <TableHead className="w-56 font-black uppercase text-[10px] tracking-wider text-slate-400">{t("Analyse IA (LAD)")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-16 text-slate-400 dark:text-zinc-500 font-bold">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-red-500/70" />
                        {t("Chargement des alertes depuis le SOC...")}
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-16 text-center text-slate-400 dark:text-zinc-500 font-bold bg-slate-50/20 dark:bg-zinc-950/10">
                        <ShieldAlert className="h-8 w-8 mx-auto mb-3 text-slate-300 dark:text-zinc-700" />
                        {t("Aucune alerte trouvée.")}
                        <div className="text-[11px] font-medium text-slate-400 mt-1">
                          {t("Synchronisez Wazuh ou déclenchez une simulation RedTeam pour peupler la console.")}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((a) => {
                      const fp = suggestFp(a.id);
                      const isFp = fp.label.includes("Faux positif");
                      const isSelected = sel.has(a.id);
                      return (
                        <TableRow 
                          key={a.id}
                          className={`
                            border-b border-slate-100 dark:border-zinc-800/80 transition-all duration-200
                            hover:bg-red-500/[0.02] dark:hover:bg-red-500/[0.02] cursor-pointer
                            ${isSelected ? "bg-amber-500/[0.04] dark:bg-amber-500/[0.03] hover:bg-amber-500/[0.06] border-l-2 border-l-amber-500" : ""}
                          `}
                          onClick={() => {
                            setSel((prev) => {
                              const n = new Set(prev);
                              if (n.has(a.id)) n.delete(a.id);
                              else n.add(a.id);
                              return n;
                            });
                          }}
                        >
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(v) => {
                                setSel((prev) => {
                                  const n = new Set(prev);
                                  if (v) n.add(a.id);
                                  else n.delete(a.id);
                                  return n;
                                  });
                              }}
                              className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500 rounded"
                            />
                          </TableCell>
                          <TableCell>
                            {sevBadge(a.severity)}
                          </TableCell>
                          <TableCell className="max-w-xs font-semibold text-slate-800 dark:text-zinc-100 text-sm">
                            <span className="line-clamp-2 leading-relaxed">{a.title}</span>
                          </TableCell>
                          <TableCell className="font-mono text-[11px] text-slate-400 dark:text-zinc-500 font-bold">{a.rule_id ?? "—"}</TableCell>
                          <TableCell className="font-mono text-[11px] font-bold text-slate-600 dark:text-zinc-400 bg-slate-100/50 dark:bg-zinc-800/40 px-2 py-0.5 rounded border border-slate-200/20 dark:border-zinc-700/20 text-center w-20">
                            {demoMitreTag(`${a.rule_id}-${a.id}`)}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-zinc-400 font-medium text-xs">{a.agent_name ?? "—"}</TableCell>
                          <TableCell>
                            {statusBadge(a.status)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-400 dark:text-zinc-500 font-mono font-medium">
                            {new Date(a.detected_at).toLocaleString("fr-FR")}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col gap-1 min-w-[150px]">
                              <div className="flex items-center justify-between text-[10px] font-extrabold">
                                <span className={isFp ? "text-emerald-500" : "text-amber-500"}>
                                  {fp.label}
                                </span>
                                <span className="text-slate-400 font-mono">{fp.conf}%</span>
                              </div>
                              
                              {/* Confidence progress bar */}
                              <div className="h-1 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isFp 
                                      ? "bg-gradient-to-r from-emerald-500 to-teal-400" 
                                      : "bg-gradient-to-r from-amber-500 to-orange-400"
                                  }`}
                                  style={{ width: `${fp.conf}%` }}
                                />
                              </div>

                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Feedback :</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={`h-6 w-6 rounded-lg transition-all duration-200 ${
                                    fpFeedback[a.id] === "up" 
                                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]" 
                                      : "text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700"
                                  }`}
                                  onClick={() => setFpFeedback((f) => ({ ...f, [a.id]: "up" }))}
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={`h-6 w-6 rounded-lg transition-all duration-200 ${
                                    fpFeedback[a.id] === "down" 
                                      ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]" 
                                      : "text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700"
                                  }`}
                                  onClick={() => setFpFeedback((f) => ({ ...f, [a.id]: "down" }))}
                                >
                                  <ThumbsDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="correlation" className="animate-in fade-in duration-300">
          <SocAlertCorrelationGraph />
        </TabsContent>

        <TabsContent value="timeline" className="animate-in fade-in duration-300">
          <SocAttackTimeline />
        </TabsContent>
      </Tabs>
    </div>
  );
}
