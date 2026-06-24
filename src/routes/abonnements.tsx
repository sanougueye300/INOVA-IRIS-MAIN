import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CreditCard, Search, RefreshCw, TrendingUp, CheckCircle, XCircle,
  Clock, AlertTriangle, Download, ExternalLink, Users, DollarSign,
  Calendar, Loader2, ArrowUpRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/abonnements")({
  head: () => ({ meta: [{ title: "Abonnements Stripe — SOC Platform" }] }),
  component: () => (
    <RequireAuth requireAdmin>
      <Abonnements />
    </RequireAuth>
  ),
});

type SubStatus = "active" | "past_due" | "canceled" | "trialing" | "incomplete" | "pending";

interface Subscription {
  id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  user_id: string | null;
  offer_id: string;
  offer_name: string;
  status: SubStatus;
  amount: number;
  currency: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  client_email: string | null;
  client_name: string | null;
  client_phone: string | null;
  organization: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<SubStatus, { label: string; className: string; icon: React.ElementType }> = {
  active:     { label: "Actif",      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: CheckCircle },
  trialing:   { label: "Essai",      className: "bg-blue-500/10 text-blue-600 border-blue-500/30",          icon: Clock },
  past_due:   { label: "En retard",  className: "bg-red-500/10 text-red-600 border-red-500/30 animate-pulse", icon: AlertTriangle },
  canceled:   { label: "Annulé",     className: "bg-slate-500/10 text-slate-500 border-slate-300",           icon: XCircle },
  incomplete: { label: "Incomplet",  className: "bg-amber-500/10 text-amber-600 border-amber-500/30",        icon: AlertTriangle },
  pending:    { label: "En attente", className: "bg-amber-500/10 text-amber-600 border-amber-500/30",        icon: Clock },
};

const OFFER_COLORS: Record<string, string> = {
  "inova-secure":    "bg-orange-500/10 text-orange-600 border-orange-500/30",
  "terranga-secure": "bg-blue-500/10 text-blue-600 border-blue-500/30",
  "gainde-secure":   "bg-violet-500/10 text-violet-600 border-violet-500/30",
};

function formatAmount(amount: number, currency: string) {
  if (currency === "xof" || currency === "FCFA") {
    return `${amount.toLocaleString("fr-FR")} FCFA`;
  }
  return `${amount.toLocaleString("fr-FR")} ${currency.toUpperCase()}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function StatusBadge({ status }: { status: SubStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${cfg.className}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function StatCard({
  label, value, sub, color, icon: Icon,
}: {
  label: string; value: string | number; sub?: string; color: string; icon: React.ElementType;
}) {
  return (
    <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur border border-slate-100 dark:border-zinc-850 shadow-sm rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
        <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={`p-1.5 rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className="text-2xl font-black text-slate-900 dark:text-white">{value}</div>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Abonnements() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubStatus | "all">("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    // subscriptions table is created via migration; cast through unknown for TS
    const { data, error } = await (supabase as any)
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading subscriptions:", error);
      toast.error("Erreur lors du chargement des abonnements");
    } else {
      setSubscriptions((data as unknown as Subscription[]) ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = subscriptions.filter((s) => {
    const matchSearch =
      !search ||
      s.client_email?.toLowerCase().includes(search.toLowerCase()) ||
      s.organization?.toLowerCase().includes(search.toLowerCase()) ||
      s.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.stripe_subscription_id?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter((s) => s.status === "active").length,
    pastDue: subscriptions.filter((s) => s.status === "past_due").length,
    mrr: subscriptions
      .filter((s) => s.status === "active")
      .reduce((acc, s) => acc + s.amount, 0),
  };

  const handleExportCSV = () => {
    const headers = ["ID Stripe", "Client", "Organisation", "Email", "Offre", "Statut", "Montant", "Début", "Fin", "Date création"];
    const rows = filtered.map((s) =>
      [
        s.stripe_subscription_id || "—",
        s.client_name || "—",
        s.organization || "—",
        s.client_email || "—",
        s.offer_name,
        s.status,
        formatAmount(s.amount, s.currency),
        formatDate(s.current_period_start),
        formatDate(s.current_period_end),
        formatDate(s.created_at),
      ]
        .map((v) => `"${v}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `abonnements_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0b0c10] transition-colors relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/10 rounded-2xl border border-violet-500/20">
              <CreditCard className="h-6 w-6 text-violet-500" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-slate-900 via-violet-600 to-violet-800 dark:from-white dark:via-violet-400 dark:to-violet-600 bg-clip-text text-transparent">
                Abonnements Stripe
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gestion centralisée des souscriptions et paiements récurrents
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl font-bold border-slate-200 dark:border-zinc-800 hover:border-violet-500"
              onClick={() => load(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl font-bold border-slate-200 dark:border-zinc-800 hover:border-violet-500"
              onClick={handleExportCSV}
            >
              <Download className="mr-2 h-3.5 w-3.5 text-violet-500" />
              Exporter CSV
            </Button>
            <Button
              size="sm"
              className="rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white gap-2"
              onClick={() =>
                window.open("https://dashboard.stripe.com/subscriptions", "_blank")
              }
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Dashboard Stripe
            </Button>
          </div>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard
              label="Total abonnements"
              value={stats.total}
              sub={`${stats.active} actifs`}
              color="bg-violet-500/10 text-violet-500"
              icon={Users}
            />
            <StatCard
              label="Abonnements actifs"
              value={stats.active}
              sub="Paiements à jour"
              color="bg-emerald-500/10 text-emerald-500"
              icon={CheckCircle}
            />
            <StatCard
              label="MRR (revenus actifs)"
              value={formatAmount(stats.mrr, "xof")}
              sub="Revenu mensuel récurrent"
              color="bg-orange-500/10 text-orange-500"
              icon={DollarSign}
            />
            <StatCard
              label="Paiements en retard"
              value={stats.pastDue}
              sub="Nécessitent une action"
              color="bg-red-500/10 text-red-500"
              icon={AlertTriangle}
            />
          </div>
        )}

        {/* Filters */}
        <Card className="p-4 bg-white/80 dark:bg-zinc-900/60 backdrop-blur border border-slate-100 dark:border-zinc-850 rounded-2xl shadow-sm mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher client, email, org, ID Stripe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-850 text-xs font-semibold rounded-xl"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "active", "trialing", "past_due", "canceled", "pending"] as const).map(
                (s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={statusFilter === s ? "default" : "outline"}
                    className="rounded-xl text-xs font-bold uppercase tracking-wide"
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === "all"
                      ? "Tous"
                      : STATUS_CONFIG[s as SubStatus]?.label ?? s}
                  </Button>
                )
              )}
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur border border-slate-100 dark:border-zinc-800 shadow-xl rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-850">
                    {[
                      "Client / Organisation",
                      "Offre",
                      "Statut",
                      "Montant / mois",
                      "Période active",
                      "Créé le",
                      "Actions",
                    ].map((h) => (
                      <TableHead
                        key={h}
                        className="text-[10px] font-black uppercase tracking-wider text-muted-foreground py-4 px-4"
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-20 text-center">
                        <CreditCard className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-xs text-muted-foreground font-semibold">
                          {search || statusFilter !== "all"
                            ? "Aucun abonnement ne correspond aux filtres."
                            : "Aucun abonnement enregistré. Les souscriptions Stripe apparaîtront ici."}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((sub) => (
                      <TableRow
                        key={sub.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-zinc-950/30 border-b border-slate-100 dark:border-zinc-850 transition-colors"
                      >
                        {/* Client */}
                        <TableCell className="py-4 px-4">
                          <div className="text-xs font-black text-slate-800 dark:text-zinc-100">
                            {sub.organization || sub.client_name || "—"}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                            {sub.client_email || "—"}
                          </div>
                          {sub.client_phone && (
                            <div className="text-[10px] text-muted-foreground/60">
                              {sub.client_phone}
                            </div>
                          )}
                        </TableCell>

                        {/* Offre */}
                        <TableCell className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${
                              OFFER_COLORS[sub.offer_id] ??
                              "bg-slate-500/10 text-slate-600 border-slate-300"
                            }`}
                          >
                            {sub.offer_name}
                          </span>
                        </TableCell>

                        {/* Statut */}
                        <TableCell className="py-4 px-4">
                          <StatusBadge status={sub.status} />
                          {sub.cancel_at_period_end && (
                            <div className="text-[9px] text-amber-500 font-bold mt-1">
                              Annulation fin de période
                            </div>
                          )}
                        </TableCell>

                        {/* Montant */}
                        <TableCell className="py-4 px-4">
                          <span className="text-sm font-black text-slate-800 dark:text-zinc-100">
                            {formatAmount(sub.amount, sub.currency)}
                          </span>
                        </TableCell>

                        {/* Période */}
                        <TableCell className="py-4 px-4">
                          {sub.current_period_start && sub.current_period_end ? (
                            <div className="text-xs text-muted-foreground font-semibold space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 shrink-0" />
                                {formatDate(sub.current_period_start)}
                              </div>
                              <div className="text-[10px] text-muted-foreground/70">
                                → {formatDate(sub.current_period_end)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Créé le */}
                        <TableCell className="py-4 px-4 text-xs text-muted-foreground font-semibold">
                          {formatDate(sub.created_at)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-4 px-4">
                          <div className="flex gap-2">
                            {sub.stripe_subscription_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-[10px] font-black uppercase hover:bg-violet-500/10 hover:text-violet-600 rounded-lg"
                                onClick={() =>
                                  window.open(
                                    `https://dashboard.stripe.com/subscriptions/${sub.stripe_subscription_id}`,
                                    "_blank"
                                  )
                                }
                              >
                                <ArrowUpRight className="h-3 w-3 mr-1" />
                                Stripe
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Footer info */}
        <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {filtered.length} abonnement{filtered.length !== 1 ? "s" : ""} affiché
            {filtered.length !== 1 ? "s" : ""}
            {subscriptions.length !== filtered.length
              ? ` sur ${subscriptions.length} total`
              : ""}
          </span>
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-violet-500" />
            Synchronisé via Stripe Webhooks
          </span>
        </div>
      </div>
    </div>
  );
}
