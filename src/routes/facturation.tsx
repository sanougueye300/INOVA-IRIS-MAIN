import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, CheckCircle, XCircle, Users, CreditCard, AlertCircle, TrendingUp, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import type { AppRole } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/facturation")({
  head: () => ({ meta: [{ title: "Facturation — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><Facturation /></RequireAuth>,
});

interface Profile { id: string; email: string | null; full_name: string | null; organization: string | null; is_active: boolean; created_at: string }
interface RoleRow { user_id: string; role: AppRole }

// Fake billing data type
type BillingStatus = "a_jour" | "en_attente" | "en_retard";

interface BillingClient extends Profile {
  billing_status: BillingStatus;
  last_invoice_amount: number;
  last_invoice_date: string;
}

function Facturation() {
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [filteredClients, setFilteredClients] = useState<BillingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BillingStatus>("all");

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      
      const roles = (r as RoleRow[]) ?? [];
      const clientUserIds = new Set(roles.filter(x => x.role === "client").map(x => x.user_id));
      
      const allProfiles = (p as Profile[]) ?? [];
      const clientProfiles = allProfiles.filter(profile => clientUserIds.has(profile.id));
      
      // Mocker des données de facturation pour chaque client
      const statuses: BillingStatus[] = ["a_jour", "en_attente", "en_retard"];
      const enrichedClients: BillingClient[] = clientProfiles.map((p, index) => {
        // Just predictable pseudo-random data
        const status = statuses[index % statuses.length];
        return {
          ...p,
          billing_status: status,
          last_invoice_amount: 500 + (index * 250), // 500, 750, 1000...
          last_invoice_date: new Date(Date.now() - (index * 86400000 * 5)).toLocaleDateString('fr-FR'),
        };
      });
      
      setClients(enrichedClients);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let filtered = clients;
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.organization?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.billing_status === statusFilter);
    }
    setFilteredClients(filtered);
  }, [clients, searchTerm, statusFilter]);

  const stats = {
    total: clients.length,
    aJour: clients.filter(p => p.billing_status === "a_jour").length,
    enRetard: clients.filter(p => p.billing_status === "en_retard").length,
    revenuMois: clients.reduce((acc, curr) => curr.billing_status !== "en_retard" ? acc + curr.last_invoice_amount : acc, 0),
  };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getStatusBadge = (status: BillingStatus) => {
    switch (status) {
      case "a_jour":
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600 gap-1"><CheckCircle className="h-3 w-3" /> À jour</Badge>;
      case "en_attente":
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> En attente</Badge>;
      case "en_retard":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> En retard</Badge>;
    }
  };

  const handleExportCSV = () => {
    const headers = ["Client / Organisation", "Email", "Statut Paiement", "Dernière Facture", "Montant"];
    const csvContent = [
      headers.join(","),
      ...filteredClients.map(c => 
        `"${c.organization || c.full_name || ""}","${c.email || ""}","${c.billing_status}","${c.last_invoice_date}","${c.last_invoice_amount}"`
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `facturation_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                Facturation
              </h1>
            </div>
            <p className="text-muted-foreground">
              Aperçu des abonnements et de l'état des paiements clients.
            </p>
          </div>
          <Button variant="outline" className="shadow-sm" onClick={handleExportCSV} disabled={filteredClients.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="p-4 hover:shadow-lg transition-shadow border-t-4 border-t-primary/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary/60" />
            </div>
          </Card>
          <Card className="p-4 hover:shadow-lg transition-shadow border-t-4 border-t-green-500/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">À jour</p>
                <p className="text-2xl font-bold text-green-600">{stats.aJour}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/60" />
            </div>
          </Card>
          <Card className="p-4 hover:shadow-lg transition-shadow border-t-4 border-t-red-500/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En retard</p>
                <p className="text-2xl font-bold text-red-600">{stats.enRetard}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500/60" />
            </div>
          </Card>
          <Card className="p-4 hover:shadow-lg transition-shadow border-t-4 border-t-blue-500/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenu Mensuel</p>
                <p className="text-2xl font-bold text-blue-600">{stats.revenuMois} €</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500/60" />
            </div>
          </Card>
        </div>

        <Card className="mb-6 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, entreprise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>Tous</Button>
              <Button variant={statusFilter === "a_jour" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("a_jour")} className="gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" /> À jour
              </Button>
              <Button variant={statusFilter === "en_attente" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("en_attente")} className="gap-2">
                <AlertCircle className="h-3 w-3 text-yellow-500" /> En attente
              </Button>
              <Button variant={statusFilter === "en_retard" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("en_retard")} className="gap-2">
                <XCircle className="h-3 w-3 text-red-500" /> En retard
              </Button>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[80px]"></TableHead>
                  <TableHead>Client / Organisation</TableHead>
                  <TableHead>Dernière Facture</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut Paiement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <CreditCard className="h-12 w-12 text-muted-foreground/30" />
                        <p className="text-muted-foreground">Aucun résultat trouvé</p>
                        <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>
                          Réinitialiser les filtres
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map(c => (
                    <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(c.organization || c.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{c.organization || c.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.last_invoice_date}</TableCell>
                      <TableCell className="font-medium">{c.last_invoice_amount} €</TableCell>
                      <TableCell>
                        {getStatusBadge(c.billing_status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">Voir factures</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
