import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, Plus, Trash2, Edit2, Check, X, ShieldAlert, Sparkles, 
  Clock, HeartHandshake, Info, ShieldCheck, HelpCircle, Coins, Laptop
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/offres")({
  head: () => ({ meta: [{ title: "Catalogues des Offres — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><AdminOffres /></RequireAuth>,
});

export interface Offer {
  id: string;
  name: string;
  value: number;
  currency: string;
  period: string;
  maxPcs: number;
  mttd: string;
  mttr: string;
  support: string;
  features: string[];
  isActive: boolean;
}

const DEFAULT_OFFERS: Offer[] = [
  {
    id: "inova-secure",
    name: "Inova Secure",
    value: 100000,
    currency: "FCFA",
    period: "an",
    maxPcs: 10,
    mttd: "< 30 min",
    mttr: "< 4 heures",
    support: "8h-18h L-V",
    features: [
      "SIEM SIEM Wazuh EDR de base",
      "Scan de réputation automatique",
      "Intégration d'IOC manuelle",
      "Support par e-mail standard",
      "Tableau de bord de sécurité"
    ],
    isActive: true
  },
  {
    id: "terranga-secure",
    name: "Terranga Secure",
    value: 24000,
    currency: "FCFA",
    period: "an",
    maxPcs: 25,
    mttd: "< 15 min",
    mttr: "< 2 heures",
    support: "24h/7 L-V",
    features: [
      "SIEM SIEM Wazuh EDR avancé",
      "Orchestrateur SOAR Pipeline",
      "Gestion d'incidents TheHive",
      "Enrichissement automatique VT",
      "Support téléphonique & e-mail"
    ],
    isActive: true
  },
  {
    id: "gainde-secure",
    name: "Gainde Secure",
    value: 60000,
    currency: "FCFA",
    period: "an",
    maxPcs: 100,
    mttd: "< 10 min",
    mttr: "< 1 heure",
    support: "24h/7/365 Dédié",
    features: [
      "SIEM SIEM Wazuh EDR Premium",
      "Orchestrateur SOAR Avancé",
      "Plateforme de Threat Intel MISP",
      "Plateforme d'investigation IRIS",
      "Analyste SOC Dédié",
      "Playbooks d'automatisation standard"
    ],
    isActive: true
  }
];

function AdminOffres() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formValue, setFormValue] = useState<number>(0);
  const [formMaxPcs, setFormMaxPcs] = useState<number>(10);
  const [formMttd, setFormMttd] = useState("< 15 min");
  const [formMttr, setFormMttr] = useState("< 2 heures");
  const [formSupport, setFormSupport] = useState("24h/7/365");
  const [formFeatures, setFormFeatures] = useState<string>("");

  // Charge et seed les offres depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem("soc_catalogues_offres");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const hasOldCurrencyOrOldOffers = parsed.some(
          (o: any) => o.currency === "EUR" || ["bronze", "argent", "or", "platine"].includes(o.id)
        );
        if (hasOldCurrencyOrOldOffers) {
          setOffers(DEFAULT_OFFERS);
          localStorage.setItem("soc_catalogues_offres", JSON.stringify(DEFAULT_OFFERS));
        } else {
          setOffers(parsed);
        }
      } catch (e) {
        setOffers(DEFAULT_OFFERS);
      }
    } else {
      setOffers(DEFAULT_OFFERS);
      localStorage.setItem("soc_catalogues_offres", JSON.stringify(DEFAULT_OFFERS));
    }
  }, []);

  // Sauvegarde les offres
  const saveOffersToStorage = (newOffers: Offer[]) => {
    setOffers(newOffers);
    localStorage.setItem("soc_catalogues_offres", JSON.stringify(newOffers));
  };

  // Switch de statut d'offre
  const toggleOfferStatus = (id: string) => {
    const updated = offers.map(o => o.id === id ? { ...o, isActive: !o.isActive } : o);
    saveOffersToStorage(updated);
    const offer = updated.find(o => o.id === id);
    toast.success(`Offre ${offer?.name}`, {
      description: `L'offre est désormais ${offer?.isActive ? "active" : "désactivée"}.`
    });
  };

  // Ouvre le panel pour la création
  const handleOpenCreate = () => {
    setEditingOffer(null);
    setFormName("");
    setFormValue(20000);
    setFormMaxPcs(20);
    setFormMttd("< 15 min");
    setFormMttr("< 2 heures");
    setFormSupport("24h/7/365");
    setFormFeatures("SIEM Wazuh\nSupport standard\nIntégration d'IOCs");
    setIsPanelOpen(true);
  };

  // Ouvre le panel pour la modification
  const handleOpenEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormName(offer.name);
    setFormValue(offer.value);
    setFormMaxPcs(offer.maxPcs);
    setFormMttd(offer.mttd);
    setFormMttr(offer.mttr);
    setFormSupport(offer.support);
    setFormFeatures(offer.features.join("\n"));
    setIsPanelOpen(true);
  };

  // Suppression d'offre
  const handleDeleteOffer = (id: string, name: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'offre ${name} ?`)) {
      const updated = offers.filter(o => o.id !== id);
      saveOffersToStorage(updated);
      toast.error(`Offre ${name} supprimée`, {
        description: "L'offre a été retirée du catalogue."
      });
    }
  };

  // Soumission du formulaire (Création/Modification)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      toast.error("Champs requis", { description: "Veuillez entrer un nom d'offre." });
      return;
    }

    const featureList = formFeatures
      .split("\n")
      .map(f => f.trim())
      .filter(f => f.length > 0);

    if (editingOffer) {
      // Mode Édition
      const updated = offers.map(o => 
        o.id === editingOffer.id 
          ? {
              ...o,
              name: formName,
              value: Number(formValue),
              maxPcs: Number(formMaxPcs),
              mttd: formMttd,
              mttr: formMttr,
              support: formSupport,
              features: featureList
            }
          : o
      );
      saveOffersToStorage(updated);
      toast.success("Offre modifiée", {
        description: `L'offre ${formName} a été mise à jour.`
      });
    } else {
      // Mode Création
      const newOffer: Offer = {
        id: "offer_" + Date.now(),
        name: formName,
        value: Number(formValue),
        currency: "FCFA",
        period: "an",
        maxPcs: Number(formMaxPcs),
        mttd: formMttd,
        mttr: formMttr,
        support: formSupport,
        features: featureList,
        isActive: true
      };
      saveOffersToStorage([...offers, newOffer]);
      toast.success("Offre créée", {
        description: `L'offre ${formName} a été ajoutée au catalogue.`
      });
    }

    setIsPanelOpen(false);
  };

  // Calculs KPI
  const totalOffers = offers.length;
  const activeOffers = offers.filter(o => o.isActive).length;
  const avgValue = totalOffers > 0 
    ? Math.round(offers.reduce((acc, o) => acc + o.value, 0) / totalOffers)
    : 0;

  // Dégradés de styles pour les cartes
  const getOfferCardStyle = (name: string, isActive: boolean) => {
    if (!isActive) return "border-slate-300 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/20 opacity-70";
    
    const lowerName = name.toLowerCase();
    if (lowerName.includes("gainde")) {
      return "border-amber-400/50 bg-gradient-to-b from-amber-400/5 to-transparent dark:from-amber-400/10 dark:to-slate-950/40 shadow-amber-500/5 shadow-lg";
    } else if (lowerName.includes("terranga")) {
      return "border-blue-400/50 bg-gradient-to-b from-blue-400/5 to-transparent dark:from-blue-400/10 dark:to-slate-950/40 shadow-blue-500/5 shadow-lg";
    } else if (lowerName.includes("inova")) {
      return "border-orange-500/50 bg-gradient-to-b from-orange-500/5 to-transparent dark:from-orange-500/10 dark:to-slate-950/40 shadow-orange-500/5 shadow-lg";
    } else {
      return "border-slate-400/50 bg-gradient-to-b from-slate-400/5 to-transparent dark:from-slate-400/10 dark:to-slate-950/40 shadow-lg";
    }
  };

  const getBadgeStyle = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("gainde")) {
      return "bg-gradient-to-r from-amber-400 to-amber-600 text-white border-none font-extrabold";
    } else if (lowerName.includes("terranga")) {
      return "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-none font-bold";
    } else if (lowerName.includes("inova")) {
      return "bg-gradient-to-r from-orange-500 to-red-500 text-white border-none font-extrabold";
    } else {
      return "bg-slate-500 text-white border-none font-bold";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      
      {/* Effet décoratif d'arrière-plan */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 py-8 relative z-10">
        
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-primary/10 rounded-2xl text-primary shadow-inner">
                <CreditCard className="h-6 w-6 animate-pulse" />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 dark:from-gray-100 dark:via-gray-300 dark:to-gray-500 bg-clip-text text-transparent">
                Catalogues Offres
              </h1>
            </div>
            <p className="text-muted-foreground text-sm max-w-xl">
              Supervisez, configurez et ajustez vos formules de facturation SOC & EDR. Activez de nouvelles offres en un clic pour vos clients.
            </p>
          </div>
          
          <Button 
            onClick={handleOpenCreate} 
            className="shadow-lg hover:shadow-xl hover:translate-y-[-1px] transition-all bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl px-5 py-6 gap-2"
          >
            <Plus className="h-5 w-5" />
            Créer une offre
          </Button>
        </div>

        {/* KPIs Summary */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="p-6 hover:shadow-lg transition-all border-border/50 bg-card/40 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Coins className="h-16 w-16 text-primary" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valeur Annuelle Moyenne</p>
                <p className="text-3xl font-extrabold mt-2 text-foreground">
                  {avgValue.toLocaleString("fr-FR")} <span className="text-lg font-normal text-muted-foreground">FCFA / an</span>
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-emerald-500">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Seeding optimisé pour conversion</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all border-border/50 bg-card/40 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <CreditCard className="h-16 w-16 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Offres commercialisées</p>
                <p className="text-3xl font-extrabold mt-2 text-foreground">
                  {activeOffers} <span className="text-lg font-normal text-muted-foreground">actives</span>
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/20 text-emerald-600 bg-emerald-500/5">
                    {totalOffers} totales
                  </Badge>
                  <span>Disponibles en catalogue</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all border-border/50 bg-card/40 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Clock className="h-16 w-16 text-purple-500" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SLA Réponse Garanti</p>
                <p className="text-3xl font-extrabold mt-2 text-purple-600 dark:text-purple-400">
                  &lt; 5 min
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-purple-500">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Support prioritaire Platine</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Offers Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {offers.map(offer => (
            <Card 
              key={offer.id} 
              className={`p-6 border transition-all duration-300 relative flex flex-col justify-between hover:scale-[1.01] hover:shadow-xl rounded-2xl ${getOfferCardStyle(offer.name, offer.isActive)}`}
            >
              <div>
                {/* Header Offre */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div>
                    <Badge className={`px-2.5 py-0.5 rounded-full ${getBadgeStyle(offer.name)}`}>
                      {offer.name}
                    </Badge>
                    {!offer.isActive && (
                      <Badge variant="secondary" className="ml-2 rounded-full border bg-slate-200 dark:bg-slate-800 text-xs">
                        Inactif
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEdit(offer)}
                      title="Modifier l'offre"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-rose-500"
                      onClick={() => handleDeleteOffer(offer.id, offer.name)}
                      title="Supprimer l'offre"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Prix */}
                <div className="mb-6">
                  <div className="text-3xl font-extrabold text-foreground flex items-baseline gap-1">
                    {offer.value.toLocaleString("fr-FR")}
                    <span className="text-base font-medium text-muted-foreground"> {offer.currency}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">par {offer.period}</div>
                </div>

                <div className="border-t border-border/50 my-4" />

                {/* Specs techniques rapides */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Laptop className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span>Inclus : <strong>{offer.maxPcs} Postes connectés</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span>MTTD : <strong>{offer.mttd}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span>MTTR : <strong>{offer.mttr}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <HeartHandshake className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span>Support : <strong>{offer.support}</strong></span>
                  </div>
                </div>

                <div className="border-t border-border/50 my-4" />

                {/* Liste des features */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Fonctionnalités :</h4>
                  <ul className="space-y-2.5">
                    {offer.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Toggle de statut bas */}
              <div className="mt-8 pt-4 border-t border-border/40 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Offre active en vente</span>
                <Switch 
                  checked={offer.isActive} 
                  onCheckedChange={() => toggleOfferStatus(offer.id)}
                />
              </div>
            </Card>
          ))}
        </div>

        {/* Modal / Slide-over Panel de création/édition d'offre */}
        {isPanelOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm transition-opacity">
            <div className="w-full max-w-lg h-full bg-background border-l border-border shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
              
              {/* Header Panel */}
              <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">
                    {editingOffer ? `Modifier l'offre ${editingOffer.name}` : "Créer une nouvelle offre"}
                  </h2>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setIsPanelOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                
                {/* Nom */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Nom de la formule d'offre <span className="text-rose-500">*</span></label>
                  <Input 
                    value={formName} 
                    onChange={e => setFormName(e.target.value)} 
                    placeholder="ex: Gold Pro, Diamond SLA..."
                    required
                    className="rounded-xl border-border focus-visible:ring-primary/20"
                  />
                </div>

                {/* Valeur & Capacité PC */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">Prix de l'abonnement (FCFA/an) <span className="text-rose-500">*</span></label>
                    <Input 
                      type="number"
                      value={formValue || ""} 
                      onChange={e => setFormValue(Number(e.target.value))} 
                      placeholder="ex: 45000"
                      min={0}
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">Nombre max de PC connectés <span className="text-rose-500">*</span></label>
                    <Input 
                      type="number"
                      value={formMaxPcs || ""} 
                      onChange={e => setFormMaxPcs(Number(e.target.value))} 
                      placeholder="ex: 50"
                      min={1}
                      required
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {/* SLAs MTTD & MTTR */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">SLA MTTD</label>
                    <Input 
                      value={formMttd} 
                      onChange={e => setFormMttd(e.target.value)} 
                      placeholder="ex: < 15 min"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">SLA MTTR</label>
                    <Input 
                      value={formMttr} 
                      onChange={e => setFormMttr(e.target.value)} 
                      placeholder="ex: < 2 heures"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {/* Niveau de Support */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Niveau de Support Technique</label>
                  <Input 
                    value={formSupport} 
                    onChange={e => setFormSupport(e.target.value)} 
                    placeholder="ex: 24h/7/365 Express, 8h-18h L-V..."
                    className="rounded-xl"
                  />
                </div>

                {/* Features (une par ligne) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-foreground">Fonctionnalités incluses</label>
                    <span className="text-[10px] text-muted-foreground">Une par ligne</span>
                  </div>
                  <textarea
                    value={formFeatures}
                    onChange={e => setFormFeatures(e.target.value)}
                    placeholder="SIEM SIEM Wazuh EDR avancé&#10;Orchestrateur SOAR Pipeline&#10;Garantie SLA 99.9%..."
                    rows={6}
                    className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                {/* Notice Info */}
                <div className="p-3 bg-primary/5 rounded-xl flex gap-2.5 items-start border border-primary/10">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Cette offre s'intégrera immédiatement dans votre catalogue et pourra être sélectionnée pour n'importe quel client existant ou nouveau lors de la facturation.
                  </p>
                </div>

              </form>

              {/* Panel Footer */}
              <div className="p-6 border-t border-border/50 bg-muted/10 flex items-center justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsPanelOpen(false)}
                  className="rounded-xl"
                >
                  Annuler
                </Button>
                <Button 
                  type="button"
                  onClick={handleSubmit}
                  className="rounded-xl px-5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
                >
                  {editingOffer ? "Enregistrer" : "Créer l'offre"}
                </Button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
