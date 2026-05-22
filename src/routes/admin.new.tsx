import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import orangeLogo from "@/assets/orange-logo.png";
import { 
  User, Mail, Phone, Building, Globe, Shield, Loader2, ArrowLeft, Camera, Info, Lock, 
  Facebook, Twitter, Linkedin, Youtube, Check, ChevronRight, ChevronLeft, CheckCircle2,
  Sliders, Key, Users, Briefcase
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import type { AppRole } from "@/lib/auth-context";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/admin/new")({
  head: () => ({ meta: [{ title: "Nouveau RH — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><NewUserPage /></RequireAuth>,
});

const ROLES: { value: AppRole; label: string; desc: string }[] = [
  { value: "client", label: "Client SOC", desc: "Accès limité aux tableaux de bord de son organisation" },
  { value: "analyste", label: "Analyste Cyber", desc: "Gestion des alertes, audits de sécurité et SOC" },
  { value: "manager", label: "Manager d'Équipe", desc: "Supervision des processus et répartition des tâches" },
  { value: "admin", label: "Administrateur Global", desc: "Contrôle total sur la plateforme et les utilisateurs" },
];

function NewUserPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);

  // Form State
  const [form, setForm] = useState({
    // Step 1: Identity & Address
    prenom: "",
    nom: "",
    email: "",
    phone: "",
    info: "",
    organization: "",
    website: "",
    physicalAddress: "",
    city: "",
    country: "Sénégal",

    // Step 2: Department & Generation
    role: "client" as AppRole,
    generation: "v1",
    budgetCode: "DEPT-CYBER-" + Math.floor(Math.random() * 9000 + 1000),
    facebook: "",
    twitter: "",
    linkedin: "",
    youtube: "",
  });

  const [isActive, setIsActive] = useState(true);
  const [permissions, setPermissions] = useState({ dispatching: false, showExperiences: false, showFollowers: true });
  const [tagPolicy, setTagPolicy] = useState<"group" | "everyone">("group");

  const fullName = `${form.prenom} ${form.nom}`.trim();
  const initials = fullName ? fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??";

  // Step validation
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!form.prenom.trim()) { toast.error("Prénom requis"); return false; }
      if (!form.nom.trim()) { toast.error("Nom requis"); return false; }
      if (!form.email.trim()) { toast.error("E-mail requis"); return false; }
      if (!/\S+@\S+\.\S+/.test(form.email)) { toast.error("Format d'e-mail invalide"); return false; }
      if (!form.organization.trim()) { toast.error("Organisation requise"); return false; }
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1)) return;

    setBusy(true);
    try {
      const body = { 
        email: form.email, 
        fullName, 
        organization: form.organization, 
        role: form.role, 
        generation: form.generation 
      };

      const { error } = await supabase.functions.invoke("admin-create-user", { body });
      if (error) throw error;
      toast.success("RH créé", { description: `OTP envoyé à ${form.email}` });
      navigate({ to: "/admin" });
    } catch (e: any) {
      toast.error("Erreur", { description: e.message ?? "Impossible de créer l'agent" });
    } finally { 
      setBusy(false); 
    }
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
      
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate({ to: "/admin" })} className="rounded-full bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-amber-500 transition-colors duration-300">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-amber-600 to-amber-800 dark:from-white dark:via-amber-500 dark:to-yellow-600 bg-clip-text text-transparent tracking-tight">
              Créer un nouvel agent RH
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Configurez le profil administratif, allouez ses privilèges de sécurité et paramétrez son intégration.
            </p>
          </div>
        </div>

        {/* 5-Step Connected Progress Bar */}
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

        {/* Wizard Main Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Active Step Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Step 1: Identity & Address */}
            {activeStep === 1 && (
              <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl overflow-hidden animate-in fade-in duration-300">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-yellow-400" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-3 font-bold dark:text-zinc-100">
                    <User className="h-5 w-5 text-amber-500" />
                    Informations sur l'identité & l'adresse
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Renseignez le nom, prénom, e-mail et l'implantation géographique de l'agent.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  <div className="grid gap-6 md:grid-cols-2">
                    {renderInput("PRENOM DE L'AGENT", form.prenom, (v) => setForm({...form, prenom: v}), "Fatou", <User className="h-4 w-4" />)}
                    {renderInput("NOM DE L'AGENT", form.nom, (v) => setForm({...form, nom: v}), "Sow", <User className="h-4 w-4" />)}
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    {renderInput("EMAIL PROFESSIONNEL", form.email, (v) => setForm({...form, email: v}), "fatou.sow@orange-sonatel.com", <Mail className="h-4 w-4" />, "email")}
                    {renderInput("CONTACT TÉLÉPHONIQUE", form.phone, (v) => setForm({...form, phone: v}), "+221 77 123 45 67", <Phone className="h-4 w-4" />, "tel")}
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    {renderInput("ORGANISATION / DIRECTION", form.organization, (v) => setForm({...form, organization: v}), "Orange Sonatel - Direction Cyber", <Building className="h-4 w-4" />)}
                    {renderInput("SITE INTERNET DE LA DIVISION", form.website, (v) => setForm({...form, website: v}), "https://sonatel.sn", <Globe className="h-4 w-4" />, "url")}
                  </div>

                  <Separator className="border-slate-100 dark:border-zinc-800" />

                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Implantation géographique de l'Agent
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        {renderInput("Adresse physique du bureau", form.physicalAddress, (v) => setForm({...form, physicalAddress: v}), "Technopole, Immeuble Sonatel", <Globe className="h-4 w-4" />)}
                      </div>
                      <div>
                        {renderInput("Ville de résidence", form.city, (v) => setForm({...form, city: v}), "Dakar", <Globe className="h-4 w-4" />)}
                      </div>
                    </div>
                  </div>

                  <div className="relative pt-2">
                    <Info className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <textarea 
                      value={form.info}
                      onChange={(e) => setForm({...form, info: e.target.value})}
                      placeholder="Commentaires administratifs complémentaires..."
                      className="min-h-[90px] w-full pl-10 border border-slate-200 dark:border-zinc-800 rounded-xl focus:border-amber-500 transition-colors bg-transparent text-sm p-3 focus:ring-0 focus:outline-none resize-none font-semibold"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Department & Generation */}
            {activeStep === 2 && (
              <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl overflow-hidden animate-in fade-in duration-300">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-yellow-400" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-3 font-bold dark:text-zinc-100">
                    <Briefcase className="h-5 w-5 text-amber-500" />
                    Budget, Génération & Réseaux Sociaux
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Renseignez le code budgétaire, sélectionnez la version applicative et ajoutez des liens sociaux.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Generation Version */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Version applicative (Génération)</Label>
                      <Select value={form.generation} onValueChange={(v) => setForm({...form, generation: v})}>
                        <SelectTrigger className="w-full bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                          <SelectItem value="v1" className="text-xs font-semibold">Génération 1 (Legacy Console)</SelectItem>
                          <SelectItem value="v2" className="text-xs font-semibold">Génération 2 (Premium High-Tech Engine)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Department budget code */}
                    {renderInput("Code Budgétaire / Division", form.budgetCode, (v) => setForm({...form, budgetCode: v}), "DEPT-CYBER-9021", <Sliders className="h-4 w-4" />)}
                  </div>

                  <Separator className="border-slate-100 dark:border-zinc-800" />

                  {/* Social Networks */}
                  <div className="space-y-4">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Réseaux Sociaux de l'Agent</Label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {renderInput("Compte Linkedin", form.linkedin, (v) => setForm({...form, linkedin: v}), "https://linkedin.com/in/fatousow", <Linkedin className="h-4 w-4 text-blue-700" />)}
                      {renderInput("Compte Twitter / X", form.twitter, (v) => setForm({...form, twitter: v}), "@fatou_cyber", <Twitter className="h-4 w-4 text-sky-500" />)}
                      {renderInput("Compte Facebook", form.facebook, (v) => setForm({...form, facebook: v}), "Fatou Sow", <Facebook className="h-4 w-4 text-blue-600" />)}
                      {renderInput("Chaîne Youtube", form.youtube, (v) => setForm({...form, youtube: v}), "Cyber Fatou Channel", <Youtube className="h-4 w-4 text-red-600" />)}
                    </div>
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
                    <Key className="h-5 w-5 text-amber-500" />
                    Profil de l'agent & Rôles applicatifs
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Attribuez le rôle d'administration global ou d'analyse cyber pour cet utilisateur.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">

                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rôle fonctionnel attribué</Label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {ROLES.map((r) => (
                        <div
                          key={r.value}
                          onClick={() => setForm({...form, role: r.value})}
                          className={`cursor-pointer rounded-2xl p-4 border transition-all duration-300 flex flex-col justify-between ${
                            form.role === r.value
                              ? "bg-amber-500/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                              : "border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20 hover:border-slate-350 hover:bg-slate-50 dark:hover:bg-zinc-900/40"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-black">{r.label}</span>
                            {form.role === r.value && (
                              <span className="p-1 bg-amber-500 text-white rounded-full">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            {r.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="border-slate-100 dark:border-zinc-800" />

                  {/* Who can tag */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Politique d'étiquetage collaboratif (Tagging Policy)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: "group", label: "Membres du groupe uniquement", desc: "Brider l'étiquetage des alertes au service RH / Cyber" },
                        { id: "everyone", label: "Tout le monde", desc: "Permettre l'étiquetage par tous les analystes" }
                      ].map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setTagPolicy(t.id as any)}
                          className={`cursor-pointer rounded-xl p-3.5 border transition-all duration-300 ${
                            tagPolicy === t.id
                              ? "bg-amber-500/10 border-amber-500"
                              : "border-slate-100 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-zinc-950/20"
                          }`}
                        >
                          <div className="text-xs font-bold dark:text-zinc-200">{t.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{t.desc}</div>
                        </div>
                      ))}
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
                    <Shield className="h-5 w-5 text-amber-500" />
                    Permissions RH & Statuts de Compte
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Réglez finement les habilitations administratives et activez le compte sur la plateforme.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  
                  <div className="space-y-4">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Habilitations cyber-défense actives</Label>
                    <div className="grid gap-3">
                      {[
                        { key: "dispatching" as const, label: "Autoriser le Dispatching d'alertes", desc: "Permet de distribuer et réaffecter des incidents aux analystes" },
                        { key: "showExperiences" as const, label: "Afficher le journal d'expériences", desc: "Affiche l'historique complet d'apprentissage IA de l'agent" },
                        { key: "showFollowers" as const, label: "Afficher les followers de dossiers", desc: "Affiche les collaborateurs abonnés aux dossiers cyber" },
                      ].map((p) => (
                        <div 
                          key={p.key} 
                          onClick={() => setPermissions(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                          className={`flex items-center gap-4 p-3.5 rounded-xl border cursor-pointer transition-all duration-300 ${
                            permissions[p.key]
                              ? "bg-amber-500/5 border-amber-500/30"
                              : "border-slate-150 dark:border-zinc-850 hover:bg-slate-50/50"
                          }`}
                        >
                          <Checkbox checked={permissions[p.key]} onCheckedChange={() => {}} />
                          <div className="text-xs">
                            <div className="font-bold dark:text-zinc-200">{p.label}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="border-slate-100 dark:border-zinc-800" />

                  {/* Status switches */}
                  <div className="space-y-4">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Statut opérationnel à la création</Label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-850">
                        <Label htmlFor="active" className="flex flex-col space-y-0.5 cursor-pointer">
                          <span className="text-xs font-bold dark:text-zinc-200">Compte Actif</span>
                          <span className="font-normal text-[10px] text-muted-foreground">Accès instantané disponible</span>
                        </Label>
                        <Switch 
                          id="active"
                          checked={isActive}
                          onCheckedChange={(c) => setIsActive(c)}
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-850">
                        <Label htmlFor="inactive" className="flex flex-col space-y-0.5 cursor-pointer">
                          <span className="text-xs font-bold dark:text-zinc-200">Mode Suspendu / Inactif</span>
                          <span className="font-normal text-[10px] text-muted-foreground">Bloquer toute tentative de connexion</span>
                        </Label>
                        <Switch 
                          id="inactive"
                          checked={!isActive}
                          onCheckedChange={(c) => setIsActive(!c)}
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
                    Validation & Onboarding de l'agent RH
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Passez en revue les informations de l'agent avant de finaliser sa création.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  
                  {/* Glassmorphic summary widgets */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    
                    <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-100 dark:border-zinc-850 space-y-2 flex gap-3 items-start">
                      <Avatar className="h-12 w-12 border-2 border-white dark:border-zinc-900 shadow">
                        <AvatarImage src={orangeLogo} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Identité Agent</div>
                        <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">{form.prenom} {form.nom}</div>
                        <div className="text-xs text-muted-foreground">{form.email}</div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-100 dark:border-zinc-850 space-y-2">
                      <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-amber-500" /> Organisation & Bureau
                      </div>
                      <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">{form.organization}</div>
                      <div className="text-xs text-muted-foreground">Ville : {form.city}</div>
                      <div className="text-xs text-muted-foreground">{form.website || "Aucun site fourni"}</div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-100 dark:border-zinc-850 space-y-2">
                      <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                        <Sliders className="h-3.5 w-3.5 text-amber-500" /> Profil, Version & Division
                      </div>
                      <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">
                        Rôle : <span className="uppercase text-amber-600 dark:text-amber-500">{form.role}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Version : Génération {form.generation}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">Code Budget : {form.budgetCode}</div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-100 dark:border-zinc-850 space-y-2">
                      <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-amber-500" /> Habilitations & Permissions
                      </div>
                      <div className="text-xs text-slate-800 dark:text-zinc-200 font-extrabold">
                        Statut : <span className={isActive ? "text-emerald-500" : "text-red-500"}>{isActive ? "Actif" : "Suspendu"}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-tight space-y-0.5 mt-1">
                        <div>• Dispatching : {permissions.dispatching ? "Activé" : "Désactivé"}</div>
                        <div>• Expériences : {permissions.showExperiences ? "Affichées" : "Masquées"}</div>
                        <div>• Followers : {permissions.showFollowers ? "Affichés" : "Masqués"}</div>
                      </div>
                    </div>

                  </div>

                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-xs text-slate-800 dark:text-zinc-350 leading-relaxed flex gap-3">
                    <Info className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p>
                      En cliquant sur « Créer le Profil Agent », le système provisionne instantanément le nouvel agent, applique ses politiques de sécurité d'accès et envoie un code OTP à l'adresse <strong>{form.email}</strong>.
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
                  onClick={handleCreate}
                  disabled={busy}
                  className="rounded-xl font-extrabold bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl ml-auto gap-2"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-4 w-4" />}
                  Créer le profil de l'agent RH
                </Button>
              )}
            </div>

          </div>

          {/* Right Column: Mini Cover Card Preview */}
          <div className="space-y-6">
            
            <Card className="overflow-hidden bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl animate-in slide-in-from-right duration-500">
              <div className="h-32 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 relative">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvc3ZnPg==')] opacity-40" />
              </div>
              <div className="px-6 pb-6 -mt-12 text-center relative z-10">
                <div className="relative inline-block">
                  <Avatar className="h-24 w-24 border-4 border-white dark:border-zinc-900 shadow-xl">
                    <AvatarImage src={orangeLogo} className="object-cover animate-pulse" />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-black">{initials}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white dark:border-zinc-900 ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                </div>
                <h2 className="mt-3 text-lg font-black tracking-tight text-slate-800 dark:text-zinc-100">{fullName || "Nouveau RH"}</h2>
                <p className="text-xs text-muted-foreground/80 font-bold">{form.organization || "Sonatel - Cyber Division"}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                  <Users className="h-3.5 w-3.5" />
                  Rôle : {form.role}
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl">
              <h3 className="text-xs font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-500" /> Sécurité d'Accès
              </h3>
              <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <div className="flex justify-between">
                  <span>Authentification :</span>
                  <span className="text-amber-500">Double Facteur (OTP)</span>
                </div>
                <div className="flex justify-between">
                  <span>Version :</span>
                  <span className="text-amber-500">Génération {form.generation}</span>
                </div>
                <div className="flex justify-between">
                  <span>Division :</span>
                  <span className="text-amber-500">Rattachée au Groupe</span>
                </div>
              </div>
            </Card>

          </div>

        </div>
      </div>
    </div>
  );
}
