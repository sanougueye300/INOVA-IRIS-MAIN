import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle, Database, Shield, Bug, Workflow,
  Fingerprint, Sliders, FileText, UserCog,
  Cpu, Timer, ShieldCheck,
  Zap, Eye, ChevronRight, Network,
  RefreshCw, Flame, Target, Globe2,
  Terminal, TrendingUp,
  Sparkles, Radio, ArrowUpRight,
  Layers, Building2, CreditCard, Laptop,
  CheckCircle2, BellRing, ExternalLink,
  ShieldAlert, Activity,
  Users, UserPlus, ThumbsUp, Briefcase, BarChart3, Plug, ServerCog,
  Phone, Mail, ArrowRight, Check,
} from "lucide-react";
import { useSocPreferences, type SocTimeRange } from "@/lib/soc-preferences";
import { useState, useEffect } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { useLivePcsData, registerClientPc, saveClientPcToCloud, syncClientPcsWithCloud } from "@/lib/pcs-sync";
import { authenticateRegisteredClient, getClientPcSyncErrorMessage } from "@/lib/registered-client-auth";
import { recordAuditEvent } from "@/lib/audit-log";
import { getClientExtendedData } from "@/routes/clients.index";
import {
  mockConnectors, mockIncidentTimeline, mockMitreTactics,
  mockShuffleRuns24h, mockCountryTraffic, mockMttdMttr,
  computeSocHealth,
} from "@/lib/soc-mock";
import {
  AreaChart, Area, XAxis, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de Bord SOC — INOVA-IRIS" }] }),
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

/* ─── Horloge Temps Réel (GMT / Local) ─── */
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
      {now.toLocaleTimeString("fr-FR")}
    </span>
  );
}

/* ─── Indicateur de Pulse Animé ─── */
function PulseDot({ color = "bg-emerald-500" }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-75`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}

/* ─── Globe Holographique Cyber de Dernière Génération (Adaptatif Clair & Sombre) ─── */
function CyberHoloGlobe() {
  return (
    <div className="relative flex items-center justify-center w-full h-full select-none">
      {/* Cercles orbitaux futuristes */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="absolute w-84 h-84 rounded-full border border-primary/20 dark:border-primary/25 animate-spin"
          style={{ animationDuration: "35s" }}
        />
        <div
          className="absolute w-70 h-70 rounded-full border border-dashed border-primary/25 dark:border-primary/20 animate-spin"
          style={{ animationDuration: "24s", animationDirection: "reverse" }}
        />
        <div
          className="absolute w-56 h-56 rounded-full border border-cyan-500/20 dark:border-cyan-400/20 animate-spin"
          style={{ animationDuration: "18s" }}
        />
      </div>

      {/* Sphère holographique centrale */}
      <div className="relative z-10 w-52 h-52 rounded-full bg-gradient-to-br from-white/95 via-primary/5 to-slate-100/90 dark:from-slate-900/95 dark:via-zinc-900/90 dark:to-zinc-950 border-2 border-primary/40 dark:border-primary/50 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08),0_0_50px_hsl(var(--primary)/0.2),inset_0_0_35px_hsl(var(--primary)/0.1)] flex items-center justify-center backdrop-blur-md">
        {/* Grille de méridiens & parallèles vectorielle */}
        <svg className="absolute inset-0 w-full h-full opacity-35 dark:opacity-30 text-primary" viewBox="0 0 208 208" fill="none">
          <circle cx="104" cy="104" r="100" stroke="currentColor" strokeWidth="0.75" />
          <ellipse cx="104" cy="104" rx="60" ry="100" stroke="currentColor" strokeWidth="0.75" />
          <ellipse cx="104" cy="104" rx="100" ry="30" stroke="currentColor" strokeWidth="0.75" />
          <ellipse cx="104" cy="104" rx="100" ry="60" stroke="currentColor" strokeWidth="0.75" />
          <line x1="4" y1="104" x2="204" y2="104" stroke="currentColor" strokeWidth="0.75" />
          <line x1="104" y1="4" x2="104" y2="204" stroke="currentColor" strokeWidth="0.75" />
        </svg>

        {/* Points chauds de télémétrie animés */}
        <div className="absolute top-8 left-12 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping opacity-75" />
        <div className="absolute top-8 left-12 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" title="Dakar SOC Sensor" />

        <div className="absolute top-16 right-8 w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_currentColor]" style={{ animationDelay: "0.4s" }} title="Paris Datacenter" />
        <div className="absolute bottom-14 left-8 w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]" style={{ animationDelay: "0.8s" }} title="Abidjan Gateway" />
        <div className="absolute bottom-10 right-14 w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" style={{ animationDelay: "1.2s" }} title="Casablanca Relay" />
        <div className="absolute top-1/2 left-6 w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_#06b6d4]" style={{ animationDelay: "0.6s" }} title="Cloud Edge Sonatel" />

        {/* Cœur du bouclier XDR */}
        <div className="relative z-10 flex flex-col items-center gap-1">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30 text-primary-foreground border border-white/20">
            <ShieldCheck className="w-7 h-7 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary font-mono mt-1">
            IRIS XDR
          </span>
        </div>
      </div>

      {/* Badge Flottant Haut : Indice Cyber Global */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-primary/30 rounded-2xl px-3.5 py-1.5 text-center shadow-md">
        <span className="text-[9px] font-black uppercase tracking-widest text-primary block font-mono">Indice Résilience</span>
        <span className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">98.5%</span>
      </div>

      {/* Badge Flottant Bas : Statut DEFCON */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-emerald-500/30 rounded-2xl px-3.5 py-1.5 shadow-md">
        <PulseDot color="bg-emerald-500" />
        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">DEFCON 4 · Bouclier Actif</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD ESPACE CLIENT — MODÈLE ÉPURÉ & PROFESSIONNEL
   (Non surchargé, distinct de la console administrateur SOC)
══════════════════════════════════════════════════════════ */
function ClientDashboard({
  user,
  organization,
}: {
  user: any;
  organization: string | null;
}) {
  const { totalPcs, latestAdded } = useLivePcsData(142);
  const [addPcOpen, setAddPcOpen] = useState(false);
  const [pcForm, setPcForm] = useState({ hostname: "", ip: "", os: "windows" as "windows" | "linux" | "macos" });
  const [isAddingPc, setIsAddingPc] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    if (user.id === "mock-uid-123") {
      try {
        const registered = JSON.parse(localStorage.getItem("inova_registered_user") || "null");
        if (!registered?.password) {
          toast.error("Reconnectez-vous à votre compte client", {
            description: "Cette ancienne session locale ne peut pas synchroniser les postes. Connectez-vous avec vos identifiants client.",
          });
          return;
        }
        authenticateRegisteredClient(registered).catch((error) => {
          toast.error("Mise à niveau du compte requise", {
            description: error instanceof Error ? error.message : "Reconnectez-vous avec vos identifiants client.",
          });
        });
      } catch (error) {
        console.error("Impossible de convertir l'ancienne session client:", error);
      }
      return;
    }
    const cached = getClientExtendedData(user.id, organization || "Client");
    syncClientPcsWithCloud(user.id, organization || "Client", cached.pcs).catch((error) => {
      console.error("Erreur de synchronisation des postes client:", error);
    });
  }, [user?.id, organization]);

  const [clientUserCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("client_user_count") ?? "1", 10);
    }
    return 1;
  });

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Client";

  const handleQuickAddPc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pcForm.hostname.trim() || !pcForm.ip.trim()) {
      toast.error("Veuillez renseigner le nom d'hôte et l'adresse IP");
      return;
    }
    setIsAddingPc(true);
    await new Promise((r) => setTimeout(r, 600));

    const newPc = {
      id: `${user?.id || "client"}-pc-${Date.now()}`,
      name: pcForm.hostname.trim(),
      hostname: pcForm.hostname.trim(),
      clientName: organization || "Client Espace",
      clientId: user?.id,
      os: pcForm.os,
      ip: pcForm.ip.trim(),
      status: "active" as const,
      cpu: Math.floor(Math.random() * 25) + 8,
      ram: Math.floor(Math.random() * 35) + 25,
      version: "v4.14.5",
      lastSeen: "À l'instant",
      wazuhId: String(Math.floor(Math.random() * 900) + 100),
    };

    const registeredPc = registerClientPc(newPc);

    try {
      if (user?.id) {
        const ext = getClientExtendedData(user.id, organization || "Client");
        const updated = { ...ext, pcs: [...ext.pcs, newPc] };
        localStorage.setItem(`client_ext_${user.id}`, JSON.stringify({ ...updated, _v: 2 }));
      }
      await saveClientPcToCloud(registeredPc);
      void recordAuditEvent("EDR_PC_CREATE", registeredPc.name, {
        endpoint_id: registeredPc.id,
        ip: registeredPc.ip,
        os: registeredPc.os,
      }, organization, "client", user.id);
    } catch (error) {
      console.error("Erreur d'enregistrement du poste dans Supabase:", error);
      void recordAuditEvent("EDR_PC_CREATE_FAILED", registeredPc.name, {
        endpoint_id: registeredPc.id,
        ip: registeredPc.ip,
        os: registeredPc.os,
        error: error instanceof Error ? error.message : String(error),
      }, organization, "client", user.id);
      toast.error("Poste conservé sur cet appareil, mais non synchronisé", {
        description: getClientPcSyncErrorMessage(error),
      });
      setIsAddingPc(false);
      return;
    }

    setIsAddingPc(false);
    setAddPcOpen(false);
    setPcForm({ hostname: "", ip: "", os: "windows" });
    toast.success("✅ Machine connectée au SOC !", {
      description: `${newPc.hostname} (${newPc.ip}) est désormais supervisée et visible sur le dashboard admin.`,
    });
  };

  return (
    <div className="w-full text-foreground selection:bg-primary/20 pb-16 transition-colors">

      {/* ── EN-TÊTE ÉPURÉ CLIENT ── */}
      <div className="border-b border-border/80 bg-card/60 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/25 border border-sky-400/30 text-white font-black text-lg shrink-0">
              {displayName.slice(0, 2).toUpperCase()}
              <div className="absolute -bottom-0.5 -right-0.5">
                <PulseDot color="bg-emerald-500" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Bonjour, {displayName}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">
                  <PulseDot color="bg-emerald-500" /> Protection Active 24/7
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                Espace Client CyberSOC · {organization || "Votre Entreprise"} · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* Quick CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setAddPcOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Laptop className="h-4 w-4" />
              + Ajouter un PC
            </button>
            <Link
              to="/admin/new"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              <UserPlus className="h-4 w-4" />
              Nouveau RH
            </Link>
            <Link
              to="/clients/inventory"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-secondary/80 hover:bg-secondary text-secondary-foreground font-bold text-xs border border-border transition-all"
            >
              <Laptop className="h-4 w-4 text-muted-foreground" />
              Parc de Postes
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">

        {/* ── 4 CARTES SYNTHÉTIQUES (KPIS CLAIRS) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Carte 1 : Postes protégés */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs hover:border-sky-500/40 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
                <Laptop className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                100% Actif
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                {totalPcs}
              </span>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Postes surveillés (EDR)</p>
              <p className="text-[11px] text-muted-foreground">{totalPcs} / {totalPcs} postes actifs sous télémétrie.</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
              <Link
                to="/clients/inventory"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
              >
                Gérer le parc <ArrowRight className="h-3 w-3" />
              </Link>
              <button
                onClick={() => setAddPcOpen(true)}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                + Ajouter
              </button>
            </div>
          </div>

          {/* Carte 2 : Alertes & Menaces */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs hover:border-emerald-500/40 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                Périmètre Sûr
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                0
              </span>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Menace active non résolue</p>
              <p className="text-[11px] text-muted-foreground">Toutes les attaques ont été bloquées automatiquement.</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60">
              <Link
                to="/alertes"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Consulter les alertes <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Carte 3 : Disponibilité SOC & SLA */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs hover:border-violet-500/40 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:scale-105 transition-transform">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-mono">
                SLA Garanti
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                99.98%
              </span>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Disponibilité du service SOC</p>
              <p className="text-[11px] text-muted-foreground">Temps de prise en charge moyen garanti &lt; 15 min.</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-500" /> Contrat Sonatel Entreprise
              </span>
            </div>
          </div>

          {/* Carte 4 : Membres RH & Collaborateurs */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs hover:border-amber-500/40 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                {clientUserCount} / 3 Utilisés
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                {clientUserCount} <span className="text-sm font-normal text-muted-foreground">/ 3</span>
              </span>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Comptes RH & Collaborateurs</p>
              <p className="text-[11px] text-muted-foreground">Gestion des accès internes à votre organisation.</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60">
              <Link
                to="/admin/new"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                Ajouter un nouveau RH <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

        </div>

        {/* ── CORPS CENTRAL EN 2 COLONNES : SYNTHÈSE ÉPURÉE & ACCÈS DIRECTS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* COLONNE GAUCHE (7/12) : Synthèse de sécurité & Journal simplifié */}
          <div className="lg:col-span-7 space-y-6">

            <div className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white">
                      Synthèse de Sécurité & Activité Récente
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      Journal vulgarisé des opérations de protection opérées par le SOC
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 w-fit">
                  Systèmes opérationnels
                </span>
              </div>

              {/* Événements compréhensibles */}
              <div className="space-y-3.5">
                {[
                  ...(latestAdded ? [{
                    title: "Nouveau poste de travail enrôlé",
                    desc: `Poste ${latestAdded.hostname} (${latestAdded.os.toUpperCase()} · ${latestAdded.ip}) synchronisé et sécurisé en temps réel.`,
                    time: "À l'instant",
                    icon: Laptop,
                    color: "text-emerald-500",
                    bg: "bg-emerald-500/10",
                  }] : []),
                  {
                    title: "Télémétrie EDR synchronisée en continu",
                    desc: `Les ${totalPcs} postes de travail de votre organisation sont actifs et protégés contre les rançongiciels et logiciels malveillants.`,
                    time: "Il y a 10 min",
                    icon: ShieldCheck,
                    color: "text-emerald-500",
                    bg: "bg-emerald-500/10",
                  },
                  {
                    title: "Tentative d'accès non autorisé stoppée",
                    desc: "Un scan suspect provenant d'Internet a été intercepté et bloqué à la passerelle sans compromission de données.",
                    time: "Aujourd'hui à 11:24",
                    icon: ShieldAlert,
                    color: "text-sky-500",
                    bg: "bg-sky-500/10",
                  },
                  {
                    title: "Audit de conformité des mots de passe",
                    desc: "Vérification automatisée effectuée. Aucune fuite d'identifiants ni vulnérabilité critique constatée sur vos comptes.",
                    time: "Hier à 17:40",
                    icon: CheckCircle2,
                    color: "text-violet-500",
                    bg: "bg-violet-500/10",
                  },
                  {
                    title: "Rapport mensuel de cybersécurité disponible",
                    desc: "Indice de résilience global évalué à 98.5%. Toutes les recommandations ont été appliquées par nos analystes.",
                    time: "Il y a 3 jours",
                    icon: FileText,
                    color: "text-amber-500",
                    bg: "bg-amber-500/10",
                  },
                ].map((ev, i) => {
                  const Icon = ev.icon;
                  return (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-secondary/40 border border-border/70 flex items-start gap-3.5"
                    >
                      <div className={`h-8 w-8 rounded-lg ${ev.bg} ${ev.color} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {ev.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                            {ev.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {ev.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Besoin de tracer chaque opération administrative ?
                </span>
                <Link
                  to="/audit"
                  className="font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  Voir les journaux d'audit <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

          </div>

          {/* COLONNE DROITE (5/12) : Accès Rapides Métiers & Support SOC Dédié */}
          <div className="lg:col-span-5 space-y-6">

            {/* Raccourcis de navigation */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  Accès Rapides Espace Client
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Modules disponibles dans votre environnement dédié
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    title: "Nouveau Collaborateur RH",
                    desc: "Créer un compte d'accès pour un collègue RH",
                    to: "/admin/new",
                    icon: UserPlus,
                    color: "text-primary",
                    bg: "bg-primary/10",
                  },
                  {
                    title: "Inventaire des Postes (EDR)",
                    desc: "Consulter la liste de vos 142 PC connectés",
                    to: "/clients/inventory",
                    icon: Laptop,
                    color: "text-sky-500",
                    bg: "bg-sky-500/10",
                  },
                  {
                    title: "Registre des Alertes",
                    desc: "Historique des alertes traitées par le SOC",
                    to: "/alertes",
                    icon: AlertTriangle,
                    color: "text-amber-500",
                    bg: "bg-amber-500/10",
                  },
                  {
                    title: "Journaux d'Audit",
                    desc: "Traçabilité des connexions et actions",
                    to: "/audit",
                    icon: FileText,
                    color: "text-violet-500",
                    bg: "bg-violet-500/10",
                  },
                  {
                    title: "Paramètres du Compte",
                    desc: "Préférences d'affichage et sécurité de session",
                    to: "/settings",
                    icon: Sliders,
                    color: "text-slate-500",
                    bg: "bg-slate-500/10",
                  },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={idx}
                      to={item.to}
                      className="p-3 rounded-xl border border-border/80 hover:border-primary/40 hover:bg-accent/40 transition-all flex items-center justify-between group shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg ${item.bg} ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Assistance Dédiée SOC Sonatel */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/5 via-primary/5 to-transparent border border-primary/20 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary font-mono block">
                    Support Dédié 24/7
                  </span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Assistance SOC Sonatel
                  </h3>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Une équipe d'analystes certifiés veille en permanence sur vos systèmes. En cas d'urgence ou de question :
              </p>

              <div className="space-y-2 pt-1 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border">
                  <span className="text-muted-foreground">Hotline Urgence Cyber :</span>
                  <a href="tel:+221338391212" className="font-bold text-primary hover:underline font-mono">
                    +221 33 839 12 12
                  </a>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border">
                  <span className="text-muted-foreground">E-mail d'astreinte :</span>
                  <a href="mailto:soc-client@sonatel.sn" className="font-bold text-primary hover:underline">
                    soc-client@sonatel.sn
                  </a>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border">
                  <span className="text-muted-foreground">Temps de prise en charge :</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    &lt; 15 minutes
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* ── PIED DE PAGE CLIENT ── */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Plateforme INOVA-IRIS · Espace Client Sécurisé Sonatel · {new Date().getFullYear()}</span>
          <div className="flex items-center gap-2">
            <PulseDot color="bg-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Surveillance SOC Opérationnelle</span>
          </div>
          <span>Certifié ISO 27001 · Données protégées</span>
        </div>

      </div>

      {/* Modal d'ajout de PC pour le client */}
      {addPcOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Laptop className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Ajouter un PC au Parc EDR
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Connecter une nouvelle machine à la surveillance SOC
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddPcOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleQuickAddPc} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Nom d'hôte de la machine (Hostname) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pcForm.hostname}
                  onChange={(e) => setPcForm({ ...pcForm, hostname: e.target.value })}
                  placeholder="Ex: PC-DIRECTION-01 ou SRV-PROD-02"
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Adresse IP locale ou réseau <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pcForm.ip}
                  onChange={(e) => setPcForm({ ...pcForm, ip: e.target.value })}
                  placeholder="Ex: 192.168.1.145 ou 10.0.4.52"
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Système d'exploitation (OS)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: "windows", label: "Windows" },
                    { val: "linux", label: "Linux" },
                    { val: "macos", label: "macOS" },
                  ].map((osOpt) => (
                    <button
                      key={osOpt.val}
                      type="button"
                      onClick={() => setPcForm({ ...pcForm, os: osOpt.val as any })}
                      className={`py-2 px-3 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                        pcForm.os === osOpt.val
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary/60 border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {osOpt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-700 dark:text-sky-300">
                L'agent de télémétrie Wazuh s'enregistrera automatiquement. Ce poste sera instantanément visible sur la console EDR et sur le dashboard administrateur du SOC.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAddPcOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isAddingPc}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {isAddingPc ? "Enrôlement en cours..." : "Enregistrer et surveiller"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD PRINCIPAL — VUE DE DERNIÈRE GÉNÉRATION EN CLAIR
══════════════════════════════════════════════════════════ */
export function Dashboard() {
  const { roles, organization, user } = useAuth();
  const isClientOnly = roles.includes("client") && !roles.includes("admin") && !roles.includes("analyste") && !roles.includes("manager");

  if (isClientOnly) {
    return <ClientDashboard user={user} organization={organization} />;
  }

  const { totalPcs, latestAdded, distribution } = useLivePcsData(142);
  const { t, timeRange, setTimeRange, themeColor } = useSocPreferences();
  const health = computeSocHealth(18, 98, mockConnectors);
  const maxMitre = Math.max(...mockMitreTactics.map((m) => m.count));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success(t("Données SOC et flux Wazuh synchronisés en temps réel."));
    }, 700);
  };

  return (
    <div className="w-full text-foreground selection:bg-primary/20 pb-16 transition-colors">

      {/* ══════ EN-TÊTE COMMAND CENTER INTÉGRÉ (SANS CHEVAUCHEMENT / OVERLAP FIXÉ) ══════ */}
      <div className="border-b border-border/80 bg-card/60 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">

          {/* Identité SOC + Titre de la page */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="relative h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/25 border border-primary/30 text-primary-foreground shrink-0">
              <ShieldCheck className="h-6 w-6 stroke-[2.5]" />
              <div className="absolute -bottom-0.5 -right-0.5">
                <PulseDot color="bg-emerald-500" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  Tableau de Bord SOC
                </h1>
                <span className="text-muted-foreground font-normal text-sm sm:text-base">—</span>
                <span className="text-sm sm:text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-amber-500 to-primary/80">
                  {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider">
                  Live Center
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Centre de Commandement Cybersécurité · Sonatel Group · Orchestration Wazuh, TheHive, MISP, Shuffle & EDR
              </p>
            </div>
          </div>

          {/* Télémesures Rapides + Contrôles (Période, Horloge, Actions) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Métriques Inline Hautes */}
            <div className="hidden lg:flex items-center gap-4 px-3 py-1.5 rounded-xl bg-secondary/50 border border-border/80 text-xs font-mono mr-1">
              <div>
                <span className="text-muted-foreground block text-[9px] uppercase font-semibold">Menaces 24h</span>
                <span className="text-red-500 dark:text-red-400 font-black text-sm">328</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div>
                <span className="text-muted-foreground block text-[9px] uppercase font-semibold">MTTD</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-black text-sm">4.2m</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div>
                <span className="text-muted-foreground block text-[9px] uppercase font-semibold">EDR Actifs</span>
                <span className="text-primary font-black text-sm">{totalPcs}</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <div>
                <span className="text-muted-foreground block text-[9px] uppercase font-semibold">Blocage</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">99.8%</span>
              </div>
            </div>

            {/* Sélecteur de période */}
            <div className="flex items-center bg-secondary/80 border border-border rounded-xl p-0.5 text-[11px] font-bold gap-0.5">
              {(["24h", "7d", "30d"] as SocTimeRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    timeRange === r
                      ? "bg-primary text-primary-foreground shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Horloge GMT */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border shadow-xs">
              <PulseDot color="bg-emerald-500" />
              <LiveClock />
              <span className="text-[10px] text-muted-foreground font-mono">GMT</span>
            </div>

            {/* Bouton Synchroniser */}
            <button
              onClick={handleRefresh}
              title={t("Synchroniser le dashboard")}
              className="h-9 w-9 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            </button>

            {/* Alertes Live & Assistant */}
            <Link
              to="/alertes"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all shadow-xs"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Alertes Live</span>
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px]">328</span>
            </Link>

            <Link
              to="/assistant"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold hover:bg-violet-500/20 transition-all shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Djib'son IA</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ══════ CORPS PRINCIPAL DU DASHBOARD (FLUIDE, SANS DÉBORDEMENT NI SCROLLBAR) ══════ */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* ── RUBAN DE 4 CARTES KPI CLÉS (STYLE GLASS CLAIR ÉPURÉ) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

          {/* KPI 1 : Menaces neutralisées */}
          <div className="relative overflow-hidden rounded-2xl bg-card/85 dark:bg-card/75 border border-border/90 hover:border-primary/50 shadow-xs hover:shadow-md transition-all p-4 backdrop-blur-md min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Menaces 24h</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                <AlertTriangle className="h-3 w-3" /> +14.2%
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">328</span>
              <span className="text-xs text-muted-foreground">bloquées</span>
            </div>
            <div className="mt-3 flex h-2 w-full rounded-full overflow-hidden gap-0.5 bg-secondary">
              <div className="bg-red-500" style={{ width: "8%" }} title="Critiques: 8%" />
              <div className="bg-primary" style={{ width: "22%" }} title="Hautes: 22%" />
              <div className="bg-amber-400" style={{ width: "35%" }} title="Moyennes: 35%" />
              <div className="bg-emerald-500" style={{ width: "35%" }} title="Faibles: 35%" />
            </div>
            <div className="mt-1.5 flex justify-between text-[9px] text-muted-foreground font-medium">
              <span className="text-red-500 font-bold">Crit. 8%</span>
              <span className="text-primary font-bold">High 22%</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Safe 70%</span>
            </div>
          </div>

          {/* KPI 2 : MTTD (Détection) */}
          <div className="relative overflow-hidden rounded-2xl bg-card/85 dark:bg-card/75 border border-border/90 hover:border-cyan-500/50 shadow-xs hover:shadow-md transition-all p-4 backdrop-blur-md min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">MTTD Détection</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                <Timer className="h-3 w-3" /> Objectif &lt; 10m
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-cyan-600 dark:text-cyan-400">4.2</span>
              <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">min</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Temps moyen de détection Wazuh SIEM & EDR.
            </p>
          </div>

          {/* KPI 3 : MTTR (Réponse) */}
          <div className="relative overflow-hidden rounded-2xl bg-card/85 dark:bg-card/75 border border-border/90 hover:border-violet-500/50 shadow-xs hover:shadow-md transition-all p-4 backdrop-blur-md min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">MTTR Réponse</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                <Zap className="h-3 w-3" /> 87% Auto
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-violet-600 dark:text-violet-400">18</span>
              <span className="text-sm font-bold text-violet-600 dark:text-violet-400">min</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Playbooks de remédiation automatisés via SOAR Shuffle.
            </p>
          </div>

          {/* KPI 4 : Parc EDR Actif */}
          <div className="relative overflow-hidden rounded-2xl bg-card/85 dark:bg-card/75 border border-border/90 hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all p-4 backdrop-blur-md min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Parc EDR</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> 100% Actif
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">{totalPcs}</span>
              <span className="text-xs text-muted-foreground">/ {totalPcs} postes</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Agents Wazuh connectés en temps réel avec latence &lt; 20ms.
            </p>
          </div>

        </div>

        {/* ══ LAYOUT TRIPARTITE RESPONSIVE (GAUCHE + CENTRE GLOBE + DROITE) ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ─── COLONNE GAUCHE : SIEM Wazuh, EDR & Résilience ─── */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 min-w-0">

            {/* Carte : Surveillance SIEM & Courbe d'Activité */}
            <div className="rounded-2xl bg-card/85 dark:bg-card/75 border border-border/90 hover:border-primary/40 shadow-xs p-4.5 backdrop-blur-md transition-all min-w-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Surveillance SIEM</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">Wazuh SIEM · XDR</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                  {timeRange}
                </span>
              </div>

              <div className="mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">1 248</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">eps nominal</span>
                </div>
                <p className="text-xs text-muted-foreground">Événements analysés par seconde</p>
              </div>

              <div className="h-28 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ALERT_TREND} margin={{ left: -25, right: 5, top: 5, bottom: 0 }}>
                    <defs>
                      <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="h" fontSize={9} stroke="#94a3b8" tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "0.75rem",
                        fontSize: "11px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="blocked"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      fill="url(#primaryGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Carte : Parc EDR & Topologie Endpoints */}
            <div className="rounded-2xl bg-card/85 dark:bg-card/75 border border-border/90 hover:border-cyan-500/40 shadow-xs p-4.5 backdrop-blur-md transition-all min-w-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                    <Laptop className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Parc & Inventaire EDR</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">Répartition Hôtes</p>
                  </div>
                </div>
                <Link
                  to="/clients/inventory"
                  className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline font-bold flex items-center gap-0.5"
                >
                  Détails <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                {[
                  { label: "Serveurs", value: String(distribution.servers), color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" },
                  { label: "Postes PC", value: String(distribution.pcs), color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10" },
                  { label: "IoT / OT", value: String(distribution.iot), color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl p-2 border border-border/80 ${s.bg}`}>
                    <span className={`font-black text-base font-mono ${s.color}`}>{s.value}</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 via-primary to-violet-500 rounded-full w-full" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center font-medium">
                {totalPcs} hôtes surveillés sans interruption de télémétrie.
              </p>
            </div>

            {/* Carte : Indice de Résilience & Conformité SOC */}
            <div className="rounded-2xl bg-card/85 dark:bg-card/75 border border-border/90 hover:border-primary/40 shadow-xs p-4.5 backdrop-blur-md transition-all min-w-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Score de Conformité</p>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  98.5<span className="text-lg text-primary">%</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  ISO 27001 Conforme
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { label: "Couverture EDR Endpoints", pct: 100, color: "bg-primary" },
                  { label: "Couverture Matrice MITRE ATT&CK", pct: 94, color: "bg-violet-500" },
                  { label: "Fraîcheur Feeds Threat Intel (MISP)", pct: 100, color: "bg-emerald-500" },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground font-medium">{m.label}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{m.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ─── COLONNE CENTRALE : Globe Holographique & Console Live ─── */}
          <div className="lg:col-span-8 xl:col-span-6 flex flex-col gap-5 min-w-0">

            {/* Zone Visuelle Centrale : Globe & Hologramme Cyber */}
            <div className="relative rounded-3xl bg-gradient-to-b from-card/90 via-card/80 to-secondary/30 border border-border/90 overflow-hidden shadow-md min-w-0" style={{ minHeight: 420 }}>
              {/* Halo d'ambiance dynamique */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,hsl(var(--primary)/0.12),transparent)] pointer-events-none" />

              {/* Composant Globe interactif */}
              <div className="absolute inset-0 flex items-center justify-center">
                <CyberHoloGlobe />
              </div>

              {/* Étiquette Flottante Haut Gauche : MISP CTI */}
              <div className="absolute top-4 left-4">
                <div className="bg-card/90 backdrop-blur-md border border-border rounded-2xl px-3 py-2 shadow-sm">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5 flex items-center gap-1.5">
                    <Radio className="h-3 w-3 text-primary" /> Flux Threat Intel (MISP)
                  </p>
                  <p className="text-xs font-black text-slate-900 dark:text-white font-mono">
                    4 820 <span className="text-primary">IOCs</span>
                  </p>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">↑ +185 feeds Sonatel CTI</p>
                </div>
              </div>

              {/* Étiquette Flottante Haut Droite : SOAR Shuffle */}
              <div className="absolute top-4 right-4">
                <div className="bg-card/90 backdrop-blur-md border border-border rounded-2xl px-3 py-2 shadow-sm">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5 flex items-center gap-1">
                    <Workflow className="h-3 w-3 text-cyan-500" /> SOAR Shuffle
                  </p>
                  <p className="text-xs font-black text-slate-900 dark:text-white font-mono">
                    14 <span className="text-cyan-600 dark:text-cyan-400">Playbooks Runs</span>
                  </p>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">100% remédiation réussie</p>
                </div>
              </div>

              {/* Étiquette Flottante Bas Gauche : TheHive Incidents */}
              <div className="absolute bottom-4 left-4">
                <div className="bg-card/90 backdrop-blur-md border border-border rounded-2xl px-3 py-2 shadow-sm">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5 flex items-center gap-1">
                    <Bug className="h-3 w-3 text-amber-500" /> TheHive & IRIS
                  </p>
                  <p className="text-xs font-black text-slate-900 dark:text-white font-mono">
                    3 <span className="text-amber-600 dark:text-amber-400">Cas Actifs</span>
                  </p>
                  <p className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">En cours d'investigation</p>
                </div>
              </div>

              {/* Étiquette Flottante Bas Droite : Trafic Suspect */}
              <div className="absolute bottom-4 right-4">
                <div className="bg-card/90 backdrop-blur-md border border-border rounded-2xl px-3 py-2 shadow-sm">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5 flex items-center gap-1">
                    <Globe2 className="h-3 w-3 text-red-500" /> Origines Bloquées
                  </p>
                  <p className="text-xs font-black text-slate-900 dark:text-white font-mono">
                    Top: <span className="text-red-500">CN · RU · NG · US</span>
                  </p>
                  <p className="text-[9px] text-muted-foreground font-medium">12 sous-réseaux isolés</p>
                </div>
              </div>
            </div>

            {/* Console Télémétrique Wazuh Live (Event Stream Cyber) */}
            <div className="rounded-2xl bg-card/85 dark:bg-card/75 border border-border/90 shadow-xs p-4.5 backdrop-blur-md min-w-0">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Console SOC · Journal d'Événements Live
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono">Wazuh SIEM & EDR</span>
                  <PulseDot color="bg-emerald-500" />
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono max-h-44 overflow-y-auto pr-1">
                {[
                  ...(latestAdded ? [{
                    t: "À l'instant",
                    msg: `Nouvel agent EDR enrôlé · Hôte ${latestAdded.hostname} (${latestAdded.clientName}) · actif`,
                    color: "text-emerald-500 font-bold",
                    badge: "ENROLLED"
                  }] : []),
                  { t: "13:48:12", msg: "SSH brute-force intercepté · IP 196.253.24.12 · bloqué via SOAR", color: "text-red-500 dark:text-red-400", badge: "BLOCKED" },
                  { t: "13:46:55", msg: "Playbook Quarantaine exécuté · Hôte SRV-PROD-02 · succès", color: "text-primary", badge: "SOAR" },
                  { t: "13:42:10", msg: "MISP Sync · 42 IOCs SHA256 importés · feed Sonatel CTI", color: "text-cyan-600 dark:text-cyan-400", badge: "MISP" },
                  { t: "13:38:04", msg: "Wazuh EDR · Script PowerShell obfusqué intercepté · bloqué", color: "text-amber-600 dark:text-amber-400", badge: "WAZUH" },
                  { t: "13:30:19", msg: `Wazuh agent check-in · ${totalPcs}/${totalPcs} actifs · latence moy. 14ms`, color: "text-emerald-600 dark:text-emerald-400", badge: "HEALTH" },
                ].map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2 rounded-xl bg-secondary/50 border border-border/70 text-[11px] min-w-0">
                    <span className="text-muted-foreground shrink-0">{log.t}</span>
                    <span className={`font-bold shrink-0 text-[9px] px-1.5 py-0.2 rounded-md ${
                      log.badge === "ENROLLED" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-pulse font-black" :
                      log.badge === "BLOCKED" ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" :
                      log.badge === "SOAR" ? "bg-primary/10 text-primary border border-primary/20" :
                      "bg-secondary text-muted-foreground border border-border"
                    }`}>
                      {log.badge}
                    </span>
                    <span className={`flex-1 truncate ${log.color}`}>{log.msg}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/alertes"
                className="mt-3 flex items-center justify-center gap-2 py-2 rounded-xl bg-secondary hover:bg-accent border border-border text-xs font-bold text-foreground transition-all"
              >
                <Eye className="h-3.5 w-3.5" /> Ouvrir la console SIEM complète →
              </Link>
            </div>

          </div>

          {/* ─── COLONNE DROITE : Connecteurs Stack, Incidents & Copilote IA ─── */}
          <div className="lg:col-span-12 xl:col-span-3 flex flex-col sm:flex-row xl:flex-col gap-4 min-w-0">

            {/* Carte : Connecteurs Stack SOC (Référence Module Outils du Sidebar) */}
            <div className="flex-1 rounded-2xl bg-card/85 dark:bg-card/75 border border-border/90 hover:border-primary/40 shadow-xs p-4.5 backdrop-blur-md transition-all min-w-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Network className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Stack SOC (Outils)</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">Connecteurs & API</p>
                  </div>
                </div>
                <Link
                  to="/integrations"
                  className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5"
                >
                  Gérer <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-2">
                {mockConnectors.map((conn) => (
                  <div
                    key={conn.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-secondary/40 border border-border/70"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${
                        conn.status === "up" ? "bg-emerald-500" :
                        conn.status === "degraded" ? "bg-amber-500 animate-pulse" :
                        "bg-red-500"
                      }`} />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{conn.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-muted-foreground">{conn.latencyMs}ms</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                        conn.status === "up" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                        conn.status === "degraded" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" :
                        "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                      }`}>
                        {conn.status === "up" ? "UP" : conn.status === "degraded" ? "DEG" : "DOWN"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Carte : Incidents Récents (TheHive / IRIS) */}
            <div className="flex-1 rounded-2xl bg-card/85 dark:bg-card/75 border border-border/90 hover:border-red-500/40 shadow-xs p-4.5 backdrop-blur-md transition-all min-w-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">TheHive · DFIR IRIS</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">Incidents Actifs</p>
                  </div>
                </div>
                <Link
                  to="/alertes"
                  className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5"
                >
                  Tous <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-2">
                {mockIncidentTimeline.slice(0, 3).map((inc) => {
                  const isCrit = inc.severity === "critical";
                  const isHigh = inc.severity === "high";
                  return (
                    <div
                      key={inc.id}
                      className="flex items-start gap-2 p-2 rounded-xl bg-secondary/40 border border-border/70"
                    >
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase shrink-0 ${
                        isCrit ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" :
                        isHigh ? "bg-primary/10 text-primary border border-primary/20" :
                        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      }`}>
                        {inc.severity.slice(0, 4)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">{inc.title}</p>
                        <p className="text-[9px] text-muted-foreground font-mono">{inc.caseRef}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Carte : Copilote IA Djib'son (Assistant IA du Sidebar) */}
            <div className="flex-1 rounded-2xl bg-gradient-to-br from-violet-500/10 via-card/85 to-card border border-violet-500/25 shadow-xs p-4.5 backdrop-blur-md transition-all min-w-0">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/25">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">Djib'son IA</p>
                  <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">Copilote Cyber Prédictif</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed italic mb-3">
                "Aucune anomalie critique non contenue. Recommandation : rotation planifiée des tokens SOAR dans 48h."
              </p>
              <div className="space-y-1.5 mb-3 text-xs">
                {[
                  { label: "3 anomalies comportementales", color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
                  { label: "2 playbooks recommandés", color: "text-cyan-600 dark:text-cyan-400", dot: "bg-cyan-500" },
                  { label: "18 IOCs enrichis par IA", color: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500" },
                ].map((r) => (
                  <div key={r.label} className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${r.dot} shrink-0`} />
                    <span className={`${r.color} font-medium`}>{r.label}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/assistant"
                className="flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-violet-500/20 hover:opacity-95 transition-all"
              >
                <Sparkles className="h-3.5 w-3.5" /> Interroger Djib'son IA
              </Link>
            </div>

          </div>

        </div>

        {/* ══════ MATRICE MITRE ATT&CK SUR TOUTE LA LARGEUR ══════ */}
        <div className="w-full rounded-2xl bg-card/85 dark:bg-card/75 border border-border/90 shadow-xs p-5 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">Matrice MITRE ATT&CK</p>
                <p className="text-[10px] text-muted-foreground">Tactiques adverses observées · Enterprise v14.1</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-muted-foreground bg-secondary px-2.5 py-1 rounded-md border border-border w-fit">
              Framework Sonatel Group
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {mockMitreTactics.slice(0, 8).map((tactic) => {
              const pct = Math.min(100, Math.round((tactic.count / maxMitre) * 100));
              const isCrit = pct > 60;
              return (
                <div key={tactic.tacticId} className="p-3 rounded-xl bg-secondary/40 border border-border/70 space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[9px] text-primary font-bold shrink-0">{tactic.tacticId}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{tactic.tactic}</span>
                    </div>
                    <span className={`font-black font-mono ml-2 shrink-0 ${isCrit ? "text-red-500" : "text-muted-foreground"}`}>
                      {tactic.count}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isCrit ? "bg-gradient-to-r from-primary to-red-500" : "bg-gradient-to-r from-violet-500 to-cyan-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════ CONSOLE OPÉRATIONNELLE ÉTALÉE JUSTE EN DESSOUS DE LA MATRICE MITRE ATT&CK ══════ */}
        <div className="w-full rounded-2xl bg-card/85 dark:bg-card/75 border border-border/90 shadow-xs p-5 backdrop-blur-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-border">
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">Console Opérationnelle</p>
              <p className="text-[10px] text-muted-foreground">Accès direct et structuré aux sous-menus d'administration, supervision clients et facturation</p>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground font-mono">
              3 Domaines Métiers · 17 Sous-Menus Connectés
            </span>
          </div>

          {/* ── LIGNE 1 : SOUS-MENU ADMINISTRATION (7 MODULES) ── */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                Ligne 1 · Administration
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">(Gestion RH, Profils, Offres, Paramètres, Connecteurs, Audit)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {[
                { label: "Gestion des agents", to: "/admin", icon: UserCog, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10", border: "hover:border-indigo-500/40" },
                { label: "Nouveau RH", to: "/admin/new", icon: UserPlus, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", border: "hover:border-blue-500/40" },
                { label: "Gestion des profils", to: "/admin/profiles", icon: Shield, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10", border: "hover:border-cyan-500/40" },
                { label: "Catalogues Offres", to: "/admin/offres", icon: CreditCard, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", border: "hover:border-violet-500/40" },
                { label: "Paramètres Globaux", to: "/settings", icon: Sliders, color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-500/10", border: "hover:border-slate-500/40" },
                { label: "Connecteurs & API", to: "/integrations", icon: Plug, color: "text-primary", bg: "bg-primary/10", border: "hover:border-primary/40" },
                { label: "Journaux d'Audit", to: "/audit", icon: FileText, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "hover:border-emerald-500/40" },
              ].map((mod) => {
                const Icon = mod.icon;
                return (
                  <Link
                    key={mod.label}
                    to={mod.to}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border/80 ${mod.border} hover:bg-accent/40 transition-all text-center group min-w-0 shadow-xs`}
                  >
                    <div className={`h-8 w-8 rounded-lg ${mod.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-4 w-4 ${mod.color}`} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors truncate w-full">
                      {mod.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ── LIGNE 2 : SOUS-MENU MODULE CLIENTS (5 MODULES) ── */}
          <div className="space-y-2.5 pt-2 border-t border-border/60">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                Ligne 2 · Module Clients
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">(Comptes, Onboarding, Satisfaction, SLA & Parc EDR)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {[
                { label: "Liste des clients", to: "/clients", icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", border: "hover:border-blue-500/40" },
                { label: "Nouveau client", to: "/clients/new", icon: UserPlus, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "hover:border-emerald-500/40" },
                { label: "Satisfaction & NPS", to: "/clients/satisfaction", icon: ThumbsUp, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "hover:border-amber-500/40" },
                { label: "SLA & Performance", to: "/clients/sla", icon: ShieldCheck, color: "text-primary", bg: "bg-primary/10", border: "hover:border-primary/40" },
                { label: "Parc & Inventaire EDR", to: "/clients/inventory", icon: Laptop, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10", border: "hover:border-cyan-500/40" },
              ].map((mod) => {
                const Icon = mod.icon;
                return (
                  <Link
                    key={mod.label}
                    to={mod.to}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border/80 ${mod.border} hover:bg-accent/40 transition-all text-center group min-w-0 shadow-xs`}
                  >
                    <div className={`h-8 w-8 rounded-lg ${mod.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-4 w-4 ${mod.color}`} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors truncate w-full">
                      {mod.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ── LIGNE 3 : SOUS-MENU MODULE FACTURATION (5 MODULES) ── */}
          <div className="space-y-2.5 pt-2 border-t border-border/60">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                Ligne 3 · Module Facturation
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">(Revenus, Factures, Contrats, Relances & Abonnements PayTech)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {[
                { label: "Tableau de Bord", to: "/facturation", hash: "dashboard", icon: BarChart3, color: "text-primary", bg: "bg-primary/10", border: "hover:border-primary/40" },
                { label: "Factures & Échéancier", to: "/facturation", hash: "invoices", icon: FileText, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", border: "hover:border-violet-500/40" },
                { label: "Contrats Clients", to: "/facturation", hash: "contracts", icon: Briefcase, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "hover:border-emerald-500/40" },
                { label: "Relances & Rappels", to: "/facturation", hash: "reminders", icon: BellRing, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", border: "hover:border-rose-500/40" },
                { label: "Abonnements PayTech", to: "/facturation", hash: "abonnements", icon: CreditCard, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10", border: "hover:border-cyan-500/40" },
              ].map((mod) => {
                const Icon = mod.icon;
                return (
                  <Link
                    key={mod.label}
                    to={mod.to}
                    hash={mod.hash}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border/80 ${mod.border} hover:bg-accent/40 transition-all text-center group min-w-0 shadow-xs`}
                  >
                    <div className={`h-8 w-8 rounded-lg ${mod.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-4 w-4 ${mod.color}`} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors truncate w-full">
                      {mod.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

        </div>

        {/* ══════ PIED DE PAGE DU CENTRE DE COMMANDEMENT ══════ */}
        <div className="pt-4 border-t border-border/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
          <span>Plateforme INOVA-IRIS SOC · Direction Cybersécurité Sonatel · {new Date().getFullYear()}</span>
          <div className="flex items-center gap-1.5">
            <PulseDot color="bg-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Tous systèmes opérationnels · DEFCON 4</span>
          </div>
          <span>ISO 27001 Conforme · Djibril Sanou Gueye</span>
        </div>

      </div>
    </div>
  );
}