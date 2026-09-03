import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle, Database, Shield, Bug, Workflow,
  Fingerprint, Sliders, FileText, UserCog,
  Activity, Cpu, Timer, ShieldCheck,
  Zap, Eye, CheckCircle2, XCircle,
  ChevronRight, Network, Lock,
  RefreshCw, Flame, Target, Globe2,
  GitBranch, Terminal, TrendingUp,
  Sparkles, Server, Radio, ArrowUpRight,
} from "lucide-react";
import { useSocPreferences } from "@/lib/soc-preferences";
import { useState, useEffect, useRef } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import {
  mockConnectors, mockIncidentTimeline, mockMitreTactics,
  mockShuffleRuns24h, mockCountryTraffic, mockMttdMttr,
  mockAlertGraphNodes, computeSocHealth,
} from "@/lib/soc-mock";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Centre de Commandement SOC — INOVA-IRIS" }] }),
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

const ALERT_TREND = [
  { h: "00h", blocked: 42, threats: 2 },
  { h: "03h", blocked: 58, threats: 4 },
  { h: "06h", blocked: 74, threats: 1 },
  { h: "09h", blocked: 112, threats: 8 },
  { h: "12h", blocked: 135, threats: 6 },
  { h: "15h", blocked: 98, threats: 3 },
  { h: "18h", blocked: 145, threats: 9 },
  { h: "21h", blocked: 82, threats: 1 },
];

/* ─── Horloge Live ─── */
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-sm font-bold text-white tabular-nums">
      {now.toLocaleTimeString("fr-FR")}
    </span>
  );
}

/* ─── Indicateur de pulse animé ─── */
function PulseDot({ color = "bg-emerald-400" }: { color?: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-70`} />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}

/* ─── Globe SVG Cyber animé (visuel central) ─── */
function CyberGlobe() {
  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {/* Cercles orbitaux */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-80 h-80 rounded-full border border-[#FF7900]/20 animate-spin" style={{ animationDuration: "30s" }} />
        <div className="absolute w-64 h-64 rounded-full border border-orange-500/15 animate-spin" style={{ animationDuration: "20s", animationDirection: "reverse" }} />
        <div className="absolute w-48 h-48 rounded-full border border-amber-400/25 animate-spin" style={{ animationDuration: "15s" }} />
      </div>

      {/* Globe central */}
      <div className="relative z-10 w-52 h-52 rounded-full bg-gradient-to-br from-slate-800 via-slate-900 to-zinc-950 border border-[#FF7900]/40 shadow-[0_0_80px_rgba(255,121,0,0.25),0_0_40px_rgba(255,121,0,0.12),inset_0_0_60px_rgba(255,121,0,0.08)] flex items-center justify-center">
        {/* Grille de latitude / longitude */}
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 208 208" fill="none">
          <circle cx="104" cy="104" r="100" stroke="#FF7900" strokeWidth="0.5" />
          <ellipse cx="104" cy="104" rx="60" ry="100" stroke="#FF7900" strokeWidth="0.5" />
          <ellipse cx="104" cy="104" rx="100" ry="30" stroke="#FF7900" strokeWidth="0.5" />
          <ellipse cx="104" cy="104" rx="100" ry="60" stroke="#FF7900" strokeWidth="0.5" />
          <line x1="4" y1="104" x2="204" y2="104" stroke="#FF7900" strokeWidth="0.5" />
          <line x1="104" y1="4" x2="104" y2="204" stroke="#FF7900" strokeWidth="0.5" />
        </svg>

        {/* Points de menace animés */}
        <div className="absolute top-8 left-12 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
        <div className="absolute top-16 right-8 w-1.5 h-1.5 rounded-full bg-[#FF7900] animate-pulse shadow-[0_0_6px_#FF7900]" style={{ animationDelay: "0.5s" }} />
        <div className="absolute bottom-14 left-8 w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-10 right-14 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-6 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#22d3ee]" style={{ animationDelay: "0.8s" }} />

        {/* Logo central */}
        <div className="relative z-10 flex flex-col items-center gap-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF7900] via-orange-600 to-amber-700 flex items-center justify-center shadow-xl">
            <ShieldCheck className="w-8 h-8 text-white stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FF7900] font-mono mt-1">IRIS XDR</span>
        </div>
      </div>

      {/* Étiquettes flottantes autour du globe */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/5 backdrop-blur-md border border-[#FF7900]/30 rounded-2xl px-3 py-1.5 text-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#FF7900] block font-mono">Score Cyber</span>
        <span className="text-xl font-black text-white font-mono">98.5%</span>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/5 backdrop-blur-md border border-emerald-500/30 rounded-2xl px-3 py-1.5">
        <PulseDot color="bg-emerald-400" />
        <span className="text-xs font-bold text-emerald-400">DEFCON 4 — Système Nominal</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD PRINCIPAL — FORMAT IMMERSIF DERNIÈRE GÉNÉRATION
══════════════════════════════════════════════════════════ */
export function Dashboard() {
  const { t } = useSocPreferences();
  const health = computeSocHealth(18, 98, mockConnectors);
  const maxMitre = Math.max(...mockMitreTactics.map((m) => m.count));
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d">("24h");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Données SOC synchronisées en temps réel.");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100 selection:bg-[#FF7900]/30 overflow-x-hidden">

      {/* ══════ TOPBAR COMMAND CENTER ══════ */}
      <div className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/90 backdrop-blur-2xl">
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-8 py-3 flex items-center justify-between gap-4">

          {/* Logo + Identité */}
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-[#FF7900] to-amber-700 flex items-center justify-center shadow-lg shadow-orange-500/25 border border-orange-400/30">
              <ShieldCheck className="h-5.5 w-5.5 text-white stroke-[2.5]" />
              <PulseDot color="bg-emerald-400" />
            </div>
            <div>
              <h1 className="text-[13px] font-black uppercase tracking-widest font-mono text-white leading-none">
                INOVA-IRIS <span className="text-[#FF7900]">SOC</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-light">Centre de Commandement Cybersécurité • Sonatel</p>
            </div>
          </div>

          {/* Métriques inline */}
          <div className="hidden lg:flex items-center gap-6 text-xs font-mono">
            <div className="text-center">
              <span className="text-slate-400 block text-[10px] uppercase">Menaces/24h</span>
              <span className="text-red-400 font-black text-base">328</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <span className="text-slate-400 block text-[10px] uppercase">MTTD</span>
              <span className="text-cyan-400 font-black text-base">4.2m</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <span className="text-slate-400 block text-[10px] uppercase">Agents EDR</span>
              <span className="text-[#FF7900] font-black text-base">142</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <span className="text-slate-400 block text-[10px] uppercase">Blocage</span>
              <span className="text-emerald-400 font-black text-base">99.8%</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            {/* Période */}
            <div className="hidden sm:flex items-center bg-white/5 border border-white/10 rounded-xl p-1 text-[11px] font-bold gap-0.5">
              {(["1h", "24h", "7d"] as const).map((r) => (
                <button key={r} onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${timeRange === r ? "bg-[#FF7900] text-white shadow" : "text-slate-400 hover:text-white"}`}>
                  {r}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <PulseDot color="bg-emerald-400" />
              <LiveClock />
              <span className="text-[10px] text-slate-400 font-mono">GMT</span>
            </div>

            <button onClick={handleRefresh}
              className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-slate-300 hover:text-[#FF7900] hover:border-[#FF7900]/40 transition-all cursor-pointer">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-[#FF7900]" : ""}`} />
            </button>

            <Link to="/audit"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#FF7900] to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 hover:opacity-90 transition-all">
              <FileText className="h-3.5 w-3.5" />
              Rapport
            </Link>
          </div>
        </div>
      </div>

      {/* ══════ SECTION HÉRO : FORMAT IMMERSIF CENTRAL ══════ */}
      <div className="relative max-w-screen-2xl mx-auto px-5 sm:px-8 pt-6 pb-8">

        {/* Titre de section */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FF7900] font-mono mb-1">
              Surveillance Opérationnelle • Sonatel Group
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Vue d'Ensemble SOC —{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF7900] to-amber-400">
                {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </span>
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Link to="/alertes"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all">
              <AlertTriangle className="h-3.5 w-3.5" /> Alertes Live
            </Link>
            <Link to="/assistant"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-bold hover:bg-violet-500/20 transition-all">
              <Sparkles className="h-3.5 w-3.5" /> Djib'son IA
            </Link>
          </div>
        </div>

        {/* ══ LAYOUT PRINCIPAL : GAUCHE + CENTRE GLOBE + DROITE ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-5">

          {/* ─── COLONNE GAUCHE : Cartes métriques flottantes ─── */}
          <div className="flex flex-col gap-4">

            {/* Carte : Surveillance Wazuh */}
            <div className="rounded-3xl bg-zinc-900/80 border border-white/8 backdrop-blur-xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Surveillance SIEM</p>
                  <p className="text-base font-black text-white">Wazuh · Suricata</p>
                </div>
                <div className="flex gap-1.5">
                  {(["1h", "24h", "7j", "30j"] as const).slice(0, 2).map((r) => (
                    <button key={r}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${r === "24h" ? "bg-[#FF7900] text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Métriques alertes */}
              <div className="mb-3">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-black text-white font-mono">328</span>
                  <span className="text-emerald-400 text-sm font-bold">+14.2%</span>
                </div>
                <p className="text-xs text-slate-400">Menaces neutralisées aujourd'hui</p>
              </div>

              {/* Barre colorée de sévérité */}
              <div className="flex h-2.5 w-full rounded-full overflow-hidden gap-0.5 mb-2">
                <div className="bg-red-500 rounded-l-full" style={{ width: "8%" }} title="Critiques" />
                <div className="bg-[#FF7900]" style={{ width: "22%" }} title="Hautes" />
                <div className="bg-amber-400" style={{ width: "35%" }} title="Moyennes" />
                <div className="bg-emerald-500 rounded-r-full" style={{ width: "35%" }} title="Faibles" />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-medium mb-4">
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />Crit. 8%</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#FF7900] inline-block" />High 22%</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />Bloqué 35%</span>
              </div>

              {/* Mini graphique */}
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ALERT_TREND} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gBlocked" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF7900" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#FF7900" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="h" fontSize={8} stroke="#475569" tickLine={false} />
                    <Tooltip contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 10, fontSize: 10 }} />
                    <Area type="monotone" dataKey="blocked" stroke="#FF7900" strokeWidth={2} fill="url(#gBlocked)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Carte : Agents EDR */}
            <div className="rounded-3xl bg-zinc-900/80 border border-white/8 backdrop-blur-xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <Cpu className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Agents EDR</p>
                    <p className="text-sm font-black text-white">Hôtes Actifs</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">100%</span>
              </div>

              <div className="text-3xl font-black text-cyan-400 font-mono mb-1">142</div>
              <p className="text-xs text-slate-400 mb-3">sur 142 enrôlés · +4 déployés ce matin</p>

              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full w-full shadow-[0_0_10px_#06b6d4]" />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  { label: "Servers", value: "48", color: "text-violet-400" },
                  { label: "Laptops", value: "74", color: "text-cyan-400" },
                  { label: "IoT/OT", value: "20", color: "text-amber-400" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/3 rounded-xl p-2 border border-white/5">
                    <span className={`font-black text-base ${s.color}`}>{s.value}</span>
                    <p className="text-[9px] text-slate-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Carte : Score SOC */}
            <div className="rounded-3xl bg-gradient-to-br from-[#FF7900]/10 via-amber-900/5 to-zinc-900 border border-[#FF7900]/25 backdrop-blur-xl p-5 shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#FF7900] mb-1">Indice de Résilience</p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl font-black text-white font-mono">98.5<span className="text-xl text-[#FF7900]">%</span></span>
                <TrendingUp className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="space-y-2">
                {[
                  { label: "Couverture EDR", pct: 100, color: "from-[#FF7900] to-amber-400" },
                  { label: "MITRE ATT&CK", pct: 94, color: "from-violet-500 to-blue-500" },
                  { label: "Threat Intel", pct: 100, color: "from-emerald-500 to-cyan-400" },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-300 font-medium">{m.label}</span>
                      <span className="text-white font-bold">{m.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${m.color} rounded-full`} style={{ width: `${m.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── COLONNE CENTRALE : Visualisation Globe + Métriques Hero ─── */}
          <div className="flex flex-col gap-5">

            {/* Zone Globe Cyber */}
            <div className="relative rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/8 overflow-hidden shadow-2xl" style={{ minHeight: 420 }}>
              {/* Fond glow ambiant */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(255,121,0,0.12),transparent)] pointer-events-none" />

              {/* Globe interactif */}
              <div className="absolute inset-0 flex items-center justify-center">
                <CyberGlobe />
              </div>

              {/* Étiquettes contextuelles flottantes */}
              <div className="absolute top-5 left-5">
                <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl px-3.5 py-2.5 shadow-xl">
                  <p className="text-[9px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1.5">
                    <Radio className="h-3 w-3 text-[#FF7900]" /> Flux Threat Intel Live
                  </p>
                  <p className="text-sm font-black text-white font-mono">MISP <span className="text-[#FF7900]">4 820</span> IOCs</p>
                  <p className="text-[10px] text-emerald-400 font-medium">↑ +185 flux CTI Sonatel</p>
                </div>
              </div>

              <div className="absolute top-5 right-5">
                <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl px-3.5 py-2.5 shadow-xl">
                  <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">⚡ SOAR Automatisé</p>
                  <p className="text-sm font-black text-white font-mono">Shuffle <span className="text-cyan-400">14</span> Runs</p>
                  <p className="text-[10px] text-emerald-400 font-medium">100% exécution réussie</p>
                </div>
              </div>

              <div className="absolute bottom-5 left-5">
                <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl px-3.5 py-2.5 shadow-xl">
                  <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">🛡 Incidents IRIS</p>
                  <p className="text-sm font-black text-white font-mono">TheHive <span className="text-amber-400">3</span> Actifs</p>
                  <p className="text-[10px] text-amber-400 font-medium">Investigation en cours</p>
                </div>
              </div>

              <div className="absolute bottom-5 right-5">
                <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl px-3.5 py-2.5 shadow-xl">
                  <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">🌍 Trafic Suspect</p>
                  <p className="text-sm font-black text-white font-mono">Top: <span className="text-red-400">CN/RU/NG</span></p>
                  <p className="text-[10px] text-slate-400 font-medium">7 jours · 12 origines</p>
                </div>
              </div>
            </div>

            {/* ─── KPIs en grille 3 colonnes sous le globe ─── */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "MTTD Détection", value: "4.2m", sub: "Obj. < 10m ✓", color: "text-cyan-400", border: "border-cyan-500/20", bg: "bg-cyan-500/5", icon: Timer },
                { label: "MTTR Réponse", value: "18m", sub: "Obj. < 4h ✓", color: "text-violet-400", border: "border-violet-500/20", bg: "bg-violet-500/5", icon: Zap },
                { label: "IOC Bloqués", value: "4 820", sub: "+185 aujourd'hui", color: "text-[#FF7900]", border: "border-orange-500/20", bg: "bg-orange-500/5", icon: Database },
              ].map((k) => {
                const Icon = k.icon;
                return (
                  <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} p-4 shadow-lg text-center backdrop-blur-xl`}>
                    <Icon className={`h-5 w-5 mx-auto mb-2 ${k.color}`} />
                    <div className={`text-2xl font-black font-mono ${k.color}`}>{k.value}</div>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase leading-tight">{k.label}</p>
                    <p className="text-[10px] text-emerald-400 font-medium mt-1">{k.sub}</p>
                  </div>
                );
              })}
            </div>

            {/* ─── Terminal Cyber Live ─── */}
            <div className="rounded-3xl bg-zinc-950 border border-white/8 p-5 shadow-xl font-mono">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">Console SOC — Wazuh Live</span>
                </div>
                <PulseDot color="bg-emerald-400" />
              </div>
              <div className="space-y-2.5 text-[11px] max-h-40 overflow-y-auto pr-1">
                {[
                  { t: "02:42:18", msg: "SSH brute-force intercepté · IP 196.253.24.12 · bloqué via SOAR", c: "text-red-400" },
                  { t: "02:41:02", msg: "Playbook Quarantaine exécuté · Hôte SRV-PROD-02 · succès", c: "text-[#FF7900]" },
                  { t: "02:39:55", msg: "MISP Sync · 42 IOCs SHA256 importés · feed Sonatel CTI", c: "text-cyan-400" },
                  { t: "02:35:11", msg: "Suricata NIDS · scan furtif détecté · ASN 37105 · RU", c: "text-amber-400" },
                  { t: "02:30:44", msg: "Wazuh agent check-in · 142/142 actifs · latence moy. 14ms", c: "text-emerald-400" },
                ].map((log, i) => (
                  <div key={i} className="flex gap-2.5 items-start p-2 rounded-xl bg-white/3 border border-white/5">
                    <span className="text-slate-500 shrink-0">{log.t}</span>
                    <span className={`${log.c} leading-relaxed`}>{log.msg}</span>
                  </div>
                ))}
              </div>
              <Link to="/alertes" className="mt-3 flex items-center justify-center gap-2 py-2 rounded-xl bg-white/3 border border-white/8 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/8 transition-all">
                <Eye className="h-3.5 w-3.5" /> Ouvrir la console SIEM complète →
              </Link>
            </div>
          </div>

          {/* ─── COLONNE DROITE : Cartes contextuelles ─── */}
          <div className="flex flex-col gap-4">

            {/* Carte : Stack SOC Connecteurs */}
            <div className="rounded-3xl bg-zinc-900/80 border border-white/8 backdrop-blur-xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                    <Network className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Stack SOC</p>
                    <p className="text-sm font-black text-white">Connecteurs & API</p>
                  </div>
                </div>
                <Link to="/integrations" className="text-[10px] text-[#FF7900] hover:underline font-bold flex items-center gap-0.5">
                  Gérer <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2.5">
                {mockConnectors.map((conn) => (
                  <div key={conn.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-800/50 border border-white/5">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 shadow-sm ${conn.status === "up" ? "bg-emerald-400 shadow-emerald-500/50" : conn.status === "degraded" ? "bg-amber-400 shadow-amber-500/50 animate-pulse" : "bg-red-500 shadow-red-500/50"}`} />
                      <span className="text-xs font-semibold text-slate-200">{conn.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400">{conn.latencyMs}ms</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${conn.status === "up" ? "bg-emerald-500/10 text-emerald-400" : conn.status === "degraded" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>
                        {conn.status === "up" ? "UP" : conn.status === "degraded" ? "DEG" : "DOWN"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Carte : Incidents Récents */}
            <div className="rounded-3xl bg-zinc-900/80 border border-white/8 backdrop-blur-xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                    <Flame className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">TheHive · IRIS</p>
                    <p className="text-sm font-black text-white">Incidents Actifs</p>
                  </div>
                </div>
                <Link to="/alertes" className="text-[10px] text-[#FF7900] hover:underline font-bold flex items-center gap-0.5">
                  Tous <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {mockIncidentTimeline.slice(0, 4).map((inc) => {
                  const sevColor = inc.severity === "critical" ? "text-red-400 bg-red-500/10 border-red-500/30"
                    : inc.severity === "high" ? "text-[#FF7900] bg-orange-500/10 border-orange-500/30"
                    : inc.severity === "medium" ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                    : "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
                  return (
                    <div key={inc.id} className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-zinc-800/50 border border-white/5">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg border shrink-0 uppercase ${sevColor}`}>
                        {inc.severity.slice(0, 4)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-200 truncate">{inc.title}</p>
                        <p className="text-[9px] text-slate-400 font-mono">{inc.caseRef}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Carte : Copilote IA Djib'son */}
            <div className="rounded-3xl bg-gradient-to-br from-violet-950/40 via-zinc-900 to-zinc-950 border border-violet-500/25 backdrop-blur-xl p-5 shadow-xl">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">Djib'son IA</p>
                  <p className="text-[10px] text-violet-300">Copilote SOC · Analyse prédictive</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-light mb-3 italic">
                "Aucune brèche active détectée. Recommandation : rotation des tokens API SOAR prévue dans 48h."
              </p>
              <div className="space-y-1.5">
                {[
                  { label: "3 anomalies comportementales", color: "text-amber-400" },
                  { label: "2 recommandations playbooks", color: "text-blue-400" },
                  { label: "18 IOC enrichis par IA", color: "text-violet-400" },
                ].map((r) => (
                  <div key={r.label} className="flex items-center gap-2 text-xs">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${r.color.replace("text-", "bg-")}`} />
                    <span className={`${r.color} font-medium`}>{r.label}</span>
                  </div>
                ))}
              </div>
              <Link to="/assistant"
                className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-violet-500/20 hover:opacity-90 transition-all">
                <GitBranch className="h-3.5 w-3.5" /> Interroger Djib'son IA
              </Link>
            </div>
          </div>

        </div>

        {/* ══════ SECTION INFÉRIEURE : MITRE ATT&CK + ACCÈS RAPIDE ══════ */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* MITRE ATT&CK */}
          <div className="lg:col-span-3 rounded-3xl bg-zinc-900/80 border border-white/8 backdrop-blur-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                  <Target className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">Matrice MITRE ATT&CK</p>
                  <p className="text-[10px] text-slate-400">Tactiques adverses observées · v14.1</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-white/5 border border-white/8 px-2.5 py-1 rounded-lg font-mono">Enterprise</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {mockMitreTactics.slice(0, 8).map((tactic) => {
                const pct = Math.min(100, Math.round((tactic.count / maxMitre) * 100));
                const isCrit = pct > 60;
                return (
                  <div key={tactic.tacticId} className="p-3 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[9px] text-[#FF7900] font-bold shrink-0">{tactic.tacticId}</span>
                        <span className="font-semibold text-slate-200 truncate">{tactic.tactic}</span>
                      </div>
                      <span className={`font-black shrink-0 ml-2 ${isCrit ? "text-red-400" : "text-slate-300"}`}>{tactic.count}</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isCrit ? "bg-gradient-to-r from-[#FF7900] to-red-500" : "bg-gradient-to-r from-violet-500 to-blue-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Accès Rapide aux modules */}
          <div className="lg:col-span-2 rounded-3xl bg-zinc-900/80 border border-white/8 backdrop-blur-xl p-6 shadow-xl">
            <div className="mb-5 pb-4 border-b border-white/5">
              <p className="text-sm font-black text-white">Console Opérationnelle</p>
              <p className="text-[10px] text-slate-400">Accès direct aux sous-systèmes</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Alertes Live", to: "/alertes", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/8", border: "border-red-500/20" },
                { label: "Base IOC", to: "/iocs", icon: Database, color: "text-violet-400", bg: "bg-violet-500/8", border: "border-violet-500/20" },
                { label: "Threat Map", to: "/threat-map", icon: Globe2, color: "text-[#FF7900]", bg: "bg-orange-500/8", border: "border-orange-500/20" },
                { label: "DFIR-IRIS", to: "/iris", icon: Fingerprint, color: "text-rose-400", bg: "bg-rose-500/8", border: "border-rose-500/20" },
                { label: "Playbooks", to: "/workflow", icon: Workflow, color: "text-cyan-400", bg: "bg-cyan-500/8", border: "border-cyan-500/20" },
                { label: "Clients", to: "/clients", icon: UserCog, color: "text-indigo-400", bg: "bg-indigo-500/8", border: "border-indigo-500/20" },
                { label: "Audit", to: "/audit", icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/8", border: "border-emerald-500/20" },
                { label: "Paramètres", to: "/settings", icon: Sliders, color: "text-slate-300", bg: "bg-white/3", border: "border-white/8" },
              ].map((mod) => {
                const Icon = mod.icon;
                return (
                  <Link key={mod.label} to={mod.to}
                    className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border ${mod.border} ${mod.bg} hover:scale-[1.04] transition-all group cursor-pointer text-center`}>
                    <div className="h-9 w-9 rounded-xl bg-zinc-950/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className={`h-4.5 w-4.5 ${mod.color}`} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors">{mod.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

        </div>

        {/* ══════ FOOTER ══════ */}
        <div className="mt-8 pt-5 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-slate-500">
          <span>INOVA-IRIS SOC Platform · Direction Cybersécurité Sonatel · {new Date().getFullYear()}</span>
          <div className="flex items-center gap-1.5">
            <PulseDot color="bg-emerald-400" />
            <span className="text-emerald-400 font-bold">Tous systèmes opérationnels · DEFCON 4</span>
          </div>
          <span>v3.0.0 · {new Date().toISOString().slice(0, 10)} · ISO 27001 Conforme</span>
        </div>

      </div>
    </div>
  );
}