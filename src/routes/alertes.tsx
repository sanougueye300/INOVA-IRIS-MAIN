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
import { RefreshCw, Search, Play, ExternalLink, ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
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

const sevColor = (s: number) =>
  s >= 12
    ? "bg-destructive text-destructive-foreground"
    : s >= 8
      ? "bg-orange-500/90 text-white"
      : s >= 5
        ? "bg-yellow-500/90 text-black"
        : "bg-muted text-foreground";

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
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("Alertes")}</h1>
          <p className="text-sm text-muted-foreground">{t("Filtres dynamiques, corrélation, playbooks et pivot TheHive.")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SocTimeRangeTabs />
          <Button onClick={() => void sync()} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {t("Synchroniser Wazuh")}
          </Button>
        </div>
      </header>

      <Tabs defaultValue="liste" className="space-y-4">
        <TabsList>
          <TabsTrigger value="liste">{t("Liste & actions")}</TabsTrigger>
          <TabsTrigger value="correlation">{t("Corrélation visuelle")}</TabsTrigger>
          <TabsTrigger value="timeline">{t("Chronologie d'attaque")}</TabsTrigger>
        </TabsList>

        <TabsContent value="liste" className="space-y-4">
          <Card className="p-4">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="relative min-w-[200px] flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Rechercher…")} className="pl-9" />
              </div>
              <Select value={fSev} onValueChange={setFSev}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t("Sévérité")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Toutes sévérités")}</SelectItem>
                  <SelectItem value="12">{t("Critique (≥12)")}</SelectItem>
                  <SelectItem value="8">{t("Élevée (8–11)")}</SelectItem>
                  <SelectItem value="5">{t("Moyenne (5–7)")}</SelectItem>
                  <SelectItem value="0">{t("Faible (moins de 5)")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Tous statuts")}</SelectItem>
                  <SelectItem value="new">new</SelectItem>
                  <SelectItem value="investigating">investigating</SelectItem>
                  <SelectItem value="closed">closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fRule} onValueChange={setFRule}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("Règle Wazuh")} />
                </SelectTrigger>
                <SelectContent>
                  {rules.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r === "all" ? t("Toutes règles") : r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={fMitre} onValueChange={setFMitre}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="MITRE" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Toutes tactiques")}</SelectItem>
                  {["T1071", "T1059", "T1110", "T1566", "—"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{filtered.length} {t("résultat(s)")}</span>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" className="gap-1" onClick={runShuffle} disabled={!primarySelected}>
                <Play className="h-4 w-4" /> Playbook Shuffle
              </Button>
              <Button size="sm" className="gap-1" onClick={pivotTheHive} disabled={!primarySelected}>
                <ExternalLink className="h-4 w-4" /> {t("Pivoter vers TheHive")}
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>{t("Sévérité")}</TableHead>
                  <TableHead>{t("Titre")}</TableHead>
                  <TableHead>{t("Règle")}</TableHead>
                  <TableHead>MITRE</TableHead>
                  <TableHead>{t("Agent")}</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>{t("Détectée")}</TableHead>
                  <TableHead>{t("IA FP")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      {t("Chargement...")}
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      {t("Aucune alerte. Synchronisez Wazuh ou lancez une simulation RedTeam.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((a) => {
                    const fp = suggestFp(a.id);
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Checkbox
                            checked={sel.has(a.id)}
                            onCheckedChange={(v) => {
                              setSel((prev) => {
                                const n = new Set(prev);
                                if (v) n.add(a.id);
                                else n.delete(a.id);
                                return n;
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge className={sevColor(a.severity)}>{a.severity}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs font-medium">
                          <span className="line-clamp-2">{a.title}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{a.rule_id ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{demoMitreTag(`${a.rule_id}-${a.id}`)}</TableCell>
                        <TableCell className="text-muted-foreground">{a.agent_name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{a.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(a.detected_at).toLocaleString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] text-muted-foreground">
                              {fp.label} ({fp.conf}%)
                            </span>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant={fpFeedback[a.id] === "up" ? "default" : "ghost"}
                                className="h-7 w-7"
                                onClick={() => setFpFeedback((f) => ({ ...f, [a.id]: "up" }))}
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant={fpFeedback[a.id] === "down" ? "destructive" : "ghost"}
                                className="h-7 w-7"
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
          </Card>
        </TabsContent>

        <TabsContent value="correlation">
          <SocAlertCorrelationGraph />
        </TabsContent>

        <TabsContent value="timeline">
          <SocAttackTimeline />
        </TabsContent>
      </Tabs>
    </div>
  );
}
