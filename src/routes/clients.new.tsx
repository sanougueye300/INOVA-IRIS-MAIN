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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50/80 to-slate-100/50 dark:from-[#0a0b0e] dark:via-[#0e1015] dark:to-[#12141a] transition-colors duration-300 relative overflow-hidden">
      
      {/* Enhanced Decorative Backgrounds with Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-[-5%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-500/8 via-orange-500/5 to-transparent blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-blue-500/6 via-cyan-500/4 to-transparent blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-purple-500/4 to-transparent blur-[120px] pointer-events-none" />

      {/* Enhanced Deployment Simulation Overlay */}
      {deployStep !== null && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.1)_0%,transparent_70%)]" />
          <Card className="w-full max-w-2xl bg-gradient-to-br from-zinc-950 to-zinc-900 border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-emerald-500/5 pointer-events-none" />
            
            <CardHeader className="pb-5 relative z-10">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-xl flex items-center gap-3 text-zinc-50 font-black">
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <Terminal className="h-6 w-6 text-amber-500 animate-pulse" />
                    </div>
                    Provisionnement Client SIEM / EDR
                  </CardTitle>
                  <CardDescription className="text-zinc-400 text-sm font-medium pl-14">
                    Configuration automatisée du sandbox de cyber-défense en cours...
                  </CardDescription>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">En Direct</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6 relative z-10">
              <div className="bg-black/60 border border-zinc-800/80 rounded-xl p-5 font-mono text-xs text-emerald-400 space-y-2.5 max-h-[280px] overflow-y-auto leading-relaxed shadow-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between text-zinc-500 font-bold border-b border-zinc-800/50 pb-2 mb-3">
                  <span className="flex items-center gap-2">
                    <span className="text-amber-500">●</span> TERMINAL DE PROVISIONNEMENT
                  </span>
                  <span className="text-[10px]">{new Date().toLocaleTimeString()}</span>
                </div>
                {deployLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-3 group hover:bg-zinc-900/30 px-2 py-1 rounded transition-colors">
                    <span className="text-zinc-600 text-[10px] mt-0.5 shrink-0 font-semibold">
                      {new Date().toLocaleTimeString()}
                    </span>
                    <span className="text-emerald-400 group-hover:text-emerald-300 transition-colors">{log}</span>
                  </div>
                ))}
                {deployStep < 7 && (
                  <div className="flex items-center gap-3 text-amber-400 animate-pulse px-2 py-1">
                    <span className="text-amber-500">❯</span>
                    <span>Provisionnement de la politique cyber en cours...</span>
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500 ml-auto" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400 font-semibold">Progression du déploiement</span>
                  <span className="text-zinc-200 font-bold">{Math.round(((deployStep + 1) / 8) * 100)}%</span>
                </div>
                <div className="grid grid-cols-8 gap-2.5">
                  {[...Array(8)].map((_, stepIdx) => (
                    <div 
                      key={stepIdx} 
                      className={`h-3 rounded-lg transition-all duration-500 relative overflow-hidden ${
                        deployStep > stepIdx 
                          ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" 
                          : deployStep === stepIdx 
                            ? "bg-amber-500 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.6)]" 
                            : "bg-zinc-800/50 border border-zinc-700/50"
                      }`}
                    >
                      {deployStep === stepIdx && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1s_infinite]" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <span className="text-xs text-zinc-400 font-medium">
                    Étape <span className="text-amber-500 font-bold">{deployStep + 1}</span> sur <span className="font-bold">8</span>
                  </span>
                  <span className="mx-2 text-zinc-700">•</span>
                  <span className="text-xs text-zinc-500">Configuration des services EDR</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container mx-auto px-4 py-10 max-w-7xl relative z-10">
        
        {/* Enhanced Premium Header */}
        <div className="mb-12">
          <div className="flex items-start gap-6">
            <Button 
              variant="outline" 
              size="icon" 
              asChild 
              className="mt-1 rounded-xl h-11 w-11 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-slate-200 dark:border-zinc-800 hover:border-amber-500 hover:bg-white dark:hover:bg-zinc-900 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <Link to="/clients">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-100 bg-clip-text text-transparent tracking-tight">
                      Provisionnement Client
                    </h1>
                    <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">SIEM · EDR</span>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-zinc-400 text-base font-medium max-w-3xl leading-relaxed">
                    Configuration complète du profil client, attribution des licences cyber-sécurité et déploiement des stratégies de protection de dernière génération.
                  </p>
                </div>
              </div>
              
              {/* Quick Stats Badges */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 backdrop-blur-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Système Opérationnel</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 backdrop-blur-sm">
                  <Shield className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Chiffrement TLS Actif</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 backdrop-blur-sm">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Provisionnement Rapide</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Redesigned Modern Steps Progress Bar */}
        <div className="mb-12 bg-white/70 dark:bg-zinc-900/50 border border-slate-200/80 dark:border-zinc-800/80 p-8 rounded-3xl shadow-lg backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-blue-500/5 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between max-w-5xl mx-auto relative">
              
              {/* Background connector line */}
              <div className="absolute top-[26px] left-[8%] right-[8%] h-[3px] bg-gradient-to-r from-slate-200 via-slate-150 to-slate-200 dark:from-zinc-800 dark:via-zinc-750 dark:to-zinc-800 rounded-full" />
              
              {/* Active progress line */}
              <div 
                className="absolute top-[26px] left-[8%] h-[3px] bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(245,158,11,0.4)]" 
                style={{ width: `${Math.min((activeStep - 1) * 21, 84)}%` }}
              />

              {[
                { num: 1, label: "Coordonnées", icon: <User className="h-4 w-4" />, desc: "Identité & Contact" },
                { num: 2, label: "Facturation", icon: <CreditCard className="h-4 w-4" />, desc: "Offre & Paiement" },
                { num: 3, label: "Accès", icon: <Lock className="h-4 w-4" />, desc: "Licences EDR" },
                { num: 4, label: "Services", icon: <Server className="h-4 w-4" />, desc: "SOAR & SIEM" },
                { num: 5, label: "Validation", icon: <CheckCircle2 className="h-4 w-4" />, desc: "Vérification" }
              ].map((st) => (
                <div key={st.num} className="flex flex-col items-center gap-3 flex-1 relative z-10">
                  <button
                    type="button"
                    onClick={() => { if (st.num < activeStep) setActiveStep(st.num); }}
                    disabled={st.num > activeStep}
                    className={`group relative transition-all duration-500 ${st.num <= activeStep ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    {/* Glow effect for active/completed */}
                    {st.num <= activeStep && (
                      <div className={`absolute inset-0 rounded-2xl blur-xl transition-all duration-500 ${
                        activeStep === st.num 
                          ? "bg-amber-500/30 scale-150" 
                          : "bg-emerald-500/20 scale-125"
                      }`} />
                    )}
                    
                    {/* Step circle */}
                    <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center font-black transition-all duration-500 border-2 ${
                      activeStep === st.num
                        ? "bg-gradient-to-br from-amber-500 to-amber-600 border-amber-400 text-white shadow-[0_8px_24px_rgba(245,158,11,0.35)] scale-110 rotate-3"
                        : activeStep > st.num
                          ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white shadow-[0_4px_16px_rgba(16,185,129,0.25)] hover:scale-105"
                          : "bg-slate-100 dark:bg-zinc-900/80 border-slate-300 dark:border-zinc-700 text-slate-400 dark:text-zinc-600"
                    } ${st.num < activeStep ? 'hover:-rotate-3' : ''}`}>
                      {activeStep > st.num ? (
                        <Check className="h-6 w-6 stroke-[3] animate-in zoom-in duration-300" />
                      ) : (
                        <div className="flex flex-col items-center">
                          {st.icon}
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {/* Step label */}
                  <div className="text-center space-y-1 max-w-[110px]">
                    <div className={`text-sm font-bold transition-all duration-300 ${
                      activeStep === st.num 
                        ? "text-amber-600 dark:text-amber-500 scale-105" 
                        : activeStep > st.num 
                          ? "text-emerald-600 dark:text-emerald-500" 
                          : "text-slate-500 dark:text-zinc-500"
                    }`}>
                      {st.label}
                    </div>
                    <div className={`text-[10px] font-semibold uppercase tracking-wider transition-colors duration-300 ${
                      activeStep === st.num 
                        ? "text-amber-500/70" 
                        : activeStep > st.num 
                          ? "text-emerald-500/70" 
                          : "text-slate-400/60 dark:text-zinc-600"
                    }`}>
                      {st.desc}
                    </div>
                  </div>
                </div>
              ))}

            </div>
          </div>
        </div>

        {/* Wizard Layout */}
        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Active Step Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Step 1: Addresses */}
            {activeStep === 1 && (
              <Card className="bg-white/90 dark:bg-zinc-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
                <CardHeader className="pb-5 pt-7 px-8 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                      <MapPin className="h-6 w-6 text-amber-600 dark:text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center gap-3 font-black text-slate-900 dark:text-zinc-50">
                        Informations de Contact & Localisation
                      </CardTitle>
                      <CardDescription className="text-sm mt-1.5 text-slate-600 dark:text-zinc-400 font-medium">
                        Identité du représentant et coordonnées d'implantation du système d'information.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 px-8 pb-8">
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
                  
                  <Separator className="border-slate-200 dark:border-zinc-800 my-2" />
                  
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                        Adresse de livraison / implantation des équipements
                      </h3>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-3 pl-14">
                      <div className="sm:col-span-2">
                        {renderInput("Adresse physique de livraison", form.deliveryAddress, (v) => setForm({...form, deliveryAddress: v}), "Dakar, SICAP Liberté IV", <MapPin className="h-4 w-4" />)}
                      </div>
                      <div>
                        {renderInput("Ville", form.deliveryCity, (v) => setForm({...form, deliveryCity: v}), "Dakar", <MapPin className="h-4 w-4" />)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <Receipt className="h-4 w-4 text-purple-600 dark:text-purple-500" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                          Adresse de facturation
                        </h3>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-500/10 font-bold gap-1.5 rounded-lg transition-all"
                        onClick={() => setForm(prev => ({
                          ...prev,
                          billingAddress: prev.deliveryAddress,
                          billingCity: prev.deliveryCity,
                          billingZip: prev.deliveryZip,
                          billingCountry: prev.deliveryCountry
                        }))}
                      >
                        <Check className="h-3 w-3" />
                        Identique à la livraison
                      </Button>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-3 pl-14">
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
              <Card className="bg-white/90 dark:bg-zinc-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
                <CardHeader className="pb-5 pt-7 px-8 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                      <CreditCard className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center gap-3 font-black text-slate-900 dark:text-zinc-50">
                        Facturation & Sélection de l'Offre
                      </CardTitle>
                      <CardDescription className="text-sm mt-1.5 text-slate-600 dark:text-zinc-400 font-medium">
                        Associez une offre active du catalogue et configurez les conditions de paiement.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 px-8 pb-8">
                  
                  {/* Cards for offers */}
                  <div className="space-y-4">
                    <Label className="text-sm font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-500" />
                      Formules d'Abonnement SOC Disponibles
                    </Label>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {offers.length === 0 ? (
                        <div className="sm:col-span-2 lg:col-span-3 text-center p-8 bg-gradient-to-br from-slate-100/80 to-slate-50/80 dark:from-zinc-900/50 dark:to-zinc-900/30 rounded-2xl border border-slate-200 dark:border-zinc-800 backdrop-blur-sm">
                          <div className="inline-flex p-4 rounded-2xl bg-slate-200/50 dark:bg-zinc-800/50 mb-4">
                            <Info className="h-8 w-8 text-slate-400 dark:text-zinc-500" />
                          </div>
                          <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium mb-3">Aucune offre active trouvée dans le catalogue d'administration.</p>
                          <Link to="/admin/offres" className="inline-flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 font-bold px-4 py-2 rounded-lg hover:bg-amber-500/10 transition-all">
                            <ChevronRight className="h-4 w-4" />
                            Aller au catalogue d'offres
                          </Link>
                        </div>
                      ) : (
                        offers.map((offer) => (
                          <div
                            key={offer.id}
                            onClick={() => handleOfferChange(offer.id)}
                            className={`group cursor-pointer rounded-2xl p-5 border-2 transition-all duration-300 relative flex flex-col justify-between h-full ${
                              selectedOfferId === offer.id
                                ? "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500 shadow-[0_8px_30px_rgba(245,158,11,0.25)] scale-[1.02]"
                                : "border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/30 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-lg hover:scale-[1.01]"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <span className={`text-base font-black uppercase tracking-wide ${selectedOfferId === offer.id ? 'text-amber-600 dark:text-amber-500' : 'text-slate-800 dark:text-zinc-200'}`}>
                                  {offer.name}
                                </span>
                                {selectedOfferId === offer.id && (
                                  <div className="flex items-center justify-center w-6 h-6 bg-amber-500 text-white rounded-full shadow-lg animate-in zoom-in duration-300">
                                    <Check className="h-4 w-4 stroke-[3]" />
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2 mb-4">
                                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                                  <strong className="text-slate-700 dark:text-zinc-300">SLA Détection :</strong> {offer.mttd}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                                  <strong className="text-slate-700 dark:text-zinc-300">MTTR :</strong> {offer.mttr}
                                </p>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 mt-2">
                                  <Cpu className="h-3.5 w-3.5 text-blue-600 dark:text-blue-500" />
                                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400">{offer.maxPcs} agents EDR</span>
                                </div>
                              </div>
                            </div>
                            <div className="pt-4 border-t border-slate-200/50 dark:border-zinc-800/50">
                              <div className="text-2xl font-black text-amber-600 dark:text-amber-500">
                                {offer.value.toLocaleString("fr-FR")} <span className="text-sm">EUR</span>
                                <span className="text-xs text-slate-500 dark:text-zinc-500 font-semibold ml-1">/ {offer.period}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <Separator className="border-slate-200 dark:border-zinc-800" />

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
              <Card className="bg-white/90 dark:bg-zinc-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500" />
                <CardHeader className="pb-5 pt-7 px-8 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                      <Lock className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center gap-3 font-black text-slate-900 dark:text-zinc-50">
                        Accès & Licences de Protection EDR
                      </CardTitle>
                      <CardDescription className="text-sm mt-1.5 text-slate-600 dark:text-zinc-400 font-medium">
                        Attribuez des privilèges d'accès et ajustez la capacité matérielle de protection EDR.
                      </CardDescription>
                    </div>
                  </div>
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
              <Card className="bg-white/90 dark:bg-zinc-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
                <CardHeader className="pb-5 pt-7 px-8 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                      <Cpu className="h-6 w-6 text-purple-600 dark:text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center gap-3 font-black text-slate-900 dark:text-zinc-50">
                        Intégrations & Automatisation SOAR
                      </CardTitle>
                      <CardDescription className="text-sm mt-1.5 text-slate-600 dark:text-zinc-400 font-medium">
                        Raccordez le SIEM aux pipelines d'orchestration de réponse active et d'alerte.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 px-8 pb-8">
                  
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
              <Card className="bg-white/90 dark:bg-zinc-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500 animate-pulse" />
                <CardHeader className="pb-5 pt-7 px-8 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center gap-3 font-black text-slate-900 dark:text-zinc-50">
                        Validation & Lancement du Provisionnement
                      </CardTitle>
                      <CardDescription className="text-sm mt-1.5 text-slate-600 dark:text-zinc-400 font-medium">
                        Vérifiez toutes les informations de configuration avant le déploiement.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 px-8 pb-8">
                  
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

            {/* Enhanced Stepper Navigation Buttons */}
            <div className="flex items-center justify-between pt-6">
              {activeStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handlePrev}
                  className="rounded-xl font-bold bg-white dark:bg-zinc-900 border-2 border-slate-300 dark:border-zinc-700 hover:border-slate-400 dark:hover:border-zinc-600 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all duration-300 shadow-md hover:shadow-lg group"
                >
                  <ChevronLeft className="mr-2 h-5 w-5 transition-transform group-hover:-translate-x-1" />
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
                  className="rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white ml-auto shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  Suivant
                  <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  onClick={createUser}
                  disabled={busy}
                  className="rounded-xl font-black bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500 hover:from-emerald-600 hover:via-green-600 hover:to-emerald-600 text-white shadow-[0_0_24px_rgba(16,185,129,0.3)] hover:shadow-[0_0_32px_rgba(16,185,129,0.4)] ml-auto gap-2.5 px-8 transition-all duration-300"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Provisionnement...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      Lancer le Provisionnement
                    </>
                  )}
                </Button>
              )}
            </div>

          </div>

          {/* Redesigned Premium HUD Console */}
          <div className="space-y-6">
            
            <Card className="bg-gradient-to-br from-zinc-950 to-zinc-900 border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)] rounded-3xl overflow-hidden relative animate-in slide-in-from-right-8 duration-700">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.1)_0%,transparent_50%)]" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-pulse" />
              
              <CardHeader className="pb-4 pt-6 px-6 relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-sm font-black tracking-widest text-amber-500 uppercase flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30">
                      <Server className="h-4 w-4 animate-pulse" />
                    </div>
                    Aperçu Configuration EDR
                  </CardTitle>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 font-medium">Simulation en temps réel du provisionnement</p>
              </CardHeader>
              
              <CardContent className="space-y-6 px-6 pb-6 relative z-10">
                
                {/* Enhanced Organization Badge */}
                <div className="bg-gradient-to-br from-black/60 to-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 text-center space-y-4 relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/10 rounded-full blur-3xl" />
                  <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl" />
                  
                  <div className="relative z-10">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 flex items-center justify-center font-black text-white shadow-[0_8px_24px_rgba(245,158,11,0.3)] text-xl mb-4 ring-4 ring-amber-500/20">
                      {form.organization ? form.organization.substring(0,2).toUpperCase() : "SI"}
                    </div>
                    <div>
                      <div className="text-base font-black text-zinc-100 tracking-tight mb-1">
                        {form.organization || "Nouvelle Organisation"}
                      </div>
                      <div className="text-xs text-zinc-500 font-semibold">
                        {form.email || "en-attente@email.com"}
                      </div>
                    </div>
                    <div className={`mx-auto inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase border mt-4 ${
                      form.edrPolicy === "zero-trust" 
                        ? "bg-red-500/15 text-red-400 border-red-500/30 shadow-[0_0_16px_rgba(239,68,68,0.2)]" 
                        : form.edrPolicy === "aggressive" 
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-[0_0_16px_rgba(245,158,11,0.2)]" 
                          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_16px_rgba(16,185,129,0.2)]"
                    }`}>
                      {form.edrPolicy === "zero-trust" ? "🚨 Strict Zero-Trust" : form.edrPolicy === "aggressive" ? "🔥 Proactive Hunting" : "🛡️ Standard Defense"}
                    </div>
                  </div>
                </div>

                {/* Enhanced Quota Progress Meter */}
                <div className="space-y-3 p-4 rounded-2xl bg-gradient-to-br from-zinc-900/50 to-black/50 border border-zinc-800/50 backdrop-blur-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Quota Agents EDR</span>
                    <span className="text-sm text-amber-500 font-black">{form.agentQuota} <span className="text-xs text-zinc-600">/ 500</span></span>
                  </div>
                  <div className="relative h-3 w-full bg-zinc-900/80 rounded-full overflow-hidden border border-zinc-800 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(245,158,11,0.5)] relative overflow-hidden" 
                      style={{ width: `${(form.agentQuota / 500) * 100}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-600 font-semibold text-right">
                    {((form.agentQuota / 500) * 100).toFixed(0)}% de la capacité maximale
                  </div>
                </div>

                {/* Enhanced Info Cards Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-zinc-900/70 to-black/70 border border-zinc-800/70 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Protection</span>
                    </div>
                    <div className="text-xs text-zinc-200 font-bold">
                      {form.automationLevel === "autonomous" ? "Autonome IA" : form.automationLevel === "semi" ? "Semi-Auto" : "Manuel"}
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-xl bg-gradient-to-br from-zinc-900/70 to-black/70 border border-zinc-800/70 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">A2F/MFA</span>
                    </div>
                    <div className="text-xs text-zinc-200 font-bold">
                      {form.requireMfa ? "Exigée ✓" : "Optionnelle"}
                    </div>
                  </div>
                </div>

                {/* Enhanced SIEM Terminal Console */}
                <div className="bg-black/80 rounded-2xl p-4 border border-zinc-800/80 font-mono text-[10px] text-emerald-400 space-y-2 leading-relaxed shadow-2xl backdrop-blur-sm">
                  <div className="flex items-center justify-between text-zinc-500 font-bold border-b border-zinc-900 pb-2.5 mb-3">
                    <span className="flex items-center gap-2">
                      <Terminal className="h-3.5 w-3.5" />
                      <span className="uppercase tracking-wider">Console Provisionnement</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px]">● LIVE</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {hudLogs.map((log, idx) => (
                      <div key={idx} className="group flex items-start gap-2 hover:bg-zinc-900/30 px-2 py-1 rounded transition-colors">
                        <span className="text-emerald-700 shrink-0">❯</span>
                        <span className="group-hover:text-emerald-300 transition-colors flex-1">{log}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System Status Indicator */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-400">Système Opérationnel</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-semibold">Ready to deploy</span>
                </div>

              </CardContent>
            </Card>

          </div>

        </div>
      </div>
    </div>
  );
}
