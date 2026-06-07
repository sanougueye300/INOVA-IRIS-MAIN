import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle, Database, Shield, Bug, Workflow,
  Fingerprint, Sliders, Plug, FileText, UserCog,
  ArrowUpRight, Activity, Cpu, Timer, ShieldCheck,
  Zap, Eye, CheckCircle2, XCircle,
  AlertCircle, ChevronRight, Network, Lock,
  RefreshCw, Flame, Target, Layers, Globe2,
  GitBranch, Terminal, ExternalLink, TrendingUp, TrendingDown,
} from "lucide-react";
import { useSocPreferences } from "@/lib/soc-preferences";
import { useState, useEffect } from "react";
import { SocThreatIntelBoard } from "@/components/soc/SocThreatIntelBoard";
import { RequireAuth } from "@/components/RequireAuth";
import {
  mockConnectors, mockIncidentTimeline, mockMitreTactics,
  mockShuffleRuns24h, mockCountryTraffic, mockMttdMttr,
  mockAlertGraphNodes, computeSocHealth,
} from "@/lib/soc-mock";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de Bord — INOVA-IRIS" }] }),
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

/* ─── Alert trend data ─── */
const ALERT_TREND = [
  { h: "00h", critical: 0, high: 2, medium: 5 },
  { h: "03h", critical: 1, high: 3, medium: 7 },
  { h: "06h", critical: 2, high: 4, medium: 8 },
  { h: "09h", critical: 3, high: 6, medium: 12 },
  { h: "12h", critical: 4, high: 7, medium: 11 },
  { h: "15h", critical: 2, high: 5, medium: 13 },
  { h: "18h", critical: 5, high: 8, medium: 10 },
  { h: "21h", critical: 1, high: 4, medium: 7 },
];

const SEV_BADGE: Record<string, string> = {
  critical: "bg-red-500/15 border border-red-500/30 text-red-500",
  high:     "bg-orange-500/15 border border-orange-500/30 text-orange-500",
  medium:   "bg-amber-500/15 border border-amber-500/30 text-amber-500",
  low:      "bg-emerald-500/15 border border-emerald-500/30 text-emerald-500",
};

/* ─── Live clock ─── */
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono text-xs text-muted-foreground">{now.toLocaleTimeString("fr-FR")} UTC+0</span>;
}

/* ─── Connector dot ─── */
function ConnectorDot({ status }: { status: string }) {
  if (status === "up")       return <span className="h-2 w-2 rounded-full bg-emerald-500" />;
  if (status === "degraded") return <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />;
  return <span className="h-2 w-2 rounded-full bg-red-500" />;
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════ */
export function Dashboard() {
  const { t } = useSocPreferences();
  const health = computeSocHealth(18, 87, mockConnectors);
  const maxMitre = Math.max(...mockMitreTactics.map((m) => m.count));

  const KPIS = [
    { label: "Agents actifs",    value: "142",  delta: "+3 aujourd'hui",     positive: true,  icon: Cpu,          accent: "text-blue-500",    iconBg: "bg-blue-500/10",    border: "border-blue-500/20"    },
    { label: "Alertes critiques",value: "0",    delta: "Système stable",     positive: true,  icon: AlertTriangle,accent: "text-emerald-500", iconBg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { label: "IOC indexés",      value: "2 450",delta: "+42 synchronisés",   positive: true,  icon: Database,     accent: "text-violet-500",  iconBg: "bg-violet-500/10",  border: "border-violet-500/20"  },
    { label: "Playbooks SOAR",   value: "14",   delta: "100% opérationnels", positive: true,  icon: Workflow,     accent: "text-amber-500",   iconBg: "bg-amber-500/10",   border: "border-amber-500/20"   },
    { label: "Score SOC",        value: "87%",  delta: "+3 pts cette semaine",positive: true, icon: Activity,     accent: "text-cyan-500",    iconBg: "bg-cyan-500/10",    border: "border-cyan-500/20"    },
    { label: "MTTD moyen",       value: "8.4m", delta: "Obj. < 15 min",      positive: true,  icon: Timer,        accent: "text-indigo-500",  iconBg: "bg-indigo-500/10",  border: "border-indigo-500/20"  },
  ];

  return (
    <div className="min-h-full bg-background text-foreground">

      {/* ══════ TOPBAR ══════ */}
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-3 md:px-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg shadow-blue-500/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">INOVA-IRIS SOC</p>
                <h1 className="text-sm font-black text-foreground leading-none">Centre de Commandement</h1>
              </div>
            </div>
            <div className="hidden h-5 w-px bg-border md:block" />
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 md:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold text-emerald-500">Tous systèmes opérationnels</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LiveClock />
            <button id="btn-refresh-dashboard"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-2xl px-6 py-8 md:px-10">

        {/* ── Page header ── */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black text-foreground">Vue d'Ensemble SOC</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Supervision opérationnelle temps réel · Sonatel Group ·{" "}
              <span className="font-semibold text-foreground">
                {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </span>
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Link to="/alertes" id="link-top-alertes"
              className="flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-500 transition-colors hover:bg-red-500/15">
              <AlertTriangle className="h-3.5 w-3.5" /> Alertes live
            </Link>
            <Link to="/assistant" id="link-top-ai"
              className="flex items-center gap-1.5 rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-500 transition-colors hover:bg-violet-500/15">
              <GitBranch className="h-3.5 w-3.5" /> Djib'son IA
            </Link>
          </div>
        </div>

        {/* ══════ KPI CARDS ══════ */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {KPIS.map((k, i) => {
            const Icon = k.icon;
            return (
              <div key={k.label}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`group relative overflow-hidden rounded-2xl border ${k.border} bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md animate-in fade-in slide-in-from-bottom-2`}
              >
                {/* Top accent line */}
                <div className={`absolute inset-x-0 top-0 h-px opacity-60 ${k.iconBg.replace("bg-", "bg-gradient-to-r from-transparent via-").replace("/10", "/40 to-transparent")}`} />
                <div className="relative">
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${k.iconBg}`}>
                    <Icon className={`h-4.5 w-4.5 ${k.accent}`} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k.label}</p>
                  <p className={`mt-1 text-2xl font-black tabular-nums ${k.accent}`}>{k.value}</p>
                  <div className="mt-1.5 flex items-center gap-1">
                    {k.positive
                      ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                      : <TrendingDown className="h-3 w-3 text-red-500" />}
                    <p className="text-[10px] text-muted-foreground">{k.delta}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ══════ ROW 2 — THREAT INTEL BOARD + CHART + HEALTH ══════ */}
        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <SocThreatIntelBoard />
          </div>

          <div className="flex flex-col gap-4">
            {/* 24h Alert trend */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-foreground">Alertes 24h</p>
                  <p className="text-[10px] text-muted-foreground">Par sévérité · Wazuh</p>
                </div>
                <div className="flex items-center gap-2.5 text-[9px] font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Crit.</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" />High</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Med</span>
                </div>
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ALERT_TREND} margin={{ left: -20, right: 4, top: 2, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gcrit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f87171" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ghigh" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fb923c" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gmed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="h" fontSize={9} stroke="var(--border)" tick={{ fill: "var(--muted-foreground)" }} />
                    <YAxis fontSize={9} stroke="var(--border)" tick={{ fill: "var(--muted-foreground)" }} />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 11 }}
                      labelStyle={{ color: "var(--foreground)" }}
                    />
                    <Area type="monotone" dataKey="medium" stroke="#fbbf24" strokeWidth={1.5} fill="url(#gmed)" />
                    <Area type="monotone" dataKey="high"   stroke="#fb923c" strokeWidth={1.5} fill="url(#ghigh)" />
                    <Area type="monotone" dataKey="critical" stroke="#f87171" strokeWidth={2} fill="url(#gcrit)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SOC Health */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-foreground">Score de Santé SOC</p>
                  <p className="text-[10px] text-muted-foreground">Métriques temps réel</p>
                </div>
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black text-emerald-500">
                  {health.score}%
                </span>
              </div>
              <div className="relative mb-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 transition-all duration-1000"
                  style={{ width: `${health.score}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Traitmt.", value: `${health.avgAlertHandlingMin}m`, ok: health.avgAlertHandlingMin < 20 },
                  { label: "IOC frais", value: `${health.iocFreshnessPct}%`, ok: health.iocFreshnessPct > 80 },
                  { label: "Conn. OK", value: `${health.connectorsOk}/${health.connectorsTotal}`, ok: health.connectorsOk >= health.connectorsTotal - 1 },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl border border-border bg-muted/30 p-2.5">
                    <p className={`text-sm font-black ${m.ok ? "text-emerald-500" : "text-amber-500"}`}>{m.value}</p>
                    <p className="text-[9px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══════ ROW 3 — INCIDENTS + CONNECTORS + MTTD+SOAR ══════ */}
        <div className="mt-5 grid gap-5 lg:grid-cols-3">

          {/* Incidents */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10">
                    <Flame className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">Incidents Récents</p>
                    <p className="text-[10px] text-muted-foreground">TheHive · IRIS</p>
                  </div>
                </div>
                <Link to="/alertes" className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80">
                  Voir tout <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            <div className="divide-y divide-border px-5">
              {mockIncidentTimeline.map((inc) => (
                <div key={inc.id} className="flex items-start gap-3 py-3.5">
                  <span className={`mt-0.5 shrink-0 rounded-lg px-1.5 py-0.5 text-[9px] font-black uppercase ${SEV_BADGE[inc.severity]}`}>
                    {inc.severity}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-foreground">{inc.title}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-[9px] text-muted-foreground">{inc.caseRef}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(inc.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-4">
              <Link to="/alertes" id="link-all-incidents"
                className="flex items-center justify-center gap-2 rounded-xl bg-muted/40 py-2.5 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Eye className="h-3.5 w-3.5" /> Tous les incidents
              </Link>
            </div>
          </div>

          {/* Stack Connectors */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10">
                    <Network className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">Stack SOC</p>
                    <p className="text-[10px] text-muted-foreground">Connecteurs · Latence</p>
                  </div>
                </div>
                <Link to="/integrations" className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80">
                  Gérer <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            <div className="divide-y divide-border px-5">
              {mockConnectors.map((conn) => (
                <div key={conn.id} className="flex items-center gap-3 py-3">
                  <ConnectorDot status={conn.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-foreground">{conn.label}</p>
                      <span className={`text-[9px] font-bold ${
                        conn.status === "up" ? "text-emerald-500" : conn.status === "degraded" ? "text-amber-500" : "text-red-500"
                      }`}>
                        {conn.status === "up" ? "UP" : conn.status === "degraded" ? "DÉGRADÉ" : "DOWN"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${
                          conn.latencyMs < 200 ? "bg-emerald-500" : conn.latencyMs < 500 ? "bg-amber-500" : "bg-red-500"
                        }`} style={{ width: `${Math.min(100, (conn.latencyMs / 1000) * 100)}%` }} />
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground">{conn.latencyMs}ms</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-4">
              <Link to="/integrations" id="link-integrations"
                className="flex items-center justify-center gap-2 rounded-xl bg-muted/40 py-2.5 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Plug className="h-3.5 w-3.5" /> Connecteurs & API
              </Link>
            </div>
          </div>

          {/* MTTD + SOAR */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10">
                  <Timer className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">MTTD / MTTR</p>
                  <p className="text-[10px] text-muted-foreground">Métriques SOC clés</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "MTTD", value: mockMttdMttr.mttdMin, target: 15,  color: "bg-blue-500",   text: "text-blue-500" },
                  { label: "MTTR", value: mockMttdMttr.mttrMin, target: 240, color: "bg-violet-500", text: "text-violet-500" },
                ].map((m) => {
                  const pct = Math.min(100, (m.value / m.target) * 100);
                  const ok  = m.value < m.target * 0.7;
                  return (
                    <div key={m.label} className="rounded-xl border border-border bg-muted/20 p-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{m.label}</p>
                      <p className={`mt-1 text-xl font-black ${ok ? m.text : "text-amber-500"}`}>
                        {m.value < 60 ? `${m.value}m` : `${(m.value / 60).toFixed(1)}h`}
                      </p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${m.color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-[9px] text-muted-foreground">Obj. &lt; {m.target < 60 ? `${m.target}m` : `${m.target / 60}h`}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10">
                    <Zap className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">Playbooks SOAR</p>
                    <p className="text-[10px] text-muted-foreground">Shuffle · 24h</p>
                  </div>
                </div>
                <Link to="/workflow" className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80">
                  Détails <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {mockShuffleRuns24h.map((run) => (
                  <div key={run.id} className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                    {run.status === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      : run.status === "failed" ? <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                      : <span className="relative flex h-4 w-4 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-50" />
                          <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/20">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                          </span>
                        </span>}
                    <p className="flex-1 truncate text-[11px] font-medium text-foreground">{run.workflow}</p>
                    <span className={`shrink-0 text-[9px] font-black ${
                      run.status === "success" ? "text-emerald-500" : run.status === "failed" ? "text-red-500" : "text-blue-500"
                    }`}>
                      {run.status === "success" ? `${run.durationSec}s` : run.status === "failed" ? "ÉCHEC" : "EN COURS"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══════ ROW 4 — MITRE + COUNTRIES + ALERTS ══════ */}
        <div className="mt-5 grid gap-5 lg:grid-cols-5">

          {/* MITRE ATT&CK */}
          <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10">
                  <Target className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">MITRE ATT&CK</p>
                  <p className="text-[10px] text-muted-foreground">Tactiques · Alertes correlées</p>
                </div>
              </div>
            </div>
            <div className="space-y-2.5 p-5">
              {mockMitreTactics.slice(0, 8).map((m) => {
                const pct    = (m.count / maxMitre) * 100;
                const isHigh = m.count > maxMitre * 0.6;
                return (
                  <div key={m.tacticId}>
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[9px] text-muted-foreground">{m.tacticId}</span>
                        <span className="text-[10px] font-medium text-foreground">{m.tactic}</span>
                      </div>
                      <span className={`text-[10px] font-black ${isHigh ? "text-red-500" : "text-foreground"}`}>{m.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${isHigh ? "bg-gradient-to-r from-red-500 to-orange-500" : "bg-gradient-to-r from-violet-500 to-blue-500"}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Country Heat */}
          <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10">
                    <Globe2 className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">Trafic Suspect</p>
                    <p className="text-[10px] text-muted-foreground">Origines · 7 jours</p>
                  </div>
                </div>
                <Link to="/threat-map" className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80">
                  Carte live <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {mockCountryTraffic.map((c) => {
                const maxI  = Math.max(...mockCountryTraffic.map((x) => x.intensity));
                const ratio = c.intensity / maxI;
                const isHigh = ratio > 0.75;
                return (
                  <div key={c.code}
                    className={`rounded-xl border p-3 text-center transition-all hover:-translate-y-0.5 ${
                      isHigh ? "border-red-500/30 bg-red-500/8" : "border-border bg-muted/20"
                    }`}
                  >
                    <p className={`text-base font-black ${isHigh ? "text-red-500" : "text-foreground"}`}>{c.code}</p>
                    <p className="truncate text-[8px] text-muted-foreground">{c.country}</p>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${isHigh ? "bg-red-500" : "bg-primary"}`}
                        style={{ width: `${ratio * 100}%` }} />
                    </div>
                    <p className={`mt-1 text-[9px] font-bold ${isHigh ? "text-red-500" : "text-muted-foreground"}`}>
                      {Math.round(c.intensity * 100)}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Alerts */}
          <div className="lg:col-span-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10">
                  <Layers className="h-4 w-4 text-cyan-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">Alertes Actives</p>
                  <p className="text-[10px] text-muted-foreground">Corrélation IP</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-border px-4">
              {mockAlertGraphNodes.map((node) => {
                const sev = node.severity >= 12 ? "critical" : node.severity >= 10 ? "high" : node.severity >= 8 ? "medium" : "low";
                return (
                  <div key={node.id} className="flex items-start gap-2.5 py-3">
                    <span className={`mt-0.5 shrink-0 rounded border px-1 py-px text-[8px] font-black uppercase ${SEV_BADGE[sev]}`}>
                      {node.severity}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-semibold text-foreground">{node.title}</p>
                      <p className="text-[9px] font-mono text-muted-foreground">{node.sourceIp}</p>
                      <span className="inline-block rounded bg-violet-500/10 px-1 py-px text-[8px] font-bold text-violet-500 mt-0.5">
                        {node.mitreTactic}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══════ ROW 5 — AI + QUICK ACCESS + AUDIT ══════ */}
        <div className="mt-5 grid gap-5 lg:grid-cols-3">

          {/* Djib'son IA */}
          <div className="overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 shadow-sm">
            <div className="border-b border-violet-500/15 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md shadow-violet-500/20">
                    <GitBranch className="h-5 w-5 text-white" />
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">Djib'son IA</p>
                    <p className="text-[10px] text-violet-500">Copilote SOC · En ligne</p>
                  </div>
                </div>
                <Link to="/assistant" className="flex items-center gap-1 text-[10px] font-bold text-violet-500 hover:text-violet-400">
                  Ouvrir <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
            <div className="space-y-2 p-5">
              {[
                { label: "Anomalies détectées",   value: "3 nouvelles",  icon: AlertCircle, color: "text-amber-500",   bg: "bg-amber-500/10"  },
                { label: "Recommandations SOAR",  value: "2 playbooks",  icon: Zap,         color: "text-blue-500",    bg: "bg-blue-500/10"   },
                { label: "IOC enrichis par IA",   value: "18 ce jour",   icon: Database,    color: "text-violet-500",  bg: "bg-violet-500/10" },
                { label: "Rapports Threat Intel", value: "5 rapports",   icon: FileText,    color: "text-emerald-500", bg: "bg-emerald-500/10"},
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card/70 px-3 py-2.5 transition-colors hover:bg-card cursor-pointer">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                    </div>
                    <p className="flex-1 text-[11px] font-medium text-foreground">{item.label}</p>
                    <span className={`text-[10px] font-black ${item.color}`}>{item.value}</span>
                  </div>
                );
              })}
              <Link to="/assistant" id="link-open-ai"
                className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-[11px] font-bold text-white shadow-md shadow-violet-500/20 transition-opacity hover:opacity-90">
                <GitBranch className="h-3.5 w-3.5" /> Interroger Djib'son IA
              </Link>
            </div>
          </div>

          {/* Quick Access */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted">
                  <Terminal className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">Accès Rapide</p>
                  <p className="text-[10px] text-muted-foreground">Modules opérationnels</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 p-4">
              {[
                { name: "Alertes",   icon: AlertTriangle, to: "/alertes",    color: "text-red-500",    bg: "bg-red-500/10",    border: "border-red-500/20"    },
                { name: "IOCs",      icon: Database,      to: "/iocs",       color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20" },
                { name: "Threat Map",icon: Globe2,        to: "/threat-map", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
                { name: "DFIR-IRIS", icon: Fingerprint,   to: "/iris",       color: "text-rose-500",   bg: "bg-rose-500/10",   border: "border-rose-500/20"   },
                { name: "Audit",     icon: FileText,      to: "/audit",      color: "text-cyan-500",   bg: "bg-cyan-500/10",   border: "border-cyan-500/20"   },
                { name: "Admin",     icon: UserCog,       to: "/admin",      color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
                { name: "Workflow",  icon: Workflow,      to: "/workflow",   color: "text-amber-500",  bg: "bg-amber-500/10",  border: "border-amber-500/20"  },
                { name: "Paramètres",icon: Sliders,       to: "/settings",   color: "text-muted-foreground", bg: "bg-muted", border: "border-border" },
              ].map((mod) => {
                const Icon = mod.icon;
                return (
                  <Link key={mod.name} to={mod.to} id={`quicklink-${mod.name.toLowerCase().replace(/\s+/g, "-")}`}
                    className={`group flex flex-col items-center gap-2 rounded-xl border ${mod.border} ${mod.bg} p-3 transition-all hover:-translate-y-0.5 hover:shadow-sm`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-card shadow-sm ${mod.color} transition-transform group-hover:scale-110`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-center text-[9px] font-bold text-muted-foreground group-hover:text-foreground transition-colors">{mod.name}</p>
                  </Link>
                );
              })}
            </div>
            <div className="border-t border-border px-5 pb-4 pt-3">
              <p className="mb-2 text-[10px] font-bold text-muted-foreground">Activité SOC — 7 jours</p>
              <div className="h-14">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    {j:"Lun",v:24},{j:"Mar",v:18},{j:"Mer",v:32},
                    {j:"Jeu",v:27},{j:"Ven",v:41},{j:"Sam",v:9},{j:"Dim",v:7},
                  ]} margin={{ left: -24, right: 4, top: 2, bottom: 0 }}>
                    <XAxis dataKey="j" fontSize={9} tick={{ fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <Bar dataKey="v" fill="var(--primary)" radius={[4,4,0,0]} opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Audit Log */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">Journal d'Audit</p>
                    <p className="text-[10px] text-muted-foreground">Traçabilité analystes</p>
                  </div>
                </div>
                <Link to="/audit" className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80">
                  Voir tout <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            <div className="divide-y divide-border px-4">
              {[
                { action: "Cas TH-4821 ouvert",     user: "analyst.diop",  time: "il y a 20m", icon: Bug,      color: "text-orange-500", bg: "bg-orange-500/10" },
                { action: "IOC exporté MISP",        user: "analyst.ba",    time: "il y a 1h",  icon: Database, color: "text-violet-500", bg: "bg-violet-500/10" },
                { action: "Playbook déclenché",      user: "soar.auto",     time: "il y a 2h",  icon: Zap,      color: "text-amber-500",  bg: "bg-amber-500/10"  },
                { action: "Connexion SOC",           user: "admin.ndiaye",  time: "il y a 3h",  icon: Lock,     color: "text-blue-500",   bg: "bg-blue-500/10"   },
                { action: "Rapport exporté",         user: "analyst.diop",  time: "il y a 5h",  icon: FileText, color: "text-cyan-500",   bg: "bg-cyan-500/10"   },
                { action: "Règle Wazuh modifiée",    user: "admin.ndiaye",  time: "il y a 8h",  icon: Shield,   color: "text-emerald-500",bg: "bg-emerald-500/10"},
              ].map((entry, i) => {
                const Icon = entry.icon;
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${entry.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${entry.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-foreground">{entry.action}</p>
                      <p className="font-mono text-[9px] text-muted-foreground">{entry.user}</p>
                    </div>
                    <span className="shrink-0 text-[9px] text-muted-foreground">{entry.time}</span>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border p-4">
              <Link to="/audit" id="link-full-audit"
                className="flex items-center justify-center gap-2 rounded-xl bg-muted/40 py-2.5 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <FileText className="h-3.5 w-3.5" /> Journal complet
              </Link>
            </div>
          </div>
        </div>

        {/* ══════ FOOTER ══════ */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-6 text-[10px] font-mono text-muted-foreground">
          <span>INOVA-IRIS SOC Platform · Sonatel Group · {new Date().getFullYear()}</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span>Tous systèmes opérationnels</span>
          </div>
          <span>v2.6.0 · {new Date().toISOString().slice(0, 10)}</span>
        </div>

      </div>
    </div>
  );
}