import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import orangeLogo from "@/assets/orange-logo.png";
import { User, Mail, Phone, Building, Globe, Shield, Loader2, ArrowLeft, Camera, Info, Lock, Facebook, Twitter, Linkedin, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import type { AppRole } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/new")({
  head: () => ({ meta: [{ title: "Nouvel Utilisateur — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><NewUserPage /></RequireAuth>,
});

const ROLES: { value: AppRole; label: string }[] = [
  { value: "client", label: "Client" },
  { value: "analyste", label: "Analyste" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

function NewUserPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    prenom: "", nom: "", email: "", phone: "", info: "",
    organization: "", website: "", role: "client" as AppRole,
    oldPassword: "", newPassword: "", confirmPassword: "",
    facebook: "", twitter: "", linkedin: "", youtube: "",
  });
  const [isActive, setIsActive] = useState(true);
  const [permissions, setPermissions] = useState({
    dispatching: false, showExperiences: false, showFollowers: true,
  });
  const [tagPolicy, setTagPolicy] = useState<"group" | "everyone">("group");

  const fullName = `${form.prenom} ${form.nom}`.trim();
  const initials = fullName ? fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) { toast.error("L'email est requis"); return; }
    setBusy(true);
    try {
      const body = { email: form.email, fullName, organization: form.organization, role: form.role };
      const { error } = await supabase.functions.invoke("admin-create-user", { body });
      if (error) throw error;
      toast.success("Utilisateur créé", { description: `OTP envoyé à ${form.email}` });
      navigate({ to: "/admin" });
    } catch (e: any) {
      toast.error("Erreur", { description: e.message ?? "Impossible de créer l'utilisateur" });
    } finally { setBusy(false); }
  };

  const inputClass = "h-12 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-primary/60 transition-colors bg-white dark:bg-slate-900";
  const sectionTitle = "text-lg font-bold text-slate-800 dark:text-slate-100 mb-4";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Back link */}
        <button onClick={() => navigate({ to: "/admin" })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour à l'administration
        </button>

        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* ══════ LEFT SIDEBAR ══════ */}
          <div className="space-y-6">
            {/* Cover + Avatar Card */}
            <Card className="overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 relative">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvc3ZnPg==')] opacity-60" />
              </div>
              <div className="px-6 pb-6 -mt-12 text-center">
                <div className="relative inline-block">
                  <Avatar className="h-24 w-24 border-4 border-white dark:border-slate-900 shadow-lg">
                    <AvatarImage src={orangeLogo} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                  <button className="absolute bottom-0 left-0 bg-slate-800/80 text-white rounded-full p-1.5 hover:bg-slate-700 transition-colors">
                    <Camera className="h-3 w-3" />
                  </button>
                </div>
                <h2 className="mt-3 text-xl font-bold">{fullName || "Nouvel Utilisateur"}</h2>
                <p className="text-sm text-muted-foreground">{form.organization || "Organisation"}</p>
              </div>
            </Card>

            {/* Profil / Role Selection */}
            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Profil</h3>
              <div className="space-y-2">
                {ROLES.map(r => (
                  <label key={r.value} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${form.role === r.value ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}>
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${form.role === r.value ? "border-primary" : "border-slate-300 dark:border-slate-600"}`}>
                      {form.role === r.value && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <span className="text-sm font-medium">{r.label}</span>
                  </label>
                ))}
              </div>
            </Card>

            {/* Who can tag + Permissions */}
            <Card className="p-5 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Qui peut tagger ?</h3>
                {(["group", "everyone"] as const).map(v => (
                  <label key={v} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${tagPolicy === v ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`} onClick={() => setTagPolicy(v)}>
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${tagPolicy === v ? "border-primary" : "border-slate-300"}`}>
                      {tagPolicy === v && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <span className="text-sm">{v === "group" ? "Membres du groupe" : "Tout le monde"}</span>
                  </label>
                ))}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Permissions</h3>
                <div className="space-y-2.5">
                  {([
                    { key: "dispatching" as const, label: "Dispatching" },
                    { key: "showExperiences" as const, label: "Montrer les expériences" },
                    { key: "showFollowers" as const, label: "Montrer les followers" },
                  ]).map(p => (
                    <label key={p.key} className="flex items-center gap-3 cursor-pointer">
                      <Checkbox checked={permissions[p.key]} onCheckedChange={v => setPermissions(prev => ({ ...prev, [p.key]: !!v }))} />
                      <span className="text-sm">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Card>

            {/* Status */}
            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Statut</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Actif</span>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Inactif</span>
                  <Switch checked={!isActive} onCheckedChange={v => setIsActive(!v)} />
                </div>
              </div>
            </Card>
          </div>

          {/* ══════ MAIN CONTENT ══════ */}
          <form onSubmit={handleCreate} className="space-y-8">
            {/* Personal Information */}
            <div>
              <h2 className={sectionTitle}>Personal Information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input className={`${inputClass} pl-10`} placeholder="PRENOM" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input className={`${inputClass} pl-10`} placeholder="NOM" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input type="email" className={`${inputClass} pl-10`} placeholder="ENTER VOTRE EMAIL" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input className={`${inputClass} pl-10`} placeholder="ENTER VOTRE CONTACT" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="sm:col-span-2 relative">
                  <Info className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Textarea className="min-h-[100px] pl-10 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-primary/60 transition-colors bg-white dark:bg-slate-900 resize-none" placeholder="INFO" value={form.info} onChange={e => setForm({ ...form, info: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Company Info + Change Password side by side */}
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h2 className={sectionTitle}>Company Info</h2>
                <div className="space-y-4">
                  <div className="relative">
                    <Building className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input className={`${inputClass} pl-10`} placeholder="COMPANY NAME" value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} />
                  </div>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input className={`${inputClass} pl-10`} placeholder="WEBSITE" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
                  </div>
                </div>
              </div>
              <div>
                <h2 className={sectionTitle}>Change Password</h2>
                <div className="space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input type="password" className={`${inputClass} pl-10`} placeholder="OLD PASSWORD" value={form.oldPassword} onChange={e => setForm({ ...form, oldPassword: e.target.value })} />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input type="password" className={`${inputClass} pl-10`} placeholder="NEW PASSWORD" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input type="password" className={`${inputClass} pl-10`} placeholder="CONFIRM NEW PASSWORD" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>

            {/* Social */}
            <div>
              <h2 className={sectionTitle}>Social</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="relative">
                  <Facebook className="absolute left-3 top-3.5 h-4 w-4 text-blue-600" />
                  <Input className={`${inputClass} pl-10`} placeholder="FACEBOOK" value={form.facebook} onChange={e => setForm({ ...form, facebook: e.target.value })} />
                </div>
                <div className="relative">
                  <Twitter className="absolute left-3 top-3.5 h-4 w-4 text-sky-500" />
                  <Input className={`${inputClass} pl-10`} placeholder="TWITTER" value={form.twitter} onChange={e => setForm({ ...form, twitter: e.target.value })} />
                </div>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-3.5 h-4 w-4 text-blue-700" />
                  <Input className={`${inputClass} pl-10`} placeholder="LINKEDIN" value={form.linkedin} onChange={e => setForm({ ...form, linkedin: e.target.value })} />
                </div>
                <div className="relative">
                  <Youtube className="absolute left-3 top-3.5 h-4 w-4 text-red-600" />
                  <Input className={`${inputClass} pl-10`} placeholder="YOUTUBE" value={form.youtube} onChange={e => setForm({ ...form, youtube: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="h-11 px-6" onClick={() => navigate({ to: "/admin" })}>Cancel Changes</Button>
              <Button type="submit" disabled={busy} className="h-11 px-6 bg-primary hover:bg-primary/90">
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création...</> : "Save Information"}
              </Button>
            </div>

            {/* Transfer + Deletion */}
            <div className="grid gap-8 lg:grid-cols-2 pt-4">
              <Card className="p-5 border-amber-200 dark:border-amber-800/40">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Transfer Ownership</h3>
                <p className="text-sm text-muted-foreground mt-1">Transférer ce compte à une autre personne ou à un département.</p>
                <Button variant="outline" size="sm" className="mt-3">Transférer</Button>
              </Card>
              <Card className="p-5 border-red-200 dark:border-red-800/40">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Account Deletion</h3>
                <p className="text-sm text-muted-foreground mt-1">Supprimer définitivement ce compte et toutes ses données.</p>
                <Button variant="destructive" size="sm" className="mt-3">Supprimer</Button>
              </Card>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
