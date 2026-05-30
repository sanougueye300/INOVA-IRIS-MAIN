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
  User, Mail, Phone, Building, MapPin, Shield, Loader2, ArrowLeft, Info, Lock,
  Check, ChevronRight, ChevronLeft, CheckCircle2, ChevronDown,
  Sliders, Key, Users, Fingerprint, Zap, Globe2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import type { AppRole } from "@/lib/auth-context";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/admin/new")({
  head: () => ({ meta: [{ title: "Nouveau Agent RH — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><NewUserPage /></RequireAuth>,
});

/* ─── Data Constants ─────────────────────────────────────────────── */

const ROLES: { value: AppRole; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { value: "client",   label: "Client",          desc: "Accès limité aux tableaux de bord de son organisation",    icon: <Users className="h-4 w-4" />,       color: "text-sky-500"     },
  { value: "analyste", label: "Analyste Cyber",   desc: "Gestion des alertes, audits de sécurité et SOC",           icon: <Zap className="h-4 w-4" />,         color: "text-violet-500"  },
  { value: "manager",  label: "Manager SOC",      desc: "Supervision des processus et répartition des tâches",      icon: <Sliders className="h-4 w-4" />,     color: "text-amber-500"   },
  { value: "admin",    label: "Administrateur",   desc: "Contrôle total sur la plateforme et les utilisateurs",     icon: <Shield className="h-4 w-4" />,      color: "text-rose-500"    },
];

const ORGANIZATIONS = [
  { value: "SONATEL/DSI",   label: "SONATEL / DSI",   sub: "Direction des Systèmes d'Information" },
  { value: "SONATEL/DDE",   label: "SONATEL / DDE",   sub: "Direction du Développement et des Études" },
  { value: "SONATEL/CYBER", label: "SONATEL / CYBER", sub: "Direction Cybersécurité SOC" },
  { value: "SONATEL/DTI",   label: "SONATEL / DTI",   sub: "Direction Technologies & Innovation" },
  { value: "SONATEL/DCF",   label: "SONATEL / DCF",   sub: "Direction Commerciale et Finance" },
  { value: "SONATEL/DRH",   label: "SONATEL / DRH",   sub: "Direction des Ressources Humaines" },
  { value: "SONATEL/DTC",   label: "SONATEL / DTC",   sub: "Direction Technique et Construction" },
  { value: "SONATEL/DAC",   label: "SONATEL / DAC",   sub: "Direction Administrative et Comptable" },
  { value: "ORANGE/BSS",    label: "ORANGE / BSS",    sub: "Orange Business Services Sénégal" },
];

const SITES = [
  { value: "technopole",      label: "Technopole, Immeuble Sonatel",         city: "Dakar" },
  { value: "liberte6",        label: "Liberté 6, Tour D — Sonatel",           city: "Dakar" },
  { value: "zone-teleport",   label: "Zone Téléport, Plateau",                city: "Dakar" },
  { value: "parcelles",       label: "Parcelles Assainies, Zone Sonatel",     city: "Dakar" },
  { value: "grand-yoff",      label: "Grand-Yoff, Centre Technique",          city: "Dakar" },
  { value: "thies",           label: "Agence Régionale de Thiès",             city: "Thiès" },
  { value: "saint-louis",     label: "Agence Régionale de Saint-Louis",       city: "Saint-Louis" },
  { value: "ziguinchor",      label: "Agence Régionale de Ziguinchor",        city: "Ziguinchor" },
  { value: "kaolack",         label: "Agence Régionale de Kaolack",           city: "Kaolack" },
  { value: "tambacounda",     label: "Agence Régionale de Tambacounda",       city: "Tambacounda" },
];

const STEPS = [
  { num: 1, label: "Identité & Adresse", icon: <User className="h-4 w-4" /> },
  { num: 2, label: "Accès & Rôles",      icon: <Key className="h-4 w-4" /> },
  { num: 3, label: "Services",           icon: <Shield className="h-4 w-4" /> },
  { num: 4, label: "Validation",         icon: <CheckCircle2 className="h-4 w-4" /> },
];

/* ─── Component ──────────────────────────────────────────────────── */

function NewUserPage() {
  const navigate = useNavigate();
  const [busy, setBusy]           = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);

  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    email: "",
    phone: "",
    matricule: "",
    info: "",
    organization: "",
    physicalAddress: "",
    city: "",
    role: "client" as AppRole,
    generation: "v1",
  });

  const [isActive, setIsActive]       = useState(true);
  const [permissions, setPermissions] = useState({ dispatching: false, showExperiences: false, showFollowers: true });
  const [tagPolicy, setTagPolicy]     = useState<"group" | "everyone">("group");

  const fullName = `${form.prenom} ${form.nom}`.trim();
  const initials = fullName ? fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??";

  /* City auto-fill from site */
  const handleSiteChange = (siteValue: string) => {
    const site = SITES.find(s => s.value === siteValue);
    setForm({ ...form, physicalAddress: siteValue, city: site?.city ?? "" });
  };

  /* Validation */
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!form.prenom.trim())       { toast.error("Prénom requis");              return false; }
      if (!form.nom.trim())          { toast.error("Nom requis");                 return false; }
      if (!form.email.trim())        { toast.error("E-mail requis");              return false; }
      if (!/\S+@\S+\.\S+/.test(form.email)) { toast.error("E-mail invalide");   return false; }
      if (!form.organization)        { toast.error("Organisation requise");       return false; }
      if (!form.physicalAddress)     { toast.error("Site / adresse requis");      return false; }
    }
    return true;
  };

  const handleNext = () => { if (validateStep(activeStep)) setActiveStep(p => p + 1); };
  const handlePrev = () => setActiveStep(p => p - 1);

  const handleCreate = async () => {
    if (!validateStep(1)) return;
    setBusy(true);
    try {
      const site = SITES.find(s => s.value === form.physicalAddress);
      const org  = ORGANIZATIONS.find(o => o.value === form.organization);
      const body = {
        email:        form.email,
        fullName,
        organization: org?.label ?? form.organization,
        role:         form.role,
        generation:   form.generation,
      };
      const { error } = await supabase.functions.invoke("admin-create-user", { body });
      if (error) throw error;
      toast.success("Agent créé avec succès !", { description: `OTP envoyé à ${form.email}` });
      navigate({ to: "/admin" });
    } catch (e: any) {
      toast.error("Erreur", { description: e.message ?? "Impossible de créer l'agent" });
    } finally {
      setBusy(false);
    }
  };

  /* Reusable underline input */
  const renderInput = (
    label: string, value: string, onChange: (v: string) => void,
    placeholder: string, icon: React.ReactNode, type = "text"
  ) => (
    <div className="relative group">
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-zinc-700 focus-within:border-amber-500 py-2.5 transition-all duration-300">
        <div className="text-slate-400 group-focus-within:text-amber-500 transition-colors shrink-0">{icon}</div>
        <div className="flex-1">
          <span className="block text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest group-focus-within:text-amber-500 transition-colors">{label}</span>
          <input
            type={type} value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent border-none outline-none p-0 text-slate-800 dark:text-zinc-100 placeholder-slate-300 dark:placeholder-zinc-600 text-sm font-semibold mt-0.5 focus:ring-0"
          />
        </div>
      </div>
    </div>
  );

  /* Reusable dropdown field */
  const renderSelect = (
    label: string, value: string, onValueChange: (v: string) => void,
    placeholder: string, icon: React.ReactNode,
    options: { value: string; label: string; sub?: string }[]
  ) => (
    <div className="group">
      <div className="flex items-start gap-3 border-b border-slate-200 dark:border-zinc-700 focus-within:border-amber-500 py-2.5 transition-all duration-300">
        <div className="text-slate-400 group-focus-within:text-amber-500 transition-colors shrink-0 mt-3">{icon}</div>
        <div className="flex-1">
          <span className="block text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">{label}</span>
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className="w-full bg-transparent border-none shadow-none p-0 h-auto text-sm font-semibold text-slate-800 dark:text-zinc-100 focus:ring-0 focus:outline-none [&>span]:flex [&>span]:items-center">
              <SelectValue placeholder={<span className="text-slate-300 dark:text-zinc-600 font-normal">{placeholder}</span>} />
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-auto shrink-0" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl">
              {options.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="rounded-lg cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-500/10 focus:bg-amber-50 dark:focus:bg-amber-500/10">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-100">{opt.label}</div>
                    {opt.sub && <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal mt-0.5">{opt.sub}</div>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const progressPct = ((activeStep - 1) / (STEPS.length - 1)) * 88; // 88% max width (5%→93%)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-[#080a10] dark:via-[#0b0d14] dark:to-[#0f1018] transition-colors duration-300 relative overflow-hidden">

      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full bg-gradient-radial from-amber-500/8 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-gradient-radial from-amber-400/5 via-transparent to-transparent blur-3xl" />
        {/* Grid mesh */}
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(rgba(245,158,11,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }}
        />
      </div>

      <div className="container mx-auto px-4 py-10 max-w-6xl relative z-10">

        {/* ── Header ── */}
        <div className="mb-10 flex items-start gap-4">
          <Button
            variant="ghost" size="icon"
            onClick={() => navigate({ to: "/admin" })}
            className="mt-1 rounded-2xl h-10 w-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 shadow-sm transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                <Fingerprint className="h-3 w-3" /> Onboarding Agent
              </span>
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-slate-900 via-amber-600 to-orange-600 dark:from-white dark:via-amber-400 dark:to-yellow-500 bg-clip-text text-transparent tracking-tight">
              Créer un Nouvel Agent RH
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 font-medium">
              Configurez l'identité, les droits d'accès et les services de l'agent en 4 étapes.
            </p>
          </div>
        </div>

        {/* ── Progress Stepper ── */}
        <div className="mb-10 relative">
          <div className="bg-white/70 dark:bg-zinc-900/50 border border-white/80 dark:border-zinc-800/50 backdrop-blur-xl rounded-3xl p-6 shadow-lg shadow-slate-200/50 dark:shadow-black/30">
            <div className="relative flex items-start justify-between max-w-3xl mx-auto">

              {/* Track line background */}
              <div className="absolute top-5 left-[6%] right-[6%] h-0.5 bg-slate-100 dark:bg-zinc-800 rounded-full" />
              {/* Track line progress */}
              <div
                className="absolute top-5 left-[6%] h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                style={{ width: `${progressPct}%` }}
              />

              {STEPS.map((st) => {
                const isDone    = activeStep > st.num;
                const isActive  = activeStep === st.num;
                return (
                  <div key={st.num} className="flex flex-col items-center gap-2 z-10 flex-1">
                    <button
                      type="button"
                      onClick={() => { if (isDone) setActiveStep(st.num); }}
                      className={`
                        relative w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all duration-300
                        ${isActive
                          ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-110 rotate-3"
                          : isDone
                            ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer hover:scale-105"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-zinc-700"
                        }
                      `}
                    >
                      {isDone ? <Check className="h-4 w-4 stroke-[3]" /> : <span>{st.num}</span>}
                      {isActive && (
                        <span className="absolute inset-0 rounded-2xl border-2 border-amber-400/40 animate-ping" />
                      )}
                    </button>
                    <div className="text-center">
                      <span className={`block text-[10px] font-extrabold uppercase tracking-wider transition-colors duration-300 ${
                        isActive ? "text-amber-500" : isDone ? "text-emerald-500" : "text-slate-400 dark:text-zinc-600"
                      }`}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Main Content Grid ── */}
        <div className="grid gap-8 lg:grid-cols-3">

          {/* ── Left / Center Panel ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* ════════════════════════════════════════════════════
                STEP 1 — Identité & Adresse
            ════════════════════════════════════════════════════ */}
            {activeStep === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-400">

                {/* Identity card */}
                <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/80 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-black/40 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 bg-[length:200%_100%] animate-[shimmer_2s_infinite]" />
                  <div className="p-7">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <User className="h-4.5 w-4.5 text-amber-500" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-slate-800 dark:text-zinc-100 uppercase tracking-wider">Identité de l'Agent</h2>
                        <p className="text-[11px] text-slate-400 font-medium">Nom, prénom, contact et matricule</p>
                      </div>
                    </div>

                    <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
                      {renderInput("Prénom de l'Agent", form.prenom, v => setForm({ ...form, prenom: v }), "Fatou", <User className="h-4 w-4" />)}
                      {renderInput("Nom de l'Agent", form.nom, v => setForm({ ...form, nom: v }), "Sow", <User className="h-4 w-4" />)}
                      {renderInput("Email Professionnel", form.email, v => setForm({ ...form, email: v }), "fatou.sow@orange-sonatel.com", <Mail className="h-4 w-4" />, "email")}
                      {renderInput("Contact Téléphonique", form.phone, v => setForm({ ...form, phone: v }), "+221 77 123 45 67", <Phone className="h-4 w-4" />, "tel")}
                      {renderInput("Matricule Agent", form.matricule, v => setForm({ ...form, matricule: v }), "SON-CYBER-2024", <Lock className="h-4 w-4" />)}
                    </div>
                  </div>
                </div>

                {/* Organisation card */}
                <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/80 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-black/40 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-violet-500 to-amber-500" />
                  <div className="p-7">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <Building className="h-4.5 w-4.5 text-violet-500" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-slate-800 dark:text-zinc-100 uppercase tracking-wider">Organisation & Localisation</h2>
                        <p className="text-[11px] text-slate-400 font-medium">Direction, département et site d'affectation</p>
                      </div>
                    </div>

                    <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
                      {/* Organisation dropdown */}
                      {renderSelect(
                        "Organisation / Direction",
                        form.organization,
                        v => setForm({ ...form, organization: v }),
                        "Sélectionnez une direction...",
                        <Building className="h-4 w-4" />,
                        ORGANIZATIONS
                      )}

                      {/* Physical address dropdown */}
                      {renderSelect(
                        "Site / Adresse physique du bureau",
                        form.physicalAddress,
                        handleSiteChange,
                        "Sélectionnez un site...",
                        <MapPin className="h-4 w-4" />,
                        SITES.map(s => ({ value: s.value, label: s.label, sub: `Ville : ${s.city}` }))
                      )}

                      {/* City auto-filled */}
                      {renderInput("Ville de résidence", form.city, v => setForm({ ...form, city: v }), "Dakar", <Globe2 className="h-4 w-4" />)}
                    </div>

                    <div className="mt-5 relative">
                      <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-700/50">
                        <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <textarea
                          value={form.info}
                          onChange={e => setForm({ ...form, info: e.target.value })}
                          placeholder="Commentaires administratifs complémentaires..."
                          className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 dark:text-zinc-200 placeholder-slate-300 dark:placeholder-zinc-600 font-medium resize-none min-h-[70px] focus:ring-0 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════
                STEP 2 — Accès & Rôles
            ════════════════════════════════════════════════════ */}
            {activeStep === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/80 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-black/40 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
                  <div className="p-7">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <Key className="h-4.5 w-4.5 text-violet-500" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-slate-800 dark:text-zinc-100 uppercase tracking-wider">Rôle & Accès Applicatif</h2>
                        <p className="text-[11px] text-slate-400 font-medium">Définissez le niveau de privilège de l'agent</p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {ROLES.map(r => (
                        <div
                          key={r.value}
                          onClick={() => setForm({ ...form, role: r.value })}
                          className={`
                            cursor-pointer rounded-2xl p-4 border-2 transition-all duration-300 relative overflow-hidden group
                            ${form.role === r.value
                              ? "border-amber-500 bg-amber-500/8 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                              : "border-slate-100 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/20 hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-500/5"
                            }
                          `}
                        >
                          {form.role === r.value && (
                            <div className="absolute top-3 right-3">
                              <span className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                                <Check className="h-3 w-3 text-white stroke-[3]" />
                              </span>
                            </div>
                          )}
                          <div className={`flex items-center gap-2 mb-2 ${r.color}`}>{r.icon}</div>
                          <div className="text-sm font-black text-slate-800 dark:text-zinc-100 mb-1">{r.label}</div>
                          <p className="text-[11px] text-slate-400 dark:text-zinc-500 leading-snug">{r.desc}</p>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-6 border-slate-100 dark:border-zinc-800" />

                    {/* Version + Tagging */}
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">Version applicative</Label>
                        <Select value={form.generation} onValueChange={v => setForm({ ...form, generation: v })}>
                          <SelectTrigger className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-amber-500 h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 rounded-xl">
                            <SelectItem value="v1" className="text-xs font-semibold">Génération 1 — Legacy Console</SelectItem>
                            <SelectItem value="v2" className="text-xs font-semibold">Génération 2 — Premium High-Tech Engine</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">Politique d'étiquetage</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "group", label: "Groupe seulement" },
                            { id: "everyone", label: "Tout le monde" },
                          ].map(t => (
                            <div
                              key={t.id}
                              onClick={() => setTagPolicy(t.id as any)}
                              className={`cursor-pointer rounded-xl p-3 border text-[11px] font-bold text-center transition-all duration-300 ${
                                tagPolicy === t.id
                                  ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400"
                                  : "border-slate-200 dark:border-zinc-800 text-slate-500 hover:border-amber-300"
                              }`}
                            >
                              {t.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════
                STEP 3 — Services & Permissions
            ════════════════════════════════════════════════════ */}
            {activeStep === 3 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/80 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-black/40 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                  <div className="p-7">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <Shield className="h-4.5 w-4.5 text-emerald-500" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-slate-800 dark:text-zinc-100 uppercase tracking-wider">Permissions & Statut</h2>
                        <p className="text-[11px] text-slate-400 font-medium">Habilitations cyber-défense et statut d'activation</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      {[
                        { key: "dispatching"      as const, label: "Autoriser le Dispatching d'alertes",       desc: "Distribuer et réaffecter des incidents aux analystes" },
                        { key: "showExperiences"  as const, label: "Afficher le journal d'expériences",        desc: "Historique complet d'apprentissage IA de l'agent" },
                        { key: "showFollowers"    as const, label: "Afficher les followers de dossiers",        desc: "Collaborateurs abonnés aux dossiers cyber" },
                      ].map(p => (
                        <div
                          key={p.key}
                          onClick={() => setPermissions(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                            permissions[p.key]
                              ? "bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.08)]"
                              : "border-slate-100 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-500/20"
                          }`}
                        >
                          <Checkbox
                            checked={permissions[p.key]}
                            onCheckedChange={() => {}}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">{p.label}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{p.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator className="border-slate-100 dark:border-zinc-800 mb-6" />

                    <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 block">Statut opérationnel à la création</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isActive ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-100 dark:border-zinc-800"}`}>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">Compte Actif</div>
                          <div className="text-[11px] text-slate-400">Accès instantané disponible</div>
                        </div>
                        <Switch id="active" checked={isActive} onCheckedChange={c => setIsActive(c)} className="data-[state=checked]:bg-emerald-500" />
                      </div>
                      <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${!isActive ? "border-red-500/40 bg-red-500/5" : "border-slate-100 dark:border-zinc-800"}`}>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">Mode Suspendu</div>
                          <div className="text-[11px] text-slate-400">Bloquer toute connexion</div>
                        </div>
                        <Switch id="inactive" checked={!isActive} onCheckedChange={c => setIsActive(!c)} className="data-[state=checked]:bg-red-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════
                STEP 4 — Validation
            ════════════════════════════════════════════════════ */}
            {activeStep === 4 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-400">
                <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/80 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-black/40 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-amber-500 to-emerald-500 animate-pulse" />
                  <div className="p-7">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-slate-800 dark:text-zinc-100 uppercase tracking-wider">Récapitulatif & Validation</h2>
                        <p className="text-[11px] text-slate-400 font-medium">Vérifiez les informations avant de créer le profil</p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Identity */}
                      <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/30 border border-slate-100 dark:border-zinc-700/50">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identité</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-white dark:border-zinc-800 shadow">
                            <AvatarImage src={orangeLogo} className="object-cover" />
                            <AvatarFallback className="bg-amber-500/10 text-amber-600 font-black text-sm">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-black text-slate-800 dark:text-zinc-100">{form.prenom} {form.nom}</div>
                            <div className="text-[11px] text-slate-400">{form.email}</div>
                            {form.matricule && <div className="text-[10px] text-amber-500 font-mono">{form.matricule}</div>}
                          </div>
                        </div>
                      </div>

                      {/* Organisation */}
                      <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/30 border border-slate-100 dark:border-zinc-700/50">
                        <div className="flex items-center gap-2 mb-3">
                          <Building className="h-3.5 w-3.5 text-violet-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Organisation</span>
                        </div>
                        <div className="text-sm font-black text-slate-800 dark:text-zinc-100">
                          {ORGANIZATIONS.find(o => o.value === form.organization)?.label ?? "—"}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">{ORGANIZATIONS.find(o => o.value === form.organization)?.sub}</div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {SITES.find(s => s.value === form.physicalAddress)?.label ?? "—"}
                        </div>
                      </div>

                      {/* Role & Access */}
                      <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/30 border border-slate-100 dark:border-zinc-700/50">
                        <div className="flex items-center gap-2 mb-3">
                          <Key className="h-3.5 w-3.5 text-indigo-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rôle & Accès</span>
                        </div>
                        <div className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase">{form.role}</div>
                        <div className="text-[11px] text-slate-400 mt-1">Génération {form.generation}</div>
                        <div className="text-[11px] text-slate-400">Politique : {tagPolicy === "group" ? "Groupe seulement" : "Tout le monde"}</div>
                      </div>

                      {/* Permissions */}
                      <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/30 border border-slate-100 dark:border-zinc-700/50">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Permissions</span>
                        </div>
                        <div className="text-sm font-black mb-2">
                          <span className={isActive ? "text-emerald-500" : "text-red-500"}>{isActive ? "● Actif" : "● Suspendu"}</span>
                        </div>
                        <div className="space-y-0.5 text-[11px] text-slate-400">
                          <div>• Dispatching : {permissions.dispatching ? "Activé" : "Désactivé"}</div>
                          <div>• Expériences : {permissions.showExperiences ? "Affichées" : "Masquées"}</div>
                          <div>• Followers : {permissions.showFollowers ? "Affichés" : "Masqués"}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/8 border border-emerald-500/20">
                      <Info className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                        En cliquant sur <strong>« Créer le Profil Agent »</strong>, le système provisionne l'agent et envoie un code OTP à <strong className="text-emerald-600 dark:text-emerald-400">{form.email}</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Navigation Buttons ── */}
            <div className="flex items-center justify-between pt-2">
              {activeStep > 1 ? (
                <Button
                  type="button" variant="outline" size="lg" onClick={handlePrev}
                  className="rounded-2xl font-bold bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Précédent
                </Button>
              ) : <div />}

              {activeStep < 4 ? (
                <Button
                  type="button" size="lg" onClick={handleNext}
                  className="rounded-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all ml-auto"
                >
                  Suivant <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button" size="lg" onClick={handleCreate} disabled={busy}
                  className="rounded-2xl font-extrabold bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-white shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 transition-all ml-auto gap-2 px-8"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  Créer le Profil Agent
                </Button>
              )}
            </div>

          </div>

          {/* ── Right Column: Live Preview ── */}
          <div className="space-y-4">

            {/* Profile card */}
            <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/80 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-black/40 overflow-hidden animate-in slide-in-from-right-4 duration-500">
              {/* Cover */}
              <div className="h-28 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20"
                  style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
              {/* Info */}
              <div className="px-6 pb-6 -mt-12 text-center relative z-10">
                <div className="relative inline-block">
                  <Avatar className="h-20 w-20 border-4 border-white dark:border-zinc-900 shadow-2xl">
                    <AvatarImage src={orangeLogo} className="object-cover" />
                    <AvatarFallback className="bg-amber-500/10 text-amber-600 text-xl font-black">{initials}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white dark:border-zinc-900 shadow ${isActive ? "bg-emerald-500" : "bg-red-400"}`} />
                </div>
                <h3 className="mt-3 text-base font-black text-slate-800 dark:text-zinc-100">{fullName || "Nouveau Agent"}</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {ORGANIZATIONS.find(o => o.value === form.organization)?.label ?? "Organisation —"}
                </p>
                {form.matricule && (
                  <p className="text-[10px] text-amber-500 font-mono mt-1">{form.matricule}</p>
                )}
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                  <Users className="h-3 w-3" /> {form.role}
                </div>
                {form.physicalAddress && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                    <MapPin className="h-3 w-3 text-slate-300" />
                    {SITES.find(s => s.value === form.physicalAddress)?.city ?? ""}
                  </div>
                )}
              </div>
            </div>

            {/* Security info */}
            <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/80 rounded-3xl p-5 shadow-xl shadow-slate-200/60 dark:shadow-black/40">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Key className="h-3.5 w-3.5 text-amber-500" /> Sécurité d'Accès
              </h3>
              <div className="space-y-2.5">
                {[
                  { k: "Authentification", v: "Double Facteur (OTP)" },
                  { k: "Version",          v: `Génération ${form.generation}` },
                  { k: "Étape actuelle",   v: `${activeStep} / 4` },
                ].map(row => (
                  <div key={row.k} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">{row.k}</span>
                    <span className="font-bold text-amber-500">{row.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step mini guide */}
            <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-white dark:border-zinc-800/80 rounded-3xl p-5 shadow-xl shadow-slate-200/60 dark:shadow-black/40">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Progression</h3>
              <div className="space-y-2">
                {STEPS.map(st => (
                  <div key={st.num} className={`flex items-center gap-2.5 text-xs transition-all duration-300 ${
                    activeStep === st.num ? "opacity-100" : activeStep > st.num ? "opacity-60" : "opacity-30"
                  }`}>
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                      activeStep > st.num ? "bg-emerald-500 text-white" : activeStep === st.num ? "bg-amber-500 text-white" : "bg-slate-100 dark:bg-zinc-800 text-slate-400"
                    }`}>
                      {activeStep > st.num ? <Check className="h-3 w-3 stroke-[3]" /> : <span className="text-[10px] font-bold">{st.num}</span>}
                    </div>
                    <span className={`font-semibold ${activeStep === st.num ? "text-amber-600 dark:text-amber-400" : "text-slate-500"}`}>
                      {st.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
