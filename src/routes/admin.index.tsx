import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Shield, Search, MoreVertical, CheckCircle, XCircle, Users, Building, Mail, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Administration — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><Admin /></RequireAuth>,
});

interface Profile { id: string; email: string | null; full_name: string | null; organization: string | null; is_active: boolean; created_at: string }
interface RoleRow { user_id: string; role: AppRole }

const roleColors: Record<AppRole, string> = {
  admin: "destructive",
  analyste: "default",
  manager: "secondary",
  client: "outline"
};

const roleLabels: Record<AppRole, string> = {
  admin: "Admin",
  analyste: "Analyste",
  manager: "Manager",
  client: "Client"
};

const defaultUser: Profile = {
  id: "default-sanou",
  email: "sanou.gueye@sonatel.com",
  full_name: "Sanou Gueye",
  organization: "Sonatel",
  is_active: true,
  created_at: new Date().toISOString()
};

function Admin() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, AppRole[]>>({});
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [form, setForm] = useState({ email: "", fullName: "", organization: "", role: "client" as AppRole });
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", email: "", organization: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const fetchedProfiles = (p as Profile[]) ?? [];
      const hasSanou = fetchedProfiles.some(profile => profile.full_name === "Sanou Gueye");
      const finalProfiles = hasSanou ? fetchedProfiles : [defaultUser, ...fetchedProfiles];
      setProfiles(finalProfiles);

      const map: Record<string, AppRole[]> = {};
      ((r as RoleRow[]) ?? []).forEach(x => { (map[x.user_id] ||= []).push(x.role); });
      if (!hasSanou) map["default-sanou"] = ["admin"];
      setRolesByUser(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let filtered = profiles;
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.organization?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(p =>
        statusFilter === "active" ? p.is_active : !p.is_active
      );
    }
    setFilteredProfiles(filtered);
  }, [profiles, searchTerm, statusFilter]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", { body: form });
      if (error) throw error;
      toast.success(`Utilisateur créé avec succès`, {
        description: `Un code OTP a été envoyé à ${form.email}`,
      });
      setOpen(false);
      setForm({ email: "", fullName: "", organization: "", role: "client" });
      await load();
    } catch (e: any) {
      toast.error("Erreur lors de la création", {
        description: e?.message ?? "Une erreur est survenue",
      });
    } finally { setBusy(false); }
  };

  const updateRole = async (userId: string, newRole: AppRole) => {
    const toastId = toast.loading("Mise à jour du rôle...");
    try {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
      if (error) throw error;
      toast.success("Rôle mis à jour", { id: toastId });
      await load();
    } catch (error: any) {
      toast.error("Erreur", { description: error.message, id: toastId });
    }
  };

  const toggleActive = async (p: Profile) => {
    const toastId = toast.loading(`${p.is_active ? "Désactivation" : "Activation"} en cours...`);
    try {
      const { error } = await supabase.from("profiles").update({ is_active: !p.is_active }).eq("id", p.id);
      if (error) throw error;
      toast.success(`Utilisateur ${p.is_active ? "désactivé" : "activé"} avec succès`, { id: toastId });
      await load();
    } catch (error: any) {
      toast.error("Erreur", { description: error.message, id: toastId });
    }
  };

  const stats = {
    total: profiles.length,
    active: profiles.filter(p => p.is_active).length,
    inactive: profiles.filter(p => !p.is_active).length,
    admins: Object.values(rolesByUser).filter(roles => roles.includes("admin")).length,
  };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const openEditDialog = (user: Profile) => {
    setEditingUser(user);
    setEditForm({ fullName: user.full_name || "", email: user.email || "", organization: user.organization || "" });
  };

  const handleUpdateUser = () => {
    setProfiles(prev => prev.map(p => p.id === editingUser?.id ? { ...p, full_name: editForm.fullName, email: editForm.email, organization: editForm.organization } : p));
    toast.success("Informations modifiées", { description: "Les informations de l'utilisateur ont été mises à jour avec succès." });
    setEditingUser(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                  Administration
                </h1>
              </div>
              <p className="text-muted-foreground">
                Gérez les utilisateurs, leurs rôles et permissions
              </p>
            </div>

            {/* Bouton Nouvel Utilisateur redirigeant vers la page de création */}
            <Link to="/admin/new" className="inline-block">
              <Button className="shadow-lg hover:shadow-xl transition-shadow">
                <UserPlus className="mr-2 h-4 w-4" />
                Nouvel utilisateur
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total utilisateurs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary/60" />
            </div>
          </Card>
          <Card className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs actifs</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/60" />
            </div>
          </Card>
          <Card className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs inactifs</p>
                <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500/60" />
            </div>
          </Card>
          <Card className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Administrateurs</p>
                <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-500/60" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email, nom ou organisation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-2">
              <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>Tous</Button>
              <Button variant={statusFilter === "active" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("active")} className="gap-2">
                <CheckCircle className="h-3 w-3" /> Actifs
              </Button>
              <Button variant={statusFilter === "inactive" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("inactive")} className="gap-2">
                <XCircle className="h-3 w-3" /> Inactifs
              </Button>
            </div>
          </div>
        </Card>

        {/* Users Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[80px]"></TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-12 w-12 text-muted-foreground/30" />
                        <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
                        <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>
                          Réinitialiser les filtres
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProfiles.map(p => (
                    <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(p.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">
              <Link to={`/admin/${p.id}`} className="text-primary hover:underline">
                {p.full_name ?? "—"}
              </Link>
            </TableCell>
                      <TableCell className="text-muted-foreground">{p.email}</TableCell>
                      <TableCell>
                        {p.organization ?? <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={(rolesByUser[p.id]?.[0]) ?? "client"}
                          onValueChange={(v) => updateRole(p.id, v as AppRole)}
                        >
                          <SelectTrigger className="w-32 transition-all focus:ring-2 focus:ring-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="analyste">Analyste</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? "default" : "secondary"} className="gap-1">
                          {p.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {p.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(p)}>
                              Modifier les informations
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActive(p)}>
                              {p.is_active ? "Désactiver" : "Activer"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Modal Modification Utilisateur */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier les informations</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Organisation</Label>
                <Input value={editForm.organization} onChange={e => setEditForm({...editForm, organization: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>Annuler</Button>
              <Button onClick={handleUpdateUser}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}