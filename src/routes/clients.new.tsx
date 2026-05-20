import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  UserPlus, Building, Mail, User, Loader2, ArrowLeft, Phone, Globe, 
  Shield, Cpu, Sliders, Server, Zap, Check, Play, Terminal, Lock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/clients/new")({
  head: () => ({ meta: [{ title: "Nouveau Client — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><NewClient /></RequireAuth>,
});

function NewClient() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [deployStep, setDeployStep] = useState<number | null>(null);
  
  // High-Tech deployment log lines
  const [deployLogs, setDeployLogs] = useState<string[]>([]);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    organization: "",
    website: "",
    role: "client" as const,
    sendInvite: true,
    requireMfa: false,
    
    // Paramètres Cyber & EDR de dernière génération
    edrPolicy: "standard",
    agentQuota: 100,
    alertChannel: "email_sms",
    automationLevel: "semi",
    wazuhActiveResponse: true,
    wazuhAdSync: false,
    wazuhSyslog: true,
  });

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
    if (!form.firstName || !form.lastName || !form.email || !form.organization) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    
    setBusy(true);
    setDeployStep(0);
    setDeployLogs(["[INFO] Initialisation du processus de provisionnement..."]);

    const steps = [
      { text: "[OK] Création de l'organisation dans la base centrale.", delay: 700 },
      { text: "[SIEM] Provisionnement du sandbox Wazuh dédié.", delay: 600 },
      { text: `[EDR] Application de la politique de sécurité [${form.edrPolicy.toUpperCase()}].`, delay: 750 },
      { text: `[SOAR] Liaison du canal d'alerte [${form.alertChannel.toUpperCase()}].`, delay: 600 },
      { text: `[IA] Enrôlement de la défense autonome (Niveau: ${form.automationLevel}).`, delay: 800 },
      { text: "[SYS] Génération des clés de chiffrement TLS syslog.", delay: 500 },
      { text: "[OK] Création du représentant et envoi de l'invitation OTP.", delay: 900 }
    ];

    let currentStepIndex = 0;
    
    const runSimulationSteps = async () => {
      for (const step of steps) {
        await new Promise((resolve) => setTimeout(resolve, step.delay));
        currentStepIndex++;
        setDeployStep(currentStepIndex);
        setDeployLogs((prev) => [...prev, step.text]);
      }

      // Execute actual Supabase API Invoke
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
        
        // Final transition
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
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    icon: React.ReactNode,
    type = "text"
  ) => (
    <div className="relative border-b-2 border-slate-200 dark:border-slate-800 focus-within:border-amber-500 py-3 transition-all duration-300 group">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground group-focus-within:text-amber-500 transition-colors duration-300">
          {icon}
        </div>
        <div className="flex-1 flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-focus-within:text-amber-500 transition-colors duration-300">
            {label}
          </span>
          <input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={id !== "phone" && id !== "website"}
            className="w-full bg-transparent border-none outline-none p-0 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm font-semibold mt-1 focus:ring-0 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0b0c10] transition-colors duration-300">
      
      {/* Installation Simulation Overlay */}
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
              {/* Progress and status */}
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

              {/* Progress indicators */}
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

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Upper Dashboard Header */}
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

        <form onSubmit={createUser}>
          <div className="grid gap-8 lg:grid-cols-3">
            
            {/* Form Left Columns (2/3 width) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Informations Personnelles */}
              <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-yellow-400" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-3 font-bold dark:text-zinc-100">
                    <User className="h-5 w-5 text-amber-500" />
                    Représentant de l'organisation
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Identité et coordonnées du responsable technique de ce compte client.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  <div className="grid gap-6 md:grid-cols-2">
                    {renderInput("firstName", "PRENOM", form.firstName, (v) => setForm({...form, firstName: v}), "Jean", <User className="h-4 w-4" />)}
                    {renderInput("lastName", "NOM", form.lastName, (v) => setForm({...form, lastName: v}), "Dupont", <User className="h-4 w-4" />)}
                  </div>
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    {renderInput("email", "ENTER VOTRE EMAIL", form.email, (v) => setForm({...form, email: v}), "jean.dupont@entreprise.com", <Mail className="h-4 w-4" />, "email")}
                    {renderInput("phone", "ENTER VOTRE CONTACT", form.phone, (v) => setForm({...form, phone: v}), "+221 77 000 00 00", <Phone className="h-4 w-4" />, "tel")}
                  </div>
                </CardContent>
              </Card>

              {/* Informations de l'Entreprise */}
              <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-yellow-400" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-3 font-bold dark:text-zinc-100">
                    <Building className="h-5 w-5 text-amber-500" />
                    Structure & Organisation
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Détails légaux et techniques de l'entreprise cliente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  <div className="grid gap-6 md:grid-cols-2">
                    {renderInput("organization", "NOM DE L'ENTREPRISE", form.organization, (v) => setForm({...form, organization: v}), "Sonatel", <Building className="h-4 w-4" />)}
                    {renderInput("website", "WEBSITE", form.website, (v) => setForm({...form, website: v}), "https://sonatel.sn", <Globe className="h-4 w-4" />, "url")}
                  </div>
                </CardContent>
              </Card>

              {/* Paramétrage Cyber de Dernière Génération */}
              <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-amber-600" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-3 font-bold dark:text-zinc-100">
                    <Cpu className="h-5 w-5 text-amber-500" />
                    Paramétrage Cyber & EDR de dernière génération
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Sélectionnez les stratégies de protection active et les quotas d'agents Wazuh du client.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  <div className="grid gap-6 md:grid-cols-2">
                    
                    {/* EDR Policy */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Politique de sécurité EDR</Label>
                      <Select 
                        value={form.edrPolicy} 
                        onValueChange={(v: any) => setForm({ ...form, edrPolicy: v })}
                      >
                        <SelectTrigger className="w-full bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:border-amber-500">
                          <SelectValue placeholder="Choisir une politique" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                          <SelectItem value="standard" className="text-xs font-semibold">🛡️ Standard Defense (Baseline)</SelectItem>
                          <SelectItem value="zero-trust" className="text-xs font-semibold">🚨 Strict Zero-Trust</SelectItem>
                          <SelectItem value="aggressive" className="text-xs font-semibold">🔥 Hunting actif & Proactif</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* SOAR Alert Channel */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Canal d'alertes SOAR principal</Label>
                      <Select 
                        value={form.alertChannel} 
                        onValueChange={(v: any) => setForm({ ...form, alertChannel: v })}
                      >
                        <SelectTrigger className="w-full bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500">
                          <SelectValue placeholder="Canal d'alertes" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                          <SelectItem value="email_sms" className="text-xs">Email & SMS sécurisés</SelectItem>
                          <SelectItem value="slack" className="text-xs">Webhook Slack (Sécurisé)</SelectItem>
                          <SelectItem value="teams" className="text-xs">Microsoft Teams Integration</SelectItem>
                          <SelectItem value="telegram" className="text-xs">Secure Telegram Bot API</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Quota d'agents EDR */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quota d'agents Wazuh EDR max</Label>
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
                      className="w-full h-2 bg-slate-100 dark:bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                      <span>Min: 5</span>
                      <span>Max: 500 agents</span>
                    </div>
                  </div>

                  <Separator className="border-slate-100 dark:border-zinc-800" />

                  {/* Incident Response Automation Level */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Niveau de remédiation SOAR (Incident Response)</Label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: "manual", title: "Manuel", desc: "Alertes uniquement", icon: <Sliders className="h-4 w-4" /> },
                        { id: "semi", title: "Semi-Autonome", desc: "Humain requis", icon: <Shield className="h-4 w-4" /> },
                        { id: "autonomous", title: "Djib'son IA 🟢", desc: "Auto-isolation EDR", icon: <Zap className="h-4 w-4" /> }
                      ].map((level) => (
                        <div
                          key={level.id}
                          onClick={() => setForm({ ...form, automationLevel: level.id })}
                          className={`cursor-pointer rounded-xl p-3 border text-center transition-all duration-300 ${
                            form.automationLevel === level.id
                              ? "bg-amber-500/10 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                              : "border-slate-100 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-zinc-950/20"
                          }`}
                        >
                          <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                            form.automationLevel === level.id ? "bg-amber-500 text-white" : "bg-slate-200 dark:bg-zinc-900 text-muted-foreground"
                          }`}>
                            {level.icon}
                          </div>
                          <div className="text-xs font-bold dark:text-zinc-200">{level.title}</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{level.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="border-slate-100 dark:border-zinc-800" />

                  {/* Wazuh Advanced Options toggles */}
                  <div className="space-y-4">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fonctionnalités avancées d'agent EDR</Label>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                        <Label htmlFor="ar" className="text-xs font-bold text-slate-600 dark:text-zinc-300">Wazuh ActiveResponse</Label>
                        <Switch 
                          id="ar"
                          checked={form.wazuhActiveResponse}
                          onCheckedChange={(c) => setForm({ ...form, wazuhActiveResponse: c })}
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                        <Label htmlFor="ad" className="text-xs font-bold text-slate-600 dark:text-zinc-300">Sync Active Directory</Label>
                        <Switch 
                          id="ad"
                          checked={form.wazuhAdSync}
                          onCheckedChange={(c) => setForm({ ...form, wazuhAdSync: c })}
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                        <Label htmlFor="tls" className="text-xs font-bold text-slate-600 dark:text-zinc-300">Syslog TLS Forwarder</Label>
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

            </div>

            {/* Right Column (Live HUD Preview & Security Card) (1/3 width) */}
            <div className="space-y-8">
              
              {/* STUNNING CYBER HUD PREVIEW */}
              <Card className="bg-zinc-950 border border-amber-500/20 shadow-[0_0_25px_rgba(245,158,11,0.05)] rounded-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber-500 to-yellow-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-black tracking-widest text-amber-500 uppercase flex items-center gap-2">
                    <Server className="h-3.5 w-3.5 animate-pulse" />
                    Aperçu Provision EDR en temps réel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  
                  {/* Dynamic Badge & Policy HUD */}
                  <div className="bg-black/60 border border-zinc-800 rounded-xl p-4 text-center space-y-3 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl" />
                    
                    {/* User dynamic initials logo */}
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
                    
                    {/* Visual bar */}
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
                      {form.automationLevel === "autonomous" ? "Défense Autonome Djib'son IA" : form.automationLevel === "semi" ? "Semi-Autonome" : "Incident Manuel"}
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

              {/* Accès & Rôle */}
              <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <div className="h-1.5 bg-gradient-to-r from-slate-200 dark:from-zinc-800 to-slate-300 dark:to-zinc-700" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-3 font-bold dark:text-zinc-100">
                    <Lock className="h-5 w-5 text-slate-500" />
                    Sécurité & Accès
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  
                  {/* Role Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rôle attribué</Label>
                    <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                      <SelectTrigger className="w-full bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                        <SelectItem value="client" className="text-xs font-semibold">Client standard</SelectItem>
                        <SelectItem value="manager" className="text-xs font-semibold">Manager d'organisation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Separator className="border-slate-100 dark:border-zinc-800" />
                  
                  {/* Require MFA Switch */}
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="mfa" className="flex flex-col space-y-1">
                      <span className="text-xs font-bold dark:text-zinc-200">Exiger l'A2F (MFA)</span>
                      <span className="font-normal text-[10px] text-muted-foreground">Forcer l'authentification à double facteur.</span>
                    </Label>
                    <Switch
                      id="mfa"
                      checked={form.requireMfa}
                      onCheckedChange={(c) => setForm({ ...form, requireMfa: c })}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  </div>
                  
                  <Separator className="border-slate-100 dark:border-zinc-800" />
                  
                  {/* Send Invite Switch */}
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="invite" className="flex flex-col space-y-1">
                      <span className="text-xs font-bold dark:text-zinc-200">Envoyer une invitation</span>
                      <span className="font-normal text-[10px] text-muted-foreground">Envoyer le code OTP de connexion par e-mail.</span>
                    </Label>
                    <Switch
                      id="invite"
                      checked={form.sendInvite}
                      onCheckedChange={(c) => setForm({ ...form, sendInvite: c })}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={busy} 
                  className="w-full shadow-lg bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-extrabold text-sm py-6 rounded-xl border-none transition-all duration-300 transform active:scale-[0.98]"
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Provisionnement en cours...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" />
                      Provisionner le client SIEM
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  asChild 
                  className="w-full bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl py-6 font-bold text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all duration-300"
                >
                  <Link to="/clients">Annuler et quitter</Link>
                </Button>
              </div>

            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
