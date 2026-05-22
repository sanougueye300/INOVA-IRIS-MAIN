import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import orangeLogo from "@/assets/orange-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth-context";
import {
  Shield, CheckCircle, XCircle, Mail, Building, ArrowLeft,
  Activity, Clock, Fingerprint, KeyRound, Globe, Power, PowerOff,
  Save, Loader2, ShieldAlert, LogOut, RotateCcw, Download,
  User as UserIcon, Palette, Sparkles, Lock, Key, Info, Phone,
  Facebook, Twitter, Linkedin, Youtube, ChevronLeft, ChevronRight,
  Sliders, Users, AlertCircle, RefreshCw, Send, Check
} from "lucide-react";

export const Route = createFileRoute("/admin/$userId")({
  head: () => ({ meta: [{ title: "Vue Utilisateur 360° — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><UserCockpit360 /></RequireAuth>,
});

// Default admin user
const DEFAULT_ADMIN_USER = {
  id: "default-sanou",
  email: "sanou.gueye@sonatel.com",
  full_name: "Sanou Gueye",
  organization: "Sonatel",
  is_active: true,
  created_at: "2025-01-15T08:00:00Z",
};

// Simulated activity
function generateMockActivity(userId: string): Array<{ date: string; type: string; message: string; ip: string }> {
  const now = Date.now();
  return [
    { date: new Date(now - 1000 * 60 * 5).toLocaleString("fr-FR"), type: "login", message: "Connexion réussie via SSO", ip: "192.168.1.50" },
    { date: new Date(now - 1000 * 60 * 45).toLocaleString("fr-FR"), type: "action", message: "Modification des connecteurs API (Wazuh)", ip: "192.168.1.50" },
    { date: new Date(now - 1000 * 3600 * 2).toLocaleString("fr-FR"), type: "action", message: "Création d'un nouveau client : Ageroute", ip: "192.168.1.50" },
    { date: new Date(now - 1000 * 3600 * 5).toLocaleString("fr-FR"), type: "login", message: "Connexion réussie (MFA validé)", ip: "10.5.28.12" },
    { date: new Date(now - 1000 * 3600 * 24).toLocaleString("fr-FR"), type: "security", message: "Rotation de la clé API personnelle", ip: "192.168.1.50" },
    { date: new Date(now - 1000 * 3600 * 48).toLocaleString("fr-FR"), type: "action", message: "Export du rapport d'audit mensuel (PDF)", ip: "10.5.28.12" },
    { date: new Date(now - 1000 * 3600 * 72).toLocaleString("fr-FR"), type: "login", message: "Connexion depuis un nouvel appareil (iPhone)", ip: "192.168.1.99" },
  ];
}

const ROLES_LIST = [
  { value: "VTB", label: "VTB Analyste", desc: "Suivi des alertes de premier niveau et dispatch" },
  { value: "PVT", label: "PVT Référent", desc: "Analyste cyber senior, validation et escalades" },
  { value: "BO VTB", label: "BO VTB Manager", desc: "Supervision des processus de surveillance" },
  { value: "Manager", label: "Manager Cyber", desc: "Planification d'équipes et gouvernance opérationnelle" },
  { value: "Admin", label: "Administrateur SOC", desc: "Administration des plateformes intégrées" },
  { value: "Super Admin", label: "Super Admin Global", desc: "Habilitation totale sur l'ensemble de la structure" }
];

function UserCockpit360() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  
  // Step navigation
  const [activeStep, setActiveStep] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<AppRole>("client");
  const [activity, setActivity] = useState<Array<{ date: string; type: string; message: string; ip: string }>>([]);

  // Banner wallpaper index
  const [bannerIndex, setBannerIndex] = useState(0);
  const BANNERS = [
    "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600",
    "bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800",
    "bg-gradient-to-br from-red-700 via-rose-800 to-amber-700",
    "bg-gradient-to-br from-emerald-700 via-teal-800 to-cyan-950",
  ];

  // Forms
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    fullName: "",
    email: "",
    organization: "",
    phone: "",
    department: "",
    info: "",
    website: "",
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
    facebook: "",
    twitter: "",
    linkedin: "",
    youtube: "",
    generation: "v2",
    budgetCode: "DEPT-CYBER-OBS"
  });

  const [selectedProfil, setSelectedProfil] = useState<string>("Admin");
  const [tagPolicy, setTagPolicy] = useState<string>("group");
  const [permissions, setPermissions] = useState({
    dispatching: false,
    experiences: false,
    followers: true,
  });

  // Djib'son AI Chat embedded state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    { role: "ai", text: "Bonjour, je suis Djib'son IA, votre auditeur de sécurité. Posez-moi des questions sur les permissions ou l'audit de sécurité de cet agent." }
  ]);
  const [isAITyping, setIsAITyping] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      let data: any = null;

      // 1. Check localStorage for locally-saved profile
      const localProfile = localStorage.getItem(`profile_${userId}`);
      if (localProfile) {
        try { data = JSON.parse(localProfile); } catch (e) {}
      }

      // 2. Check if it's the default admin user
      if (!data && userId === "default-sanou") {
        data = DEFAULT_ADMIN_USER;
      }

      // 3. Otherwise fetch from Supabase
      if (!data) {
        const { data: db, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (error) throw error;
        data = db;
      }

      setProfile(data);

      // Load role
      if (userId === "default-sanou") {
        setRole("admin");
      } else {
        const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", userId);
        if (r && r.length > 0) setRole(r[0].role as AppRole);
      }

      // Load or generate activity
      const storedActivity = localStorage.getItem(`activity_${userId}`);
      if (storedActivity) {
        setActivity(JSON.parse(storedActivity));
      } else {
        const mock = generateMockActivity(userId);
        setActivity(mock);
      }

      const localPhone = localStorage.getItem(`phone_user_${userId}`) || "";
      const localDept = localStorage.getItem(`dept_user_${userId}`) || (userId === "default-sanou" ? "SNT/DDE/DDO/CLF" : "");
      const localInfo = localStorage.getItem(`info_user_${userId}`) || (userId === "default-sanou" ? "Ingénieur Cyberdéfense & Administrateur Principal du SOC Sonatel." : "");
      const localWebsite = localStorage.getItem(`website_user_${userId}`) || "https://sonatel.sn";
      
      const localFacebook = localStorage.getItem(`fb_user_${userId}`) || "";
      const localTwitter = localStorage.getItem(`tw_user_${userId}`) || "";
      const localLinkedin = localStorage.getItem(`li_user_${userId}`) || "";
      const localYoutube = localStorage.getItem(`yt_user_${userId}`) || "";
      
      const localProfil = localStorage.getItem(`profil_role_${userId}`) || (userId === "default-sanou" ? "Admin" : "VTB");
      const localTagPolicy = localStorage.getItem(`tag_policy_${userId}`) || "group";
      const localPermissions = localStorage.getItem(`perms_user_${userId}`) 
        ? JSON.parse(localStorage.getItem(`perms_user_${userId}`)!) 
        : { dispatching: false, experiences: false, followers: true };

      const parts = (data.full_name || "").split(" ");
      const prenom = parts[0] || "";
      const nom = parts.slice(1).join(" ") || "";

      setForm({
        prenom,
        nom,
        fullName: data.full_name || "",
        email: data.email || "",
        organization: data.organization || "",
        phone: localPhone,
        department: localDept,
        info: localInfo,
        website: localWebsite,
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
        facebook: localFacebook,
        twitter: localTwitter,
        linkedin: localLinkedin,
        youtube: localYoutube,
        generation: localStorage.getItem(`gen_user_${userId}`) || "v2",
        budgetCode: localStorage.getItem(`budget_user_${userId}`) || "DEPT-CYBER-" + Math.floor(Math.random() * 9000 + 1000)
      });

      setSelectedProfil(localProfil);
      setTagPolicy(localTagPolicy);
      setPermissions(localPermissions);
    } catch (e: any) {
      toast.error("Erreur", { description: "Impossible de charger le profil utilisateur" });
      navigate({ to: "/admin" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const mergedFullName = `${form.prenom} ${form.nom}`.trim() || form.fullName;
      const updatedProfile = { ...profile, full_name: mergedFullName, organization: form.organization };

      if (userId === "default-sanou" || localStorage.getItem(`profile_${userId}`)) {
        localStorage.setItem(`profile_${userId}`, JSON.stringify(updatedProfile));
      } else {
        const { error } = await supabase.from("profiles").update({
          full_name: mergedFullName,
          organization: form.organization,
        }).eq("id", userId);
        if (error) throw error;
      }

      localStorage.setItem(`phone_user_${userId}`, form.phone);
      localStorage.setItem(`dept_user_${userId}`, form.department);
      localStorage.setItem(`info_user_${userId}`, form.info);
      localStorage.setItem(`website_user_${userId}`, form.website);
      
      localStorage.setItem(`fb_user_${userId}`, form.facebook);
      localStorage.setItem(`tw_user_${userId}`, form.twitter);
      localStorage.setItem(`li_user_${userId}`, form.linkedin);
      localStorage.setItem(`yt_user_${userId}`, form.youtube);

      localStorage.setItem(`profil_role_${userId}`, selectedProfil);
      localStorage.setItem(`tag_policy_${userId}`, tagPolicy);
      localStorage.setItem(`perms_user_${userId}`, JSON.stringify(permissions));
      localStorage.setItem(`gen_user_${userId}`, form.generation);
      localStorage.setItem(`budget_user_${userId}`, form.budgetCode);

      setProfile(updatedProfile);
      toast.success("Profil et préférences mis à jour avec succès");
      
      // Simulate Technical Onboarding console
      setActiveStep(5);
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!profile) return;
    const toastId = toast.loading(`${profile.is_active ? "Désactivation" : "Activation"} en cours...`);
    try {
      const updatedProfile = { ...profile, is_active: !profile.is_active };
      if (userId === "default-sanou" || localStorage.getItem(`profile_${userId}`)) {
        localStorage.setItem(`profile_${userId}`, JSON.stringify(updatedProfile));
      } else {
        const { error } = await supabase.from("profiles").update({ is_active: !profile.is_active }).eq("id", userId);
        if (error) throw error;
      }
      setProfile(updatedProfile);
      toast.success(`Utilisateur ${profile.is_active ? "désactivé" : "activé"}`, { id: toastId });
    } catch (e: any) {
      toast.error("Erreur", { description: e.message, id: toastId });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const generateAIBio = () => {
    setForm(prev => ({ ...prev, info: "Rédaction en cours par l'IA..." }));
    setTimeout(() => {
      setForm(prev => ({
        ...prev,
        info: `Ingénieur Cyberdéfense certifié chez ${prev.organization || 'Sonatel'}. Expert dans l'orchestration SOAR (Shuffle) et la gestion des incidents via TheHive/Wazuh. Responsable de la protection des infrastructures cloud et de l'administration du SOC.`
      }));
      toast.success("Biographie professionnelle générée par Djib'son IA !");
    }, 1200);
  };

  const getPasswordStrength = () => {
    if (!form.newPassword) return { score: 0, text: "Aucun", color: "bg-slate-200" };
    if (form.newPassword.length < 6) return { score: 1, text: "Faible", color: "bg-red-500 animate-pulse" };
    if (form.newPassword.length < 10) return { score: 2, text: "Moyen", color: "bg-amber-500" };
    return { score: 3, text: "Fort (Algorithme AES-256 validé)", color: "bg-emerald-500 shadow-sm" };
  };
  const strength = getPasswordStrength();

  // Audit triggers
  const triggerAIPrompt = (prompt: string) => {
    setChatMessages(prev => [...prev, { role: "user", text: prompt }]);
    setIsAITyping(true);
    setTimeout(() => {
      let reply = "Requête non reconnue par le noyau de diagnostic.";
      if (prompt.includes("permissions")) {
        reply = `[AUDIT DJIB'SON IA] : Analyse des privilèges pour ${form.prenom} ${form.nom}. Profil SOC sélectionné : ${selectedProfil}. Habilitations : Dispatching=${permissions.dispatching ? 'OUI' : 'NON'}, Expériences=${permissions.experiences ? 'OUI' : 'NON'}. Score de conformité : 100%. Aucun risque détecté.`;
      } else if (prompt.includes("rotation")) {
        reply = `[SCRIPT DE ROTATION API GENERATED] :\n# Automatique rotation script for ${form.email}\nimport requests\nresponse = requests.post('https://soc.sonatel.sn/api/v1/rotate-keys',\n  headers={'Authorization': 'Bearer MFA_SESSION_TOKEN'},\n  json={'user_id': '${userId}'})\nprint("Rotation statut :", response.json().get('status'))`;
      } else if (prompt.includes("MFA")) {
        reply = `[AUDIT MFA & SECURITE] : Score global : 98/100. MFA : Activé via SSO Sonatel. Cryptage de session : TLS 1.3. Force du mot de passe : Fort. Recommandation : Planifier une rotation de clé API dans 14 jours.`;
      }
      setChatMessages(prev => [...prev, { role: "ai", text: reply }]);
      setIsAITyping(false);
    }, 1000);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text }]);
    setIsAITyping(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: "ai", text: `[Djib'son IA] Audit de "${text}" : Analyse du compte ${profile?.full_name} effectuée. Aucun dépassement de privilèges n'a été détecté. Session sécurisée.` }]);
      setIsAITyping(false);
    }, 1000);
  };

  const renderInput = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    icon: React.ReactNode,
    type = "text",
    disabled = false
  ) => (
    <div className={`relative border-b border-slate-200 dark:border-zinc-800 focus-within:border-amber-500 py-2.5 transition-all duration-300 group ${disabled ? "opacity-60" : ""}`}>
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
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent border-none outline-none p-0 text-slate-800 dark:text-zinc-100 placeholder-slate-400 text-sm font-semibold mt-1 focus:ring-0 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );

  const activityTypeStyles: Record<string, string> = {
    login: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
    action: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
    security: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0b0c10] transition-colors duration-300 relative overflow-hidden">
      
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        
        {/* Header */}
        <div className="mb-8">
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" /> Retour à l'administration
          </Link>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-amber-500/20">
                <AvatarImage src={orangeLogo} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-amber-600 to-amber-800 dark:from-white dark:via-amber-500 dark:to-yellow-600 bg-clip-text text-transparent tracking-tight">
                  Cockpit de Modification 360°
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Agent ID : <span className="font-mono">{profile.id}</span> · Rôle system : <span className="font-bold text-amber-500 uppercase">{role}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={toggleActive} className="rounded-xl font-bold bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
                {profile.is_active ? <PowerOff className="h-4 w-4 mr-2 text-red-500" /> : <Power className="h-4 w-4 mr-2 text-emerald-500" />}
                {profile.is_active ? "Suspendre l'agent" : "Réactiver l'agent"}
              </Button>
            </div>
          </div>
        </div>

        {/* 5-Step Connected Progress Bar */}
        <div className="mb-10 bg-white/60 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-850 p-6 rounded-2xl shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-bold tracking-wider relative max-w-4xl mx-auto">
            
            {/* Steps connectors */}
            <div className="absolute top-5 left-[5%] right-[5%] h-0.5 bg-slate-200 dark:bg-zinc-800 -z-10" />
            <div 
              className="absolute top-5 left-[5%] h-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 -z-10 transition-all duration-500" 
              style={{ width: `${(activeStep - 1) * 22.5}%` }}
            />

            {[
              { num: 1, label: "Addresses" },
              { num: 2, label: "Données Facturation" },
              { num: 3, label: "Accès et Produits" },
              { num: 4, label: "Activité & Audit" },
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
                    <UserIcon className="h-5 w-5 text-amber-500" />
                    Modification d'identité & d'adresse
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Mettez à jour les coordonnées personnelles de l'agent. L'adresse e-mail n'est pas modifiable.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  <div className="grid gap-6 md:grid-cols-2">
                    {renderInput("PRENOM DE L'AGENT", form.prenom, (v) => setForm({...form, prenom: v}), "Prenom", <UserIcon className="h-4 w-4" />)}
                    {renderInput("NOM DE L'AGENT", form.nom, (v) => setForm({...form, nom: v}), "Nom", <UserIcon className="h-4 w-4" />)}
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    {renderInput("EMAIL PROFESSIONNEL (Lecture seule)", form.email, () => {}, "email@sonatel.sn", <Mail className="h-4 w-4" />, "email", true)}
                    {renderInput("CONTACT TÉLÉPHONIQUE", form.phone, (v) => setForm({...form, phone: v}), "+221 77 123 45 67", <Phone className="h-4 w-4" />, "tel")}
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    {renderInput("ORGANISATION / DIVISION", form.organization, (v) => setForm({...form, organization: v}), "Sonatel", <Building className="h-4 w-4" />)}
                    {renderInput("SITE INTERNET DE LA DIVISION", form.website, (v) => setForm({...form, website: v}), "https://sonatel.sn", <Globe className="h-4 w-4" />, "url")}
                  </div>

                  <Separator className="border-slate-100 dark:border-zinc-800" />

                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Bureau physique & Implantation
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        {renderInput("Adresse physique du bureau", form.department, (v) => setForm({...form, department: v}), "Technopole, Dakar", <Globe className="h-4 w-4" />)}
                      </div>
                      <div>
                        {renderInput("Code Division Bureau", form.department.split("/")[0] || "SNT", () => {}, "SNT", <Sliders className="h-4 w-4" />, "text", true)}
                      </div>
                    </div>
                  </div>

                  <div className="relative pt-2">
                    <Info className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <div className="absolute right-3 top-3.5 z-10">
                      <button
                        type="button"
                        onClick={generateAIBio}
                        className="text-[10px] text-amber-500 font-bold hover:underline flex items-center gap-1 cursor-pointer bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20"
                      >
                        <Sparkles className="h-3 w-3 animate-pulse" /> Rédiger bio par IA
                      </button>
                    </div>
                    <textarea 
                      value={form.info}
                      onChange={(e) => setForm({...form, info: e.target.value})}
                      placeholder="Biographie commerciale administrative complémentaire..."
                      className="min-h-[90px] w-full pl-10 pr-32 border border-slate-200 dark:border-zinc-800 rounded-xl focus:border-amber-500 transition-colors bg-transparent text-sm p-3 focus:ring-0 focus:outline-none resize-none font-semibold leading-relaxed"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Division & Security Credentials */}
            {activeStep === 2 && (
              <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl overflow-hidden animate-in fade-in duration-300">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-yellow-400" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-3 font-bold dark:text-zinc-100">
                    <Key className="h-5 w-5 text-amber-500" />
                    Codes division, Generation & Sécurité
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Mettez à jour les codes budgétaires et le mot de passe d'authentification de l'agent.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Generation select */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Version applicative (Génération)</Label>
                      <Select value={form.generation} onValueChange={(v) => setForm({...form, generation: v})}>
                        <SelectTrigger className="w-full bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850">
                          <SelectItem value="v1" className="text-xs font-semibold">Génération 1 (Legacy Console)</SelectItem>
                          <SelectItem value="v2" className="text-xs font-semibold">Génération 2 (Premium High-Tech Engine)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Department budget code */}
                    {renderInput("Code Division Budgétaire", form.budgetCode, (v) => setForm({...form, budgetCode: v}), "DEPT-CYBER-OBS", <Sliders className="h-4 w-4" />)}
                  </div>

                  <Separator className="border-slate-100 dark:border-zinc-800" />

                  {/* Password modifier */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Lock className="h-4 w-4" /> Changement du mot de passe d'agent
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {renderInput("Ancien mot de passe", form.oldPassword, (v) => setForm({...form, oldPassword: v}), "••••••••••••", <Lock className="h-4 w-4" />, "password")}
                      
                      {/* Password strength */}
                      <div className="space-y-1.5">
                        {renderInput("Nouveau mot de passe", form.newPassword, (v) => setForm({...form, newPassword: v}), "••••••••••••", <KeyRound className="h-4 w-4" />, "password")}
                        {form.newPassword && (
                          <div className="px-1.5">
                            <div className="flex justify-between text-[9px] mb-1 font-bold uppercase tracking-wider">
                              <span className="text-slate-400">Complexité</span>
                              <span className={strength.score === 3 ? "text-emerald-500 animate-pulse" : strength.score === 2 ? "text-amber-500" : "text-red-500"}>
                                {strength.text}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full ${strength.color} rounded-full transition-all duration-300`} style={{ width: strength.score === 3 ? "100%" : strength.score === 2 ? "60%" : "30%" }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator className="border-slate-100 dark:border-zinc-800" />

                  {/* Social Networks */}
                  <div className="space-y-4">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comptes & Réseaux Sociaux</Label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {renderInput("Profil Linkedin", form.linkedin, (v) => setForm({...form, linkedin: v}), "https://linkedin.com/in/sanou-gueye", <Linkedin className="h-4 w-4 text-blue-700" />)}
                      {renderInput("Profil Twitter / X", form.twitter, (v) => setForm({...form, twitter: v}), "@sanou_cyber", <Twitter className="h-4 w-4 text-sky-500" />)}
                      {renderInput("Profil Facebook", form.facebook, (v) => setForm({...form, facebook: v}), "Sanou Gueye", <Facebook className="h-4 w-4 text-blue-600" />)}
                      {renderInput("Profil Youtube", form.youtube, (v) => setForm({...form, youtube: v}), "Cyber Sanou", <Youtube className="h-4 w-4 text-red-600" />)}
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
                    <Shield className="h-5 w-5 text-amber-500" />
                    Profil d'accès, Politique de Taggage & Permissions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configurez le rôle de surveillance cyber, la politique d'étiquetage et les permissions applicatives.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">

                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rôle opérationnel (Profil)</Label>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {ROLES_LIST.map((r) => (
                        <div
                          key={r.value}
                          onClick={() => setSelectedProfil(r.value)}
                          className={`cursor-pointer rounded-2xl p-4 border transition-all duration-300 flex flex-col justify-between ${
                            selectedProfil === r.value
                              ? "bg-amber-500/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                              : "border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20 hover:border-slate-350 hover:bg-slate-50 dark:hover:bg-zinc-900/40"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black">{r.label}</span>
                            {selectedProfil === r.value && (
                              <span className="p-1 bg-amber-500 text-white rounded-full">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-snug">
                            {r.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="border-slate-100 dark:border-zinc-800" />

                  {/* Who can tag you */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Politique d'étiquetage collaboratif (Tagging Policy)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: "group", label: "Membres du groupe uniquement", desc: "Brider l'étiquetage aux analystes affectés" },
                        { id: "everyone", label: "Tout le monde", desc: "Permettre l'étiquetage global sur le réseau" }
                      ].map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setTagPolicy(t.id)}
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

                  <Separator className="border-slate-100 dark:border-zinc-800" />

                  {/* Permissions */}
                  <div className="space-y-4">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Permissions cyber-défense granulaires</Label>
                    <div className="grid gap-3">
                      {[
                        { key: "dispatching" as const, label: "Autoriser le Dispatching d'alertes", desc: "Autorise la réaffectation et l'attribution des alertes de sécurité" },
                        { key: "experiences" as const, label: "Afficher le journal d'expériences", desc: "Affiche l'historique d'apprentissage de l'intelligence artificielle de l'agent" },
                        { key: "followers" as const, label: "Afficher les followers de dossiers", desc: "Affiche la liste des observateurs abonnés aux incidents cyber" },
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

                </CardContent>
              </Card>
            )}

            {/* Step 4: Activité & Security Audit */}
            {activeStep === 4 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                
                {/* Djib'son IA Auditor Panel */}
                <Card className="bg-slate-950 text-slate-100 border border-zinc-800 shadow-xl rounded-2xl overflow-hidden font-mono flex flex-col h-[400px]">
                  {/* Header */}
                  <div className="p-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-900">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-emerald-400 font-extrabold text-xs uppercase tracking-wider">CONSEILLER DE SÉCURITÉ DJIB'SON IA</span>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">ACTIF</Badge>
                  </div>
                  
                  {/* Message logs */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-zinc-950">
                    {chatMessages.map((m, idx) => (
                      <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <span className={`text-[8px] uppercase mb-1 font-bold tracking-widest ${m.role === 'user' ? 'text-blue-400' : 'text-emerald-400'}`}>
                          {m.role === 'user' ? '[UTILISATEUR]' : '[DJIB\'SON IA]'}
                        </span>
                        <div className={`p-3 rounded-xl text-[11px] max-w-[85%] leading-relaxed whitespace-pre-wrap ${
                          m.role === 'user'
                            ? 'bg-blue-950/40 text-blue-200 border border-blue-500/20'
                            : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
                        }`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {isAITyping && (
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/60 p-2 font-bold animate-pulse">
                        <span>[DJIB'SON IA EN TRAIN D'ANALYSER LE PROFIL...]</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Audit queries */}
                  <div className="p-3 bg-zinc-900 border-t border-zinc-850 flex flex-wrap gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => triggerAIPrompt("Auditer les permissions de ce profil")}
                      className="text-[9px] px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer font-bold"
                    >
                      🔍 Audit de permissions
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerAIPrompt("Générer script de rotation de clé API")}
                      className="text-[9px] px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer font-bold"
                    >
                      🔑 Script de clé API
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerAIPrompt("Évaluer score de sécurité MFA")}
                      className="text-[9px] px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer font-bold"
                    >
                      🛡️ Score Sécurité MFA
                    </button>
                  </div>
                  
                  {/* Chat sender */}
                  <form onSubmit={handleChatSubmit} className="p-4 bg-zinc-900 border-t border-zinc-850 flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Poser une question d'audit à l'IA..."
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black px-4 py-2 rounded text-xs transition-colors shrink-0"
                    >
                      AUDITER
                    </button>
                  </form>
                </Card>

                {/* Audit Logs events */}
                <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                        <Activity className="h-4 w-4 text-amber-500" /> Historique d'Audit & Connexions
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Dernières connexions et actions administratives de l'agent.</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-lg font-bold text-xs"
                      onClick={() => {
                        const content = activity.map(a => `[${a.date}] [${a.type.toUpperCase()}] ${a.message} (IP: ${a.ip})`).join("\n");
                        const blob = new Blob([content], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `audit_${profile.full_name?.replace(/\s+/g, "_") || userId}.txt`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        toast.success("Journal d'audit exporté");
                      }}
                    >
                      <Download className="h-4.5 w-4.5 mr-1.5 text-amber-500" /> Exporter le Log
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {activity.map((ev, i) => (
                      <div key={i} className="flex items-start gap-4 p-3 rounded-xl bg-slate-50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-850 hover:bg-slate-50 transition-colors">
                        <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${activityTypeStyles[ev.type] || "bg-muted text-muted-foreground"}`}>
                          {ev.type}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">{ev.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">{ev.date} · Adresse IP : <span className="font-mono">{ev.ip}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

              </div>
            )}

            {/* Step 5: Validation */}
            {activeStep === 5 && (
              <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl overflow-hidden animate-in fade-in duration-300">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-emerald-500 animate-pulse" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-3 font-bold dark:text-zinc-100">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    Validation de la configuration agent
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Examinez les préférences de l'agent avant de valider l'enregistrement.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  
                  {/* Glassmorphic recap widgets */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    
                    <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-100 dark:border-zinc-850 space-y-2 flex gap-3 items-start">
                      <Avatar className="h-12 w-12 border-2 border-white dark:border-zinc-900 shadow">
                        <AvatarImage src={orangeLogo} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{getInitials(profile.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Identité Agent</div>
                        <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">{form.prenom} {form.nom}</div>
                        <div className="text-xs text-muted-foreground">{form.email}</div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-100 dark:border-zinc-850 space-y-2">
                      <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-amber-500" /> Bureau & Division
                      </div>
                      <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">{form.organization}</div>
                      <div className="text-xs text-muted-foreground">Département : {form.department}</div>
                      <div className="text-xs text-muted-foreground">Url : {form.website || "—"}</div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-100 dark:border-zinc-850 space-y-2">
                      <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                        <Sliders className="h-3.5 w-3.5 text-amber-500" /> Rôle, Version & Division
                      </div>
                      <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">
                        Profil : <span className="uppercase text-amber-600 dark:text-amber-500">{selectedProfil}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Génération : {form.generation}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">Code Division : {form.budgetCode}</div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-100 dark:border-zinc-850 space-y-2">
                      <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-amber-500" /> Habilitations de sécurité
                      </div>
                      <div className="text-xs text-slate-800 dark:text-zinc-200 font-extrabold">
                        Statut opérationnel : <span className={profile.is_active ? "text-emerald-500" : "text-red-500"}>{profile.is_active ? "Actif" : "Suspendu"}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-tight space-y-0.5 mt-1">
                        <div>• Dispatching : {permissions.dispatching ? "Activé" : "Désactivé"}</div>
                        <div>• Partage Expériences : {permissions.experiences ? "Activé" : "Désactivé"}</div>
                        <div>• Followers dossiers : {permissions.followers ? "Activé" : "Désactivé"}</div>
                      </div>
                    </div>

                  </div>

                  {/* High-tech security actions panel */}
                  <div className="p-5 bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-slate-100 dark:border-zinc-850 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-amber-500" /> Actions de Sécurité Administratives
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-amber-500 gap-1.5 h-10" 
                        onClick={() => {
                          toast.success("OTP envoyé", { description: `Un e-mail d'authentification OTP temporaire a été émis pour ${profile.email}.` });
                        }}
                      >
                        <RotateCcw className="h-4 w-4 text-amber-500" />
                        Réinitialiser mot de passe
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-amber-500 gap-1.5 h-10" 
                        onClick={() => {
                          toast.success("Clé API régénérée", { description: "L'ancienne signature d'accès a été invalidée." });
                        }}
                      >
                        <KeyRound className="h-4 w-4 text-amber-500" />
                        Rotation clé API
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-amber-500 gap-1.5 h-10 text-red-500" 
                        onClick={() => {
                          toast.success("Sessions révoquées", { description: "Toutes les sessions de l'agent ont été déconnectées." });
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        Révoquer sessions actives
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-xs text-slate-800 dark:text-zinc-350 leading-relaxed flex gap-3">
                    <Info className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p>
                      En cliquant sur « Enregistrer les modifications », le profil et toutes les permissions associées seront mis à jour instantanément dans la base de données.
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
                  onClick={() => setActiveStep(prev => prev - 1)}
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
                  onClick={() => setActiveStep(prev => prev + 1)}
                  className="rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white ml-auto"
                >
                  Suivant
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl font-extrabold bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl ml-auto gap-2"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer les modifications
                </Button>
              )}
            </div>

          </div>

          {/* Right Column: Mini Cover Card Preview */}
          <div className="space-y-6">
            
            <Card className="overflow-hidden bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl relative">
              <div className={`h-32 ${BANNERS[bannerIndex]} relative transition-all duration-500`}>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvc3ZnPg==')] opacity-40" />
                <button
                  type="button"
                  onClick={() => setBannerIndex((bannerIndex + 1) % BANNERS.length)}
                  className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 text-xs transition-colors flex items-center gap-1 cursor-pointer font-sans"
                  title="Changer la bannière"
                >
                  <Palette className="h-3 w-3" />
                  <span className="text-[9px] font-bold">Thème</span>
                </button>
              </div>
              <div className="px-6 pb-6 -mt-12 text-center relative z-10">
                <div className="relative inline-block">
                  <Avatar className="h-24 w-24 border-4 border-white dark:border-zinc-900 shadow-xl">
                    <AvatarImage src={orangeLogo} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-black">{getInitials(profile.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white dark:border-zinc-900 ${profile.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                </div>
                <h2 className="mt-3 text-lg font-black tracking-tight text-slate-800 dark:text-zinc-100">
                  {form.prenom || form.nom ? `${form.prenom} ${form.nom}` : profile.full_name || "Utilisateur"}
                </h2>
                <p className="text-xs text-muted-foreground/80 font-bold">{form.organization || "Sonatel SOC"}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">
                  <Users className="h-3.5 w-3.5" />
                  Profil : {selectedProfil}
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80 shadow-xl rounded-2xl">
              <h3 className="text-xs font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-500" /> Sécurité d'Accès de l'Agent
              </h3>
              <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <div className="flex justify-between">
                  <span>Authentification :</span>
                  <span className="text-amber-500">Double Facteur (OTP)</span>
                </div>
                <div className="flex justify-between">
                  <span>Version Moteur :</span>
                  <span className="text-amber-500">Génération {form.generation}</span>
                </div>
                <div className="flex justify-between">
                  <span>Division :</span>
                  <span className="text-amber-500 font-mono text-[10px]">{form.budgetCode}</span>
                </div>
              </div>
            </Card>

          </div>

        </div>
      </div>
    </div>
  );
}
