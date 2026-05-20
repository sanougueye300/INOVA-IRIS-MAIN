import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle, Database, Shield, Bug, Workflow,
  ServerCog, Brain, Globe2, Fingerprint, Sliders,
  Plug, FileText, UserCog, ScanSearch,
  ArrowUpRight, Activity, Cpu, ExternalLink, Maximize2
} from "lucide-react";
import { useSocPreferences } from "@/lib/soc-preferences";
import { useState } from "react";
import { SocCyberGlobe } from "@/components/soc/SocCyberGlobe";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de Bord — INOVA-IRIS" }] }),
  component: Dashboard,
});

const STATS = [
  { label: "Agents actifs", value: "142", delta: "+3 ce jour", icon: Cpu, from: "from-blue-500", to: "to-cyan-500", glow: "shadow-blue-500/25", text: "text-blue-500", border: "border-blue-500/20", bg: "bg-blue-500/5 dark:bg-blue-500/10" },
  { label: "Alertes critiques", value: "0", delta: "Système stable", icon: AlertTriangle, from: "from-emerald-500", to: "to-teal-400", glow: "shadow-emerald-500/25", text: "text-emerald-500", border: "border-emerald-500/20", bg: "bg-emerald-500/5 dark:bg-emerald-500/10" },
  { label: "IOC indexés", value: "2 450", delta: "+42 synchronisés", icon: Database, from: "from-violet-500", to: "to-purple-400", glow: "shadow-violet-500/25", text: "text-violet-500", border: "border-violet-500/20", bg: "bg-violet-500/5 dark:bg-violet-500/10" },
  { label: "Playbooks SOAR", value: "14", delta: "100% opérationnels", icon: Activity, from: "from-amber-500", to: "to-orange-400", glow: "shadow-amber-500/25", text: "text-amber-500", border: "border-amber-500/20", bg: "bg-amber-500/5 dark:bg-amber-500/10" },
];

const MODULES = [
  {
    section: "Surveillance & Threat Intelligence",
    bar: "from-blue-500 to-cyan-400",
    items: [
      { name: "Alertes & SIEM", desc: "Flux live des alertes SOC", icon: AlertTriangle, color: "text-blue-500", bg: "bg-blue-500/10", ring: "ring-blue-500/30", to: "/alertes", status: "En ligne", dot: "bg-emerald-500" },
      { name: "Base d'IOCs", desc: "Indicateurs de compromission", icon: Database, color: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30", to: "/iocs", status: "Synchrone", dot: "bg-emerald-500" },
      { name: "Threat Map", desc: "Cartographie mondiale live", icon: Globe2, color: "text-violet-500", bg: "bg-violet-500/10", ring: "ring-violet-500/30", to: "/threat-map", status: "Live", dot: "bg-red-500" },
      { name: "Assistant IA", desc: "Copilote de cyberdéfense IA", icon: Brain, color: "text-amber-500", bg: "bg-amber-500/10", ring: "ring-amber-500/30", to: "/assistant", status: "Disponible", dot: "bg-emerald-500" },
    ]
  },
  {
    section: "Stack Technique SOC",
    bar: "from-purple-500 to-violet-400",
    items: [
      { name: "Wazuh SIEM/EDR", desc: "Sécurité des hôtes & logs", icon: Shield, color: "text-blue-500", bg: "bg-blue-500/10", ring: "ring-blue-500/30", to: "/outils", status: "Opérationnel", dot: "bg-emerald-500" },
      { name: "TheHive", desc: "Gestion collaborative", icon: Bug, color: "text-purple-500", bg: "bg-purple-500/10", ring: "ring-purple-500/30", to: "/outils", status: "Opérationnel", dot: "bg-emerald-500" },
      { name: "MISP", desc: "Partage de menaces & IOC", icon: ServerCog, color: "text-red-500", bg: "bg-red-500/10", ring: "ring-red-500/30", to: "/outils", status: "Opérationnel", dot: "bg-emerald-500" },
      { name: "VirusTotal", desc: "Analyse multi-moteurs", icon: ScanSearch, color: "text-cyan-500", bg: "bg-cyan-500/10", ring: "ring-cyan-500/30", to: "/outils", status: "Quota 82%", dot: "bg-amber-500" },
      { name: "Shuffle SOAR", desc: "Orchestration & playbooks", icon: Workflow, color: "text-amber-500", bg: "bg-amber-500/10", ring: "ring-amber-500/30", to: "/outils", status: "Opérationnel", dot: "bg-emerald-500" },
      { name: "DFIR-IRIS", desc: "Forensique & preuves", icon: Fingerprint, color: "text-rose-500", bg: "bg-rose-500/10", ring: "ring-rose-500/30", to: "/iris", status: "Opérationnel", dot: "bg-emerald-500" },
    ]
  },
  {
    section: "Administration & Gouvernance",
    bar: "from-indigo-500 to-blue-400",
    items: [
      { name: "Utilisateurs & Rôles", desc: "Comptes et accès RBAC", icon: UserCog, color: "text-indigo-500", bg: "bg-indigo-500/10", ring: "ring-indigo-500/30", to: "/admin", status: "Sécurisé", dot: "bg-emerald-500" },
      { name: "Paramètres", desc: "Préférences plateforme", icon: Sliders, color: "text-zinc-500", bg: "bg-zinc-500/10", ring: "ring-zinc-500/30", to: "/settings", status: "Actif", dot: "bg-emerald-500" },
      { name: "Connecteurs & API", desc: "Tokens et endpoints SOC", icon: Plug, color: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30", to: "/integrations", status: "Actif", dot: "bg-emerald-500" },
      { name: "Journaux d'Audit", desc: "Traçabilité des analystes", icon: FileText, color: "text-red-500", bg: "bg-red-500/10", ring: "ring-red-500/30", to: "/audit", status: "Journalisation", dot: "bg-blue-500" },
    ]
  }
];

export function Dashboard() {
  const { t } = useSocPreferences();
  const [mapExpanded, setMapExpanded] = useState(false);

  return (
    <div className="min-h-full bg-background text-foreground">

      {/* ══════════════════════════════════════════
          HERO — Ambient glow header
      ══════════════════════════════════════════ */}
      <div className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-card/80 to-background">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-primary/6 blur-[120px]" />
        <div className="pointer-events-none absolute -right-20 top-0 h-[300px] w-[300px] rounded-full bg-violet-500/6 blur-[90px]" />

        <div className="relative mx-auto max-w-7xl px-6 py-10 md:px-10">
          {/* Badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Centre de Commandement · INOVA-IRIS
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight leading-none text-foreground">
                Vue d'Ensemble SOC
              </h1>
              <p className="mt-2 text-sm text-muted-foreground/80">
                Supervision opérationnelle temps réel · Sonatel Group
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-2 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 self-start sm:self-auto">
              <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75 absolute" />
              <span className="h-2 w-2 rounded-full bg-emerald-500 relative" />
              Tous systèmes opérationnels
            </div>
          </div>

          {/* KPI Cards */}
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={`group relative overflow-hidden rounded-2xl border ${s.border} ${s.bg} p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${s.glow}`}>
                  <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${s.from} ${s.to} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`} />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{s.label}</p>
                      <p className={`mt-2 text-3xl font-black tabular-nums ${s.text}`}>{s.value}</p>
                      <p className="mt-1.5 text-[10px] font-semibold text-muted-foreground/70">{s.delta}</p>
                    </div>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.from} ${s.to} text-white shadow-md`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>


      {/* ══════════════════════════════════════════
          CUSTOM SOC CYBER GLOBE
      ══════════════════════════════════════════ */}
      <div className="mx-auto max-w-7xl px-6 pt-10 md:px-10">
        <SocCyberGlobe />
      </div>




      {/* ══════════════════════════════════════════
          MODULES GRID SECTIONS
      ══════════════════════════════════════════ */}
      <div className="mx-auto max-w-7xl space-y-12 px-6 py-12 md:px-10">
        {MODULES.map((section) => (
          <div key={section.section}>
            {/* Section Header */}
            <div className="mb-5 flex items-center gap-3">
              <div className={`h-5 w-1 rounded-full bg-gradient-to-b ${section.bar} opacity-90`} />
              <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{section.section}</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-border/70 to-transparent" />
            </div>

            {/* Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {section.items.map((mod) => {
                const Icon = mod.icon;
                return (
                  <Link
                    key={mod.name}
                    to={mod.to}
                    className={`group relative flex flex-col gap-3.5 overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-border hover:bg-card hover:shadow-xl hover:ring-1 ${mod.ring}`}
                  >
                    {/* Top shimmer line on hover */}
                    <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${section.bar} opacity-0 transition-opacity duration-300 group-hover:opacity-60`} />

                    {/* Icon + Status */}
                    <div className="flex items-center justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${mod.bg} ${mod.color} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-[9px] font-mono font-bold text-muted-foreground border border-border/60">
                        <span className={`h-1.5 w-1.5 rounded-full ${mod.dot}`} />
                        {mod.status}
                      </span>
                    </div>

                    {/* Text */}
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-foreground transition-colors duration-200 group-hover:text-primary">
                          {mod.name}
                        </h3>
                        <ArrowUpRight className="h-3.5 w-3.5 translate-x-1 -translate-y-1 text-primary opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{mod.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Platform Footer */}
        <div className="border-t border-border/30 pt-6 text-center text-[10px] font-mono text-muted-foreground/40 tracking-widest uppercase">
          INOVA-IRIS SOC Platform · Sonatel Group · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}