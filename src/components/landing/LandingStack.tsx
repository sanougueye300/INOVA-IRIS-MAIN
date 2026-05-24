import { Link } from "@tanstack/react-router";
import {
  Shield, Activity, Workflow, Database, Search,
  ArrowRight, CheckCircle2, Fingerprint
} from "lucide-react";

const TOOLS = [
  { name: "Wazuh", role: "SIEM / XDR", icon: Shield, desc: "Détection des menaces, surveillance d'intégrité et collecte de logs en temps réel.", gradient: "from-blue-500 to-cyan-500", glow: "shadow-blue-500/20" },
  { name: "Shuffle", role: "SOAR", icon: Workflow, desc: "Orchestration et automatisation des playbooks de réponse aux incidents.", gradient: "from-amber-500 to-orange-500", glow: "shadow-amber-500/20" },
  { name: "TheHive", role: "Case Management", icon: Activity, desc: "Gestion collaborative des incidents et investigations forensiques.", gradient: "from-purple-500 to-violet-500", glow: "shadow-purple-500/20" },
  { name: "MISP", role: "Threat Intelligence", icon: Database, desc: "Partage et corrélation d'indicateurs de compromission (IoC).", gradient: "from-red-500 to-rose-500", glow: "shadow-red-500/20" },
  { name: "VirusTotal", role: "Enrichissement", icon: Search, desc: "Analyse multi-moteurs des fichiers, URLs et hashes suspects.", gradient: "from-cyan-500 to-teal-500", glow: "shadow-cyan-500/20" },
  { name: "DFIR-IRIS", role: "Forensique", icon: Fingerprint, desc: "Plateforme d'investigation numérique et gestion de preuves.", gradient: "from-rose-500 to-pink-500", glow: "shadow-rose-500/20" },
];

const FEATURES = [
  "Détection temps réel des menaces sur 142+ endpoints",
  "Enrichissement automatique des IoC via MISP & VirusTotal",
  "Playbooks de réponse personnalisables et auto-exécutés",
  "Investigation collaborative avec TheHive & DFIR-IRIS",
  "Tableau de bord SOC avec métriques en direct",
  "Copilote IA intégré pour l'analyse avancée",
];

export function LandingStack() {
  return (
    <>
      {/* Stack Section */}
      <section className="landing-dark relative py-24 overflow-hidden">
        <div className="pointer-events-none absolute inset-0" style={{
          backgroundImage: `radial-gradient(rgba(249,115,22,0.03) 1px, transparent 1px)`,
          backgroundSize: "30px 30px",
        }} />
        <div className="relative mx-auto max-w-7xl px-6 md:px-10">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/5 px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-orange-400 mb-4">
              Stack Technologique
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              6 briques <span className="text-gradient-cyber">open source</span> intégrées
            </h2>
            <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
              Couvrant toute la chaîne SOC : détection, enrichissement, orchestration, investigation et forensique.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((t, i) => {
              const Icon = t.icon;
              return (
                <div key={t.name}
                  className={`group glass-card rounded-2xl p-6 transition-all duration-300 hover:-translate-y-2 hover:border-orange-500/20 hover:shadow-xl ${t.glow} animate-fade-up`}
                  style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${t.gradient} text-white shadow-lg`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-white group-hover:text-orange-400 transition-colors">{t.name}</h3>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-orange-400/60 mt-1">{t.role}</p>
                  <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{t.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-dark relative py-24 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-orange-500/[0.04] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 md:px-10">
          <div className="glass-card rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
            {/* Scan line effect */}
            <div className="absolute inset-0 scan-line pointer-events-none" />
            <h2 className="text-3xl md:text-4xl font-black text-white relative">
              Réponse aux incidents, <span className="text-gradient-cyber">automatisée</span>
            </h2>
            <p className="mt-4 text-zinc-400 max-w-2xl mx-auto relative">
              De la détection d'une alerte Wazuh jusqu'à la création d'un cas TheHive enrichi par MISP — tout orchestré par Shuffle.
            </p>
            <div className="mt-10 grid gap-3 text-left sm:grid-cols-2 max-w-2xl mx-auto relative">
              {FEATURES.map((f) => (
                <div key={f} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-orange-400 mt-0.5 shrink-0" />
                  <span className="text-zinc-300">{f}</span>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-4 relative">
              <Link to="/auth/login"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-xl hover:-translate-y-0.5">
                Accéder au Dashboard <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/workflow"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-bold text-zinc-300 transition-all hover:bg-white/10">
                Voir le workflow
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-[10px] font-mono text-zinc-700 tracking-widest uppercase">
          INOVA-IRIS SOC Platform · Sonatel Group · {new Date().getFullYear()}
        </div>
      </section>
    </>
  );
}
