import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  UserPlus, Shield, Search, MoreVertical, CheckCircle, XCircle,
  Users, Loader2, Download, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Administration — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><Admin /></RequireAuth>,
});

interface Profile { id: string; email: string | null; full_name: string | null; organization: string | null; is_active: boolean; created_at: string }
interface RoleRow { user_id: string; role: AppRole }

/* ─── Role badge styles ─────────────────────────────────────────── */
const roleBadgeStyle: Record<AppRole, { bg: string; text: string; ring: string; label: string }> = {
  admin: {
    bg: "bg-violet-100 dark:bg-violet-900/40",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-300 dark:ring-violet-700",
    label: "Admin",
  },
  manager: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-300 dark:ring-blue-700",
    label: "Manager",
  },
  analyste: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-300 dark:ring-amber-700",
    label: "Analyste",
  },
  client: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-300",
    ring: "ring-slate-300 dark:ring-slate-600",
    label: "Client",
  },
};

function RoleBadge({ role }: { role: AppRole }) {
  const s = roleBadgeStyle[role] ?? roleBadgeStyle.client;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${s.bg} ${s.text} ${s.ring} select-none`}
    >
      <Shield className="h-3 w-3" />
      {s.label}
    </span>
  );
}

/* ─── Pagination component ──────────────────────────────────────── */
const PAGE_SIZE = 6;

function Pagination({
  total,
  page,
  setPage,
}: {
  total: number;
  page: number;
  setPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pages = useMemo(() => {
    const arr: (number | "…")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (page > 3) arr.push("…");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) arr.push(i);
      if (page < totalPages - 2) arr.push("…");
      arr.push(totalPages);
    }
    return arr;
  }, [totalPages, page]);

  const indexOfFirstItem = (page - 1) * PAGE_SIZE;
  const indexOfLastItem = page * PAGE_SIZE;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-200 dark:border-white/5">
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium sm:w-1/3 text-left">
        Affichage de <span className="font-semibold text-slate-700 dark:text-slate-200">{indexOfFirstItem + 1}</span> à{" "}
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {Math.min(indexOfLastItem, total)}
        </span>{" "}
        sur <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> utilisateurs
      </p>
      
      <div className="flex items-center justify-center gap-1.5 sm:w-1/3">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-800 disabled:opacity-50 cursor-pointer"
          onClick={() => setPage(Math.max(page - 1, 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-slate-500 dark:text-slate-400 text-sm">…</span>
          ) : (
            <Button
              key={p}
              variant={page === p ? "default" : "outline"}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                page === p
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-none shadow-sm"
                  : "bg-white dark:bg-slate-950 border-slate-200 dark:border-white/5 text-slate-655 hover:text-slate-850"
              }`}
              onClick={() => setPage(p as number)}
            >
              {p}
            </Button>
          )
        )}
        
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-800 disabled:opacity-50 cursor-pointer"
          onClick={() => setPage(Math.min(page + 1, totalPages))}
          disabled={page === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="hidden sm:block sm:w-1/3" />
    </div>
  );
}

/* ─── Default seed user ─────────────────────────────────────────── */
const defaultUser: Profile = {
  id: "default-sanou",
  email: "sanou.gueye@sonatel.com",
  full_name: "Sanou Gueye",
  organization: "Sonatel",
  is_active: true,
  created_at: new Date().toISOString(),
};

/* ─── Export helper ─────────────────────────────────────────────── */
async function exportToExcel(
  profiles: Profile[],
  rolesByUser: Record<string, AppRole[]>
) {
  const XLSX = await import("xlsx-js-style");

  const rows = profiles.map((p) => ({
    "Nom complet": p.full_name ?? "—",
    "Email": p.email ?? "—",
    "Organisation": p.organization ?? "—",
    "Rôle": roleBadgeStyle[rolesByUser[p.id]?.[0] ?? "client"]?.label ?? "Client",
    "Statut": p.is_active ? "Actif" : "Inactif",
    "Créé le": p.created_at
      ? new Date(p.created_at).toLocaleDateString("fr-FR", {
          day: "2-digit", month: "2-digit", year: "numeric",
        })
      : "—",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  /* Column widths */
  ws["!cols"] = [
    { wch: 26 }, { wch: 36 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
  ];

  /* Row heights (Header: 28pt, Data: 22pt) */
  ws["!rows"] = [
    { hpt: 28 },
    ...Array(rows.length).fill({ hpt: 22 }),
  ];

  /* Style headers and data cells */
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellAddr]) continue;

      const isHeader = r === 0;
      const isEvenRow = r % 2 === 0;

      // Alignments
      let align = "left";
      if (isHeader || c === 3 || c === 4 || c === 5) {
        align = "center";
      }

      // Font style & colors
      let fontColor = isHeader ? "FFFFFF" : "1E293B";
      let fontBold = isHeader;

      if (!isHeader && c === 4) { // Statut Column
        const val = ws[cellAddr].v;
        if (val === "Actif") {
          fontColor = "16A34A"; // green-600
          fontBold = true;
        } else if (val === "Inactif") {
          fontColor = "DC2626"; // red-600
          fontBold = true;
        }
      }

      ws[cellAddr].s = {
        font: {
          name: "Segoe UI",
          sz: isHeader ? 11 : 10,
          bold: fontBold,
          color: { rgb: fontColor },
        },
        fill: {
          fgColor: { rgb: isHeader ? "F16E00" : (isEvenRow ? "F8FAFC" : "FFFFFF") },
        },
        alignment: {
          horizontal: align,
          vertical: "center",
          wrapText: true,
        },
        border: {
          top: { style: "thin", color: { rgb: "E2E8F0" } },
          bottom: { style: isHeader ? "medium" : "thin", color: { rgb: isHeader ? "B45309" : "E2E8F0" } },
          left: { style: "thin", color: { rgb: "E2E8F0" } },
          right: { style: "thin", color: { rgb: "E2E8F0" } },
        },
      };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Utilisateurs SOC");

  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `INOVA-IRIS_Utilisateurs_${today}.xlsx`);
}

/* ─── Main component ────────────────────────────────────────────── */
function Admin() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, AppRole[]>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", email: "", organization: "" });
  const [currentPage, setCurrentPage] = useState(1);

  /* ── Load data ── */
  const load = async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const fetched = (p as Profile[]) ?? [];
      const hasSanou = fetched.some(pr => pr.full_name === "Sanou Gueye");
      setProfiles(hasSanou ? fetched : [defaultUser, ...fetched]);

      const map: Record<string, AppRole[]> = {};
      ((r as RoleRow[]) ?? []).forEach(x => { (map[x.user_id] ||= []).push(x.role); });
      if (!hasSanou) map["default-sanou"] = ["admin"];
      setRolesByUser(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* ── Filtering ── */
  useEffect(() => {
    let f = profiles;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      f = f.filter(p =>
        p.email?.toLowerCase().includes(q) ||
        p.full_name?.toLowerCase().includes(q) ||
        p.organization?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      f = f.filter(p => statusFilter === "active" ? p.is_active : !p.is_active);
    }
    setFilteredProfiles(f);
    setCurrentPage(1); // reset to page 1 on filter change
  }, [profiles, searchTerm, statusFilter]);

  /* ── Paginated slice ── */
  const paginatedProfiles = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProfiles.slice(start, start + PAGE_SIZE);
  }, [filteredProfiles, currentPage]);

  /* ── Actions ── */
  const toggleActive = async (p: Profile) => {
    const toastId = toast.loading(`${p.is_active ? "Désactivation" : "Activation"} en cours...`);
    try {
      const { error } = await supabase.from("profiles").update({ is_active: !p.is_active }).eq("id", p.id);
      if (error) throw error;
      toast.success(`Utilisateur ${p.is_active ? "désactivé" : "activé"}`, { id: toastId });
      await load();
    } catch (error: any) {
      toast.error("Erreur", { description: error.message, id: toastId });
    }
  };

  const openEditDialog = (user: Profile) => {
    setEditingUser(user);
    setEditForm({ fullName: user.full_name ?? "", email: user.email ?? "", organization: user.organization ?? "" });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    const toastId = toast.loading("Mise à jour en cours...");
    try {
      if (editingUser.id !== "default-sanou") {
        const { error } = await supabase.from("profiles").update({
          full_name: editForm.fullName,
          organization: editForm.organization,
        }).eq("id", editingUser.id);
        if (error) throw error;
      }
      setProfiles(prev => prev.map(p =>
        p.id === editingUser.id
          ? { ...p, full_name: editForm.fullName, email: editForm.email, organization: editForm.organization }
          : p
      ));
      toast.success("Informations modifiées", { id: toastId, description: "Mise à jour réussie." });
      setEditingUser(null);
    } catch (e: any) {
      toast.error("Erreur", { id: toastId, description: e.message });
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToExcel(profiles, rolesByUser);
      toast.success("Export réussi !", { description: `${profiles.length} utilisateurs exportés en Excel.` });
    } catch {
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setExporting(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const stats = {
    total: profiles.length,
    active: profiles.filter(p => p.is_active).length,
    inactive: profiles.filter(p => !p.is_active).length,
    admins: Object.values(rolesByUser).filter(roles => roles.includes("admin")).length,
  };

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8">

        {/* ── Header ── */}
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
              <p className="text-muted-foreground">Gérez les utilisateurs, leurs rôles et permissions</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Export Excel */}
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={exporting || loading || profiles.length === 0}
                className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20 shadow-sm"
                id="btn-export-excel"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Exporter Excel
              </Button>

              {/* Nouvel agent */}
              <Link to="/admin/new" className="inline-block">
                <Button className="shadow-lg hover:shadow-xl transition-shadow gap-2" id="btn-nouvel-agent">
                  <UserPlus className="h-4 w-4" />
                  Nouvel agent
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          {[
            { label: "Total utilisateurs", value: stats.total, icon: Users, color: "text-primary/60", valueColor: "" },
            { label: "Utilisateurs actifs", value: stats.active, icon: CheckCircle, color: "text-green-500/60", valueColor: "text-green-600" },
            { label: "Utilisateurs inactifs", value: stats.inactive, icon: XCircle, color: "text-red-500/60", valueColor: "text-red-600" },
            { label: "Administrateurs", value: stats.admins, icon: Shield, color: "text-purple-500/60", valueColor: "text-purple-600" },
          ].map(({ label, value, icon: Icon, color, valueColor }) => (
            <Card key={label} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
                </div>
                <Icon className={`h-8 w-8 ${color}`} />
              </div>
            </Card>
          ))}
        </div>

        {/* ── Filters ── */}
        <Card className="mb-6 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-users"
                placeholder="Rechercher par email, nom ou organisation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-2">
              <Button id="filter-all" variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>Tous</Button>
              <Button id="filter-active" variant={statusFilter === "active" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("active")} className="gap-2">
                <CheckCircle className="h-3 w-3" /> Actifs
              </Button>
              <Button id="filter-inactive" variant={statusFilter === "inactive" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("inactive")} className="gap-2">
                <XCircle className="h-3 w-3" /> Inactifs
              </Button>
            </div>
          </div>
        </Card>

        {/* ── Table ── */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[60px]"></TableHead>
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
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedProfiles.length === 0 ? (
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
                  paginatedProfiles.map((p) => {
                    const role: AppRole = rolesByUser[p.id]?.[0] ?? "client";
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/30 transition-colors group">
                        {/* Avatar */}
                        <TableCell>
                          <Avatar className="h-10 w-10 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                              {getInitials(p.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>

                        {/* Nom */}
                        <TableCell className="font-medium">
                          <Link
                            to="/admin/$userId"
                            params={{ userId: p.id }}
                            className="text-primary hover:underline underline-offset-2"
                          >
                            {p.full_name ?? "—"}
                          </Link>
                        </TableCell>

                        {/* Email */}
                        <TableCell className="text-muted-foreground text-sm">{p.email}</TableCell>

                        {/* Organisation */}
                        <TableCell>
                          {p.organization ?? <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>

                        {/* Rôle */}
                        <TableCell className="text-muted-foreground text-sm font-medium">
                          {roleBadgeStyle[role]?.label ?? role}
                        </TableCell>

                        {/* Statut */}
                        <TableCell>
                          {p.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-700">
                              <CheckCircle className="h-3 w-3" /> Actif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 ring-1 ring-red-300 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-700">
                              <XCircle className="h-3 w-3" /> Inactif
                            </span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to="/admin/$userId"
                              params={{ userId: p.id }}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary transition-colors opacity-60 group-hover:opacity-100"
                                title="Voir la vue 360 de l'utilisateur"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => openEditDialog(p)}>
                                  Modifier les infos
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => toggleActive(p)}
                                  className={p.is_active ? "text-red-600 focus:text-red-600" : "text-emerald-600 focus:text-emerald-600"}
                                >
                                  {p.is_active ? "Désactiver" : "Activer"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Pagination ── */}
          {!loading && filteredProfiles.length > 0 && (
            <Pagination
              total={filteredProfiles.length}
              page={currentPage}
              setPage={setCurrentPage}
            />
          )}
        </Card>

        {/* ── Edit Dialog ── */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier les informations</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Organisation</Label>
                <Input value={editForm.organization} onChange={e => setEditForm({ ...editForm, organization: e.target.value })} />
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