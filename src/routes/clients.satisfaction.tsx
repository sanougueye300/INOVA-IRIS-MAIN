import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ThumbsUp, Send, Smile, Meh, Frown, MessageSquare,
  Sparkles, AlertCircle, RefreshCw, TrendingUp, Star, Bell
} from "lucide-react";

export const Route = createFileRoute("/clients/satisfaction")({
  head: () => ({ meta: [{ title: "Satisfaction & NPS — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><SatisfactionPage /></RequireAuth>,
});

interface NpsEntry {
  id: string; clientName: string; organization: string;
  score: number; comment: string; date: string;
  sentiment: "positif" | "neutre" | "négatif"; category: string;
}

const SEED: NpsEntry[] = [
  { id: "1", clientName: "Ibrahima Diallo", organization: "Ageroute Sénégal", score: 9, comment: "L'équipe SOC a détecté et isolé la menace en moins de 8 min. Impressionnant.", date: "2026-05-20", sentiment: "positif", category: "Performance" },
  { id: "2", clientName: "Fatou Ndiaye", organization: "SONABHY", score: 7, comment: "Bonne réactivité, mais la communication lors des incidents peut être améliorée.", date: "2026-05-18", sentiment: "neutre", category: "Communication" },
  { id: "3", clientName: "Moussa Coulibaly", organization: "Min. des Finances", score: 5, comment: "Délai trop long lors de l'incident du 15 mai. Nous attendons des améliorations.", date: "2026-05-15", sentiment: "négatif", category: "Délai SLA" },
  { id: "4", clientName: "Aminata Traoré", organization: "Orange Burkina", score: 10, comment: "Service parfait ! La console EDR est très intuitive et l'assistance 24/7 irréprochable.", date: "2026-05-12", sentiment: "positif", category: "Interface" },
  { id: "5", clientName: "Cheikh Diop", organization: "BIS Group", score: 8, comment: "La mise à jour auto des agents Wazuh a grandement simplifié notre gestion.", date: "2026-05-10", sentiment: "positif", category: "Automatisation" },
  { id: "6", clientName: "Mariam Koné", organization: "Groupe CFAO", score: 6, comment: "Le tableau de bord est parfois lent. Nous espérons des optimisations.", date: "2026-05-08", sentiment: "négatif", category: "Performance" },
];

const TREND = [
  { month: "Jan", p: 65, pa: 22, d: 13, nps: 52 },
  { month: "Fév", p: 70, pa: 18, d: 12, nps: 58 },
  { month: "Mar", p: 68, pa: 20, d: 12, nps: 56 },
  { month: "Avr", p: 72, pa: 17, d: 11, nps: 61 },
  { month: "Mai", p: 75, pa: 15, d: 10, nps: 65 },
  { month: "Jun", p: 78, pa: 13, d: 9,  nps: 69 },
];

const TEMPLATES: Record<string, { label: string; subject: string; body: string }> = {
  post_incident: { label: "Post-incident", subject: "Votre avis sur notre traitement — SOC Sonatel", body: "Bonjour [Nom],\n\nSuite à l'incident de sécurité récemment traité, nous souhaitons recueillir votre feedback.\n\nSur une échelle de 0 à 10, dans quelle mesure nous recommanderiez-vous ?\n[LIEN_SONDAGE]\n\nMerci,\nL'équipe SOC Sonatel" },
  quarterly: { label: "Sondage trimestriel", subject: "Évaluation trimestrielle — Comment se porte votre sécurité ?", body: "Bonjour [Nom],\n\nVotre avis est essentiel pour améliorer nos services de cybersécurité.\n\nSur une échelle de 0 à 10, quelle note donneriez-vous à notre accompagnement ?\n[LIEN_SONDAGE]\n\nCordialement,\nL'équipe CyberSOC Sonatel" },
  renewal: { label: "Renouvellement", subject: "Votre contrat arrive bientôt à échéance — Partagez votre avis", body: "Bonjour [Nom],\n\nVotre contrat arrive prochainement à renouvellement. Nous souhaitons connaître votre satisfaction globale.\n\nSur 0 à 10, seriez-vous prêt à nous recommander ?\n[LIEN_SONDAGE]\n\nMerci de votre fidélité,\nSonatel CyberSOC" },
};

function SatisfactionPage() {
  const [reviews, setReviews] = useState<NpsEntry[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [tpl, setTpl] = useState("quarterly");
  const [dest, setDest] = useState("all");
  const [filter, setFilter] = useState("all");
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem("soc_nps_reviews");
    setReviews(s ? JSON.parse(s) : SEED);
    if (!s) localStorage.setItem("soc_nps_reviews", JSON.stringify(SEED));
    supabase.from("profiles").select("id,full_name,organization").then(({ data }) => { if (data) setClients(data); });
  }, []);

  const promoters  = reviews.filter(r => r.score >= 9).length;
  const passives   = reviews.filter(r => r.score >= 7 && r.score <= 8).length;
  const detractors = reviews.filter(r => r.score <= 6).length;
  const total      = reviews.length;
  const nps        = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
  const avg        = total > 0 ? (reviews.reduce((a, r) => a + r.score, 0) / total).toFixed(1) : "0";
  const npsColor   = nps >= 50 ? "text-emerald-500" : nps >= 0 ? "text-amber-500" : "text-red-500";
  const gaugeDeg   = Math.min(180, ((nps + 100) / 200) * 180);

  const sendSurvey = async () => {
    setSending(true);
    await new Promise(r => setTimeout(r, 2000));
    setSending(false); setDrawer(false);
    toast.success("Enquête NPS envoyée !", { description: `Gabarit "${TEMPLATES[tpl].label}" transmis aux clients sélectionnés.` });
  };

  const sIcon = (s: string) => s === "positif" ? <Smile className="h-3.5 w-3.5 text-emerald-500" /> : s === "négatif" ? <Frown className="h-3.5 w-3.5 text-red-500" /> : <Meh className="h-3.5 w-3.5 text-amber-500" />;
  const sBadge = (s: string) => ({ positif: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", négatif: "bg-red-500/10 text-red-600 border-red-500/20", neutre: "bg-amber-500/10 text-amber-600 border-amber-500/20" }[s] || "");

  const filtered = reviews.filter(r => filter === "all" || r.sentiment === filter);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0b0c10] relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
              <ThumbsUp className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-amber-600 to-amber-800 dark:from-white dark:via-amber-400 dark:to-yellow-500 bg-clip-text text-transparent">
                Satisfaction & NPS Clients
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Score NPS temps réel · Analyse de sentiment IA · Envoi d'enquêtes multicanal</p>
            </div>
          </div>
          <Button onClick={() => setDrawer(true)} className="rounded-xl font-extrabold bg-amber-500 hover:bg-amber-600 text-white gap-2 shadow-lg">
            <Send className="h-4 w-4" /> Envoyer une enquête NPS
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Gauge */}
          <Card className="sm:col-span-2 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800 shadow-xl rounded-2xl p-6 flex flex-col items-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Score NPS Global</p>
            <div className="relative w-48 h-28">
              <svg viewBox="0 0 200 110" className="w-full">
                <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="#e2e8f0" strokeWidth="18" strokeLinecap="round" className="dark:stroke-zinc-800" />
                <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none"
                  stroke={nps >= 50 ? "#10b981" : nps >= 0 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="18" strokeLinecap="round"
                  strokeDasharray={`${(gaugeDeg / 180) * 267} 267`} />
                <line x1="100" y1="100"
                  x2={100 + 65 * Math.cos(((180 - gaugeDeg) * Math.PI) / 180)}
                  y2={100 - 65 * Math.sin(((180 - gaugeDeg) * Math.PI) / 180)}
                  stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
                <circle cx="100" cy="100" r="6" fill="#f59e0b" />
              </svg>
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <span className={`text-4xl font-black ${npsColor}`}>{nps}</span>
                <span className="text-xs text-muted-foreground ml-1">/ 100</span>
              </div>
            </div>
            <div className="flex gap-4 mt-3 text-[10px] font-black uppercase">
              <span className="text-emerald-500">{promoters} Promoteurs</span>
              <span className="text-amber-500">{passives} Passifs</span>
              <span className="text-red-500">{detractors} Détracteurs</span>
            </div>
          </Card>

          <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800 shadow-xl rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Note Moyenne</span>
              <Star className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-4xl font-black text-slate-900 dark:text-white">{avg}<span className="text-xl font-normal text-muted-foreground">/10</span></div>
            <div className="flex gap-0.5 mt-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className={`text-[10px] ${i < Math.round(parseFloat(avg)) ? "text-amber-400" : "text-slate-200 dark:text-zinc-700"}`}>★</span>
              ))}
            </div>
          </Card>

          <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800 shadow-xl rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Réponses totales</span>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-4xl font-black text-slate-900 dark:text-white">{total}</div>
            <div className="text-[10px] mt-2 font-semibold flex items-center gap-1">
              {detractors > 0
                ? <><AlertCircle className="h-3 w-3 text-red-500 animate-pulse" /><span className="text-red-500">{detractors} détracteur(s) à traiter</span></>
                : <><Sparkles className="h-3 w-3 text-emerald-500" /><span className="text-emerald-500">Aucun détracteur actif</span></>}
            </div>
          </Card>
        </div>

        {/* Trend bars */}
        <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800 shadow-xl rounded-2xl p-6 mb-8">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-500" /> Évolution du NPS sur 6 mois
          </h3>
          <div className="flex items-end gap-3 h-44">
            {TREND.map(m => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-slate-100 dark:bg-zinc-950 rounded-xl h-36 flex flex-col justify-end overflow-hidden">
                  <div className="w-full bg-red-400/60" style={{ height: `${m.d}%` }} />
                  <div className="w-full bg-amber-400/60" style={{ height: `${m.pa}%` }} />
                  <div className="w-full bg-emerald-400/80" style={{ height: `${m.p}%` }} />
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase">{m.month}</span>
                <span className={`text-[10px] font-black ${m.nps >= 60 ? "text-emerald-500" : m.nps >= 40 ? "text-amber-500" : "text-red-500"}`}>{m.nps}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-6 mt-4 text-[10px] font-bold uppercase">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400/80 inline-block" /> Promoteurs (9-10)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400/60 inline-block" /> Passifs (7-8)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400/60 inline-block" /> Détracteurs (0-6)</span>
          </div>
        </Card>

        {/* Reviews */}
        <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800 shadow-xl rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-zinc-850 flex flex-wrap gap-3 items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-amber-500" /> Avis & Commentaires
            </h3>
            <div className="flex gap-2">
              {["all", "positif", "neutre", "négatif"].map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${filter === s ? "bg-amber-500 text-white" : "bg-slate-100 dark:bg-zinc-900 text-muted-foreground hover:bg-slate-200"}`}>
                  {s === "all" ? "Tous" : s}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-zinc-850">
            {filtered.map(r => (
              <div key={r.id} className={`p-5 hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 transition-colors ${r.sentiment === "négatif" ? "border-l-4 border-red-500" : ""}`}>
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-amber-500/10 text-amber-500 font-black text-xs">
                      {r.clientName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-black text-slate-800 dark:text-zinc-100">{r.clientName}</span>
                      <span className="text-[10px] text-muted-foreground">{r.organization}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${sBadge(r.sentiment)}`}>
                        {sIcon(r.sentiment)}{r.sentiment}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-900 rounded-full text-[9px] font-black uppercase text-muted-foreground">{r.category}</span>
                    </div>
                    <div className="flex gap-0.5 mb-1.5">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <span key={i} className={`text-[10px] ${i < r.score ? "text-amber-400" : "text-slate-200 dark:text-zinc-700"}`}>★</span>
                      ))}
                      <span className="ml-2 text-xs font-black text-slate-700 dark:text-zinc-300">{r.score}/10</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed italic">"{r.comment}"</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-semibold">{r.date}</p>
                  </div>
                  {r.sentiment === "négatif" && (
                    <Button size="sm" onClick={() => toast.info("Relance envoyée", { description: `Un suivi a été initié pour ${r.clientName}.` })}
                      className="h-8 text-[9px] font-black uppercase bg-red-500 hover:bg-red-600 text-white rounded-lg gap-1 shrink-0">
                      <Bell className="h-3 w-3" /> Relancer
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => !sending && setDrawer(false)} />
          <div className="relative w-full max-w-lg h-full bg-white dark:bg-[#0b0c10] border-l border-slate-100 dark:border-zinc-850 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-zinc-850 bg-slate-50 dark:bg-zinc-950/20">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Passerelle d'enquête NPS</span>
              <h2 className="text-xl font-extrabold mt-0.5 dark:text-zinc-100">Envoyer un sondage de satisfaction</h2>
              <p className="text-xs text-muted-foreground mt-1">Choisissez un gabarit et les destinataires. Envoi simulé via Orange Business SMS & Mail.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Gabarit de sondage</label>
                <Select value={tpl} onValueChange={setTpl}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-zinc-800 text-sm font-semibold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATES).map(([k, t]) => (
                      <SelectItem key={k} value={k} className="text-sm font-semibold">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Destinataires</label>
                <Select value={dest} onValueChange={setDest}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-zinc-800 text-sm font-semibold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-sm font-semibold">Tous les clients actifs ({clients.length})</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-sm font-semibold">{c.full_name || c.organization || c.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aperçu du message</label>
                <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-100 dark:border-zinc-850">
                  <p className="text-[10px] font-bold text-amber-500 mb-1.5">OBJET : {TEMPLATES[tpl].subject}</p>
                  <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line font-medium">{TEMPLATES[tpl].body}</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-zinc-850 bg-slate-50 dark:bg-zinc-950/20 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDrawer(false)} className="rounded-xl font-bold">Annuler</Button>
              <Button onClick={sendSurvey} disabled={sending} className="rounded-xl font-extrabold bg-amber-500 hover:bg-amber-600 text-white gap-2 px-6">
                {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Envoyer le sondage
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
