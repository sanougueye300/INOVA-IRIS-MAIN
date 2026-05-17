import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Search, Download, Database, Radar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import { demoVtScore, demoMitreTag, mockIocWeeklyTrend } from "@/lib/soc-mock";
import { SocTimeRangeTabs } from "@/components/soc/SocTimeRangeTabs";
import { useSocPreferences } from "@/lib/soc-preferences";
import {
  BarChart,
  Bar,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export const Route = createFileRoute("/iocs")({
  head: () => ({ meta: [{ title: "IOC — SOC Platform" }] }),
  component: () => (
    <RequireAuth>
      <Iocs />
    </RequireAuth>
  ),
});

interface Ioc {
  id: string;
  ioc_type: string;
  value: string;
  threat_name: string | null;
  threat_level: string;
  source: string;
  tags: string[] | null;
  last_seen: string | null;
}

const lvlColor = (l: string) =>
  l === "critical"
    ? "bg-destructive text-destructive-foreground"
    : l === "high"
      ? "bg-orange-500/90 text-white"
      : l === "medium"
        ? "bg-yellow-500/90 text-black"
        : "bg-muted text-foreground";

const DAY = 86400000;

function Iocs() {
  const [iocs, setIocs] = useState<Ioc[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [syncing, setSyncing] = useState(false);
  const { t, language } = useSocPreferences();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("iocs").select("*").order("last_seen", { ascending: false }).limit(200);
    if (error) toast.error(error.message);
    setIocs((data as Ioc[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const sync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-misp-iocs");
      if (error) throw error;
      toast.success(`${data?.imported ?? 0} IOC synchronisés`);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erreur";
      toast.error("Synchronisation échouée: " + msg);
    } finally {
      setSyncing(false);
    }
  };

  const filtered = useMemo(
    () =>
      iocs.filter(
        (i) =>
          !q ||
          i.value.toLowerCase().includes(q.toLowerCase()) ||
          (i.threat_name ?? "").toLowerCase().includes(q.toLowerCase()),
      ),
    [iocs, q],
  );

  const dormant = useMemo(
    () =>
      filtered.filter((i) => {
        if (!i.last_seen) return false;
        return Date.now() - new Date(i.last_seen).getTime() > 30 * DAY;
      }),
    [filtered],
  );

  const hunter = () => {
    toast.promise(new Promise((r) => setTimeout(r, 1800)), {
      loading: "IOC Hunter — rétroscan Wazuh 7 jours…",
      success: `${Math.min(filtered.length, 12)} correspondances potentielles (démo).`,
      error: "Échec",
    });
  };

  const exportStix = () => {
    const blob = new Blob([JSON.stringify({ type: "bundle", spec_version: "2.1", id: "bundle--demo" }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "iocs-stix-demo.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Export STIX (schéma simplifié démo)");
  };

  const pushWazuhCdb = () => {
    toast.message("Push Wazuh CDB", { description: "Liste CDB list mise à jour (simulation — utiliser wazuh-manager API)." });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("Indicateurs (IOC)")}</h1>
          <p className="text-sm text-muted-foreground">{t("Enrichissement VT, MITRE, MISP, exports et IOC Hunter.")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SocTimeRangeTabs />
          <Button variant="secondary" className="gap-1" onClick={hunter}>
            <Radar className="h-4 w-4" /> {t("IOC Hunter (7 j)")}
          </Button>
          <Button variant="outline" className="gap-1" onClick={exportStix}>
            <Download className="h-4 w-4" /> STIX / TAXII
          </Button>
          <Button variant="outline" onClick={pushWazuhCdb}>
            {t("Push Wazuh CDB")}
          </Button>
          <Button onClick={() => void sync()} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {t("Synchroniser MISP")}
          </Button>
        </div>
      </header>

      {dormant.length > 0 && (
        <Card className="mb-4 border-amber-500/40 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {t("IOC dormants (plus de 30 j sans vue) — revue suppression recommandée.")}
          </p>
          <ul className="mt-2 max-h-24 overflow-y-auto font-mono text-xs text-muted-foreground">
            {dormant.slice(0, 8).map((d) => (
              <li key={d.id}>
                {d.value} · {t("dernier vu")} {d.last_seen ? new Date(d.last_seen).toLocaleDateString(language === "fr" ? "fr-FR" : language === "en" ? "en-US" : language === "wo" ? "fr-FR" : "ar-EG") : "—"}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">{t("Nouveaux vs expirés (semaine)")}</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockIocWeeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="newIoc" name={t("Nouveaux")} fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expired" name={t("Expirés")} fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">{t("Tendance nette (ligne)")}</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockIocWeeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="newIoc" name={t("Nouveaux")} stroke="var(--primary)" strokeWidth={2} />
                <Line type="monotone" dataKey="expired" name={t("Expirés")} stroke="var(--destructive)" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Rechercher (IP, hash, domaine...)")} className="pl-9" />
          </div>
          <span className="text-sm text-muted-foreground">{filtered.length} {t("résultat(s)")}</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Type")}</TableHead>
              <TableHead>{t("Valeur")}</TableHead>
              <TableHead>{t("Menace")}</TableHead>
              <TableHead>{t("Niveau")}</TableHead>
              <TableHead>{t("Score VT")}</TableHead>
              <TableHead>{t("MàJ")}</TableHead>
              <TableHead>{t("Alertes liées")}</TableHead>
              <TableHead>MITRE</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>{t("Dernière obs.")}</TableHead>
              <TableHead>MISP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground">
                  {t("Chargement...")}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                  {t("Aucun IOC. Synchronisez MISP.")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((i) => {
                const vt = demoVtScore(i.value);
                const mitre = demoMitreTag(i.value);
                const alertsLinked = (i.value.length % 9) + 1;
                return (
                  <TableRow key={i.id}>
                    <TableCell>
                      <Badge variant="outline">{i.ioc_type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate font-mono text-xs">{i.value}</TableCell>
                    <TableCell>{i.threat_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={lvlColor(i.threat_level)}>{i.threat_level}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{vt}/100</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date().toLocaleDateString(language === "fr" ? "fr-FR" : language === "en" ? "en-US" : language === "wo" ? "fr-FR" : "ar-EG")}
                    </TableCell>
                    <TableCell>{alertsLinked}</TableCell>
                    <TableCell className="font-mono text-xs">{mitre}</TableCell>
                    <TableCell className="text-muted-foreground">{i.source}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {i.last_seen ? new Date(i.last_seen).toLocaleDateString(language === "fr" ? "fr-FR" : language === "en" ? "en-US" : language === "wo" ? "fr-FR" : "ar-EG") : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 px-2"
                        onClick={() =>
                          toast.message("MISP", { description: `Recherche ouverte pour ${i.value} (API MISP).` })
                        }
                      >
                        <Database className="h-3 w-3" />
                        MISP
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
