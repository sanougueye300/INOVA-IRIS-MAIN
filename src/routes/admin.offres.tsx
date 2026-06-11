import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  CreditCard, Plus, Trash2, Edit2, Check, X, ShieldAlert, Sparkles,
  Clock, HeartHandshake, Info, ShieldCheck, Coins, Laptop, AlertTriangle,
  LayoutGrid, Table2, Search, TrendingUp, Activity, Star, Zap, Filter,
  ChevronDown, ChevronUp, Palette
} from "lucide-react";
import { toast } from "sonner";
import type { Offer } from "@/lib/offers";
import { DEFAULT_OFFERS, computeCatalogStats } from "@/lib/offers";

export type { Offer };
export { DEFAULT_OFFERS };

export const Route = createFileRoute("/admin/offres")({
  head: () => ({ meta: [{ title: "Catalogues des Offres — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><AdminOffres /></RequireAuth>,
});

type ViewMode = "grid" | "table" | "compare";
type SortField = "name" | "value" | "maxPcs" | "mttd";

const THEME_OPTIONS = [
  { value: "orange", label: "Orange (Inova)", color: "#f97316" },
  { value: "blue", label: "Bleu (Terranga)", color: "#3b82f6" },
  { value: "gold", label: "Or (Gainde)", color: "#f59e0b" },
  { value: "slate", label: "Ardoise (Neutre)", color: "#64748b" },
  { value: "purple", label: "Violet (Premium)", color: "#8b5cf6" },
  { value: "emerald", label: "Émeraude (Secure)", color: "#10b981" },
];

function getThemeTokens(theme?: string, isActive: boolean = true) {
  const map: Record<string, {
    card: string;
    badge: string;
    accent: string;
    glow: string;
    header: string;
    check: string;
  }> = {
    orange: {
      card: "border-orange-400/40 bg-gradient-to-br from-orange-500/8 via-transparent to-orange-400/4 shadow-orange-500/10 shadow-xl",
      badge: "bg-gradient-to-r from-orange-500 to-red-500 text-white border-none font-extrabold shadow-lg shadow-orange-500/30",
      accent: "text-orange-500",
      glow: "from-orange-400/20 to-transparent",
      header: "bg-orange-500/10",
      check: "text-orange-500",
    },
    blue: {
      card: "border-blue-400/40 bg-gradient-to-br from-blue-500/8 via-transparent to-indigo-400/4 shadow-blue-500/10 shadow-xl",
      badge: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-none font-bold shadow-lg shadow-blue-500/30",
      accent: "text-blue-500",
      glow: "from-blue-400/20 to-transparent",
      header: "bg-blue-500/10",
      check: "text-blue-500",
    },
    gold: {
      card: "border-amber-400/40 bg-gradient-to-br from-amber-500/8 via-transparent to-yellow-400/4 shadow-amber-500/10 shadow-xl",
      badge: "bg-gradient-to-r from-amber-400 to-amber-600 text-white border-none font-extrabold shadow-lg shadow-amber-500/30",
      accent: "text-amber-500",
      glow: "from-amber-400/20 to-transparent",
      header: "bg-amber-500/10",
      check: "text-amber-500",
    },
    purple: {
      card: "border-purple-400/40 bg-gradient-to-br from-purple-500/8 via-transparent to-violet-400/4 shadow-purple-500/10 shadow-xl",
      badge: "bg-gradient-to-r from-purple-500 to-violet-600 text-white border-none font-bold shadow-lg shadow-purple-500/30",
      accent: "text-purple-500",
      glow: "from-purple-400/20 to-transparent",
      header: "bg-purple-500/10",
      check: "text-purple-500",
    },
    emerald: {
      card: "border-emerald-400/40 bg-gradient-to-br from-emerald-500/8 via-transparent to-teal-400/4 shadow-emerald-500/10 shadow-xl",
      badge: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none font-bold shadow-lg shadow-emerald-500/30",
      accent: "text-emerald-500",
      glow: "from-emerald-400/20 to-transparent",
      header: "bg-emerald-500/10",
      check: "text-emerald-500",
    },
    slate: {
      card: "border-slate-400/40 bg-gradient-to-br from-slate-500/8 via-transparent to-slate-400/4 shadow-slate-500/10 shadow-xl",
      badge: "bg-gradient-to-r from-slate-500 to-slate-700 text-white border-none font-bold shadow-lg shadow-slate-500/30",
      accent: "text-slate-500",
      glow: "from-slate-400/20 to-transparent",
      header: "bg-slate-500/10",
      check: "text-slate-500",
    },
  };

  const resolved = theme && map[theme] ? map[theme] : map["slate"];
  if (!isActive) {
    return {
      ...resolved,
      card: "border-slate-300 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/20 opacity-60 shadow-none",
    };
  }
  return resolved;
}

function inferTheme(name: string, existingTheme?: string): string {
  if (existingTheme) return existingTheme;
  const l = name.toLowerCase();
  if (l.includes("gainde")) return "gold";
  if (l.includes("terranga")) return "blue";
  if (l.includes("inova")) return "orange";
  return "slate";
}

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub: React.ReactNode; accent?: string;
}) {
  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-300 border-border/50 bg-card/40 backdrop-blur-md relative overflow-hidden group cursor-default">
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 group-hover:opacity-15 transition-all duration-300">
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-3xl font-extrabold mt-2 ${accent || "text-foreground"}`}>{value}</p>
      <div className="mt-2">{sub}</div>
    </Card>
  );
}

function AdminOffres() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortAsc, setSortAsc] = useState(true);
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  // Form State
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formValue, setFormValue] = useState<number>(0);
  const [formMaxPcs, setFormMaxPcs] = useState<number>(10);
  const [formMttd, setFormMttd] = useState("< 15 min");
  const [formMttr, setFormMttr] = useState("< 2 heures");
  const [formSupport, setFormSupport] = useState("24h/7/365");
  const [formFeatures, setFormFeatures] = useState<string>("");
  const [formTheme, setFormTheme] = useState<string>("slate");

  // Charge et seed les offres depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem("soc_catalogues_offres");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const hasOldData = parsed.some(
          (o: any) => o.currency === "EUR" || ["bronze", "argent", "or", "platine"].includes(o.id)
        );
        if (hasOldData) {
          setOffers(DEFAULT_OFFERS);
          localStorage.setItem("soc_catalogues_offres", JSON.stringify(DEFAULT_OFFERS));
        } else {
          // Upgrade existing offers with correct prices if needed
          const upgraded = parsed.map((o: any) => {
            if (o.id === "terranga-secure" && o.value === 24000) {
              return { ...o, value: 250000, maxPcs: 25 };
            }
            if (o.id === "gainde-secure" && o.value === 60000) {
              return { ...o, value: 500000, maxPcs: 50 };
            }
            return o;
          });
          setOffers(upgraded);
          localStorage.setItem("soc_catalogues_offres", JSON.stringify(upgraded));
        }
      } catch (e) {
        setOffers(DEFAULT_OFFERS);
      }
    } else {
      setOffers(DEFAULT_OFFERS);
      localStorage.setItem("soc_catalogues_offres", JSON.stringify(DEFAULT_OFFERS));
    }
  }, []);

  const saveOffersToStorage = (newOffers: Offer[]) => {
    setOffers(newOffers);
    localStorage.setItem("soc_catalogues_offres", JSON.stringify(newOffers));
  };

  const toggleOfferStatus = (id: string) => {
    const updated = offers.map(o => o.id === id ? { ...o, isActive: !o.isActive } : o);
    saveOffersToStorage(updated);
    const offer = updated.find(o => o.id === id);
    toast.success(`Offre ${offer?.name}`, {
      description: `L'offre est désormais ${offer?.isActive ? "active" : "désactivée"}.`
    });
  };

  const handleOpenCreate = () => {
    setEditingOffer(null);
    setFormName("");
    setFormDescription("");
    setFormValue(100000);
    setFormMaxPcs(20);
    setFormMttd("< 15 min");
    setFormMttr("< 2 heures");
    setFormSupport("24h/7/365");
    setFormFeatures("SIEM Wazuh\nSupport standard\nIntégration d'IOCs");
    setFormTheme("slate");
    setIsPanelOpen(true);
  };

  const handleOpenEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormName(offer.name);
    setFormDescription(offer.description || "");
    setFormValue(offer.value);
    setFormMaxPcs(offer.maxPcs);
    setFormMttd(offer.mttd);
    setFormMttr(offer.mttr);
    setFormSupport(offer.support);
    setFormFeatures(offer.features.join("\n"));
    setFormTheme(inferTheme(offer.name, offer.theme));
    setIsPanelOpen(true);
  };

  const handleDeleteOffer = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const updated = offers.filter(o => o.id !== deleteTarget.id);
    saveOffersToStorage(updated);
    toast.error(`Offre ${deleteTarget.name} supprimée`, {
      description: "L'offre a été retirée du catalogue."
    });
    setDeleteTarget(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Champs requis", { description: "Veuillez entrer un nom d'offre." });
      return;
    }
    const featureList = formFeatures.split("\n").map(f => f.trim()).filter(f => f.length > 0);

    if (editingOffer) {
      const updated = offers.map(o =>
        o.id === editingOffer.id
          ? { ...o, name: formName, description: formDescription, value: Number(formValue), maxPcs: Number(formMaxPcs), mttd: formMttd, mttr: formMttr, support: formSupport, features: featureList, theme: formTheme }
          : o
      );
      saveOffersToStorage(updated);
      toast.success("Offre modifiée", { description: `L'offre ${formName} a été mise à jour.` });
    } else {
      const newOffer: Offer = {
        id: "offer_" + Date.now(),
        name: formName,
        description: formDescription,
        value: Number(formValue),
        currency: "FCFA",
        period: "mois",
        maxPcs: Number(formMaxPcs),
        mttd: formMttd,
        mttr: formMttr,
        support: formSupport,
        features: featureList,
        isActive: true,
        theme: formTheme,
      };
      saveOffersToStorage([...offers, newOffer]);
      toast.success("Offre créée", { description: `L'offre ${formName} a été ajoutée au catalogue.` });
    }
    setIsPanelOpen(false);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const filteredOffers = useMemo(() => {
    let list = [...offers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o =>
        o.name.toLowerCase().includes(q) ||
        (o.description || "").toLowerCase().includes(q) ||
        o.features.some(f => f.toLowerCase().includes(q))
      );
    }
    if (filterActive === "active") list = list.filter(o => o.isActive);
    if (filterActive === "inactive") list = list.filter(o => !o.isActive);
    list.sort((a, b) => {
      let av: any = a[sortField], bv: any = b[sortField];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return list;
  }, [offers, searchQuery, filterActive, sortField, sortAsc]);

  const stats = useMemo(() => computeCatalogStats(offers), [offers]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="h-3.5 w-3.5 opacity-30" />;
    return sortAsc ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-500/3 blur-[200px] pointer-events-none" />

      <div className="container mx-auto px-4 py-8 relative z-10">

        {/* ── Header ── */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shadow-inner ring-1 ring-primary/20">
                <CreditCard className="h-6 w-6 animate-pulse" />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 dark:from-gray-100 dark:via-gray-300 dark:to-gray-500 bg-clip-text text-transparent">
                Catalogues Offres
              </h1>
            </div>
            <p className="text-muted-foreground text-sm max-w-xl">
              Supervisez, configurez et ajustez vos formules de facturation SOC &amp; EDR.
            </p>
          </div>
          <Button
            onClick={handleOpenCreate}
            className="shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl px-5 py-6 gap-2 ring-2 ring-primary/30"
          >
            <Plus className="h-5 w-5" /> Créer une offre
          </Button>
        </div>

        {/* ── Stats KPIs ── */}
        <div className="grid gap-5 md:grid-cols-4 mb-8">
          <StatCard
            icon={<Coins className="h-16 w-16 text-primary" />}
            label="Valeur Moyenne Catalogue"
            value={`${stats.avgValue.toLocaleString("fr-FR")} FCFA`}
            sub={<div className="flex items-center gap-1 text-xs text-emerald-500"><Sparkles className="h-3.5 w-3.5" /><span>par mois / offre</span></div>}
          />
          <StatCard
            icon={<TrendingUp className="h-16 w-16 text-emerald-500" />}
            label="Revenus Mensuels Total"
            value={`${stats.totalMonthly.toLocaleString("fr-FR")} FCFA`}
            sub={<div className="flex items-center gap-1 text-xs text-emerald-500"><Activity className="h-3.5 w-3.5" /><span>Toutes offres actives</span></div>}
            accent="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            icon={<CreditCard className="h-16 w-16 text-blue-500" />}
            label="Offres Commercialisées"
            value={`${stats.active} actives`}
            sub={<div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/20 text-blue-600 bg-blue-500/5">{stats.total} totales</Badge><span>en catalogue</span></div>}
          />
          <StatCard
            icon={<Clock className="h-16 w-16 text-purple-500" />}
            label="SLA Réponse Garanti"
            value="< 5 min"
            sub={<div className="flex items-center gap-1 text-xs text-purple-500"><ShieldCheck className="h-3.5 w-3.5" /><span>Support prioritaire Platine</span></div>}
            accent="text-purple-600 dark:text-purple-400"
          />
        </div>

        {/* ── Filters & View Toggle ── */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher une offre..."
              className="pl-9 rounded-xl border-border/60 bg-card/50 backdrop-blur"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "active", "inactive"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterActive(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${filterActive === f
                  ? "bg-primary text-primary-foreground border-primary shadow"
                  : "bg-card/50 text-muted-foreground border-border/50 hover:bg-muted"
                  }`}
              >
                {f === "all" ? "Toutes" : f === "active" ? "Actives" : "Inactives"}
              </button>
            ))}
            <div className="h-5 w-px bg-border/50 mx-1 hidden sm:block" />
            {/* View mode buttons */}
            <div className="flex bg-card/50 border border-border/50 rounded-xl overflow-hidden">
              {([
                { mode: "grid", icon: <LayoutGrid className="h-4 w-4" />, label: "Cartes" },
                { mode: "table", icon: <Table2 className="h-4 w-4" />, label: "Tableau" },
                { mode: "compare", icon: <Zap className="h-4 w-4" />, label: "Comparer" },
              ] as { mode: ViewMode; icon: React.ReactNode; label: string }[]).map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all ${viewMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                    }`}
                  title={label}
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result count */}
        {searchQuery && (
          <p className="text-xs text-muted-foreground mb-4">
            {filteredOffers.length} résultat{filteredOffers.length !== 1 ? "s" : ""} pour « {searchQuery} »
          </p>
        )}

        {/* ── Grid View ── */}
        {viewMode === "grid" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOffers.map(offer => {
              const theme = getThemeTokens(inferTheme(offer.name, offer.theme), offer.isActive);
              return (
                <Card
                  key={offer.id}
                  className={`border transition-all duration-300 relative flex flex-col justify-between hover:scale-[1.02] hover:shadow-2xl rounded-2xl overflow-hidden ${theme.card}`}
                >
                  {/* Top colored bar */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${theme.glow.replace("from-", "from-").replace("to-transparent", "to-transparent")}`}
                    style={{ background: `linear-gradient(to right, ${THEME_OPTIONS.find(t => t.value === inferTheme(offer.name, offer.theme))?.color || "#64748b"}80, transparent)` }}
                  />

                  <div className="p-6">
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex flex-col gap-1.5">
                        <Badge className={`px-2.5 py-0.5 rounded-full text-xs ${theme.badge}`}>{offer.name}</Badge>
                        {!offer.isActive && <Badge variant="secondary" className="rounded-full text-[10px] w-fit">Inactif</Badge>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit(offer)} title="Modifier">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-rose-500" onClick={() => handleDeleteOffer(offer.id, offer.name)} title="Supprimer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Description */}
                    {offer.description && (
                      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{offer.description}</p>
                    )}

                    {/* Price */}
                    <div className="mb-5">
                      <div className="text-3xl font-extrabold text-foreground flex items-baseline gap-1">
                        {offer.value.toLocaleString("fr-FR")}
                        <span className="text-base font-medium text-muted-foreground"> {offer.currency}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">par mois</div>
                    </div>

                    <div className="border-t border-border/40 my-4" />

                    {/* Specs */}
                    <div className="space-y-2.5 mb-5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Laptop className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>Inclus : <strong className="text-foreground">{offer.maxPcs} postes</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>MTTD : <strong className="text-foreground">{offer.mttd}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>MTTR : <strong className="text-foreground">{offer.mttr}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <HeartHandshake className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>Support : <strong className="text-foreground">{offer.support}</strong></span>
                      </div>
                    </div>

                    <div className="border-t border-border/40 my-4" />

                    {/* Features */}
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Fonctionnalités</h4>
                      <ul className="space-y-2">
                        {offer.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-foreground/80">
                            <Check className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${theme.check}`} />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Footer toggle */}
                  <div className="mx-6 mb-5 mt-2 pt-4 border-t border-border/40 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {offer.isActive ? "Active en vente" : "Désactivée"}
                    </span>
                    <Switch checked={offer.isActive} onCheckedChange={() => toggleOfferStatus(offer.id)} />
                  </div>
                </Card>
              );
            })}

            {filteredOffers.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <Filter className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">Aucune offre trouvée</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Modifiez vos critères de recherche ou créez une nouvelle offre</p>
              </div>
            )}
          </div>
        )}

        {/* ── Table View ── */}
        {viewMode === "table" && (
          <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur rounded-2xl shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    {[
                      { field: "name" as SortField, label: "Offre" },
                      { field: "value" as SortField, label: "Prix / mois" },
                      { field: "maxPcs" as SortField, label: "Max PC" },
                      { field: "mttd" as SortField, label: "MTTD" },
                    ].map(({ field, label }) => (
                      <th key={field} className="px-5 py-4 text-left">
                        <button
                          onClick={() => toggleSort(field)}
                          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {label} <SortIcon field={field} />
                        </button>
                      </th>
                    ))}
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Support</th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">MTTR</th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Statut</th>
                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOffers.map((offer, i) => {
                    const theme = getThemeTokens(inferTheme(offer.name, offer.theme), offer.isActive);
                    return (
                      <tr
                        key={offer.id}
                        className={`border-b border-border/30 transition-colors hover:bg-muted/20 ${i % 2 === 0 ? "" : "bg-muted/5"}`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="h-8 w-1 rounded-full"
                              style={{ background: THEME_OPTIONS.find(t => t.value === inferTheme(offer.name, offer.theme))?.color || "#64748b" }}
                            />
                            <div>
                              <Badge className={`text-xs px-2 py-0.5 rounded-full ${theme.badge}`}>{offer.name}</Badge>
                              {offer.description && <p className="text-[11px] text-muted-foreground mt-0.5">{offer.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-extrabold text-foreground whitespace-nowrap">
                          {offer.value.toLocaleString("fr-FR")} <span className="text-xs font-normal text-muted-foreground">FCFA</span>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">{offer.maxPcs} postes</td>
                        <td className="px-5 py-4 font-mono text-xs text-foreground">{offer.mttd}</td>
                        <td className="px-5 py-4 text-xs text-muted-foreground">{offer.support}</td>
                        <td className="px-5 py-4 font-mono text-xs text-foreground">{offer.mttr}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Switch checked={offer.isActive} onCheckedChange={() => toggleOfferStatus(offer.id)} />
                            <span className={`text-xs font-semibold ${offer.isActive ? "text-emerald-500" : "text-muted-foreground"}`}>
                              {offer.isActive ? "Active" : "Inactif"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit(offer)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-rose-500" onClick={() => handleDeleteOffer(offer.id, offer.name)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredOffers.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">Aucune offre correspondante</div>
              )}
            </div>
          </Card>
        )}

        {/* ── Compare View ── */}
        {viewMode === "compare" && (
          <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur rounded-2xl shadow-xl">
            <div className="p-5 border-b border-border/50 bg-muted/20 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-foreground">Comparaison des offres</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground w-48">Critère</th>
                    {filteredOffers.map(offer => {
                      const theme = getThemeTokens(inferTheme(offer.name, offer.theme), offer.isActive);
                      return (
                        <th key={offer.id} className="px-5 py-4 text-center">
                          <Badge className={`text-xs px-2.5 py-0.5 rounded-full ${theme.badge}`}>{offer.name}</Badge>
                          {offer.description && <p className="text-[10px] text-muted-foreground mt-1 font-normal">{offer.description}</p>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: "💰 Prix / mois",
                      render: (o: Offer) => <span className="font-extrabold text-foreground">{o.value.toLocaleString("fr-FR")} FCFA</span>
                    },
                    {
                      label: "🖥 Postes max",
                      render: (o: Offer) => <span className="font-bold">{o.maxPcs}</span>
                    },
                    {
                      label: "⚡ MTTD",
                      render: (o: Offer) => <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{o.mttd}</span>
                    },
                    {
                      label: "🛠 MTTR",
                      render: (o: Offer) => <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{o.mttr}</span>
                    },
                    {
                      label: "🎧 Support",
                      render: (o: Offer) => <span className="text-xs">{o.support}</span>
                    },
                    {
                      label: "✅ Fonctionnalités",
                      render: (o: Offer) => (
                        <ul className="text-left space-y-1">
                          {o.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                              <Check className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      )
                    },
                    {
                      label: "📊 Statut",
                      render: (o: Offer) => (
                        <Badge className={o.isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground"}>
                          {o.isActive ? "Active" : "Inactive"}
                        </Badge>
                      )
                    },
                  ].map((row, ri) => (
                    <tr key={ri} className={`border-b border-border/30 ${ri % 2 === 0 ? "" : "bg-muted/5"}`}>
                      <td className="px-5 py-4 text-xs font-semibold text-muted-foreground whitespace-nowrap">{row.label}</td>
                      {filteredOffers.map(offer => (
                        <td key={offer.id} className="px-5 py-4 text-center align-top">{row.render(offer)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredOffers.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">Aucune offre à comparer</div>
              )}
            </div>
          </Card>
        )}

        {/* ── Slide-in Panel (Create / Edit) ── */}
        {isPanelOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg h-full bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Panel header */}
              <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">
                    {editingOffer ? `Modifier ${editingOffer.name}` : "Nouvelle offre"}
                  </h2>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setIsPanelOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Nom de la formule <span className="text-rose-500">*</span></label>
                  <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="ex: Gold Pro, Diamond SLA..." required className="rounded-xl" />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Description courte</label>
                  <Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="ex: Protection essentielle pour les PME" className="rounded-xl" />
                </div>

                {/* Price & PCs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">Prix (FCFA/mois) <span className="text-rose-500">*</span></label>
                    <Input type="number" value={formValue || ""} onChange={e => setFormValue(Number(e.target.value))} placeholder="ex: 100000" min={0} required className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">Max PC <span className="text-rose-500">*</span></label>
                    <Input type="number" value={formMaxPcs || ""} onChange={e => setFormMaxPcs(Number(e.target.value))} placeholder="ex: 50" min={1} required className="rounded-xl" />
                  </div>
                </div>

                {/* MTTD & MTTR */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">SLA MTTD</label>
                    <Input value={formMttd} onChange={e => setFormMttd(e.target.value)} placeholder="ex: < 15 min" className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">SLA MTTR</label>
                    <Input value={formMttr} onChange={e => setFormMttr(e.target.value)} placeholder="ex: < 2 heures" className="rounded-xl" />
                  </div>
                </div>

                {/* Support */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Niveau de Support</label>
                  <Input value={formSupport} onChange={e => setFormSupport(e.target.value)} placeholder="ex: 24h/7/365 Express" className="rounded-xl" />
                </div>

                {/* Theme Color */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Palette className="h-4 w-4 text-muted-foreground" /> Couleur / Thème
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {THEME_OPTIONS.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setFormTheme(t.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${formTheme === t.value
                          ? "border-primary bg-primary/10 text-foreground shadow"
                          : "border-border/50 hover:bg-muted text-muted-foreground"
                          }`}
                      >
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ background: t.color }} />
                        {t.label.split(" (")[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-foreground">Fonctionnalités incluses</label>
                    <span className="text-[10px] text-muted-foreground">Une par ligne</span>
                  </div>
                  <textarea
                    value={formFeatures}
                    onChange={e => setFormFeatures(e.target.value)}
                    placeholder={"SIEM Wazuh EDR avancé\nOrchestration SOAR Pipeline..."}
                    rows={6}
                    className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                {/* Info note */}
                <div className="p-3 bg-primary/5 rounded-xl flex gap-2.5 items-start border border-primary/10">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Cette offre s'intégrera immédiatement dans le catalogue et pourra être sélectionnée pour n'importe quel client.
                  </p>
                </div>
              </form>

              {/* Panel footer */}
              <div className="p-6 border-t border-border/50 bg-muted/10 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsPanelOpen(false)} className="rounded-xl">Annuler</Button>
                <Button type="button" onClick={handleSubmit} className="rounded-xl px-5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-lg shadow-primary/25">
                  {editingOffer ? "Enregistrer" : "Créer l'offre"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
          <div className="relative bg-gradient-to-br from-rose-600 via-red-500 to-orange-500 p-6 pb-8">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_107%,_#fff_0%,_transparent_50%)]" />
            <div className="relative flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center ring-4 ring-white/20 backdrop-blur-sm">
                <AlertTriangle className="h-7 w-7 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">Supprimer l'offre</DialogTitle>
                <p className="text-sm text-white/80 mt-1">Cette action est irréversible</p>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 -mt-4 rounded-t-2xl relative z-10">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 mb-6">
              <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">Vous allez supprimer l'offre :</p>
                <p className="text-base font-bold text-rose-800 dark:text-rose-200 mt-0.5">« {deleteTarget?.name} »</p>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">Tous les clients associés à cette offre ne pourront plus la voir dans le catalogue.</p>
              </div>
            </div>
            <DialogFooter className="flex gap-3 sm:gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border-border/60 hover:bg-muted font-medium">
                <X className="h-4 w-4 mr-1.5" />Annuler
              </Button>
              <Button onClick={confirmDelete} className="flex-1 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-700 hover:to-red-600 text-white font-semibold shadow-lg shadow-rose-500/25 border-0">
                <Trash2 className="h-4 w-4 mr-1.5" />Oui, supprimer
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
