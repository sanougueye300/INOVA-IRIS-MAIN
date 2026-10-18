import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Building, Mail, User, Loader2, ArrowLeft, Phone,
  Shield, Cpu, Sliders, Server, Zap, Check, Play, Terminal, Lock,
  CreditCard, CheckCircle2, ChevronRight, ChevronLeft, Info,
  Smartphone, Sparkles, CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { loadOffers, type Offer } from "@/lib/offers";
import { recordAuditEvent } from "@/lib/audit-log";

export const Route = createFileRoute("/clients/new")({
  head: () => ({ meta: [{ title: "Nouveau Client — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><NewClient /></RequireAuth>,
});

function NewClient() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [deployStep, setDeployStep] = useState<number | null>(null);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  
  // Wizard state: 1 to 5
  const [activeStep, setActiveStep] = useState<number>(1);
  
  // Dynamic list of offers loaded from catalog — init synchronously to avoid undefined on first render
  const [offers, setOffers] = useState<Offer[]>(() => {
    const list = loadOffers();
    return list.filter((o: Offer) => o.isActive);
  });
  const [selectedOfferId, setSelectedOfferId] = useState<string>(() => {
    const list = loadOffers().filter((o: Offer) => o.isActive);
    return list.length > 0 ? list[0].id : "inova-secure";
  });

  // Form State - Streamlined, no website, no delivery address, no billing address
  const [form, setForm] = useState({
    // Step 1: Informations Entreprise & Représentant
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    organization: "",
    sector: "Technologies & Télécoms",

    // Step 2: Données Facturation & PayTech
    billingCycle: "annuel",
    paymentMethod: "paytech",
    clientAccountRef: "A003107" + Math.floor(Math.random() * 900000 + 100000),
    
    // PayTech configuration
    paytechMethod: "wave", // wave, om, card, guichet
    paytechPhone: "",
    
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

  // Sync agentQuota when selectedOfferId changes (initial or user selection)
  useEffect(() => {
    const found = offers.find(o => o.id === selectedOfferId);
    if (found) {
      setForm(prev => ({ ...prev, agentQuota: found.maxPcs }));
    }
  }, [selectedOfferId]);

  // Sync phone with paytechPhone if empty
  useEffect(() => {
    if (form.phone && !form.paytechPhone) {
      setForm(prev => ({ ...prev, paytechPhone: prev.phone }));
    }
  }, [form.phone]);

  // Update form fields dynamically based on offer selection
  const handleOfferChange = (offerId: string) => {
    setSelectedOfferId(offerId);
    const selected = offers.find(o => o.id === offerId);
    if (selected) {
      setForm(prev => ({
        ...prev,
        agentQuota: selected.maxPcs,
        edrPolicy: selected.id.includes("platine") ? "zero-trust" : selected.id.includes("or") ? "aggressive" : "standard"
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
      if (!form.phone.trim()) { toast.error("Numéro de téléphone requis"); return false; }
      if (!form.organization.trim()) { toast.error("Nom de l'entreprise requis"); return false; }
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

  // Selected offer helper — fallback to first offer, then a safe empty object to never crash
  const selectedOffer = offers.find(o => o.id === selectedOfferId) || offers[0] || { 
    id: "", name: "—", value: 0, currency: "FCFA", period: "mois", maxPcs: 25,
    mttd: "—", mttr: "—", support: "—", features: [], isActive: true 
  };

  // Dynamic console logs in the live HUD
  const [hudLogs, setHudLogs] = useState<string[]>([]);
  useEffect(() => {
    const policyLabel = 
      form.edrPolicy === "zero-trust" ? "STRICT ZERO-TRUST" : 
      form.edrPolicy === "aggressive" ? "PROACTIVE HUNTING" : "DEFENSE STANDARD";
    
    const logs = [
      `[SYS] Client: ${form.organization || "En attente..."}`,
      `[PAY] Passerelle: PAYTECH SN (${form.paytechMethod.toUpperCase()})`,
      `[EDR] Quota maximum: ${form.agentQuota} agents`,
      `[EDR] Baseline policy: ${policyLabel}`,
      `[SOAR] Canal: ${form.alertChannel.toUpperCase()}`,
      `[IA] Niveau auto: ${form.automationLevel.toUpperCase()}`,
      `[WZH] ActiveResponse: ${form.wazuhActiveResponse ? "ACTIF" : "INACTIF"}`,
      `[TLS] Syslog forwarder: ${form.wazuhSyslog ? "PRÊT" : "DÉSACTIVÉ"}`
    ];
    setHudLogs(logs);
  }, [form.organization, form.paytechMethod, form.agentQuota, form.edrPolicy, form.alertChannel, form.automationLevel, form.wazuhActiveResponse, form.wazuhSyslog]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) return;
    
    setBusy(true);
    setDeployStep(0);
    setDeployLogs(["[INFO] Initialisation du provisionnement client de nouvelle génération..."]);

    const steps = [
      { text: "[OK] Enregistrement de l'organisation dans le référentiel central.", delay: 500 },
      { text: `[PAYTECH] Initialisation passerelle PayTech SN (Réf: PAYTECH-${form.clientAccountRef}).`, delay: 600 },
      { text: "[SIEM] Provisionnement du sandbox Wazuh dédié et sécurisé.", delay: 500 },
      { text: `[EDR] Déploiement de la politique cyber-défense [${form.edrPolicy.toUpperCase()}].`, delay: 600 },
      { text: `[SOAR] Configuration des flux d'orchestration [${form.alertChannel.toUpperCase()}].`, delay: 500 },
      { text: `[IA] Activation de l'assistance autonome (Niveau: ${form.automationLevel}).`, delay: 600 },
      { text: "[OK] Envoi de l'invitation sécurisée et du lien PayTech au représentant.", delay: 700 }
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
            phone: form.phone || "+221000000000",
            generation: "v2",
            isActive: true,
          }
        });
        
        if (error) {
          console.error("Erreur Edge Function:", error);
          throw new Error(error.message || "Erreur lors de l'appel à la fonction Edge");
        }
        
        if (data && typeof data === 'object' && 'error' in data) {
          console.error("Erreur dans la réponse:", data);
          throw new Error((data as any).error || "Erreur lors de la création du client");
        }
        
        setDeployLogs((prev) => [...prev, "[SUCCESS] Client déployé avec succès sur la plateforme SOC !"]);
        void recordAuditEvent("CLIENT_CREATE", fullName, {
          client_id: data?.userId ?? null,
          email: form.email,
          role: form.role,
        }, form.organization, "staff");
        
        toast.success(`Client créé avec succès`, {
          description: `Compte configuré et lien PayTech prêt pour activation.`,
        });
        
        await navigate({ 
          to: "/clients",
          search: { refresh: Date.now().toString() }
        });
      } catch (err: any) {
        toast.error("Erreur lors de la création", {
          description: err?.message ?? "Une erreur est survenue lors du provisionnement",
        });
        setDeployStep(null);
        setBusy(false);
      }
    };

    runSimulationSteps();
  };

  const stepsList = [
    { num: 1, title: "Identité", desc: "Entreprise & Contact", icon: <User className="h-4 w-4" /> },
    { num: 2, title: "Offre & PayTech", desc: "Formule & Règlement", icon: <CreditCard className="h-4 w-4" /> },
    { num: 3, title: "Accès & EDR", desc: "Licences & Quota", icon: <Lock className="h-4 w-4" /> },
    { num: 4, title: "Services SOAR", desc: "IA & Automatisation", icon: <Server className="h-4 w-4" /> },
    { num: 5, title: "Validation", desc: "Déploiement direct", icon: <CheckCircle2 className="h-4 w-4" /> }
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#090a0f] text-slate-900 dark:text-zinc-100 transition-colors duration-300 relative overflow-hidden">
      
      {/* Subtle modern cyber glow mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(245,158,11,0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-gradient-to-b from-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-t from-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Deployment Simulation Overlay */}
      {deployStep !== null && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-zinc-950 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500" />
            
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                  <Terminal className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">Déploiement en cours</h3>
                  <p className="text-xs text-zinc-400">Orchestration cyber-sécurité & PayTech Sénégal</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                En direct
              </div>
            </div>

            <div className="my-5 bg-black/70 border border-zinc-850 rounded-2xl p-4 font-mono text-xs text-emerald-400 space-y-2 max-h-56 overflow-y-auto">
              {deployLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-zinc-600 text-[11px] select-none">❯</span>
                  <span className="leading-relaxed">{log}</span>
                </div>
              ))}
              {deployStep < 7 && (
                <div className="flex items-center gap-2 text-amber-400 animate-pulse pt-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Traitement des flux cryptographiques...</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400 font-medium">
                <span>Progression</span>
                <span className="text-amber-400 font-bold">{Math.round(((deployStep + 1) / 8) * 100)}%</span>
              </div>
              <div className="h-2 w-full bg-zinc-850 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(((deployStep + 1) / 8) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        
        {/* Sleek Minimal Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3.5">
            <Button 
              variant="outline" 
              size="icon" 
              asChild 
              className="rounded-2xl h-11 w-11 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-slate-200 dark:border-zinc-800 hover:border-amber-500 transition-all shadow-sm"
            >
              <Link to="/clients">
                <ArrowLeft className="h-5 w-5 text-slate-700 dark:text-zinc-300" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent">
                  Nouveau Client
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Provisionnement SOC
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                Enrôlement simplifié, attribution des licences EDR et passerelle PayTech Sénégal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <div className="px-3 py-1.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-slate-200/80 dark:border-zinc-800/80 backdrop-blur-md flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">SIEM En Ligne</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-slate-200/80 dark:border-zinc-800/80 backdrop-blur-md flex items-center gap-2 shadow-sm">
              <Shield className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">TLS 1.3</span>
            </div>
          </div>
        </div>

        {/* Modern Stepper Progress Bar */}
        <div className="mb-8 p-3 sm:p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {stepsList.map((st, idx) => {
              const isCurrent = activeStep === st.num;
              const isDone = activeStep > st.num;
              return (
                <div key={st.num} className="flex-1 flex items-center">
                  <button
                    type="button"
                    onClick={() => { if (st.num < activeStep) setActiveStep(st.num); }}
                    disabled={st.num > activeStep}
                    className={`flex items-center gap-2.5 p-2 rounded-xl transition-all duration-300 w-full text-left ${
                      isCurrent 
                        ? "bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 shadow-xs" 
                        : isDone 
                          ? "hover:bg-slate-100 dark:hover:bg-zinc-800/60 cursor-pointer" 
                          : "opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                      isCurrent 
                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/30" 
                        : isDone 
                          ? "bg-emerald-500 text-white" 
                          : "bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
                    }`}>
                      {isDone ? <Check className="h-4 w-4 stroke-[2.5]" /> : st.num}
                    </div>
                    <div className="hidden md:block min-w-0">
                      <div className={`text-xs font-bold truncate ${
                        isCurrent ? "text-amber-600 dark:text-amber-400" : isDone ? "text-slate-800 dark:text-zinc-200" : "text-slate-500 dark:text-zinc-400"
                      }`}>
                        {st.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                        {st.desc}
                      </div>
                    </div>
                  </button>
                  {idx < stepsList.length - 1 && (
                    <div className="hidden sm:block w-3 sm:w-6 h-0.5 bg-slate-200 dark:bg-zinc-800 shrink-0 mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Grid: Form (col-span-8) + Sticky Live Overview (col-span-4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Active Step Panel */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* STEP 1: INFORMATIONS ENTREPRISE & CONTACT */}
            {activeStep === 1 && (
              <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/70 backdrop-blur-xl shadow-md overflow-hidden animate-in fade-in duration-300">
                <CardHeader className="pb-4 pt-6 px-6 sm:px-8 border-b border-slate-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        Informations du Client & Représentant
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Coordonnées professionnelles et profil de l'organisation.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6 sm:p-8 space-y-6">
                  {/* Entreprise & Secteur */}
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      Structure de l'organisation
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Nom de l'entreprise / Organisation <span className="text-amber-500">*</span>
                        </Label>
                        <div className="relative flex items-center">
                          <Building className="absolute left-3.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                          <input
                            type="text"
                            value={form.organization}
                            onChange={(e) => setForm({ ...form, organization: e.target.value })}
                            placeholder="Ex: Sonatel, Free SN, Wave CI..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-sm font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Secteur d'activité
                        </Label>
                        <Select 
                          value={form.sector} 
                          onValueChange={(v) => setForm({ ...form, sector: v })}
                        >
                          <SelectTrigger className="w-full py-2.5 h-auto rounded-xl bg-slate-50/80 dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800 text-sm font-medium focus:ring-2 focus:ring-amber-500/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                            <SelectItem value="Technologies & Télécoms">Technologies & Télécoms</SelectItem>
                            <SelectItem value="Banque, Finance & Fintech">Banque, Finance & Fintech</SelectItem>
                            <SelectItem value="Santé & Pharmaceutique">Santé & Pharmaceutique</SelectItem>
                            <SelectItem value="Énergie & Industrie">Énergie & Industrie</SelectItem>
                            <SelectItem value="Secteur Public & Gouvernement">Secteur Public & Gouvernement</SelectItem>
                            <SelectItem value="Commerce & Distribution">Commerce & Distribution</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator className="border-slate-100 dark:border-zinc-800/80" />

                  {/* Représentant */}
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      Représentant Principal (Administrateur Référent)
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Prénom <span className="text-amber-500">*</span>
                        </Label>
                        <div className="relative flex items-center">
                          <User className="absolute left-3.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                          <input
                            type="text"
                            value={form.firstName}
                            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                            placeholder="Amadou"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-sm font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Nom de famille <span className="text-amber-500">*</span>
                        </Label>
                        <div className="relative flex items-center">
                          <User className="absolute left-3.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                          <input
                            type="text"
                            value={form.lastName}
                            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                            placeholder="Diallo"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-sm font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          E-mail professionnel <span className="text-amber-500">*</span>
                        </Label>
                        <div className="relative flex items-center">
                          <Mail className="absolute left-3.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                          <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="a.diallo@entreprise.sn"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-sm font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Téléphone direct <span className="text-amber-500">*</span>
                        </Label>
                        <div className="relative flex items-center">
                          <Phone className="absolute left-3.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                          <input
                            type="tel"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="+221 77 000 00 00"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-sm font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                    <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                      L'invitation d'accès avec mot de passe temporaire et lien PayTech sécurisé sera transmise directement à cette adresse e-mail.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 2: OFFRE & PASSERELLE PAYTECH */}
            {activeStep === 2 && (
              <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/70 backdrop-blur-xl shadow-md overflow-hidden animate-in fade-in duration-300">
                <CardHeader className="pb-4 pt-6 px-6 sm:px-8 border-b border-slate-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        Formule d'Abonnement & Passerelle PayTech
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Sélectionnez la protection requise et configurez le règlement PayTech Sénégal.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6 sm:p-8 space-y-6">
                  {/* Offers Grid */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                        Formules de Cyber-Sécurité
                      </Label>
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {offers.length} formules disponibles
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {offers.map((offer) => {
                        const isSelected = selectedOfferId === offer.id;
                        return (
                          <div
                            key={offer.id}
                            onClick={() => handleOfferChange(offer.id)}
                            className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between relative group ${
                              isSelected
                                ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10 ring-1 ring-amber-500"
                                : "bg-slate-50/60 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-bold uppercase tracking-wide ${
                                  isSelected ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-zinc-200"
                                }`}>
                                  {offer.name}
                                </span>
                                {isSelected ? (
                                  <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                                    <Check className="h-3 w-3 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-zinc-700 group-hover:border-slate-400" />
                                )}
                              </div>

                              <div className="space-y-1 text-xs text-slate-500 dark:text-zinc-400 mb-3">
                                <div className="flex items-center gap-1.5">
                                  <Cpu className="h-3.5 w-3.5 text-blue-500" />
                                  <span>Jusqu'à <strong className="text-slate-700 dark:text-zinc-300">{offer.maxPcs} agents</strong></span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Shield className="h-3.5 w-3.5 text-emerald-500" />
                                  <span>MTTD : {offer.mttd} · MTTR : {offer.mttr}</span>
                                </div>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-200/60 dark:border-zinc-800/60 flex items-baseline justify-between">
                              <span className="text-base font-extrabold text-slate-900 dark:text-zinc-100">
                                {offer.value.toLocaleString("fr-FR")} <span className="text-xs font-semibold text-slate-500">{offer.currency}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">/{offer.period}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Facturation & Période */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Périodicité de facturation
                      </Label>
                      <Select 
                        value={form.billingCycle} 
                        onValueChange={(v) => setForm({ ...form, billingCycle: v })}
                      >
                        <SelectTrigger className="w-full py-2.5 h-auto rounded-xl bg-slate-50/80 dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800 text-sm font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                          <SelectItem value="annuel">Annuelle (Recommandée — Économie 20%)</SelectItem>
                          <SelectItem value="mensuel">Mensuelle (Sans engagement long)</SelectItem>
                          <SelectItem value="trimestriel">Trimestrielle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Mode de paiement principal
                      </Label>
                      <Select 
                        value={form.paymentMethod} 
                        onValueChange={(v) => setForm({ ...form, paymentMethod: v })}
                      >
                        <SelectTrigger className="w-full py-2.5 h-auto rounded-xl bg-slate-50/80 dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800 text-sm font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                          <SelectItem value="paytech" className="font-semibold text-amber-600 dark:text-amber-500">
                            PayTech Sénégal (Wave / OM / CB)
                          </SelectItem>
                          <SelectItem value="virement">Virement bancaire professionnel</SelectItem>
                          <SelectItem value="facture_orange">Facture Orange Business</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* MODERN PAYTECH SÉNÉGAL MODULE - Replaces Bank Coordinates */}
                  {form.paymentMethod === "paytech" && (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-emerald-500/5 border-2 border-amber-500/25 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-900 dark:text-zinc-100">
                                Passerelle PayTech Sénégal
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Agréé BCEAO
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                              Règlement instantané Wave, Orange Money et Cartes Bancaires.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-start sm:self-auto">
                          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-amber-600 dark:text-amber-400">
                            PAYTECH-{form.clientAccountRef}
                          </span>
                        </div>
                      </div>

                      {/* PayTech Channel Pills */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Canal de paiement privilégié
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {[
                            { id: "wave", name: "Wave Sénégal", desc: "Push direct 0% frais", color: "border-cyan-500/40 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5" },
                            { id: "om", name: "Orange Money", desc: "Push OTP mobile", color: "border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-500/5" },
                            { id: "card", name: "Carte Bancaire", desc: "Visa / Mastercard 3DS", color: "border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/5" },
                            { id: "guichet", name: "Guichet Global", desc: "Tous opérateurs", color: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5" }
                          ].map((channel) => (
                            <button
                              key={channel.id}
                              type="button"
                              onClick={() => setForm({ ...form, paytechMethod: channel.id })}
                              className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                                form.paytechMethod === channel.id
                                  ? `${channel.color} ring-1 ring-current shadow-xs`
                                  : "border-slate-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/40 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-700 dark:text-zinc-300"
                              }`}
                            >
                              <div className="text-xs font-bold flex items-center justify-between">
                                {channel.name}
                                {form.paytechMethod === channel.id && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                                {channel.desc}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* PayTech Phone Field */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                            Numéro Mobile PayTech pour encaissement
                          </Label>
                          <div className="relative flex items-center">
                            <Smartphone className="absolute left-3.5 h-4 w-4 text-slate-400" />
                            <input
                              type="tel"
                              value={form.paytechPhone || form.phone}
                              onChange={(e) => setForm({ ...form, paytechPhone: e.target.value })}
                              placeholder="+221 77 000 00 00"
                              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-medium focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                            />
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white/80 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-center">
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400">Total contrat prévisionnel</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <span>
                              {form.billingCycle === "annuel" 
                                ? (selectedOffer.value * 12 * 0.8).toLocaleString("fr-FR") 
                                : selectedOffer.value.toLocaleString("fr-FR")
                              } {selectedOffer.currency}
                            </span>
                            <span className="text-[10px] font-normal text-slate-500">
                              / {form.billingCycle}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 pt-1">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>Notification IPN instantanée · Chiffrement AES-256 · Facture proforma jointe</span>
                      </div>
                    </div>
                  )}

                  {/* Alternative non-paytech payment note */}
                  {form.paymentMethod !== "paytech" && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400 flex items-center gap-3">
                      <Info className="h-4 w-4 text-blue-500 shrink-0" />
                      <div>
                        Règlement par <strong>{form.paymentMethod === "virement" ? "Virement bancaire" : "Facturation Orange"}</strong> sélectionné.
                        Les instructions de règlement avec la référence <strong>{form.clientAccountRef}</strong> seront incluses dans la facture transmise.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* STEP 3: ACCÈS ET PRODUITS EDR */}
            {activeStep === 3 && (
              <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/70 backdrop-blur-xl shadow-md overflow-hidden animate-in fade-in duration-300">
                <CardHeader className="pb-4 pt-6 px-6 sm:px-8 border-b border-slate-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        Accès & Licences de Protection EDR
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Privilèges de gestion et dimensionnement du parc de postes protégés.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6 sm:p-8 space-y-6">
                  {/* EDR Policy interactive cards */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      Politique de défense EDR Wazuh
                    </Label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: "standard", title: "Standard Baseline", desc: "Détection heuristique & conformité", icon: <Shield className="h-4 w-4 text-emerald-500" /> },
                        { id: "aggressive", title: "Hunting Proactif", desc: "Surveillance agressive & IOA", icon: <Zap className="h-4 w-4 text-amber-500" /> },
                        { id: "zero-trust", title: "Strict Zero-Trust", desc: "Isolation et blocage par défaut", icon: <Lock className="h-4 w-4 text-red-500" /> }
                      ].map((pol) => (
                        <div
                          key={pol.id}
                          onClick={() => setForm({ ...form, edrPolicy: pol.id })}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            form.edrPolicy === pol.id
                              ? "bg-amber-500/10 border-amber-500 shadow-xs ring-1 ring-amber-500"
                              : "bg-slate-50/60 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            {pol.icon}
                            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">{pol.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                            {pol.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quota slider */}
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800">
                    <div className="flex justify-between items-center">
                      <div>
                        <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                          Quota d'agents Wazuh EDR
                        </Label>
                        <p className="text-[11px] text-slate-500">Nombre d'endpoints autorisés à s'enrôler</p>
                      </div>
                      <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {form.agentQuota} agents
                      </span>
                    </div>

                    <input 
                      type="range" 
                      min="5" 
                      max="250" 
                      step="5"
                      value={form.agentQuota} 
                      onChange={(e) => setForm({ ...form, agentQuota: parseInt(e.target.value) })}
                      className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />

                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>Minimum : 5 endpoints</span>
                      <span>Maximum : 250 endpoints</span>
                    </div>
                  </div>

                  <Separator className="border-slate-100 dark:border-zinc-800/80" />

                  {/* Access role & MFA switches */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      Paramètres de sécurité du compte
                    </Label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/60 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800">
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">Double Authentification (2FA)</div>
                          <div className="text-[10px] text-slate-500">Exiger lors de la 1ère connexion</div>
                        </div>
                        <Switch 
                          checked={form.requireMfa}
                          onCheckedChange={(c) => setForm({ ...form, requireMfa: c })}
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/60 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800">
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">Envoi invitation e-mail</div>
                          <div className="text-[10px] text-slate-500">Génération du code OTP temporaire</div>
                        </div>
                        <Switch 
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

            {/* STEP 4: SERVICES SOAR ET AUTOMATISATION */}
            {activeStep === 4 && (
              <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/70 backdrop-blur-xl shadow-md overflow-hidden animate-in fade-in duration-300">
                <CardHeader className="pb-4 pt-6 px-6 sm:px-8 border-b border-slate-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
                      <Cpu className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        Services SOAR & Automatisation IA
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Pipelines de réponse aux incidents et canaux de notification SOC.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6 sm:p-8 space-y-6">
                  {/* Automation Levels */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      Niveau de remédiation automatique SOAR
                    </Label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: "manual", title: "Manuel", desc: "Alerte & Ticket sans action automatique", icon: <Sliders className="h-4 w-4" /> },
                        { id: "semi", title: "Semi-Autonome", desc: "Validation humaine requise pour blocage", icon: <Shield className="h-4 w-4" /> },
                        { id: "autonomous", title: "Autonome IA", desc: "Isolation EDR immédiate par l'IA", icon: <Zap className="h-4 w-4" /> }
                      ].map((lvl) => (
                        <div
                          key={lvl.id}
                          onClick={() => setForm({ ...form, automationLevel: lvl.id })}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all text-center flex flex-col items-center justify-between ${
                            form.automationLevel === lvl.id
                              ? "bg-amber-500/10 border-amber-500 shadow-xs ring-1 ring-amber-500"
                              : "bg-slate-50/60 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                            form.automationLevel === lvl.id ? "bg-amber-500 text-white" : "bg-slate-200 dark:bg-zinc-800 text-slate-500"
                          }`}>
                            {lvl.icon}
                          </div>
                          <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">{lvl.title}</div>
                          <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">{lvl.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Canal d'alerte */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Canal de diffusion des alertes critiques
                    </Label>
                    <Select 
                      value={form.alertChannel} 
                      onValueChange={(v) => setForm({ ...form, alertChannel: v })}
                    >
                      <SelectTrigger className="w-full py-2.5 h-auto rounded-xl bg-slate-50/80 dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800 text-sm font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                        <SelectItem value="email_sms">E-mail & SMS d'urgence chiffrés</SelectItem>
                        <SelectItem value="slack">Webhook Slack Incident Response</SelectItem>
                        <SelectItem value="teams">Microsoft Teams Cyber Hub</SelectItem>
                        <SelectItem value="telegram">Bot Telegram Sécurisé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Options avancées Wazuh */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      Modules Wazuh avancés
                    </Label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800">
                        <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">ActiveResponse</span>
                        <Switch 
                          checked={form.wazuhActiveResponse}
                          onCheckedChange={(c) => setForm({ ...form, wazuhActiveResponse: c })}
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800">
                        <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">Sync Active Directory</span>
                        <Switch 
                          checked={form.wazuhAdSync}
                          onCheckedChange={(c) => setForm({ ...form, wazuhAdSync: c })}
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800">
                        <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">Syslog TLS</span>
                        <Switch 
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

            {/* STEP 5: VALIDATION & DEPLOIEMENT */}
            {activeStep === 5 && (
              <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/70 backdrop-blur-xl shadow-md overflow-hidden animate-in fade-in duration-300">
                <CardHeader className="pb-4 pt-6 px-6 sm:px-8 border-b border-slate-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        Vérification & Lancement
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Confirmez les spécifications avant le provisionnement automatique.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6 sm:p-8 space-y-6">
                  {/* Clean 4-card recap grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. Organisation */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                        <Building className="h-4 w-4" />
                        <span>Organisation & Contact</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-zinc-100">{form.organization}</div>
                      <div className="text-xs text-slate-500">{form.firstName} {form.lastName}</div>
                      <div className="text-xs text-slate-500">{form.email} · {form.phone}</div>
                    </div>

                    {/* 2. Formule & PayTech */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                        <CreditCard className="h-4 w-4" />
                        <span>Formule & PayTech</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 uppercase">{selectedOffer.name}</div>
                      <div className="text-xs text-slate-500">Paiement : PayTech Sénégal ({form.paytechMethod.toUpperCase()})</div>
                      <div className="text-xs font-mono text-slate-500">Réf : PAYTECH-{form.clientAccountRef}</div>
                    </div>

                    {/* 3. Cyber-sécurité */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                        <Shield className="h-4 w-4" />
                        <span>EDR & Licences</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-zinc-100">{form.agentQuota} Postes autorisés</div>
                      <div className="text-xs text-slate-500">Politique : {form.edrPolicy.toUpperCase()}</div>
                      <div className="text-xs text-slate-500">A2F/MFA : {form.requireMfa ? "Obligatoire" : "Optionnel"}</div>
                    </div>

                    {/* 4. SOAR & Alerte */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                        <Cpu className="h-4 w-4" />
                        <span>SOAR & Automatisation</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                        {form.automationLevel === "autonomous" ? "Isolation par IA Djib'son" : "Semi-Autonome"}
                      </div>
                      <div className="text-xs text-slate-500">Canal : {form.alertChannel}</div>
                      <div className="text-xs text-slate-500">ActiveResponse Wazuh : {form.wazuhActiveResponse ? "ON" : "OFF"}</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-slate-700 dark:text-zinc-300 flex items-start gap-3">
                    <Info className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      Le compte client sera immédiatement approvisionné. Un e-mail d'activation sécurisé ainsi que le lien direct <strong>PayTech Sénégal</strong> seront instantanément expédiés à <strong>{form.email}</strong>.
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center justify-between pt-2">
              {activeStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  className="rounded-xl px-5 h-11 font-semibold border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all"
                >
                  <ChevronLeft className="mr-1.5 h-4 w-4" />
                  Précédent
                </Button>
              ) : (
                <div />
              )}

              {activeStep < 5 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="rounded-xl px-6 h-11 font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition-all"
                >
                  Suivant
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={createUser}
                  disabled={busy}
                  className="rounded-xl px-8 h-11 font-extrabold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25 transition-all"
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Provisionnement...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Lancer le Provisionnement
                    </>
                  )}
                </Button>
              )}
            </div>

          </div>

          {/* STICKY LIVE OVERVIEW SIDEBAR (Clean, Minimal, Modern) */}
          <div className="lg:col-span-4 sticky top-6 space-y-4">
            
            {/* Live Client Summary Card */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/70 backdrop-blur-xl shadow-md overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500" />
              
              <CardHeader className="pb-3 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Synthèse en Direct
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-5 pb-5 space-y-4">
                
                {/* Organization badge */}
                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/80">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
                    {form.organization ? form.organization.substring(0, 2).toUpperCase() : "SOC"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">
                      {form.organization || "Nouvelle Organisation"}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                      {form.email || "client@entreprise.com"}
                    </div>
                  </div>
                </div>

                {/* Offer & PayTech pill */}
                <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/50 dark:bg-zinc-950/40 border border-slate-200/60 dark:border-zinc-800/60">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Formule :</span>
                    <span className="font-bold uppercase text-amber-600 dark:text-amber-400">{selectedOffer.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Règlement :</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      PayTech {form.paytechMethod.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60 dark:border-zinc-800/60">
                    <span className="text-slate-500 font-medium">Montant :</span>
                    <span className="font-extrabold text-slate-900 dark:text-zinc-100">
                      {selectedOffer.value.toLocaleString("fr-FR")} {selectedOffer.currency}
                    </span>
                  </div>
                </div>

                {/* Quota Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Capacité EDR autorisée</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">{form.agentQuota} agents</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-amber-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((form.agentQuota / 250) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Live Logs Compact Terminal */}
                <div className="rounded-2xl bg-zinc-950 border border-zinc-850 p-3 font-mono text-[10px] text-emerald-400 space-y-1">
                  <div className="text-zinc-500 flex items-center justify-between pb-1.5 border-b border-zinc-850 text-[9px]">
                    <span>STATUS PROVISIONNEMENT</span>
                    <span className="text-emerald-400">READY</span>
                  </div>
                  <div className="space-y-1 pt-1 max-h-24 overflow-y-auto">
                    {hudLogs.slice(-4).map((log, i) => (
                      <div key={i} className="truncate">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>

              </CardContent>
            </Card>

          </div>

        </div>

      </div>
    </div>
  );
}
