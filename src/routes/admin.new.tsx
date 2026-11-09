import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
  Sliders, Key, Users, Fingerprint, Zap, Globe2, AlertTriangle,
  Eye, EyeOff, Briefcase, RefreshCw, KeyRound, ShieldCheck, UserPlus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import type { AppRole } from "@/lib/auth-context";
import { useAuth } from "@/lib/auth-context";
import { Separator } from "@/components/ui/separator";
import { invokeAuthSecurity } from "@/lib/auth-security";
import { recordAuditEvent } from "@/lib/audit-log";

export const Route = createFileRoute("/admin/new")({
  head: () => ({ meta: [{ title: "Nouveau Agent RH — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><NewUserPage /></RequireAuth>,
});

/* ─── Data Constants ─────────────────────────────────────────────── */

const ROLES: { value: AppRole; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
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

/* ─── Modèle Simplifié Nouveau RH pour Espace Client ─────────────── */
function ClientNewRHView({
  organization,
  clientUserCount,
  setClientUserCount,
  CLIENT_MAX_USERS,
}: {
  organization: string | null;
  clientUserCount: number;
  setClientUserCount: (n: number) => void;
  CLIENT_MAX_USERS: number;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const clientQuotaReached = clientUserCount >= CLIENT_MAX_USERS;

  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    email: "",
    phone: "",
    fonction: "Responsable Ressources Humaines",
    password: "",
    confirmPassword: "",
  });

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm((f) => ({ ...f, password: pwd, confirmPassword: pwd }));
    setShowPassword(true);
    toast.info("Mot de passe sécurisé généré !");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (clientQuotaReached) {
      toast.error("Quota maximal atteint", {
        description: `Votre abonnement client permet jusqu'à ${CLIENT_MAX_USERS} comptes. Contactez le support pour augmenter votre quota.`,
      });
      return;
    }

    if (!form.prenom.trim()) {
      toast.error("Le prénom est obligatoire");
      return;
    }
    if (!form.nom.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
      toast.error("Une adresse e-mail professionnelle valide est requise");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Le numéro de téléphone est requis");
      return;
    }
    if (!form.password || form.password.length < 6) {
      toast.error("Le mot de passe doit comporter au moins 6 caractères");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setBusy(true);
    try {
      const fullName = `${form.prenom.trim()} ${form.nom.trim()}`;
      const orgName = organization || "Organisation Client";
      const body = {
        email: form.email.trim(),
        fullName,
        organization: orgName,
        role: "client",
        generation: "v2",
        phone: form.phone.trim(),
        matricule: `RH-${Date.now().toString().slice(-4)}`,
        physicalAddress: "",
        city: "",
        info: `Poste / Fonction : ${form.fonction || "Collaborateur RH"}`,
        tagPolicy: "group",
        isActive: true,
        permissions: { dispatching: false, showExperiences: false, showFollowers: true },
        password: form.password,
        securityAnswers: [],
        redirectOrigin: window.location.origin,
      };

      const { error } = await supabase.functions.invoke("admin-create-user", { body });
      if (error) {
        let errMsg = error.message;
        if (error.context && typeof error.context.json === "function") {
          try {
            const errBody = await error.context.json();
            if (errBody?.error) errMsg = errBody.error;
          } catch (_) {}
        }
        throw new Error(errMsg);
      }

      const newCount = clientUserCount + 1;
      setClientUserCount(newCount);
      localStorage.setItem("client_user_count", String(newCount));

      toast.success("Nouveau compte RH créé avec succès !", {
        description: `Le collaborateur ${fullName} (${form.email}) a été ajouté à votre organisation.`,
      });

      // Clear form
      setForm({
        prenom: "",
        nom: "",
        email: "",
        phone: "",
        fonction: "Responsable Ressources Humaines",
        password: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      toast.error("Erreur de création", {
        description: err?.message || "Impossible de créer le compte collaborateur",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-zinc-950 text-foreground transition-colors py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Back and Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/dashboard" })}
              className="text-xs text-muted-foreground hover:text-foreground pl-0 -ml-2 mb-1"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Retour au Tableau de bord
            </Button>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 inline-flex items-center gap-1.5">
                <Users className="h-3 w-3" /> Espace Client · Gestion des Équipes
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Nouveau Collaborateur RH
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Ajoutez simplement un compte d'accès RH pour un membre de votre organisation.
            </p>
          </div>

          <Link
            to="/admin"
            className="self-start sm:self-auto inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border transition-colors shadow-xs"
          >
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            Voir la liste des comptes
          </Link>
        </div>

        {/* Quota Banner */}
        <div className={`p-4 rounded-2xl border transition-all ${
          clientQuotaReached
            ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
            : "bg-card border-border shadow-xs"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                clientQuotaReached ? "bg-red-500/20 text-red-600 dark:text-red-400" : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
              }`}>
                {clientQuotaReached ? <AlertTriangle className="h-5 w-5" /> : <Users className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider">
                  {clientQuotaReached ? "Quota d'utilisateurs atteint" : "Comptes collaborateurs de votre entreprise"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {clientQuotaReached
                    ? "Limite de 3 utilisateurs atteinte pour votre forfait. Contactez le SOC Sonatel pour une extension."
                    : `Organisation : ${organization || "Votre Entreprise"} · ${CLIENT_MAX_USERS - clientUserCount} compte(s) disponible(s)`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:self-center">
              <div className="w-28 sm:w-36">
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      clientQuotaReached ? "bg-red-500" : clientUserCount >= 2 ? "bg-amber-500" : "bg-sky-500"
                    }`}
                    style={{ width: `${Math.min((clientUserCount / CLIENT_MAX_USERS) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-xs font-black font-mono shrink-0">
                {clientUserCount} / {CLIENT_MAX_USERS}
              </span>
            </div>
          </div>
        </div>

        {/* Form Container — Modèle Moderne & Épuré */}
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">

          {/* Section 1: Informations Personnelles & Poste */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Informations du collaborateur</h2>
                <p className="text-[11px] text-muted-foreground">Coordonnées professionnelles et intitulé du poste</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Prénom <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                    placeholder="Ex: Aminata"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nom <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    placeholder="Ex: Diop"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  E-mail professionnel <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="aminata.diop@entreprise.sn"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Numéro de téléphone <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+221 77 000 00 00"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Fonction / Poste au sein de l'entreprise
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={form.fonction}
                    onChange={(e) => setForm({ ...form, fonction: e.target.value })}
                    placeholder="Ex: Responsable Ressources Humaines, Chargé RH, Directeur..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Sécurité & Mot de Passe */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Sécurité & Accès</h2>
                  <p className="text-[11px] text-muted-foreground">Mot de passe temporaire pour la première connexion</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateRandomPassword}
                className="text-xs h-8 rounded-lg gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5 text-primary" /> Générer un mot de passe
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mot de passe temporaire <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Minimum 6 caractères"
                    className="w-full pl-9 pr-10 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Confirmer le mot de passe <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="Répétez le mot de passe"
                    className="w-full pl-9 pr-10 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendWelcomeEmail}
                  onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <span>Envoyer une notification par email avec le lien d'accès à l'espace</span>
              </label>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-500/5 border border-sky-500/20 text-xs text-sky-700 dark:text-sky-300 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Espace sécurisé :</span> Ce compte aura un rôle <strong>Client</strong> avec accès aux données de <strong>{organization || "votre organisation"}</strong> uniquement.
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate({ to: "/dashboard" })}
              className="text-xs w-full sm:w-auto"
            >
              Annuler
            </Button>

            <Button
              type="submit"
              disabled={busy || clientQuotaReached}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 gap-2"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création du compte en cours...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Créer le compte RH
                </>
              )}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}

/* ─── Component ──────────────────────────────────────────────────── */

function NewUserPage() {
  const navigate = useNavigate();
  const { roles, organization, user } = useAuth();
  const isClientOnly = roles.includes("client") && !roles.includes("admin") && !roles.includes("analyste") && !roles.includes("manager");

  // Track user quota for client role (max 3)
  const CLIENT_MAX_USERS = 3;
  const [clientUserCount, setClientUserCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("client_user_count") ?? "0", 10);
    }
    return 0;
  });
  const clientQuotaReached = isClientOnly && clientUserCount >= CLIENT_MAX_USERS;

  if (isClientOnly) {
    return (
      <ClientNewRHView
        organization={organization}
        clientUserCount={clientUserCount}
        setClientUserCount={setClientUserCount}
        CLIENT_MAX_USERS={CLIENT_MAX_USERS}
      />
    );
  }

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
    role: (isClientOnly ? "client" : "analyste") as AppRole,
    generation: "v1",
    password: "",
    confirmPassword: "",
  });

  const [isActive, setIsActive]       = useState(true);
  const [permissions, setPermissions] = useState({ dispatching: false, showExperiences: false, showFollowers: true });
  const [tagPolicy, setTagPolicy]     = useState<"group" | "everyone">("group");
  const [securityQuestions, setSecurityQuestions] = useState<{ id: string; question_text: string }[]>([]);
  const [securityAnswers, setSecurityAnswers] = useState<Record<string, string>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const fullName = `${form.prenom} ${form.nom}`.trim();
  const initials = fullName ? fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??";

  useEffect(() => {
    if (activeStep !== 2 || securityQuestions.length) return;
    setLoadingQuestions(true);
    invokeAuthSecurity<{ questions: { id: string; question_text: string }[] }>("list_security_question_catalog")
      .then((r) => setSecurityQuestions((r.questions ?? []).slice(0, 2)))
      .catch(() => setSecurityQuestions([]))
      .finally(() => setLoadingQuestions(false));
  }, [activeStep, securityQuestions.length]);

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
      if (!form.phone.trim())        { toast.error("Téléphone requis pour l'OTP de connexion"); return false; }
      if (!form.organization)        { toast.error("Organisation requise");       return false; }
      if (!form.physicalAddress)     { toast.error("Site / adresse requis");      return false; }
    }
    if (step === 2) {
      if (!form.password) {
        toast.error("Mot de passe requis");
        return false;
      }
      if (form.password.length < 6) {
        toast.error("Le mot de passe doit contenir au moins 6 caractères");
        return false;
      }
      if (form.password !== form.confirmPassword) {
        toast.error("Les mots de passe ne correspondent pas");
        return false;
      }
      const answersPayload = securityQuestions.map((q) => ({
        questionId: q.id,
        answer: securityAnswers[q.id] ?? "",
      }));
      if (answersPayload.some((a) => !a.answer.trim())) {
        toast.error("Répondez aux 2 questions de secours");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => { if (validateStep(activeStep)) setActiveStep(p => p + 1); };
  const handlePrev = () => setActiveStep(p => p - 1);

  const handleCreate = async () => {
    if (!validateStep(1) || !validateStep(2)) return;

    // Client quota guard
    if (isClientOnly && clientUserCount >= CLIENT_MAX_USERS) {
      toast.error("Quota atteint", {
        description: `Votre abonnement permet un maximum de ${CLIENT_MAX_USERS} utilisateurs. Contactez le support pour augmenter votre quota.`,
      });
      return;
    }

    setBusy(true);
    try {
      const org = ORGANIZATIONS.find(o => o.value === form.organization);
      const body = {
        email:           form.email,
        fullName,
        organization:    org?.label ?? form.organization,
        role:            isClientOnly ? "client" : form.role,
        generation:      form.generation,
        phone:           form.phone,
        matricule:       form.matricule,
        physicalAddress: form.physicalAddress,
        city:            form.city,
        info:            form.info,
        tagPolicy,
        isActive,
        permissions,
        password:        form.password,
        securityAnswers: securityQuestions.map((q) => ({
          questionId: q.id,
          answer: securityAnswers[q.id] ?? "",
        })),
        redirectOrigin:  window.location.origin,
      };
      const { data, error } = await supabase.functions.invoke("admin-create-user", { body });
      if (error) {
        let errMsg = error.message;
        // Attempt to extract details from the HTTP response
        if (error.context && typeof error.context.json === "function") {
          try {
            const errBody = await error.context.json();
            if (errBody && errBody.error) {
              errMsg = errBody.error;
            }
          } catch (_) {
            try {
              const text = await error.context.text();
              if (text) errMsg = text;
            } catch (__) {}
          }
        }
        throw new Error(errMsg);
      }
      const securityInfo = data?.security;
      void recordAuditEvent("USER_CREATE", fullName, {
        email: form.email,
        role: body.role,
        generation: body.generation,
      }, org?.label ?? form.organization, isClientOnly ? "client" : "staff", isClientOnly ? user?.id : null);
      const otpDesc = securityInfo?.otpSentVia === "sms" && securityInfo?.maskedPhone
        ? `OTP SMS envoyé au ${securityInfo.maskedPhone}`
        : securityInfo?.otpSentVia === "email"
          ? `E-mail de bienvenue et OTP envoyés à ${form.email}`
          : `E-mail envoyé à ${form.email}`;

      toast.success("Agent créé avec succès !", {
        description: otpDesc,
      });

      // Update client quota counter
      if (isClientOnly) {
        const newCount = clientUserCount + 1;
        setClientUserCount(newCount);
        localStorage.setItem("client_user_count", String(newCount));
      }

      navigate({ to: "/admin/new" });
    } catch (e: any) {
      toast.error("Erreur", { description: e.message ?? "Impossible de créer l'agent" });
    } finally {
      setBusy(false);
    }
  };

  /* ─── Modern Input Helper ─────────────────────────────────────── */
  const renderInput = (
    label: string, value: string, onChange: (v: string) => void,
    placeholder: string, icon: React.ReactNode, type = "text",
    required = false
  ) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none">
          {icon}
        </div>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 text-sm text-slate-800 dark:text-zinc-100 placeholder-slate-300 dark:placeholder-zinc-600 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 transition-all shadow-sm"
        />
      </div>
    </div>
  );

  /* ─── Modern Select Helper ──────────────────────────────────────── */
  const renderSelect = (
    label: string, value: string, onValueChange: (v: string) => void,
    placeholder: string, icon: React.ReactNode,
    options: { value: string; label: string; sub?: string }[],
    required = false
  ) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none z-10">
          {icon}
        </div>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="w-full pl-10 py-2.5 h-auto rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 text-sm font-medium text-slate-800 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 shadow-sm transition-all">
            <SelectValue placeholder={<span className="text-slate-300 dark:text-zinc-600">{placeholder}</span>} />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50">
            {options.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="rounded-xl cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-500/10 focus:bg-amber-50 dark:focus:bg-amber-500/10 py-2.5">
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
  );

  const stepColors = ["from-amber-500 to-orange-500", "from-violet-500 to-indigo-500", "from-emerald-500 to-teal-500", "from-amber-400 to-emerald-500"];
  const stepDescriptions = [
    "Coordonnées professionnelles, organisation et localisation",
    "Rôle, habilitations applicatives et sécurité du compte",
    "Services activés, permissions et statut opérationnel",
    "Vérification finale avant création du profil"
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#080a10] transition-colors duration-300">

      {/* ══════════════════════════════════════════════════════════
          LEFT SIDEBAR — Fixed dark panel with branding & progress
      ══════════════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex w-80 xl:w-96 flex-col shrink-0 bg-gradient-to-b from-slate-900 via-zinc-900 to-slate-950 relative overflow-hidden border-r border-slate-800">

        {/* Ambient glow decorations */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 left-0 w-48 h-48 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(rgba(245,158,11,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.6) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />

        {/* Top branding */}
        <div className="relative z-10 p-7 pb-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-5">
            <Avatar className="h-10 w-10 border border-amber-500/30 shadow-lg shadow-amber-500/10">
              <AvatarImage src={orangeLogo} className="object-cover" />
              <AvatarFallback className="bg-amber-500/20 text-amber-400 font-black text-sm">{initials || "AG"}</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-white font-black text-sm leading-tight">{fullName || "Nouvel Agent"}</div>
              <div className="text-zinc-400 text-[11px] font-medium mt-0.5">
                {ORGANIZATIONS.find(o => o.value === form.organization)?.label ?? "Direction non assignée"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-red-400"} animate-pulse`} />
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">SONATEL SOC SECURITY</span>
          </div>
          <div className="font-mono text-[10px] text-amber-400/70 bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-2.5 py-1 w-fit">
            {form.matricule || "SON-RH-XXXX"}
          </div>
        </div>

        {/* Step progress navigation */}
        <div className="relative z-10 flex-1 p-7 py-8 space-y-2">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-5">Progression</p>
          {STEPS.map((st, i) => {
            const isDone = activeStep > st.num;
            const isAct  = activeStep === st.num;
            return (
              <button
                key={st.num}
                type="button"
                onClick={() => { if (isDone) setActiveStep(st.num); }}
                disabled={!isDone && !isAct}
                className={[
                  "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all duration-300 group",
                  isAct  ? "bg-white/10 border border-white/15 shadow-lg" : "",
                  isDone ? "hover:bg-white/5 cursor-pointer" : "",
                  !isAct && !isDone ? "opacity-30 cursor-not-allowed" : ""
                ].join(" ")}
              >
                <div className={[
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 font-black text-sm",
                  isAct  ? `bg-gradient-to-br ${stepColors[i]} text-white shadow-lg` : "",
                  isDone ? "bg-emerald-500/20 text-emerald-400" : "",
                  !isAct && !isDone ? "bg-zinc-800 text-zinc-600" : ""
                ].join(" ")}>
                  {isDone ? <Check className="h-4 w-4 stroke-[3]" /> : st.num}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={[
                    "text-sm font-bold leading-tight",
                    isAct  ? "text-white" : isDone ? "text-zinc-300" : "text-zinc-600"
                  ].join(" ")}>{st.label}</div>
                  {isAct && (
                    <div className="text-[10px] text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                      {stepDescriptions[i]}
                    </div>
                  )}
                </div>
                {isAct && <ChevronRight className="h-3.5 w-3.5 text-zinc-500 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Bottom security info */}
        <div className="relative z-10 p-7 pt-5 border-t border-white/5 space-y-2.5">
          {[
            { k: "2FA",        v: "Orange SMS Pro", icon: <Shield className="h-3 w-3" /> },
            { k: "Chiffrement", v: "AES-256-GCM",   icon: <Lock className="h-3 w-3" /> },
            { k: "Accréditation", v: "SOC SONATEL",  icon: <ShieldCheck className="h-3 w-3" /> },
          ].map(row => (
            <div key={row.k} className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500 flex items-center gap-1.5">{row.icon}{row.k}</span>
              <span className="text-zinc-300 font-bold">{row.v}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════
          RIGHT PANEL — Main scrollable content area
      ══════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">

        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-zinc-800/80 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost" size="icon"
              onClick={() => navigate({ to: "/admin" })}
              className="rounded-xl h-8 w-8 border border-slate-200 dark:border-zinc-700 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-slate-900 dark:text-white">Créer un Nouvel Agent SOC</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase">
                  <ShieldCheck className="h-3 w-3" /> Sonatel RH
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                <Link to="/admin" className="hover:text-amber-500 transition-colors">Console SOC</Link>
                <span>/</span>
                <span>Agents RH</span>
                <span>/</span>
                <span className="text-amber-500 font-semibold">{STEPS[activeStep - 1].label}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Mobile step indicator */}
            <div className="lg:hidden flex items-center gap-1.5 text-xs">
              {STEPS.map(st => (
                <div key={st.num} className={[
                  "h-2 rounded-full transition-all duration-300",
                  activeStep === st.num ? "w-6 bg-amber-500" : activeStep > st.num ? "w-2 bg-emerald-500" : "w-2 bg-slate-200 dark:bg-zinc-700"
                ].join(" ")} />
              ))}
            </div>
            {!isClientOnly && (
              <Link to="/clients/new" className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-amber-500 transition-colors font-medium">
                <span>Nouveau Client</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </header>

        {/* Content wrapper */}
        <div className="flex-1 px-6 py-8 max-w-3xl w-full mx-auto">

          {/* Step header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${stepColors[activeStep - 1]} flex items-center justify-center shadow-lg text-white font-black text-sm`}>
                {activeStep}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">{STEPS[activeStep - 1].label}</h2>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">{stepDescriptions[activeStep - 1]}</p>
              </div>
              <div className="ml-auto hidden sm:flex items-center gap-1.5 text-xs font-bold bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl text-slate-500 dark:text-zinc-400">
                <span className="text-amber-500">{activeStep}</span>
                <span>/</span>
                <span>4</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-5">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${stepColors[activeStep - 1]} transition-all duration-700 ease-out`}
                style={{ width: `${(activeStep / 4) * 100}%` }}
              />
            </div>
          </div>

          {/* ════════════════════════════════════════════════════
              STEP 1 — Identité & Adresse
          ════════════════════════════════════════════════════ */}
          {activeStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">

              {/* Identity card */}
              <div className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Identité de l'Agent</h3>
                    <p className="text-[11px] text-slate-400">Nom, prénom, contact et matricule</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {renderInput("Prénom de l'Agent", form.prenom, v => setForm({ ...form, prenom: v }), "Ex: Fatou", <User className="h-4 w-4" />, "text", true)}
                  {renderInput("Nom de l'Agent", form.nom, v => setForm({ ...form, nom: v }), "Ex: Sow", <User className="h-4 w-4" />, "text", true)}
                  {renderInput("Email Professionnel", form.email, v => setForm({ ...form, email: v }), "fatou.sow@orange-sonatel.com", <Mail className="h-4 w-4" />, "email", true)}
                  {renderInput("Contact Téléphonique", form.phone, v => setForm({ ...form, phone: v }), "+221 77 123 45 67", <Phone className="h-4 w-4" />, "tel", true)}
                  <div className="sm:col-span-2">
                    {renderInput("Matricule Agent", form.matricule, v => setForm({ ...form, matricule: v }), "SON-CYBER-2024", <Lock className="h-4 w-4" />)}
                  </div>
                </div>
              </div>

              {/* Organisation card */}
              <div className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Building className="h-4 w-4 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Organisation & Localisation</h3>
                    <p className="text-[11px] text-slate-400">Direction, département et site d'affectation</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {renderSelect("Organisation / Direction", form.organization, v => setForm({ ...form, organization: v }), "Sélectionnez une direction...", <Building className="h-4 w-4" />, ORGANIZATIONS, true)}
                  {renderSelect("Site / Bureau", form.physicalAddress, handleSiteChange, "Sélectionnez un site...", <MapPin className="h-4 w-4" />, SITES.map(s => ({ value: s.value, label: s.label, sub: `Ville : ${s.city}` })), true)}
                  <div className="sm:col-span-2">
                    {renderInput("Ville de résidence", form.city, v => setForm({ ...form, city: v }), "Dakar", <Globe2 className="h-4 w-4" />)}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1.5">Notes administratives</label>
                  <textarea
                    value={form.info}
                    onChange={e => setForm({ ...form, info: e.target.value })}
                    placeholder="Commentaires complémentaires (optionnel)..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 text-sm text-slate-800 dark:text-zinc-100 placeholder-slate-300 dark:placeholder-zinc-600 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 transition-all shadow-sm resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              STEP 2 — Accès & Rôles
          ════════════════════════════════════════════════════ */}
          {activeStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">

              {/* Role selection */}
              <div className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Key className="h-4 w-4 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Rôle & Accès Applicatif</h3>
                    <p className="text-[11px] text-slate-400">Niveau de privilège de l'agent SOC</p>
                  </div>
                </div>

                {isClientOnly ? (
                  <div className="flex items-start gap-3 rounded-xl p-4 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-500/30">
                    <Users className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-sky-700 dark:text-sky-400">Rôle attribué : Client</p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">Accès restreint à votre organisation uniquement.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {ROLES.map(r => (
                      <div
                        key={r.value}
                        onClick={() => setForm({ ...form, role: r.value })}
                        className={[
                          "cursor-pointer rounded-xl p-4 border-2 transition-all duration-200 relative group",
                          form.role === r.value
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-500/8 shadow-sm"
                            : "border-slate-100 dark:border-zinc-800 hover:border-amber-200 dark:hover:border-amber-500/30 hover:bg-amber-50/50 dark:hover:bg-amber-500/5"
                        ].join(" ")}
                      >
                        {form.role === r.value && (
                          <span className="absolute top-3 right-3 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-white stroke-[3]" />
                          </span>
                        )}
                        <div className={`mb-2 ${r.color}`}>{r.icon}</div>
                        <div className="text-xs font-bold text-slate-800 dark:text-zinc-100 mb-1">{r.label}</div>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-snug">{r.desc}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 pt-5 border-t border-slate-100 dark:border-zinc-800 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2 block">Version applicative</Label>
                    <Select value={form.generation} onValueChange={v => setForm({ ...form, generation: v })}>
                      <SelectTrigger className="rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs font-semibold focus:ring-2 focus:ring-amber-500/40 h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 rounded-xl">
                        <SelectItem value="v1" className="text-xs font-semibold">Génération 1 — Legacy Console</SelectItem>
                        <SelectItem value="v2" className="text-xs font-semibold">Génération 2 — Premium High-Tech</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2 block">Politique d'étiquetage</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ id: "group", label: "Groupe" }, { id: "everyone", label: "Tout le monde" }].map(t => (
                        <div
                          key={t.id}
                          onClick={() => setTagPolicy(t.id as any)}
                          className={[
                            "cursor-pointer rounded-xl px-3 py-2.5 border text-[11px] font-bold text-center transition-all",
                            tagPolicy === t.id
                              ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400"
                              : "border-slate-200 dark:border-zinc-800 text-slate-500 hover:border-amber-300"
                          ].join(" ")}
                        >
                          {t.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Password + Security questions */}
              <div className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Lock className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Sécurité du Compte</h3>
                      <p className="text-[11px] text-slate-400">Mot de passe initial (min. 6 caractères)</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {renderInput("Mot de passe", form.password, v => setForm({ ...form, password: v }), "••••••••", <Lock className="h-4 w-4" />, "password", true)}
                  {renderInput("Confirmer le mot de passe", form.confirmPassword, v => setForm({ ...form, confirmPassword: v }), "••••••••", <Lock className="h-4 w-4" />, "password", true)}
                </div>

                {/* Security questions */}
                <div className="mt-5 pt-5 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Questions de secours</h3>
                      <p className="text-[11px] text-slate-400">2 questions obligatoires pour la récupération</p>
                    </div>
                  </div>
                  {loadingQuestions ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                      <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {securityQuestions.map((q) => (
                        <div key={q.id} className="rounded-xl border border-dashed border-slate-200 dark:border-zinc-700 p-4 space-y-2">
                          <p className="text-xs font-semibold text-slate-600 dark:text-zinc-300">{q.question_text}</p>
                          <input
                            type="text"
                            value={securityAnswers[q.id] ?? ""}
                            onChange={(e) => setSecurityAnswers({ ...securityAnswers, [q.id]: e.target.value })}
                            placeholder="Réponse secrète de l'agent"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 text-sm text-slate-800 dark:text-zinc-100 placeholder-slate-300 dark:placeholder-zinc-600 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 transition-all shadow-sm"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              STEP 3 — Services & Permissions
          ════════════════════════════════════════════════════ */}
          {activeStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Permissions & Habilitations</h3>
                    <p className="text-[11px] text-slate-400">Droits cyber-défense et modules activés</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    { key: "dispatching"     as const, label: "Dispatching d'alertes",        desc: "Distribuer et réaffecter des incidents aux analystes", icon: <Zap className="h-4 w-4 text-amber-500" /> },
                    { key: "showExperiences" as const, label: "Journal d'expériences IA",     desc: "Historique complet d'apprentissage IA de l'agent",    icon: <Fingerprint className="h-4 w-4 text-violet-500" /> },
                    { key: "showFollowers"   as const, label: "Affichage des followers",      desc: "Collaborateurs abonnés aux dossiers cyber",           icon: <Users className="h-4 w-4 text-sky-500" /> },
                  ].map(p => (
                    <div
                      key={p.key}
                      onClick={() => setPermissions(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                      className={[
                        "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                        permissions[p.key]
                          ? "bg-emerald-50 dark:bg-emerald-500/8 border-emerald-500/40"
                          : "border-slate-100 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-500/20"
                      ].join(" ")}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${permissions[p.key] ? "bg-emerald-500/15" : "bg-slate-100 dark:bg-zinc-800"}`}>
                        {p.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800 dark:text-zinc-200">{p.label}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{p.desc}</div>
                      </div>
                      <Checkbox
                        checked={permissions[p.key]}
                        onCheckedChange={() => {}}
                        className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 shrink-0"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-3 block">Statut opérationnel à la création</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div
                      onClick={() => setIsActive(true)}
                      className={[
                        "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        isActive ? "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/8" : "border-slate-100 dark:border-zinc-800 hover:border-emerald-200"
                      ].join(" ")}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive ? "bg-emerald-500/20" : "bg-slate-100 dark:bg-zinc-800"}`}>
                        <Check className={`h-4 w-4 ${isActive ? "text-emerald-500" : "text-slate-400"}`} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800 dark:text-zinc-100">Compte Actif</div>
                        <div className="text-[11px] text-slate-400">Accès instantané disponible</div>
                      </div>
                    </div>
                    <div
                      onClick={() => setIsActive(false)}
                      className={[
                        "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        !isActive ? "border-red-500/50 bg-red-50 dark:bg-red-500/8" : "border-slate-100 dark:border-zinc-800 hover:border-red-200"
                      ].join(" ")}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${!isActive ? "bg-red-500/20" : "bg-slate-100 dark:bg-zinc-800"}`}>
                        <AlertTriangle className={`h-4 w-4 ${!isActive ? "text-red-500" : "text-slate-400"}`} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800 dark:text-zinc-100">Mode Suspendu</div>
                        <div className="text-[11px] text-slate-400">Bloquer toute connexion</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              STEP 4 — Validation & Récapitulatif
          ════════════════════════════════════════════════════ */}
          {activeStep === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">

              {/* Agent preview card */}
              <div className="bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.04]"
                  style={{ backgroundImage: "linear-gradient(rgba(245,158,11,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.6) 1px, transparent 1px)", backgroundSize: "30px 30px" }}
                />
                <div className="relative z-10 flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-amber-500/30 shadow-xl shadow-amber-500/10">
                    <AvatarImage src={orangeLogo} className="object-cover" />
                    <AvatarFallback className="bg-amber-500/20 text-amber-400 text-xl font-black">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-black text-lg">{fullName || "Nouveau Agent"}</h3>
                      <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-red-400"}`} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-zinc-400 text-sm">{form.email || "—"}</span>
                      {form.matricule && <span className="font-mono text-amber-400/80 text-xs bg-zinc-800 px-2 py-0.5 rounded">{form.matricule}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-bold uppercase">
                        <Users className="h-3 w-3" /> {form.role}
                      </span>
                      {form.physicalAddress && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-zinc-800 text-zinc-300 rounded-full text-[10px] font-medium">
                          <MapPin className="h-3 w-3 text-zinc-500" />
                          {SITES.find(s => s.value === form.physicalAddress)?.city ?? "Dakar"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Building className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Organisation</span>
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-zinc-100">
                    {ORGANIZATIONS.find(o => o.value === form.organization)?.label ?? "—"}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{ORGANIZATIONS.find(o => o.value === form.organization)?.sub}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{SITES.find(s => s.value === form.physicalAddress)?.label ?? "—"}</div>
                </div>

                <div className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Key className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accès & Rôle</span>
                  </div>
                  <div className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase">{form.role}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Génération {form.generation}</div>
                  <div className="text-[11px] text-slate-400">Politique : {tagPolicy === "group" ? "Groupe seulement" : "Tout le monde"}</div>
                </div>

                <div className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
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

                <div className="bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Phone className="h-3.5 w-3.5 text-sky-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</span>
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-zinc-100">{form.phone || "—"}</div>
                  <div className="text-[11px] text-slate-400 mt-1 break-all">{form.email || "—"}</div>
                </div>
              </div>

              {/* Confirm notice */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/8 border border-emerald-200 dark:border-emerald-500/20">
                <Info className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                  En cliquant sur <strong>« Créer le Profil Agent »</strong>, le système provisionne l'agent, envoie un e-mail de bienvenue à <strong className="text-emerald-600 dark:text-emerald-400">{form.email}</strong> et un code OTP par SMS au <strong className="text-emerald-600 dark:text-emerald-400">{form.phone || "téléphone enregistré"}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* ── Navigation Buttons ── */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100 dark:border-zinc-800">
            {activeStep > 1 ? (
              <Button
                type="button" variant="outline" onClick={handlePrev}
                className="rounded-xl font-bold border-slate-200 dark:border-zinc-700 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all px-5"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Précédent
              </Button>
            ) : <div />}

            {activeStep < 4 ? (
              <Button
                type="button" onClick={handleNext}
                className="ml-auto rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all px-6 gap-2"
              >
                Continuer <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button" onClick={handleCreate} disabled={busy}
                className="ml-auto rounded-xl font-extrabold bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-white shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 transition-all px-8 gap-2"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                Créer le Profil Agent
              </Button>
            )}
          </div>

        </div>
      </main>

    </div>
  );
}

