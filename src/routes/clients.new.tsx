import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  UserPlus, Building, Mail, User, Loader2, ArrowLeft, Phone, Globe, 
  Shield, Cpu, Sliders, Server, Zap, Check, Play, Terminal, Lock,
  CreditCard, MapPin, Receipt, CheckCircle2, ChevronRight, ChevronLeft, Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/clients/new")({
  head: () => ({ meta: [{ title: "Nouveau Client — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><NewClient /></RequireAuth>,
});

interface Offer {
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

function NewClient() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [deployStep, setDeployStep] = useState<number | null>(null);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  
  // Wizard state: 1 to 5
  const [activeStep, setActiveStep] = useState<number>(1);
  
  // Dynamic list of offers loaded from catalog
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("argent");

  // Form State
  const [form, setForm] = useState({
    // Step 1: Addresses / Contact Details
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    organization: "",
    website: "",
    deliveryAddress: "",
    deliveryCity: "",
    deliveryZip: "",
    deliveryCountry: "Sénégal",
    billingAddress: "",
    billingCity: "",
    billingZip: "",
    billingCountry: "Sénégal",

    // Step 2: Données Facturation
    billingCycle: "annuel",
    paymentMethod: "virement",
    clientAccountRef: "A003107" + Math.floor(Math.random() * 900000 + 100000),

    // Step 3: Accès et Produits
    role: "client" as const,
    sendInvite: true,
    requireMfa: false,
    edrPolicy: "standard",
    agentQuota: 25,

    // Step 4: Services
    alertChannel: "email_sms",
    automationLevel: "semi",
    wazuhActiveResponse: true,
    wazuhAdSync: false,
    wazuhSyslog: true,
  });

  // Load catalog offers on mount
  useEffect(() => {
    const stored = localStorage.getItem("soc_catalog_offers") || localStorage.getItem("soc_catalogues_offres");
    if (stored) {
      try {
        const list = JSON.parse(stored);
        setOffers(list.filter((o: any) => o.isActive));
      } catch (e) {}
    }
  }, []);

  // Update form fields dynamically based on offer selection
  const handleOfferChange = (offerId: string) => {
    setSelectedOfferId(offerId);
    const selected = offers.find(o => o.id === offerId);
    if (selected) {
      setForm(prev => ({
        ...prev,
        agentQuota: selected.maxPcs,
        edrPolicy: selected.id === "platine" ? "zero-trust" : selected.id === "or" ? "aggressive" : "standard"
      }));
    }
  };

  // Validation function per step
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!form.firstName.trim()) { toast.error("Prénom requis"); return false; }
      if (!form.lastName.trim()) { toast.error("Nom requis"); return false; }
      if (!form.email.trim()) { toast.error("E-mail requis"); return false; }
      if (!/\S+@\S+\.\S+/.test(form.email)) { toast.error("Format d'e-mail invalide"); return false; }
      if (!form.organization.trim()) { toast.error("Nom de l'entreprise requis"); return false; }
      if (!form.deliveryAddress.trim()) { toast.error("Adresse de livraison requise"); return false; }
      if (!form.billingAddress.trim()) { toast.error("Adresse de facturation requise"); return false; }
    }
    if (step === 2) {
      if (!selectedOfferId) { toast.error("Veuillez sélectionner une formule d'abonnement"); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setActiveStep(prev => prev - 1);
  };

  // Dynamic console logs in the live HUD
  const [hudLogs, setHudLogs] = useState<string[]>([]);
  useEffect(() => {
    const policyLabel = 
      form.edrPolicy === "zero-trust" ? "STRICT ZERO-TRUST" : 
      form.edrPolicy === "aggressive" ? "PROACTIVE HUNTING" : "DEFENSE STANDARD";
    
    const logs = [
      `[SYS] Client: ${form.organization || "En attente..."}`,
      `[EDR] Quota maximum: ${form.agentQuota} agents`,
      `[EDR] Baseline policy: ${policyLabel}`,
      `[SOAR] Canal: ${form.alertChannel.toUpperCase()}`,
      `[IA] Niveau auto: ${form.automationLevel.toUpperCase()}`,
      `[WZH] ActiveResponse: ${form.wazuhActiveResponse ? "ON" : "OFF"}`,
      form.wazuhAdSync ? `[WZH] ActiveDirectory: SYNC ENABLED` : `[WZH] ActiveDirectory: SYNC DISABLED`,
      `[TLS] Syslog forwarder: ${form.wazuhSyslog ? "READY" : "DISABLED"}`
    ];
    setHudLogs(logs);
  }, [form.organization, form.agentQuota, form.edrPolicy, form.alertChannel, form.automationLevel, form.wazuhActiveResponse, form.wazuhAdSync, form.wazuhSyslog]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) return;
    
    setBusy(true);
    setDeployStep(0);
    setDeployLogs(["[INFO] Initialisation du processus de provisionnement..."]);

    const steps = [
      { text: "[OK] Création de l'organisation dans la base centrale.", delay: 600 },
      { text: "[SIEM] Provisionnement du sandbox Wazuh dédié.", delay: 500 },
      { text: `[EDR] Application de la politique de sécurité [${form.edrPolicy.toUpperCase()}].`, delay: 700 },
      { text: `[SOAR] Liaison du canal d'alerte [${form.alertChannel.toUpperCase()}].`, delay: 500 },
      { text: `[IA] Enrôlement de la défense autonome (Niveau: ${form.automationLevel}).`, delay: 700 },
      { text: "[SYS] Génération des clés de chiffrement TLS syslog.", delay: 400 },
      { text: "[OK] Création du représentant et envoi de l'invitation OTP.", delay: 800 }
    ];

    let currentStepIndex = 0;
    
    const runSimulationSteps = async () => {
      for (const step of steps) {
        await new Promise((resolve) => setTimeout(resolve, step.delay));
        currentStepIndex++;
        setDeployStep(currentStepIndex);
        setDeployLogs((prev) => [...prev, step.text]);
      }

      try {
        const fullName = `${form.firstName} ${form.lastName}`.trim();
        const { data, error } = await supabase.functions.invoke("admin-create-user", { 
          body: {
            email: form.email,
            fullName: fullName,
            organization: form.organization,
            role: form.role,
          }
        });
        
        if (error) throw error;
        
        toast.success(`Client créé avec succès`, {
          description: `Compte provisionné et configuré sur le SIEM`,
        });
        
        navigate({ to: "/clients" });
      } catch (err: any) {
        toast.error("Erreur lors de la création", {
          description: err?.message ?? "Une erreur est survenue lors de l'appel API",
        });
        setDeployStep(null);
        setBusy(false);
      }
    };

    runSimulationSteps();
  };

  const renderInput = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    icon: React.ReactNode,
    type = "text"
  ) => (
    <div className="relative border-b border-slate-200 dark:border-zinc-800 focus-within:border-amber-500 py-2.5 transition-all duration-300 group">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground group-focus-within:text-amber-500 transition-colors duration-300">
          {icon}
        </div>
        <div className="flex-1 flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-focus-within:text-amber-500 transition-colors duration-300">
            {label}
          </span>
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent border-none outline-none p-0 text-slate-800 dark:text-zinc-100 placeholder-slate-400 text-sm font-semibold mt-1 focus:ring-0 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0b0c10] transition-colors duration-300 relative overflow-hidden">
      
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />

      {/* Deployment Simulation Overlay */}
      {deployStep !== null && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl bg-zinc-950 border-zinc-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 animate-pulse" />
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-3 text-zinc-100">
                <Terminal className="h-5 w-5 text-amber-500 animate-pulse" />
                Déploiement du Client SIEM / EDR
              </CardTitle>
              <CardDescription className="text-zinc-400 text-xs">
                Simulation et déploiement du sandbox cyber-défense en cours...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-black border border-zinc-800 rounded-lg p-4 font-mono text-[11px] text-emerald-400 space-y-2 max-h-[220px] overflow-y-auto leading-relaxed shadow-inner">
                {deployLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-zinc-600">[{new Date().toLocaleTimeString()}]</span>
                    <span>{log}</span>
                  </div>
                ))}
                {deployStep < 7 && (
                  <div className="flex items-center gap-2 text-zinc-400 animate-pulse">
                    <span>❯</span>
                    <span>Provisionnement de la politique cyber en cours...</span>
                    <Loader2 className="h-3 w-3 animate-spin text-amber-500 ml-auto" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {[...Array(7)].map((_, stepIdx) => (
                  <div 
                    key={stepIdx} 
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      deployStep > stepIdx 
                        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                        : deployStep === stepIdx 
                          ? "bg-amber-500 animate-pulse" 
                          : "bg-zinc-800"
                    }`} 
                  />
                ))}
              </div>
              <div className="text-center text-xs text-zinc-500 mt-2">
                Étape {deployStep + 1} de 8 : Configuration EDR
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="rounded-full bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-amber-500 transition-colors duration-300">
            <Link to="/clients">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-amber-600 to-amber-800 dark:from-white dark:via-amber-500 dark:to-yellow-600 bg-clip-text text-transparent tracking-tight">
              Provisionner un nouveau client
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Configurez son profil, attribuez ses licences et appliquez des stratégies de protection de dernière génération.
            </p>
          </div>
        </div>

        {/* Dynamic Connected Steps Progress Bar */}
        <div className="mb-10 bg-white/60 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-850 p-6 rounded-2xl shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-bold tracking-wider relative max-w-4xl mx-auto">
            
            {/* Steps connectors */}
            <div className="absolute top-5 left-[5%] right-[5%] h-0.5 bg-slate-200 dark:bg-zinc-800 -z-10" />
            <div 
              className="absolute top-5 left-[5%] h-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 -z-10 transition-all duration-500 ease-in-out" 
              style={{ width: `${(activeStep - 1) * 22.5}%` }}
            />

            {[
              { num: 1, label: "Addresses" },
              { num: 2, label: "Données Facturation" },
              { num: 3, label: "Accès et Produits" },
              { num: 4, label: "Services" },
              { num: 5, label: "Validation" }
            ].map((st) => (
              <div key={st.num} className="flex flex-col items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => { if (st.num < activeStep) setActiveStep(st.num); }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all duration-300 border-2 ${
                    activeStep === st.num
                      ? "bg-gradient-to-br from-amber-500 to-yellow-500 border-transparent text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-110"
                      : activeStep > st.num
                        ? "bg-emerald-500 border-transparent text-white shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                        : "bg-slate-100 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-muted-foreground"
                  }`}
                >
                  {activeStep > st.num ? <Check className="h-5 w-5 stroke-[3]" /> : st.num}
                </button>
                <span className={`text-[10px] text-center max-w-[100px] uppercase font-extrabold mt-1 transition-colors duration-300 ${
                  activeStep === st.num ? "text-amber-500" : activeStep > st.num ? "text-emerald-500" : "text-muted-foreground/60"
                }`}>
                  {st.label}
                </span>
              </div>
            ))}

          </div>
        </div>

        {/* Wizard Layout */}
        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Active Step Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Step 1: Addresses */}
            {activeStep === 1 && (
              <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl overflow-hidden animate-in fade-in duration-300">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-yellow-400" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-3 font-bold dark:text-zinc-100">
                    <MapPin className="h-5 w-5 text-amber-500" />
                    Informations sur les adresses & contacts
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Identité du représentant et coordonnées d'implantation du système d'information.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  <div className="grid gap-6 md:grid-cols-2">
                    {renderInput("PRENOM DU REPRÉSENTANT", form.firstName, (v) => setForm({...form, firstName: v}), "Jean", <User className="h-4 w-4" />)}
                    {renderInput("NOM DU REPRÉSENTANT", form.lastName, (v) => setForm({...form, lastName: v}), "Dupont", <User className="h-4 w-4" />)}
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    {renderInput("EMAIL PROFESSIONNEL", form.email, (v) => setForm({...form, email: v}), "jean.dupont@entreprise.com", <Mail className="h-4 w-4" />, "email")}
                    {renderInput("CONTACT TÉLÉPHONIQUE", form.phone, (v) => setForm({...form, phone: v}), "+221 77 000 00 00", <Phone className="h-4 w-4" />, "tel")}
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    {renderInput("NOM DE L'ENTREPRISE", form.organization, (v) => setForm({...form, organization: v}), "Sonatel", <Building className="h-4 w-4" />)}
                    {renderInput("SITE WEB DE L'ORGANISATION", form.website, (v) => setForm({...form, website: v}), "https://sonatel.sn", <Globe className="h-4 w-4" />, "url")}
                  </div>
                  
                  <Separator className="border-slate-100 dark:border-zinc-800" />
                  
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Adresse de livraison / d'implantation des équipements
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        {renderInput("Adresse physique de livraison", form.deliveryAddress, (v) => setForm({...form, deliveryAddress: v}), "Dakar, SICAP Liberté IV", <MapPin className="h-4 w-4" />)}
                      </div>
                      <div>
                        {renderInput("Ville", form.deliveryCity, (v) => setForm({...form, deliveryCity: v}), "Dakar", <MapPin className="h-4 w-4" />)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Receipt className="h-4 w-4" /> Adresse de facturation
                      </h3>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-[10px] text-amber-500 hover:text-amber-600 font-extrabold gap-1"
                        onClick={() => setForm(prev => ({
                          ...prev,
                          billingAddress: prev.deliveryAddress,
                          billingCity: prev.deliveryCity,
                          billingZip: prev.deliveryZip,
                          billingCountry: prev.deliveryCountry
                        }))}
                      >
                        Identique à la livraison
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        {renderInput("Adresse physique de facturation", form.billingAddress, (v) => setForm({...form, billingAddress: v}), "Dakar, SICAP Liberté IV", <Receipt className="h-4 w-4" />)}
                      </div>
                      <div>
                        {renderInput("Ville de facturation", form.billingCity, (v) => setForm({...form, billingCity: v}), "Dakar", <Receipt className="h-4 w-4" />)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Données Facturation */}
            {activeStep === 2 && (
              <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl overflow-hidden animate-in fade-in duration-300">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-yellow-400" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-3 font-bold dark:text-zinc-100">
                    <CreditCard className="h-5 w-5 text-amber-500" />
                    Données de Facturation & Choix de l'Offre
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Associez une offre active du catalogue et configurez les conditions de paiement.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  
                  {/* Cards for offers */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Formule d'Abonnement SOC active</Label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {offers.length === 0 ? (
                        <div className="sm:col-span-2 text-center p-6 bg-slate-100 dark:bg-zinc-900 rounded-xl">
                          <p className="text-xs text-muted-foreground">Aucune offre active trouvée dans le catalogue d'administration.</p>
                          <Link to="/admin/offres" className="text-xs text-amber-500 hover:underline font-bold mt-2 inline-block">Aller au catalogue d'offres</Link>
                        </div>
                      ) : (
                        offers.map((offer) => (
                          <div
                            key={offer.id}
                            onClick={() => handleOfferChange(offer.id)}
                            className={`cursor-pointer rounded-2xl p-4 border transition-all duration-300 relative flex flex-col justify-between ${
                              selectedOfferId === offer.id
                                ? "bg-amber-500/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                                : "border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20 hover:border-slate-350 hover:bg-slate-50 dark:hover:bg-zinc-900/40"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-black">{offer.name}</span>
                                {selectedOfferId === offer.id && (
                                  <span className="p-1 bg-amber-500 text-white rounded-full">
                                    <Check className="h-3 w-3 stroke-[3]" />
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground leading-snug mb-3">
                                SLA de détection : <strong>{offer.mttd}</strong> | MTTR : <strong>{offer.mttr}</strong>
                              </p>
                              <div className="text-xs text-slate-700 dark:text-zinc-300 font-bold mb-1">
                                Postes inclus : {offer.maxPcs} agents EDR
                              </div>
                            </div>
                            <div className="text-lg font-black text-amber-600 dark:text-amber-500 mt-2">
                              {offer.value.toLocaleString("fr-FR")} EUR <span className="text-[10px] text-muted-foreground">/ {offer.period}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <Separator className="border-slate-100 dark:border-zinc-800" />

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Billing Cycle */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Périodicité de facturation</Label>
                      <Select 
                        value={form.billingCycle} 
                        onValueChange={(v: any) => setForm({ ...form, billingCycle: v })}
                      >
                        <SelectTrigger className="w-full bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                          <SelectItem value="mensuel" className="text-xs">Mensuelle (À terme échu)</SelectItem>
                          <SelectItem value="trimestriel" className="text-xs">Trimestrielle</SelectItem>
                          <SelectItem value="annuel" className="text-xs">Annuelle (Anticipée)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mode de règlement</Label>
                      <Select 
                        value={form.paymentMethod} 
                        onValueChange={(v: any) => setForm({ ...form, paymentMethod: v })}
                      >
                        <SelectTrigger className="w-full bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                          <SelectItem value="virement" className="text-xs">Virement bancaire SEPA</SelectItem>
                          <SelectItem value="prelevement" className="text-xs">Prélèvement automatique</SelectItem>
                          <SelectItem value="orange_money" className="text-xs">Orange Money Pro (Sénégal)</SelectItem>
                          <SelectItem value="facture_orange" className="text-xs">Facture Globale Orange Business</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 rounded-xl flex items-center justify-between border border-slate-100 dark:border-zinc-850">
                    <div className="flex items-center gap-3">
                      <Receipt className="h-5 w-5 text-amber-500 shrink-0" />
                      <div className="text-xs">
                        <div className="font-bold">Référence compte de facturation client générée</div>
                        <div className="text-muted-foreground mt-0.5">Identifiant unique du contrat financier</div>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {form.clientAccountRef}
                    </span>
                  </div>

                </CardContent>
              </Card>
            )}

            {/* Step 3: Accès et Produits */}
            {activeStep === 3 && (
              <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl overflow-hidden animate-in fade-in duration-300">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-yellow-400" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-3 font-bold dark:text-zinc-100">
                    <Lock className="h-5 w-5 text-amber-500" />
                    Accès et Produits (Licences & Protection EDR)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Attribuez des privilèges d'accès et ajustez la capacité matérielle de protection EDR.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Default Access Role */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rôle d'administration client</Label>
                      <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                        <SelectTrigger className="w-full bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                          <SelectItem value="client" className="text-xs font-semibold">Client standard (Lecture seule/Abonnement)</SelectItem>
                          <SelectItem value="manager" className="text-xs font-semibold">Manager d'organisation (Contrôle total EDR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* EDR Policy */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Politique de sécurité EDR</Label>
                      <Select 
                        value={form.edrPolicy} 
                        onValueChange={(v: any) => setForm({ ...form, edrPolicy: v })}
                      >
                        <SelectTrigger className="w-full bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500">
                          <SelectValue placeholder="Choisir une politique" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                          <SelectItem value="standard" className="text-xs font-semibold">🛡️ Standard Defense (Baseline)</SelectItem>
                          <SelectItem value="zero-trust" className="text-xs font-semibold">🚨 Strict Zero-Trust</SelectItem>
                          <SelectItem value="aggressive" className="text-xs font-semibold">🔥 Hunting actif & Proactif</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Quota Curseur */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quota d'agents Wazuh EDR max autorisé</Label>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        {form.agentQuota} agents
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="5" 
                      max="500" 
                      step="5"
                      value={form.agentQuota} 
                      onChange={(e) => setForm({ ...form, agentQuota: parseInt(e.target.value) })}
                      className="w-full h-2 bg-slate-150 dark:bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                      <span>Min: 5</span>
                      <span>Max: 500 agents connectés</span>
                    </div>
                  </div>

                  <Separator className="border-slate-100 dark:border-zinc-800" />

                  {/* Access security policies */}
                  <div className="space-y-4">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exigences de sécurité d'accès</Label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-850">
                        <Label htmlFor="mfa" className="flex flex-col space-y-0.5 cursor-pointer">
                          <span className="text-xs font-bold dark:text-zinc-200">Exiger la double authentification (A2F / MFA)</span>
                          <span className="font-normal text-[10px] text-muted-foreground">Forcer à la première connexion</span>
                        </Label>
                        <Switch 
                          id="mfa"
                          checked={form.requireMfa}
                          onCheckedChange={(c) => setForm({ ...form, requireMfa: c })}
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-850">
                        <Label htmlFor="invite" className="flex flex-col space-y-0.5 cursor-pointer">
                          <span className="text-xs font-bold dark:text-zinc-200">Envoyer le lien d'invitation par mail</span>
                          <span className="font-normal text-[10px] text-muted-foreground">Envoi automatique du code OTP sécurisé</span>
                        </Label>
                        <Switch 
                          id="invite"
                          checked={form.sendInvite}
                          onCheckedChange={(c) => setForm({ ...form, sendInvite: c })}
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            )}

            {/* Step 4: Services */}
            {activeStep === 4 && (
              <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl overflow-hidden animate-in fade-in duration-300">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-yellow-400" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-3 font-bold dark:text-zinc-100">
                    <Cpu className="h-5 w-5 text-amber-500" />
                    Intégrations & Automatisation SOAR
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Raccordez le SIEM aux pipelines d'orchestration de réponse active et d'alerte.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  
                  {/* Automation SOAR level cards */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Niveau de remédiation automatique (SOAR / Incident Response)</Label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: "manual", title: "Manuel", desc: "Alerte & Ticket uniquement", icon: <Sliders className="h-4 w-4" /> },
                        { id: "semi", title: "Semi-Autonome", desc: "Humain requis pour bloquer", icon: <Shield className="h-4 w-4" /> },
                        { id: "autonomous", title: "Autonome 🟢", desc: "Isolation EDR par IA Djib'son", icon: <Zap className="h-4 w-4" /> }
                      ].map((level) => (
                        <div
                          key={level.id}
                          onClick={() => setForm({ ...form, automationLevel: level.id })}
                          className={`cursor-pointer rounded-xl p-3.5 border text-center transition-all duration-300 flex flex-col justify-between items-center ${
                            form.automationLevel === level.id
                              ? "bg-amber-500/10 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                              : "border-slate-100 dark:border-zinc-800 hover:border-slate-350 bg-slate-50/50 dark:bg-zinc-950/20"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                            form.automationLevel === level.id ? "bg-amber-500 text-white" : "bg-slate-200 dark:bg-zinc-900 text-muted-foreground"
                          }`}>
                            {level.icon}
                          </div>
                          <div>
                            <div className="text-xs font-bold dark:text-zinc-200">{level.title}</div>
                            <div className="text-[9px] text-muted-foreground mt-1 leading-tight">{level.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="border-slate-100 dark:border-zinc-800" />

                  {/* Alert Channel */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Canal d'alerte prioritaire</Label>
                    <Select 
                      value={form.alertChannel} 
                      onValueChange={(v: any) => setForm({ ...form, alertChannel: v })}
                    >
                      <SelectTrigger className="w-full bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500">
                        <SelectValue placeholder="Canal d'alertes" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                        <SelectItem value="email_sms" className="text-xs font-semibold">Email & SMS Chiffrés</SelectItem>
                        <SelectItem value="slack" className="text-xs font-semibold">Webhook Slack Incident Response</SelectItem>
                        <SelectItem value="teams" className="text-xs font-semibold">Microsoft Teams Cyber Hub</SelectItem>
                        <SelectItem value="telegram" className="text-xs font-semibold">Secure Telegram Bot Channel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator className="border-slate-100 dark:border-zinc-800" />

                  {/* Wazuh Advanced Options toggles */}
                  <div className="space-y-4">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fonctionnalités avancées de l'agent EDR</Label>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-850">
                        <Label htmlFor="ar" className="text-xs font-bold text-slate-600 dark:text-zinc-350 cursor-pointer">Wazuh ActiveResponse</Label>
                        <Switch 
                          id="ar"
                          checked={form.wazuhActiveResponse}
                          onCheckedChange={(c) => setForm({ ...form, wazuhActiveResponse: c })}
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-850">
                        <Label htmlFor="ad" className="text-xs font-bold text-slate-600 dark:text-zinc-350 cursor-pointer">Sync Active Directory</Label>
                        <Switch 
                          id="ad"
                          checked={form.wazuhAdSync}
                          onCheckedChange={(c) => setForm({ ...form, wazuhAdSync: c })}
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-850">
                        <Label htmlFor="tls" className="text-xs font-bold text-slate-600 dark:text-zinc-350 cursor-pointer">Syslog TLS Forwarder</Label>
                        <Switch 
                          id="tls"
                          checked={form.wazuhSyslog}
                          onCheckedChange={(c) => setForm({ ...form, wazuhSyslog: c })}
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            )}

            {/* Step 5: Validation */}
            {activeStep === 5 && (
              <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl overflow-hidden animate-in fade-in duration-300">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-emerald-500 animate-pulse" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-3 font-bold dark:text-zinc-100">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    Validation et lancement du provisionnement cyber
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Vérifiez toutes les informations de configuration avant le lancement du déploiement.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  
                  {/* Interactive recap widgets */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    
                    <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-100 dark:border-zinc-850 space-y-2">
                      <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-amber-500" /> Identité du représentant
                      </div>
                      <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">{form.firstName} {form.lastName}</div>
                      <div className="text-xs text-muted-foreground">{form.email}</div>
                      <div className="text-xs text-muted-foreground">{form.phone || "Aucun numéro fourni"}</div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-100 dark:border-zinc-850 space-y-2">
                      <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-amber-500" /> Coordonnées Structure
                      </div>
                      <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">{form.organization}</div>
                      <div className="text-xs text-muted-foreground">{form.website || "Aucun site fourni"}</div>
                      <div className="text-[10px] bg-slate-200 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 font-bold px-2 py-0.5 rounded inline-block mt-1">
                        Adresse : {form.deliveryCity} ({form.deliveryCountry})
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-100 dark:border-zinc-850 space-y-2">
                      <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-amber-500" /> Détails Facturation
                      </div>
                      <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">
                        Formule : <span className="uppercase text-amber-600 dark:text-amber-500">{selectedOfferId}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Cycle : {form.billingCycle} | Règlement : {form.paymentMethod}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">Facturation : {form.clientAccountRef}</div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-100 dark:border-zinc-850 space-y-2">
                      <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-amber-500" /> Cyber-Sécurité & SIEM
                      </div>
                      <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">
                        Capacité max : {form.agentQuota} agents EDR
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Stratégie : {form.edrPolicy} | A2F : {form.requireMfa ? "Exigée" : "Non-Requise"}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold">
                        SOAR : {form.automationLevel === "autonomous" ? "Isolation Djib'son IA" : "Semi-Autonome"}
                      </div>
                    </div>

                  </div>

                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-xs text-slate-800 dark:text-zinc-300 leading-relaxed flex gap-3">
                    <Info className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p>
                      En lançant le provisionnement, la plateforme va orchestrer automatiquement la création des accès et des politiques de sécurité. Un email d'activation OTP sera instantanément envoyé à <strong>{form.email}</strong>.
                    </p>
                  </div>

                </CardContent>
              </Card>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center justify-between pt-4">
              {activeStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handlePrev}
                  className="rounded-xl font-bold bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Précédent
                </Button>
              ) : (
                <div />
              )}

              {activeStep < 5 ? (
                <Button
                  type="button"
                  size="lg"
                  onClick={handleNext}
                  className="rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white ml-auto"
                >
                  Suivant
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  onClick={createUser}
                  disabled={busy}
                  className="rounded-xl font-extrabold bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl ml-auto gap-2"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-4 w-4" />}
                  Lancer le provisionnement EDR
                </Button>
              )}
            </div>

          </div>

          {/* Right Column: Cyber previews HUD Console */}
          <div className="space-y-6">
            
            <Card className="bg-zinc-950 border border-amber-500/20 shadow-[0_0_25px_rgba(245,158,11,0.05)] rounded-2xl overflow-hidden relative animate-in slide-in-from-right duration-500">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber-500 to-yellow-500" />
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-black tracking-widest text-amber-500 uppercase flex items-center gap-2">
                  <Server className="h-3.5 w-3.5 animate-pulse" />
                  Aperçu Provision EDR en temps réel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                
                {/* Dynamic Badge & Policy HUD */}
                <div className="bg-black/60 border border-zinc-900 rounded-xl p-4 text-center space-y-3 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl" />
                  <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center font-bold text-white shadow-lg text-lg">
                    {form.organization ? form.organization.substring(0,2).toUpperCase() : "SI"}
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-zinc-100 tracking-tight">
                      {form.organization || "Nouvelle Organisation"}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-semibold mt-0.5">
                      {form.email || "en-attente@email.com"}
                    </div>
                  </div>
                  <div className={`mx-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${
                    form.edrPolicy === "zero-trust" 
                      ? "bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.2)]" 
                      : form.edrPolicy === "aggressive" 
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  }`}>
                    {form.edrPolicy === "zero-trust" ? "Strict Zero-Trust 🚨" : form.edrPolicy === "aggressive" ? "Proactive Hunting 🔥" : "Standard Defense 🛡️"}
                  </div>
                </div>

                {/* Quota Progress meter */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                    <span>Quota Agents EDR</span>
                    <span className="text-amber-500">{form.agentQuota} / 500</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" 
                      style={{ width: `${(form.agentQuota / 500) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Incident Level Info */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80 text-[10px] font-semibold text-zinc-300">
                  <span>Niveau de protection :</span>
                  <span className="flex items-center gap-1.5 text-zinc-100">
                    <Zap className="h-3 w-3 text-amber-500 animate-pulse" />
                    {form.automationLevel === "autonomous" ? "Défense Autonome" : form.automationLevel === "semi" ? "Semi-Autonome" : "Incident Manuel"}
                  </span>
                </div>

                {/* SIEM Terminal Logs */}
                <div className="bg-black rounded-lg p-3 border border-zinc-800 font-mono text-[9px] text-emerald-400 space-y-1 leading-relaxed">
                  <div className="text-zinc-500 font-bold border-b border-zinc-900 pb-1.5 flex justify-between">
                    <span>CONSOLE DE PROVISIONNEMENT</span>
                    <span className="animate-pulse">● LIVE</span>
                  </div>
                  {hudLogs.map((log, idx) => (
                    <div key={idx} className="truncate">
                      <span className="text-emerald-700 mr-1.5">❯</span>
                      {log}
                    </div>
                  ))}
                </div>

              </CardContent>
            </Card>

          </div>

        </div>
      </div>
    </div>
  );
}
