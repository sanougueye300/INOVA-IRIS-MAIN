import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ShieldCheck, AlertTriangle, Clock, Zap, Activity, TrendingUp,
  CheckCircle, XCircle, Bell, Download, RefreshCw, BarChart3
} from "lucide-react";

export const Route = createFileRoute("/clients/sla")({
  head: () => ({ meta: [{ title: "SLA & Performance — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><SlaPage /></RequireAuth>,
});

interface SlaRow {
  id: string; clientName: string; org: string; tier: string;
  mttdContract: number; mttdActual: number;
  mttrContract: number; mttrActual: number;
  compliance: number; violations: number; lastIncident: string;
}

interface Incident {
  id: string; client: string; title: string; openedAt: string;
  resolvedAt: string; mttdMin: number; mttrMin: number; slaOk: boolean;
}

const TIERS = { Bronze: "#94a3b8", Argent: "#3b82f6", Or: "#f59e0b", Platine: "#a855f7" };

const SEED_SLA: SlaRow[] = [
  { id: "s1", clientName: "Ageroute Sénégal", org: "Ageroute", tier: "Platine", mttdContract: 5,  mttdActual: 4,  mttrContract: 30, mttrActual: 22,  compliance: 98, violations: 0, lastIncident: "2026-05-20" },
  { id: "s2", clientName: "SONABHY",          org: "SONABHY",  tier: "Or",      mttdContract: 10, mttdActual: 12, mttrContract: 60, mttrActual: 55,  compliance: 91, violations: 1, lastIncident: "2026-05-18" },
  { id: "s3", clientName: "Min. Finances",    org: "MinFin",   tier: "Argent",  mttdContract: 15, mttdActual: 22, mttrContract: 120, mttrActual: 145, compliance: 74, violations: 3, lastIncident: "2026-05-15" },
  { id: "s4", clientName: "Orange Burkina",   org: "OBF",      tier: "Platine", mttdContract: 5,  mttdActual: 4,  mttrContract: 30, mttrActual: 28,  compliance: 99, violations: 0, lastIncident: "2026-05-12" },
  { id: "s5", clientName: "BIS Group",        org: "BIS",      tier: "Or",      mttdContract: 10, mttdActual: 9,  mttrContract: 60, mttrActual: 58,  compliance: 96, violations: 0, lastIncident: "2026-05-10" },
  { id: "s6", clientName: "Groupe CFAO",      org: "CFAO",     tier: "Argent",  mttdContract: 15, mttdActual: 18, mttrContract: 120, mttrActual: 130, compliance: 83, violations: 2, lastIncident: "2026-05-08" },
];

const SEED_INCIDENTS: Incident[] = [
  { id: "i1", client: "Ageroute",  title: "Ransomware détecté sur srv-prod-01",      openedAt: "2026-05-20 09:14", resolvedAt: "2026-05-20 09:36", mttdMin: 4,  mttrMin: 22,  slaOk: true  },
  { id: "i2", client: "SONABHY",   title: "Exfiltration de données détectée",        openedAt: "2026-05-18 14:05", resolvedAt: "2026-05-18 15:02", mttdMin: 12, mttrMin: 55,  slaOk: false },
  { id: "i3", client: "Min. Fin.", title: "Connexion suspecte depuis IP étrangère",  openedAt: "2026-05-15 07:44", resolvedAt: "2026-05-15 10:09", mttdMin: 22, mttrMin: 145, slaOk: false },
  { id: "i4", client: "Orange BF", title: "Mouvement latéral détecté (APT27)",      openedAt: "2026-05-12 16:30", resolvedAt: "2026-05-12 16:58", mttdMin: 4,  mttrMin: 28,  slaOk: true  },
  { id: "i5", client: "BIS Group", title: "Augmentation anormale du trafic réseau", openedAt: "2026-05-10 11:22", resolvedAt: "2026-05-10 12:20", mttdMin: 9,  mttrMin: 58,  slaOk: true  },
];

function SlaPage() {
  const [slaData, setSlaData] = useState<SlaRow[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSlaData(SEED_SLA);
    setIncidents(SEED_INCIDENTS);
    setLoading(false);
  }, []);

  const avgCompliance  = slaData.length ? Math.round(slaData.reduce((a, r) => a + r.compliance, 0) / slaData.length) : 0;
  const totalViolations = slaData.reduce((a, r) => a + r.violations, 0);
  const avgMttd = slaData.length ? (slaData.reduce((a, r) => a + r.mttdActual, 0) / slaData.length).toFixed(1) : "0";
  const avgMttr = slaData.length ? (slaData.reduce((a, r) => a + r.mttrActual, 0) / slaData.length).toFixed(0) : "0";

  const complianceColor = (v: number) => v >= 95 ? "text-emerald-500" : v >= 80 ? "text-amber-500" : "text-red-500";
  const complianceBg   = (v: number) => v >= 95 ? "bg-emerald-500" : v >= 80 ? "bg-amber-500" : "bg-red-500";
  const tierColor = (t: string) => (TIERS as any)[t] || "#94a3b8";

  const exportCSV = () => {
    const rows = [
      ["Client", "Formule", "MTTD Contractuel", "MTTD Réel", "MTTR Contractuel", "MTTR Réel", "% Conformité", "Violations"],
      ...slaData.map(r => [r.clientName, r.tier, r.mttdContract + " min", r.mttdActual + " min", r.mttrContract + " min", r.mttrActual + " min", r.compliance + "%", r.violations])
    ].map(r => r.join(",")).join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sla_rapport.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success("Rapport SLA exporté");
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0b0c10] relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
              <ShieldCheck className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-blue-600 to-blue-800 dark:from-white dark:via-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
                SLA & Performance Contrats
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Suivi temps réel des engagements · MTTD · MTTR · Conformité contractuelle</p>
            </div>
          </div>
          <Button onClick={exportCSV} variant="outline" className="rounded-xl font-bold bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-blue-500 gap-2">
            <Download className="h-4 w-4 text-blue-500" /> Exporter rapport SLA
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { label: "Conformité SLA Globale", value: avgCompliance + "%", icon: ShieldCheck, color: "emerald", sub: `${slaData.filter(r => r.compliance >= 95).length} clients conformes` },
            { label: "MTTD Moyen Réel", value: avgMttd + " min", icon: Zap, color: "amber", sub: "Temps moyen de détection" },
            { label: "MTTR Moyen Réel", value: avgMttr + " min", icon: Clock, color: "blue", sub: "Temps moyen de remédiation" },
            { label: "Violations SLA", value: totalViolations.toString(), icon: AlertTriangle, color: "red", sub: `${slaData.filter(r => r.violations > 0).length} client(s) en défaut` },
          ].map((k, i) => (
            <Card key={i} className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800 shadow-xl rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{k.label}</span>
                <div className={`p-1.5 bg-${k.color}-500/10 rounded-lg`}>
                  <k.icon className={`h-4 w-4 text-${k.color}-500`} />
                </div>
              </div>
              <div className={`text-3xl font-black ${k.color === "red" && totalViolations > 0 ? "text-red-500" : "text-slate-900 dark:text-white"}`}>{k.value}</div>
              <p className="text-[10px] text-muted-foreground mt-1.5 font-semibold">{k.sub}</p>
            </Card>
          ))}
        </div>

        {/* SLA Table */}
        <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800 shadow-xl rounded-2xl overflow-hidden mb-8">
          <div className="p-5 border-b border-slate-100 dark:border-zinc-850">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" /> Tableau de conformité SLA par client
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-zinc-950">
                  {["Client / Organisation", "Formule", "MTTD Contractuel", "MTTD Réel", "MTTR Contractuel", "MTTR Réel", "Conformité", "Actions"].map(h => (
                    <TableHead key={h} className="text-[10px] font-black uppercase tracking-wider text-muted-foreground py-4">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {slaData.map(row => {
                  const mttdOk = row.mttdActual <= row.mttdContract;
                  const mttrOk = row.mttrActual <= row.mttrContract;
                  return (
                    <TableRow key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 border-b border-slate-100 dark:border-zinc-850">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback style={{ backgroundColor: tierColor(row.tier) + "20", color: tierColor(row.tier) }} className="text-xs font-black">
                              {row.org.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-xs font-black text-slate-800 dark:text-zinc-100">{row.clientName}</div>
                            <div className="text-[10px] text-muted-foreground">Dernier incident : {row.lastIncident}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase" style={{ backgroundColor: tierColor(row.tier) + "20", color: tierColor(row.tier) }}>
                          {row.tier}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-muted-foreground py-4">&lt; {row.mttdContract} min</TableCell>
                      <TableCell className="py-4">
                        <span className={`text-xs font-black ${mttdOk ? "text-emerald-500" : "text-red-500"} flex items-center gap-1`}>
                          {mttdOk ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          {row.mttdActual} min
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-muted-foreground py-4">&lt; {row.mttrContract} min</TableCell>
                      <TableCell className="py-4">
                        <span className={`text-xs font-black ${mttrOk ? "text-emerald-500" : "text-red-500"} flex items-center gap-1`}>
                          {mttrOk ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          {row.mttrActual} min
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden w-16">
                            <div className={`h-full ${complianceBg(row.compliance)} rounded-full transition-all`} style={{ width: `${row.compliance}%` }} />
                          </div>
                          <span className={`text-xs font-black ${complianceColor(row.compliance)}`}>{row.compliance}%</span>
                        </div>
                        {row.violations > 0 && (
                          <span className="text-[9px] font-black text-red-500 mt-0.5 block">{row.violations} violation(s)</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        {row.violations > 0 && (
                          <Button size="sm" onClick={() => toast.info("Alerte SLA", { description: `Notification envoyée à ${row.clientName}.` })}
                            className="h-7 text-[9px] font-black uppercase bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg gap-1 border border-red-500/20">
                            <Bell className="h-3 w-3" /> Notifier
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Incident Timeline */}
        <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800 shadow-xl rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-zinc-850">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" /> Timeline des derniers incidents & résolutions
            </h3>
          </div>
          <div className="p-6 relative">
            <div className="absolute left-10 top-6 bottom-6 w-0.5 bg-slate-100 dark:bg-zinc-800" />
            <div className="space-y-6">
              {incidents.map(inc => (
                <div key={inc.id} className="flex items-start gap-4">
                  <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center border-2 shrink-0 ${inc.slaOk ? "bg-emerald-500/10 border-emerald-500" : "bg-red-500/10 border-red-500"}`}>
                    {inc.slaOk ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                  </div>
                  <div className="flex-1 p-4 bg-slate-50 dark:bg-zinc-950/30 rounded-xl border border-slate-100 dark:border-zinc-850">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                      <span className="text-xs font-black text-slate-800 dark:text-zinc-100">{inc.title}</span>
                      <Badge variant="outline" className={`text-[9px] font-black ${inc.slaOk ? "border-emerald-500/30 text-emerald-600" : "border-red-500/30 text-red-600"}`}>
                        {inc.slaOk ? "SLA respecté" : "SLA violé"}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-[10px] text-muted-foreground font-semibold">
                      <span>Client : <strong className="text-slate-700 dark:text-zinc-300">{inc.client}</strong></span>
                      <span>Détection : <strong className={inc.mttdMin <= 10 ? "text-emerald-500" : "text-red-500"}>{inc.mttdMin} min</strong></span>
                      <span>Résolution : <strong className={inc.mttrMin <= 60 ? "text-emerald-500" : "text-red-500"}>{inc.mttrMin} min</strong></span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{inc.openedAt} → {inc.resolvedAt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
