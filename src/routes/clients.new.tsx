import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Building, Mail, User, Loader2, ArrowLeft, Phone, Globe, Shield, SwitchCamera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/clients/new")({
  head: () => ({ meta: [{ title: "Nouveau Client — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><NewClient /></RequireAuth>,
});

function NewClient() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
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
  });

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    
    const fullName = `${form.firstName} ${form.lastName}`.trim();
    
    try {
      // The edge function currently accepts email, fullName, organization, role
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
        description: `Un code OTP a été envoyé à ${form.email}`,
      });
      
      navigate({ to: "/clients" });
    } catch (e: any) {
      toast.error("Erreur lors de la création", {
        description: e?.message ?? "Une erreur est survenue",
      });
    } finally { 
      setBusy(false); 
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link to="/clients">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
              Ajouter un client
            </h1>
            <p className="text-muted-foreground mt-1">
              Créez un nouveau compte client et configurez ses accès à la plateforme.
            </p>
          </div>
        </div>

        <form onSubmit={createUser}>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              {/* Informations du Profil */}
              <Card className="shadow-md border-border/50">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Informations du profil
                  </CardTitle>
                  <CardDescription>Les informations personnelles du représentant client.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input
                        id="firstName"
                        placeholder="Jean"
                        required
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        className="transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom</Label>
                      <Input
                        id="lastName"
                        placeholder="Dupont"
                        required
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        className="transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Adresse e-mail
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="jean.dupont@entreprise.com"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        Numéro de contact
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+33 1 23 45 67 89"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Informations de l'Entreprise */}
              <Card className="shadow-md border-border/50">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    Informations sur l'entreprise
                  </CardTitle>
                  <CardDescription>Les détails de l'organisation que représente ce client.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="organization">Nom de l'entreprise</Label>
                    <Input
                      id="organization"
                      placeholder="Acme Corp"
                      required
                      value={form.organization}
                      onChange={(e) => setForm({ ...form, organization: e.target.value })}
                      className="transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website" className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      Site web
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://acme-corp.com"
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      className="transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Configuration et Permissions */}
              <Card className="shadow-md border-border/50">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Sécurité & Accès
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Rôle attribué</Label>
                    <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client standard</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Le rôle détermine les accès aux différents modules de la plateforme.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="mfa" className="flex flex-col space-y-1">
                      <span>Exiger l'A2F</span>
                      <span className="font-normal text-xs text-muted-foreground">Forcer l'authentification à double facteur.</span>
                    </Label>
                    <Switch
                      id="mfa"
                      checked={form.requireMfa}
                      onCheckedChange={(c) => setForm({ ...form, requireMfa: c })}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="invite" className="flex flex-col space-y-1">
                      <span>Envoyer une invitation</span>
                      <span className="font-normal text-xs text-muted-foreground">Envoyer l'OTP par e-mail au client.</span>
                    </Label>
                    <Switch
                      id="invite"
                      checked={form.sendInvite}
                      onCheckedChange={(c) => setForm({ ...form, sendInvite: c })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Button type="submit" size="lg" disabled={busy} className="w-full shadow-lg">
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" />
                      Créer le client
                    </>
                  )}
                </Button>
                <Button variant="outline" size="lg" asChild className="w-full bg-white dark:bg-zinc-900">
                  <Link to="/clients">Annuler</Link>
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
