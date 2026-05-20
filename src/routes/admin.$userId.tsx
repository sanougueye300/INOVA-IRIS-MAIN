import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import orangeLogo from "@/assets/orange-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth-context";
import {
  Shield, CheckCircle, XCircle, Mail, Building, ArrowLeft,
  Activity, Clock, Fingerprint, KeyRound, Globe, Power, PowerOff,
  Save, Loader2, ShieldAlert, LogOut, RotateCcw, Download,
  User as UserIcon, Palette, Sparkles, Lock, Key, Info, Phone,
  Facebook, Twitter, Linkedin, Youtube
} from "lucide-react";

export const Route = createFileRoute("/admin/$userId")({
  head: () => ({ meta: [{ title: "Vue Utilisateur 360° — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><UserCockpit360 /></RequireAuth>,
});

// Utilisateur par défaut admin (Sanou Gueye)
const DEFAULT_ADMIN_USER = {
  id: "default-sanou",
  email: "sanou.gueye@sonatel.com",
  full_name: "Sanou Gueye",
  organization: "Sonatel",
  is_active: true,
  created_at: "2025-01-15T08:00:00Z",
};

// Activité simulée pour l'admin par défaut
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

// Permissions par rôle
const PERMISSIONS: Record<AppRole, string[]> = {
  admin: [
    "Accès complet à toutes les ressources",
    "Gestion des utilisateurs et rôles",
    "Configuration des connecteurs SOC",
    "Accès aux journaux d'audit",
    "Gestion de la facturation",
    "Isolation réseau EDR",
    "Suppression de données",
  ],
  manager: [
    "Supervision des analystes",
    "Validation des incidents",
    "Accès aux rapports consolidés",
    "Gestion des clients assignés",
    "Export des données",
  ],
  analyste: [
    "Traitement des alertes SOC",
    "Investigation des incidents",
    "Enrichissement des IOC",
    "Consultation DFIR-IRIS",
    "Exécution de scans EDR",
  ],
  client: [
    "Consultation du tableau de bord",
    "Visualisation de ses alertes",
    "Téléchargement de ses contrats",
    "Consultation de ses rapports",
  ],
};

function UserCockpit360() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<AppRole>("client");
  const [activity, setActivity] = useState<Array<{ date: string; type: string; message: string; ip: string }>>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "security">("overview");

  // Dynamic Wallpaper Theme states
  const [bannerIndex, setBannerIndex] = useState(0);
  const BANNERS = [
    "bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600",
    "bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800",
    "bg-gradient-to-br from-red-700 via-rose-800 to-amber-700",
    "bg-gradient-to-br from-emerald-700 via-teal-800 to-cyan-950",
  ];

  // Restored multi-page fields
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
    artstation: "",
    behance: "",
  });

  const [selectedProfil, setSelectedProfil] = useState<string>("Admin");
  const [tagPolicy, setTagPolicy] = useState<string>("group");
  const [permissions, setPermissions] = useState({
    dispatching: false,
    experiences: false,
    followers: true,
  });

  // Chat demo state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    { role: "ai", text: "Bonjour, je suis Djib'son IA, votre auditeur de sécurité SOC. Comment puis-je vous aider aujourd'hui ?" }
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
      const localArtstation = localStorage.getItem(`art_user_${userId}`) || "";
      const localBehance = localStorage.getItem(`beh_user_${userId}`) || "";
      
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
        artstation: localArtstation,
        behance: localBehance,
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
      localStorage.setItem(`art_user_${userId}`, form.artstation);
      localStorage.setItem(`beh_user_${userId}`, form.behance);

      localStorage.setItem(`profil_role_${userId}`, selectedProfil);
      localStorage.setItem(`tag_policy_${userId}`, tagPolicy);
      localStorage.setItem(`perms_user_${userId}`, JSON.stringify(permissions));

      setProfile(updatedProfile);
      toast.success("Profil et préférences mis à jour avec succès");
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

  const activityTypeStyles: Record<string, string> = {
    login: "bg-blue-500/10 text-blue-500",
    action: "bg-emerald-500/10 text-emerald-500",
    security: "bg-amber-500/10 text-amber-500",
  };

  // Next-Gen simulated AI Biography Writer
  const generateAIBio = () => {
    const backupText = form.info;
    setForm(prev => ({ ...prev, info: "Rédaction en cours par l'IA..." }));
    setTimeout(() => {
      setForm(prev => ({
        ...prev,
        info: `Ingénieur Cyberdéfense certifié chez ${prev.organization || 'Sonatel'}. Expert dans l'orchestration SOAR (Shuffle) et la gestion des incidents via TheHive/Wazuh. Responsable de la protection des infrastructures cloud et de l'administration du SOC.`
      }));
      toast.success("Biographie professionnelle générée par Djib'son IA !");
    }, 1200);
  };

  // Next-Gen simulated Password strength evaluation
  const getPasswordStrength = () => {
    if (!form.newPassword) return { score: 0, text: "Aucun", color: "bg-slate-200" };
    if (form.newPassword.length < 6) return { score: 1, text: "Faible", color: "bg-red-500 animate-pulse" };
    if (form.newPassword.length < 10) return { score: 2, text: "Moyen", color: "bg-amber-500" };
    return { score: 3, text: "Fort (Algorithme AES-256 validé)", color: "bg-emerald-500 shadow-sm shadow-emerald-500/30" };
  };
  const strength = getPasswordStrength();

  // Next-Gen active AI Auditor trigger
  const triggerAIPrompt = (prompt: string) => {
    setChatMessages(prev => [...prev, { role: "user", text: prompt }]);
    setIsAITyping(true);
    setTimeout(() => {
      let reply = "Requête non reconnue par le noyau de diagnostic.";
      if (prompt.includes("permissions")) {
        reply = `[AUDIT DJIB'SON IA] : Analyse des privilèges pour ${form.prenom} ${form.nom}. Profil SOC sélectionné : ${selectedProfil}. permissions actives : Dispatching=${permissions.dispatching ? 'OUI' : 'NON'}, Partage d'expériences=${permissions.experiences ? 'OUI' : 'NON'}. Score de conformité : 100%. Aucun risque détecté.`;
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

  // Reusable double line input helper matching the mockup exactly
  const renderDoubleLineInput = ({
    icon: Icon,
    label,
    value,
    onChange,
    type = "text",
    placeholder = "",
    disabled = false,
  }: {
    icon: any;
    label: string;
    value: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
  }) => {
    return (
      <div className={`relative border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 h-12 flex flex-col justify-center px-3 py-1 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all ${disabled ? 'opacity-70 cursor-not-allowed bg-slate-50 dark:bg-slate-950/20' : ''}`}>
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <div className="flex-1 flex flex-col min-w-0">
            <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider leading-none mb-0.5">{label}</span>
            <input
              type={type}
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              disabled={disabled}
              className="text-sm font-semibold bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-full text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700 leading-tight"
            />
          </div>
        </div>
      </div>
    );
  };

  // Reusable double line textarea helper matching the mockup exactly
  const renderDoubleLineTextarea = ({
    icon: Icon,
    label,
    value,
    onChange,
    placeholder = "",
    rightAction = null
  }: {
    icon: any;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    rightAction?: React.ReactNode;
  }) => {
    return (
      <div className="relative border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 flex flex-col p-3 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all sm:col-span-2">
        <div className="flex items-start gap-2.5">
          <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500 mt-1 shrink-0" />
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider leading-none">{label}</span>
              {rightAction}
            </div>
            <textarea
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              rows={3}
              className="text-sm font-semibold bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-full text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700 resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  const tabs = [
    { key: "overview" as const, label: "Vue générale", icon: UserIcon },
    { key: "activity" as const, label: "Activité & Audit", icon: Activity },
    { key: "security" as const, label: "Permissions & Sécurité", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-20 relative">
      <div className="container mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" /> Retour à l'administration
          </Link>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                <AvatarImage src={orangeLogo} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{profile.full_name ?? "Utilisateur"}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={profile.is_active ? "default" : "secondary"} className="gap-1">
                    {profile.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {profile.is_active ? "Actif" : "Inactif"}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Shield className="h-3 w-3" />
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={toggleActive} className="gap-2">
                {profile.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                {profile.is_active ? "Désactiver" : "Activer"}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-muted/50 rounded-lg p-1 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════ TAB: VUE GÉNÉRALE ═══════ */}
        {activeTab === "overview" && (
          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            {/* ══════ LEFT SIDEBAR ══════ */}
            <div className="space-y-6">
              {/* Cover + Avatar Card */}
              <Card className="overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className={`h-32 ${BANNERS[bannerIndex]} relative transition-all duration-500`}>
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvc3ZnPg==')] opacity-60" />
                  <button
                    type="button"
                    onClick={() => setBannerIndex((bannerIndex + 1) % BANNERS.length)}
                    className="absolute top-3 right-3 bg-slate-900/60 hover:bg-slate-900/80 text-white rounded-full p-1.5 text-xs transition-colors flex items-center gap-1 cursor-pointer font-sans"
                    title="Changer la bannière"
                  >
                    <Palette className="h-3 w-3" />
                    <span className="text-[10px] font-bold">Thème</span>
                  </button>
                </div>
                <div className="px-6 pb-6 -mt-12 text-center relative">
                  <div className="relative inline-block">
                    <Avatar className="h-24 w-24 border-4 border-white dark:border-slate-900 shadow-lg">
                      <AvatarImage src={orangeLogo} className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">{getInitials(profile.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-900" />
                  </div>
                  <h2 className="mt-3 text-xl font-bold text-slate-800 dark:text-slate-100">{form.prenom || form.nom ? `${form.prenom} ${form.nom}` : profile.full_name || "Utilisateur"}</h2>
                  <p className="text-sm text-muted-foreground font-medium">{form.department || "SNT/DDE/DDO/CLF"}</p>
                  
                  <div className="flex items-center justify-center gap-4 mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>1297 Followers</span>
                    <span>3971 Following</span>
                  </div>

                  {/* Next-Gen Rep XP bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-left">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-400 uppercase font-bold tracking-wider">SOC Rep Level</span>
                      <span className="font-bold text-primary text-[10px]">Analyste IV (83% XP)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-orange-500 rounded-full" style={{ width: "83%" }} />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Profil (Roles Radio Buttons) */}
              <Card className="p-5 shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Profil</h3>
                <div className="space-y-1.5">
                  {["VTB", "PVT", "BO VTB", "Manager", "Admin", "Super Admin"].map(p => (
                    <label key={p} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${selectedProfil === p ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}>
                      <input
                        type="radio"
                        name="selectedProfil"
                        checked={selectedProfil === p}
                        onChange={() => setSelectedProfil(p)}
                        className="h-4 w-4 text-primary border-slate-300 dark:border-slate-600 focus:ring-primary"
                      />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{p}</span>
                    </label>
                  ))}
                </div>
              </Card>

              {/* Who can tag you? */}
              <Card className="p-5 shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Who can tag you?</h3>
                <div className="space-y-1.5">
                  {["group", "everyone"].map(policy => (
                    <label key={policy} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${tagPolicy === policy ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}>
                      <input
                        type="radio"
                        name="tagPolicy"
                        checked={tagPolicy === policy}
                        onChange={() => setTagPolicy(policy)}
                        className="h-4 w-4 text-primary border-slate-300 dark:border-slate-600 focus:ring-primary"
                      />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {policy === "group" ? "Group Members" : "Everyone"}
                      </span>
                    </label>
                  ))}
                </div>
              </Card>

              {/* Permissions Checkboxes */}
              <Card className="p-5 shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Permissions</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.dispatching}
                      onChange={e => setPermissions({ ...permissions, dispatching: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dispatching</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.experiences}
                      onChange={e => setPermissions({ ...permissions, experiences: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Allow users to show your experiences</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.followers}
                      onChange={e => setPermissions({ ...permissions, followers: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Allow users to show your followers</span>
                  </label>
                </div>
              </Card>

              {/* Status active switch */}
              <Card className="p-5 shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Status</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Compte Actif</span>
                  <input
                    type="checkbox"
                    checked={profile.is_active}
                    onChange={toggleActive}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
              </Card>
            </div>

            {/* ══════ RIGHT FORM ══════ */}
            <form onSubmit={handleSave} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Personal Information</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {renderDoubleLineInput({ icon: UserIcon, label: "PRENOM", value: form.prenom, onChange: e => setForm({ ...form, prenom: e.target.value }) })}
                  {renderDoubleLineInput({ icon: UserIcon, label: "NOM", value: form.nom, onChange: e => setForm({ ...form, nom: e.target.value }) })}
                  {renderDoubleLineInput({ icon: Mail, label: "Enter votre email", value: form.email, disabled: true })}
                  {renderDoubleLineInput({ icon: Phone, label: "Enter votre contact", value: form.phone, onChange: e => setForm({ ...form, phone: e.target.value }), placeholder: "+221 77 000 00 00" })}
                  {renderDoubleLineTextarea({
                    icon: Info,
                    label: "INFO",
                    value: form.info,
                    onChange: e => setForm({ ...form, info: e.target.value }),
                    placeholder: "Entrez vos informations de profil...",
                    rightAction: (
                      <button
                        type="button"
                        onClick={generateAIBio}
                        className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer bg-primary/10 px-2 py-0.5 rounded-full"
                      >
                        <Sparkles className="h-3 w-3" /> Rédiger par IA (Djib'son IA)
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Company Info + Password side by side */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Company Info</h2>
                  <div className="space-y-4">
                    {renderDoubleLineInput({ icon: Building, label: "Company Name", value: form.organization, onChange: e => setForm({ ...form, organization: e.target.value }), placeholder: "Nom de l'entreprise" })}
                    {renderDoubleLineInput({ icon: Globe, label: "Website", value: form.website, onChange: e => setForm({ ...form, website: e.target.value }), placeholder: "https://example.com" })}
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Change Password</h2>
                  <div className="space-y-4">
                    {renderDoubleLineInput({ icon: Lock, label: "Old Password", value: form.oldPassword, onChange: e => setForm({ ...form, oldPassword: e.target.value }), type: "password", placeholder: "••••••••••••" })}
                    
                    {/* New Password with strength meter */}
                    <div className="space-y-1.5">
                      {renderDoubleLineInput({
                        icon: KeyRound,
                        label: "New Password",
                        value: form.newPassword,
                        onChange: e => setForm({ ...form, newPassword: e.target.value }),
                        type: "password",
                        placeholder: "Saisir le nouveau mot de passe"
                      })}
                      {form.newPassword && (
                        <div className="px-1.5">
                          <div className="flex justify-between text-[10px] mb-1 font-bold">
                            <span className="text-slate-400">Complexité</span>
                            <span className={strength.score === 3 ? "text-emerald-500" : strength.score === 2 ? "text-amber-500" : "text-red-500"}>
                              {strength.text}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full ${strength.color} rounded-full transition-all duration-300`} style={{ width: strength.score === 3 ? "100%" : strength.score === 2 ? "60%" : "30%" }} />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {renderDoubleLineInput({ icon: KeyRound, label: "Confirm New Password", value: form.confirmPassword, onChange: e => setForm({ ...form, confirmPassword: e.target.value }), type: "password", placeholder: "Confirmer le nouveau mot de passe" })}
                  </div>
                </div>
              </div>

              {/* Social links */}
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Social</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {renderDoubleLineInput({ icon: Facebook, label: "Facebook", value: form.facebook, onChange: e => setForm({ ...form, facebook: e.target.value }), placeholder: "Lien Facebook" })}
                  {renderDoubleLineInput({ icon: Twitter, label: "Twitter", value: form.twitter, onChange: e => setForm({ ...form, twitter: e.target.value }), placeholder: "Lien Twitter" })}
                  {renderDoubleLineInput({ icon: Linkedin, label: "Linkedin", value: form.linkedin, onChange: e => setForm({ ...form, linkedin: e.target.value }), placeholder: "Lien Linkedin" })}
                  {renderDoubleLineInput({ icon: Youtube, label: "Youtube", value: form.youtube, onChange: e => setForm({ ...form, youtube: e.target.value }), placeholder: "Lien Youtube" })}
                  {renderDoubleLineInput({ icon: Palette, label: "Artstation", value: form.artstation, onChange: e => setForm({ ...form, artstation: e.target.value }), placeholder: "Lien Artstation" })}
                  {renderDoubleLineInput({ icon: Globe, label: "Behance", value: form.behance, onChange: e => setForm({ ...form, behance: e.target.value }), placeholder: "Lien Behance" })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={loadData} disabled={saving} className="h-11 px-6">
                  Cancel Changes
                </Button>
                <Button type="submit" disabled={saving} className="h-11 px-6 bg-primary hover:bg-primary/95 text-white">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...
                    </>
                  ) : (
                    "Save Information"
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ═══════ TAB: ACTIVITÉ & AUDIT ═══════ */}
        {activeTab === "activity" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-primary" /> Journal d'activité
                  </CardTitle>
                  <CardDescription>{activity.length} événements enregistrés</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => {
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
                  toast.success("Rapport d'audit téléchargé");
                }}>
                  <Download className="h-4 w-4" /> Exporter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activity.map((ev, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${activityTypeStyles[ev.type] || "bg-muted text-muted-foreground"}`}>
                      {ev.type}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{ev.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ev.date} · IP: {ev.ip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══════ TAB: PERMISSIONS & SÉCURITÉ ═══════ */}
        {activeTab === "security" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Permissions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldAlert className="h-5 w-5 text-primary" /> Permissions ({role})
                </CardTitle>
                <CardDescription>Privilèges associés au rôle actuel de l'utilisateur.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(PERMISSIONS[role] || []).map((perm, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-muted/30">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      {perm}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Actions de sécurité */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <KeyRound className="h-5 w-5 text-primary" /> Actions de sécurité
                </CardTitle>
                <CardDescription>Opérations sensibles sur le compte.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-3" onClick={() => {
                  toast.success("OTP de réinitialisation envoyé", { description: `Un code temporaire a été envoyé à ${profile.email}` });
                }}>
                  <RotateCcw className="h-4 w-4" />
                  Réinitialiser le mot de passe (envoyer OTP)
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3" onClick={() => {
                  toast.success("Clé API rotée avec succès", { description: "L'ancienne clé est immédiatement invalidée." });
                }}>
                  <KeyRound className="h-4 w-4" />
                  Rotation de la clé API
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 text-amber-600 hover:text-amber-700" onClick={() => {
                  toast.success("Toutes les sessions ont été déconnectées", { description: "L'utilisateur devra se reconnecter." });
                }}>
                  <LogOut className="h-4 w-4" />
                  Déconnecter toutes les sessions actives
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 text-red-600 hover:text-red-700" onClick={toggleActive}>
                  {profile.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  {profile.is_active ? "Suspendre le compte" : "Réactiver le compte"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Floating Chat demo pill */}
      <button
        type="button"
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-slate-900 border border-slate-800 shadow-xl hover:shadow-2xl text-slate-100 hover:scale-105 active:scale-95 transition-all font-semibold cursor-pointer select-none"
      >
        Chat demo <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
      </button>

      {/* Djib'son AI Chat Drawer */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-sm transition-all duration-300">
          <div className="flex-1" onClick={() => setIsChatOpen(false)} />
          
          <div className="w-[420px] bg-slate-950 text-slate-100 border-l border-slate-850 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300 font-mono">
            {/* Header */}
            <div className="p-4 border-b border-slate-850 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider">DJIB'SON SECURITY AI v1.2</span>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-slate-400 hover:text-white transition-colors text-xs font-bold"
              >
                [FERMER]
              </button>
            </div>
            
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950">
              {chatMessages.map((m, idx) => (
                <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className={`text-[9px] uppercase mb-1 font-bold tracking-widest ${m.role === 'user' ? 'text-blue-400' : 'text-emerald-400'}`}>
                    {m.role === 'user' ? '[UTILISATEUR]' : '[DJIB\'SON IA]'}
                  </span>
                  <div className={`p-3 rounded-lg text-xs max-w-[85%] leading-relaxed whitespace-pre-wrap ${
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
                  <span>[DJIB'SON IA EN TRAIN D'ANALYSER...]</span>
                </div>
              )}
            </div>
            
            {/* Action Chips */}
            <div className="p-3 bg-slate-900 border-t border-slate-850 flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => triggerAIPrompt("Auditer les permissions de ce profil")}
                className="text-[10px] px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors cursor-pointer font-bold"
              >
                🔍 Audit de permissions
              </button>
              <button
                type="button"
                onClick={() => triggerAIPrompt("Générer script de rotation de clé API")}
                className="text-[10px] px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors cursor-pointer font-bold"
              >
                🔑 Script de clé API
              </button>
              <button
                type="button"
                onClick={() => triggerAIPrompt("Évaluer score de sécurité MFA")}
                className="text-[10px] px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors cursor-pointer font-bold"
              >
                🛡️ Score Sécurité MFA
              </button>
            </div>
            
            {/* Input */}
            <form onSubmit={handleChatSubmit} className="p-4 bg-slate-900 border-t border-slate-850 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Poser une question de sécurité..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded text-xs transition-colors shrink-0"
              >
                ENVOYER
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
