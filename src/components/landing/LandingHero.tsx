import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Shield, Activity, Zap, ArrowRight, Brain, Globe2,
  Radio, Lock, Eye, Cpu, Server, Wifi
} from "lucide-react";

const THREAT_LEVELS = [
  { id: "stable", label: "Stable", color: "#10b981", glow: "rgba(16,185,129,0.15)" },
  { id: "warning", label: "Alerte", color: "#f59e0b", glow: "rgba(245,158,11,0.15)" },
  { id: "critical", label: "Critique", color: "#ef4444", glow: "rgba(239,68,68,0.2)" },
  { id: "outbreak", label: "Attaque Massive", color: "#ec4899", glow: "rgba(236,72,153,0.2)" },
];

const PROTOCOLS = [
  { id: "wazuh", label: "Wazuh EDR", icon: Shield, score: 25 },
  { id: "shuffle", label: "Shuffle SOAR", icon: Zap, score: 25 },
  { id: "misp", label: "MISP Intel", icon: Globe2, score: 25 },
  { id: "dfir", label: "DFIR Forensics", icon: Eye, score: 25 },
];

const STATS = [
  { label: "Agents actifs", value: 142, suffix: "", icon: Cpu },
  { label: "Menaces bloquées", value: 12847, suffix: "", icon: Shield },
  { label: "Temps réponse", value: 4.2, suffix: "s", icon: Activity },
  { label: "Uptime SOC", value: 99.97, suffix: "%", icon: Server },
];

const AI_MESSAGES: Record<string, string> = {
  stable: "✅ Tous les systèmes sont nominaux. Surveillance continue activée sur 142 endpoints. Aucune anomalie détectée.",
  warning: "⚠️ Alerte niveau 2 : Tentatives de scan réseau détectées depuis 3 sources. Playbook Shuffle #220 activé automatiquement.",
  critical: "🔴 ALERTE CRITIQUE : Vague APT détectée ciblant le périmètre Sonatel. MISP enrichissement en cours. TheHive case #1042 ouvert.",
  outbreak: "🚨 ATTAQUE MASSIVE EN COURS : Campagne DDoS + Ransomware coordonnée. Tous les playbooks activés. Isolation réseau recommandée.",
};

function AnimatedCounter({ target, suffix, duration = 2000 }: { target: number; suffix: string; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Number(start.toFixed(target % 1 === 0 ? 0 : 2)));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{target % 1 === 0 ? Math.floor(val).toLocaleString() : val.toFixed(2)}{suffix}</>;
}

export function LandingHero() {
  const [threatLevel, setThreatLevel] = useState("stable");
  const [activeProtocols, setActiveProtocols] = useState<Record<string, boolean>>({
    wazuh: true, shuffle: true, misp: true, dfir: true,
  });
  const [aiTyping, setAiTyping] = useState(false);
  const [aiText, setAiText] = useState(AI_MESSAGES.stable);

  const currentThreat = THREAT_LEVELS.find((t) => t.id === threatLevel)!;
  const defenseScore = PROTOCOLS.reduce((sum, p) => sum + (activeProtocols[p.id] ? p.score : 0), 0);

  useEffect(() => {
    setAiTyping(true);
    const msg = AI_MESSAGES[threatLevel];
    setAiText("");
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setAiText(msg.slice(0, i));
      if (i >= msg.length) { clearInterval(timer); setAiTyping(false); }
    }, 18);
    return () => clearInterval(timer);
  }, [threatLevel]);

  const toggleProtocol = (id: string) => {
    setActiveProtocols((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="relative min-h-screen landing-dark overflow-hidden">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full animate-float-slow"
          style={{ background: `radial-gradient(circle, ${currentThreat.glow}, transparent 70%)` }} />
        <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full animate-float-delay"
          style={{ background: `radial-gradient(circle, rgba(249,115,22,0.08), transparent 70%)` }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full animate-pulse-glow"
          style={{ background: `radial-gradient(circle, ${currentThreat.glow.replace("0.15", "0.06")}, transparent 60%)` }} />
        {/* Grid overlay */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(249,115,22,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.03) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 md:px-10">
        {/* Top Badge */}
        <div className="animate-fade-up flex justify-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/5 px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest text-orange-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-orange-500" />
            </span>
            Centre de Commandement SOC · INOVA-IRIS
          </div>
        </div>

        {/* Title */}
        <div className="animate-fade-up-1 text-center max-w-4xl mx-auto mb-8">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
            <span className="text-white">Plateforme de </span>
            <span className="text-gradient-cyber">Cyberdéfense</span>
            <br />
            <span className="text-white">Nouvelle Génération</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Architecture SOC intégrée combinant <span className="text-orange-400 font-semibold">Wazuh</span>,{" "}
            <span className="text-orange-400 font-semibold">Shuffle</span>,{" "}
            <span className="text-orange-400 font-semibold">TheHive</span>,{" "}
            <span className="text-orange-400 font-semibold">MISP</span> et{" "}
            <span className="text-orange-400 font-semibold">VirusTotal</span> pour une réponse automatisée aux incidents.
          </p>
        </div>

        {/* CTA */}
        <div className="animate-fade-up-2 flex flex-wrap justify-center gap-4 mb-16">
          <Link to="/auth/login"
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5">
            Accéder au SOC <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link to="/architecture"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-bold text-zinc-300 backdrop-blur transition-all hover:bg-white/10 hover:border-white/20">
            Voir l'architecture
          </Link>
        </div>

        {/* Stats Row */}
        <div className="animate-fade-up-3 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="glass-card rounded-2xl p-5 text-center transition-all hover:-translate-y-1 hover:border-orange-500/20">
                <Icon className="h-5 w-5 mx-auto mb-2 text-orange-400" />
                <div className="text-2xl md:text-3xl font-black text-white tabular-nums">
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mt-1">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* ═══ Interactive Control Center ═══ */}
        <div className="animate-fade-up-4 grid lg:grid-cols-5 gap-6">
          {/* LEFT: Controls */}
          <div className="lg:col-span-2 space-y-5">
            {/* Threat Level Selector */}
            <div className="glass-card rounded-2xl p-5 scan-line relative overflow-hidden">
              <div className="relative">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                  <Radio className="h-3.5 w-3.5 text-orange-400" /> Niveau de Menace
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {THREAT_LEVELS.map((t) => (
                    <button key={t.id} onClick={() => setThreatLevel(t.id)}
                      className={`rounded-xl px-3 py-2.5 text-xs font-bold transition-all border ${
                        threatLevel === t.id
                          ? "border-current shadow-lg scale-[1.02]"
                          : "border-white/5 bg-white/[0.02] text-zinc-500 hover:bg-white/5"
                      }`}
                      style={threatLevel === t.id ? { color: t.color, backgroundColor: t.glow, borderColor: t.color + "40", boxShadow: `0 0 20px ${t.glow}` } : {}}>
                      <span className="inline-block h-1.5 w-1.5 rounded-full mr-1.5" style={{ background: t.color }} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Protocol Toggles */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-orange-400" /> Protocoles Actifs
              </h3>
              <div className="space-y-2.5">
                {PROTOCOLS.map((p) => {
                  const Icon = p.icon;
                  const active = activeProtocols[p.id];
                  return (
                    <button key={p.id} onClick={() => toggleProtocol(p.id)}
                      className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all border ${
                        active ? "border-orange-500/20 bg-orange-500/5" : "border-white/5 bg-white/[0.02]"
                      }`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        active ? "bg-orange-500/15 text-orange-400" : "bg-white/5 text-zinc-600"
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={`text-xs font-bold ${active ? "text-zinc-200" : "text-zinc-600"}`}>{p.label}</span>
                      <div className={`ml-auto h-5 w-9 rounded-full transition-colors relative ${
                        active ? "bg-orange-500" : "bg-zinc-700"
                      }`}>
                        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                          active ? "left-[18px]" : "left-0.5"
                        }`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Defense Score */}
            <div className="glass-card rounded-2xl p-5 text-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Cyber Defense Score</h3>
              <div className="relative mx-auto h-28 w-28">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none"
                    stroke={defenseScore >= 75 ? "#10b981" : defenseScore >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(defenseScore / 100) * 264} 264`}
                    className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white">{defenseScore}</span>
                  <span className="text-[9px] font-mono text-zinc-500">/ 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: AI Copilot + Status */}
          <div className="lg:col-span-3 space-y-5">
            {/* AI Copilot */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Copilote IA · INOVA-IRIS</h3>
                  <p className="text-[10px] font-mono text-zinc-500">Analyse en temps réel · Modèle LLM SOC v3.2</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[9px] font-mono text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> En ligne
                </div>
              </div>
              <div className="rounded-xl bg-black/40 border border-white/5 p-4 min-h-[80px]">
                <p className="text-sm text-zinc-300 leading-relaxed font-mono">
                  {aiText}
                  {aiTyping && <span className="inline-block h-4 w-0.5 bg-orange-400 animate-pulse ml-0.5" />}
                </p>
              </div>
            </div>

            {/* Pipeline Workflow */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-5 flex items-center gap-2">
                <Wifi className="h-3.5 w-3.5 text-orange-400" /> Pipeline de Réponse aux Incidents
              </h3>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {[
                  { step: "Détection", icon: Eye, c: "from-blue-500 to-cyan-500" },
                  { step: "Enrichissement", icon: Globe2, c: "from-violet-500 to-purple-500" },
                  { step: "Analyse IA", icon: Brain, c: "from-orange-500 to-amber-500" },
                  { step: "Blocage", icon: Shield, c: "from-emerald-500 to-teal-500" },
                  { step: "Case Mgmt", icon: Activity, c: "from-rose-500 to-pink-500" },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.step} className="flex items-center gap-1 shrink-0">
                      <div className="group flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition-all hover:bg-white/5 hover:border-white/10 hover:-translate-y-1 cursor-pointer">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${s.c} text-white shadow-md`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] font-bold text-zinc-400 group-hover:text-zinc-200">{s.step}</span>
                      </div>
                      {i < 4 && (
                        <div className="flex items-center px-1">
                          <div className="h-px w-4 bg-gradient-to-r from-white/20 to-white/5" />
                          <ArrowRight className="h-3 w-3 text-zinc-700" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* System Status */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">
                Status des Modules
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: "Wazuh SIEM", status: "Opérationnel", dot: "bg-emerald-400" },
                  { name: "Shuffle SOAR", status: "14 playbooks", dot: "bg-emerald-400" },
                  { name: "TheHive", status: "Opérationnel", dot: "bg-emerald-400" },
                  { name: "MISP", status: "2450 IOCs", dot: "bg-emerald-400" },
                  { name: "VirusTotal", status: "Quota 82%", dot: "bg-amber-400" },
                  { name: "DFIR-IRIS", status: "Opérationnel", dot: "bg-emerald-400" },
                ].map((m) => (
                  <div key={m.name} className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${m.dot} shrink-0`} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-zinc-300 truncate">{m.name}</p>
                      <p className="text-[9px] font-mono text-zinc-600">{m.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
