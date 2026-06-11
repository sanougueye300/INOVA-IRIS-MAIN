import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  ShieldAlert, Webhook, Search, FolderOpen, Sparkles, CheckCircle, 
  ArrowRight, Activity, Terminal, Shield, Network, Zap, 
  Cpu, Users, Clock, Flame, ChevronRight, MessageSquare, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "INOVA-IRIS — Plateforme SOC Intégrée" },
      { name: "description", content: "Plateforme SOC Sonatel de nouvelle génération. Détection, enrichissement et remédiation automatique des cybermenaces." },
    ],
  }),
  component: LandingPage,
});

const SIMULATION_STEPS = [
  {
    tool: "Wazuh (SIEM)",
    icon: ShieldAlert,
    color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    message: "Tentative d'accès SSH brute-force détectée sur Sonatel-DB-Prod-01.",
    timestamp: "12:04:15",
  },
  {
    tool: "Shuffle (SOAR)",
    icon: Webhook,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    message: "Playbook 'SSH Bruteforce Containment' déclenché automatiquement par webhook.",
    timestamp: "12:04:16",
  },
  {
    tool: "VirusTotal & MISP",
    icon: Search,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    message: "IP 185.220.101.5 analysée. Résultat : 18/90 scanners positifs. IOC corrélé avec MISP.",
    timestamp: "12:04:18",
  },
  {
    tool: "TheHive (Incidents)",
    icon: FolderOpen,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    message: "Cas #9482 créé. Criticité : Haute. Tag: brute-force. Assigné au groupe Analystes.",
    timestamp: "12:04:19",
  },
  {
    tool: "Djib'son IA (SOAR)",
    icon: Sparkles,
    color: "text-violet-500 bg-violet-500/10 border-violet-500/20",
    message: "Recommandation générée : Isolation logique de la base et blocage IP temporaire.",
    timestamp: "12:04:21",
  },
  {
    tool: "Actionneur SOC",
    icon: CheckCircle,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    message: "IP de l'attaquant bannie du routeur. Hôte isolé. Alerte fermée (résolue).",
    timestamp: "12:04:23",
  }
];

const TOOLS_STACK = [
  {
    id: "wazuh",
    name: "Wazuh SIEM",
    role: "Détection & FIM",
    desc: "Collecte des logs, détection des anomalies système et de l'intégrité des fichiers (FIM). Déclenche les alertes selon les règles MITRE ATT&CK.",
    color: "border-rose-500/30 text-rose-500 bg-rose-500/5",
  },
  {
    id: "shuffle",
    name: "Shuffle SOAR",
    role: "Orchestration & Playbooks",
    desc: "Orchestrateur de flux cyber de dernière génération. Il interconnecte Wazuh, les bases de Threat Intel et les outils de gestion d'incidents.",
    color: "border-amber-500/30 text-amber-500 bg-amber-500/5",
  },
  {
    id: "misp",
    name: "MISP CTI",
    role: "Threat Intelligence",
    desc: "Base de partage d'IOCs. Permet de vérifier instantanément si des adresses IP, domaines ou empreintes de fichiers ont été signalés.",
    color: "border-blue-500/30 text-blue-500 bg-blue-500/5",
  },
  {
    id: "thehive",
    name: "TheHive",
    role: "Incident Response",
    desc: "Gestionnaire de cas collaboratif. Permet aux analystes de suivre, investiguer et documenter chaque alerte de sécurité enrichie.",
    color: "border-purple-500/30 text-purple-500 bg-purple-500/5",
  },
  {
    id: "virustotal",
    name: "VirusTotal",
    role: "Enrichissement rapide",
    desc: "Analyse automatisée de réputation. Soumission instantanée d'IPs et de hashs suspects pour validation multi-antivirus.",
    color: "border-emerald-500/30 text-emerald-500 bg-emerald-500/5",
  }
];

const PRESETS = [
  {
    q: "Qu'est-ce qu'INOVA-IRIS ?",
    r: "INOVA-IRIS est la plateforme SOC intégrée de Sonatel. Elle automatise la détection d'intrusions, l'enrichissement d'alertes via CTI et la réponse SOAR pour réduire le temps de traitement des incidents de plusieurs heures à quelques secondes."
  },
  {
    q: "Quelles sont les offres tarifaires ?",
    r: "Nous proposons des packages adaptés à chaque entreprise : Terranga (250 000 FCFA/mois, 1 poste d'analyste, support standard), Gainde (500 000 FCFA/mois, 5 postes d'analystes, support 24/7) et des contrats personnalisés Platine (750 000 FCFA/mois)."
  },
  {
    q: "Quelle est la valeur ajoutée du SOAR ?",
    r: "Le SOAR (opéré par Shuffle) permet d'isoler automatiquement les serveurs attaqués et de bannir les attaquants sans attente, réduisant le taux de pénétration des menaces de 95%."
  }
];

function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [activeTool, setActiveTool] = useState("wazuh");
  const [chatLog, setChatLog] = useState<{ q: string; r: string }[]>([
    {
      q: "Bienvenue sur l'assistant INOVA-IRIS. Comment puis-je vous aider ?",
      r: "Posez-moi une question sur le fonctionnement de la plateforme, les playbooks autonomes ou les tarifs."
    }
  ]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Simulation of live security log loop
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % SIMULATION_STEPS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const handleAskPreset = (preset: typeof PRESETS[0]) => {
    if (isTyping) return;
    setIsTyping(true);
    setChatLog((prev) => [...prev, { q: preset.q, r: "..." }]);
    
    setTimeout(() => {
      setChatLog((prev) => {
        const copy = [...prev];
        copy[copy.length - 1].r = preset.r;
        return copy;
      });
      setIsTyping(false);
    }, 1200);
  };

  const handleAskCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim() || isTyping) return;
    
    const question = customQuestion;
    setCustomQuestion("");
    setIsTyping(true);
    setChatLog((prev) => [...prev, { q: question, r: "..." }]);

    setTimeout(() => {
      let answer = "Je comprends votre question. En tant que copilote IA Djib'son de la plateforme SOC Sonatel, je confirme que la console orchestre Wazuh et Shuffle pour centraliser vos alertes. Pour une réponse personnalisée approfondie, veuillez vous connecter à votre compte SOC.";
      
      const qLower = question.toLowerCase();
      if (qLower.includes("prix") || qLower.includes("offre") || qLower.includes("tarif")) {
        answer = "Les tarifs de nos offres standards de dernière génération sont : Terranga à 250 000 FCFA/mois et Gainde à 500 000 FCFA/mois. Chaque formule définit des SLAs de GTR et un nombre de postes dédiés.";
      } else if (qLower.includes("wazuh") || qLower.includes("agent")) {
        answer = "L'agent Wazuh s'installe facilement via Docker ou script Bash disponible sur la page Déploiement. Il remonte les événements système en temps réel au manager SOC.";
      } else if (qLower.includes("misp") || qLower.includes("cti")) {
        answer = "MISP est notre outil de Threat Intelligence favori. Il est requêté automatiquement à chaque alerte pour croiser l'IP de l'attaquant avec notre base mondiale de menaces.";
      }

      setChatLog((prev) => {
        const copy = [...prev];
        copy[copy.length - 1].r = answer;
        return copy;
      });
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="relative overflow-hidden bg-slate-950 text-slate-100 min-h-screen">
      
      {/* Background Cyber Effect */}
      <div className="absolute inset-0 bg-dotted opacity-25 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 px-4 container mx-auto flex flex-col items-center text-center">
        
        {/* Badge status */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-8 animate-pulse-glow">
          <Activity className="h-3.5 w-3.5" />
          <span>NOUVELLE GÉNÉRATION SOC SONATEL</span>
        </div>

        <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight max-w-5xl leading-none">
          Supervisez la Sécurité de vos Actifs avec <span className="text-gradient-cyber">INOVA-IRIS</span>
        </h1>

        <p className="mt-6 text-base md:text-xl text-slate-400 max-w-3xl leading-relaxed">
          Une plateforme moderne combinant le SIEM <strong>Wazuh</strong>, l'orchestrateur SOAR <strong>Shuffle</strong>, 
          l'enrichissement <strong>VirusTotal/MISP</strong> et la gestion collaborative <strong>TheHive</strong>.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="bg-[image:var(--gradient-hero)] hover:scale-[1.02] active:scale-[0.98] transition-all font-bold shadow-lg shadow-primary/20 h-12 px-8 rounded-xl cursor-pointer">
            <Link to="/login">Accéder à la Plateforme SOC</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-slate-800 hover:bg-slate-900 h-12 px-6 rounded-xl cursor-pointer">
            <Link to="/workflow">Découvrir le Workflow</Link>
          </Button>
        </div>

        {/* Hero Interactive Terminal Widget */}
        <div className="mt-16 w-full max-w-4xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl relative shadow-primary/5">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/60">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 block" />
              <span className="text-xs text-slate-500 font-mono ml-2">inova-iris // incident-simulator</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-500 font-mono">LIVE REMEDIATION STATE</span>
            </div>
          </div>

          <div className="grid md:grid-cols-12 min-h-[300px]">
            {/* Simulation steps list */}
            <div className="md:col-span-5 border-r border-slate-800/80 bg-slate-950/20 p-4 space-y-2.5 text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Cycle d'incident</span>
              {SIMULATION_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = activeStep === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveStep(idx)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-xs text-left transition-all ${
                      isActive 
                        ? "border-primary/30 bg-primary/5 text-slate-100 shadow-sm" 
                        : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg border ${step.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="font-semibold leading-tight">{step.tool}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{step.timestamp}</div>
                    </div>
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>

            {/* Terminal simulation log detail */}
            <div className="md:col-span-7 p-6 flex flex-col justify-between text-left font-mono bg-slate-950/40 relative">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Terminal className="h-4 w-4 text-primary" />
                  <span>iris-soc@sonatel:~# inspect-incident --id 9482</span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-500">[{SIMULATION_STEPS[activeStep].timestamp}] INITIALIZING INVESTIGATION STATE...</p>
                  <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
                    <span className="text-primary font-bold">{SIMULATION_STEPS[activeStep].tool} :</span>
                    <p className="mt-1.5 text-slate-300 leading-relaxed">{SIMULATION_STEPS[activeStep].message}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-400">
                  <p className="text-emerald-500">✔ Observable IP 185.220.101.5 extracted</p>
                  <p className="text-purple-400">✔ TheHive Case #9482 linked to SIEM alert</p>
                  {activeStep >= 4 ? (
                    <p className="text-violet-400">⚡ SOAR autonomous decision: Firewall block rule applied</p>
                  ) : (
                    <p className="text-slate-600">⚡ Waiting for SOAR action...</p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                <span>Appuyez sur les étapes à gauche pour naviguer</span>
                <span className="animate-pulse">_</span>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* 2. DYNAMIC BENTO GRID FEATURES */}
      <section className="py-20 bg-slate-900/30 border-y border-slate-900 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Une Plateforme, 4 Piliers Fondamentaux
            </h2>
            <p className="text-slate-400 mt-4">
              INOVA-IRIS a été pensée pour répondre aux exigences réglementaires et opérationnelles les plus strictes.
            </p>
          </div>

          <div className="grid md:grid-cols-12 gap-6">
            
            {/* Bento 1: SOAR Autonome */}
            <Card className="md:col-span-8 border-slate-800 bg-slate-900/40 backdrop-blur-md hover:border-primary/20 transition-all group overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
                    <Zap className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Orchestration & SOAR Autonome</CardTitle>
                </div>
                <CardDescription className="text-slate-400 mt-2">
                  Grâce à Shuffle, déclenchez des réponses immédiates (confinement, blocage d'IP, réinitialisation de comptes) dès la qualification de la menace.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 relative">
                <div className="mt-4 p-4 rounded-xl border border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Network className="h-8 w-8 text-primary" />
                    <div>
                      <div className="text-xs font-bold text-slate-300">Playbook: Isolation d'hôte</div>
                      <div className="text-[10px] text-slate-500">Déclenché pour tentative Ransomware</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Isolation OK (1.2s)</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Bento 2: Threat Map */}
            <Card className="md:col-span-4 border-slate-800 bg-slate-900/40 backdrop-blur-md hover:border-primary/20 transition-all overflow-hidden flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500">
                    <Flame className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Threat Map</CardTitle>
                </div>
                <CardDescription className="text-slate-400">
                  Visualisez les flux d'attaques en temps réel et activez le géo-blocage d'un simple clic.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-32 flex items-center justify-center relative overflow-hidden bg-slate-950/20 border-t border-slate-800/60">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent animate-pulse" />
                <div className="text-center">
                  <div className="text-3xl font-black text-primary">Threat Geoblocking</div>
                  <div className="text-[10px] text-emerald-500 font-mono mt-1">SÉNÉGAL / SONATEL GATEWAY ACTIVE</div>
                </div>
              </CardContent>
            </Card>

            {/* Bento 3: AI Assistant (Interactive Chat) */}
            <Card className="md:col-span-5 border-slate-800 bg-slate-900/40 backdrop-blur-md hover:border-primary/20 transition-all overflow-hidden flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-500">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Copilote Djib'son IA</CardTitle>
                </div>
                <CardDescription className="text-slate-400">
                  Posez des questions à l'IA entraînée sur les procédures de sécurité de Sonatel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-[200px] border border-slate-800 bg-slate-950/60 rounded-xl p-3 overflow-y-auto flex flex-col gap-2.5 font-sans text-xs scrollbar-thin">
                  {chatLog.map((chat, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="text-slate-500 font-semibold">{chat.q}</div>
                      <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-2 text-slate-300">
                        {chat.r === "..." ? (
                          <span className="flex gap-1 items-center py-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce delay-75" />
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce delay-150" />
                          </span>
                        ) : chat.r}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preset buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleAskPreset(p)}
                      disabled={isTyping}
                      className="text-[10px] border border-slate-800 hover:border-primary/30 bg-slate-950/40 text-slate-400 hover:text-slate-200 px-2 py-1 rounded-md transition-all cursor-pointer"
                    >
                      {p.q}
                    </button>
                  ))}
                </div>

                {/* Question input */}
                <form onSubmit={handleAskCustom} className="flex gap-2">
                  <input
                    type="text"
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="Posez une question sur le SOC..."
                    disabled={isTyping}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-50"
                  />
                  <Button type="submit" size="icon" disabled={isTyping} className="bg-primary hover:bg-primary/90 rounded-lg h-8 w-8 cursor-pointer">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Bento 4: SLAs & Offres */}
            <Card className="md:col-span-7 border-slate-800 bg-slate-900/40 backdrop-blur-md hover:border-primary/20 transition-all flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Offres & SLAs Garantis</CardTitle>
                </div>
                <CardDescription className="text-slate-400">
                  Des forfaits adaptés pour superviser vos serveurs et réseaux de manière continue avec des métriques de temps de réponse optimales.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-left">
                    <div className="text-gradient-cyber font-bold text-lg">Offre Terranga</div>
                    <div className="text-2xl font-extrabold mt-1 text-slate-200">250 000 FCFA</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">par mois · SLA Standard</div>
                    <Link to="/admin/offres" className="text-xs text-primary hover:underline flex items-center gap-1 mt-3">
                      En savoir plus <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-left">
                    <div className="text-primary font-bold text-lg">Offre Gaindé</div>
                    <div className="text-2xl font-extrabold mt-1 text-slate-200">500 000 FCFA</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">par mois · Support 24/7/365</div>
                    <Link to="/admin/offres" className="text-xs text-primary hover:underline flex items-center gap-1 mt-3">
                      En savoir plus <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </section>

      {/* 3. SECURITY TOOLS TECH STACK */}
      <section className="py-20 px-4 container mx-auto max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="bg-primary/15 text-primary border-primary/20 px-3 py-1 mb-3">CONTRÔLE INTÉGRÉ</Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Les Meilleurs Outils Open Source du Marché
          </h2>
          <p className="text-slate-400 mt-4">
            INOVA-IRIS unifie vos logiciels de cybersécurité préférés sous un seul tableau de bord analytique et décisionnel.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-4">
          {TOOLS_STACK.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`p-6 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                activeTool === tool.id 
                  ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/5" 
                  : "border-slate-800/80 bg-slate-900/10 hover:bg-slate-900/30 hover:border-slate-800"
              }`}
            >
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${activeTool === tool.id ? "text-primary" : "text-slate-500"}`}>
                  {tool.role}
                </span>
                <h3 className="text-base font-extrabold text-slate-200 mt-1">{tool.name}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-4 leading-relaxed line-clamp-3">
                {tool.desc}
              </p>
            </button>
          ))}
        </div>

        {/* Selected Tool Details Card */}
        <div className="mt-8 p-6 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-slate-100">
                  {TOOLS_STACK.find(t => t.id === activeTool)?.name}
                </h3>
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {TOOLS_STACK.find(t => t.id === activeTool)?.role}
                </Badge>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                {TOOLS_STACK.find(t => t.id === activeTool)?.desc}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2.5">
              <Button asChild variant="outline" size="sm" className="border-slate-800 hover:bg-slate-900 cursor-pointer">
                <Link to="/outils" hash={activeTool}>Voir dans Outils SOC</Link>
              </Button>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/95 text-slate-950 font-bold cursor-pointer">
                <Link to="/deploiement">Guide de Déploiement</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. STATISTICS */}
      <section className="py-20 bg-slate-900/40 border-t border-slate-900 px-4 text-center">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <div className="text-4xl md:text-5xl font-black text-gradient-cyber">99.99%</div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Disponibilité SOC</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl md:text-5xl font-black text-gradient-cyber">&lt; 2 min</div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Temps de réponse SOAR</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl md:text-5xl font-black text-gradient-cyber">15 000+</div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Agents Supervisés</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl md:text-5xl font-black text-gradient-cyber">100%</div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conformité SLA</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION */}
      <section className="py-20 px-4 text-center relative overflow-hidden">
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
        <div className="container mx-auto max-w-3xl relative">
          <h2 className="text-3xl md:text-5xl font-black">Prêt à Sécuriser vos Données ?</h2>
          <p className="text-slate-400 mt-4 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Rejoignez Sonatel SOC aujourd'hui et donnez à vos équipes les moyens de détecter, analyser et contrer les incidents de sécurité en temps réel.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-[image:var(--gradient-hero)] hover:scale-[1.02] active:scale-[0.98] transition-all font-bold h-12 px-8 rounded-xl cursor-pointer">
              <Link to="/login">Accéder à la Console</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-slate-800 hover:bg-slate-900 h-12 px-6 rounded-xl cursor-pointer">
              <Link to="/deploiement">Documentation Technique</Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
