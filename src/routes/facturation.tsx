import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { 
  Search, CheckCircle, XCircle, Users, CreditCard, AlertCircle, TrendingUp, Download, 
  Loader2, Mail, Phone, Clock, ArrowRight, Check, Send, Smartphone, MessageSquare, 
  FileText, Shield, Sparkles, Bell, Calendar, DollarSign, ArrowLeftRight, ChevronRight,
  ExternalLink, BarChart3, Briefcase, BellRing
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import type { AppRole } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/facturation")({
  head: () => ({ meta: [{ title: "Facturation & Rappels — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><Facturation /></RequireAuth>,
});

interface Profile { 
  id: string; 
  email: string | null; 
  full_name: string | null; 
  organization: string | null; 
  is_active: boolean; 
  created_at: string 
}

interface RoleRow { 
  user_id: string; 
  role: AppRole 
}

type BillingStatus = "a_jour" | "en_attente" | "en_retard";

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  organization: string;
  client_email: string;
  client_phone: string;
  amount: number;
  due_date: string;
  issue_date: string;
  status: BillingStatus;
  reminders_sent: number;
  last_reminder_date?: string;
  last_reminder_channel?: "email" | "sms" | "both";
  formula: string;
}

interface ReminderLog {
  id: string;
  timestamp: string;
  client_name: string;
  invoice_number: string;
  channel: "email" | "sms" | "both";
  message: string;
  status: "delivered" | "failed";
}

const PRESET_TEMPLATES = {
  amical: {
    label: "Rappel Amical (Douce Relance)",
    subject: "Rappel concernant votre facture d'abonnement CyberSOC Sonatel",
    body: "Bonjour [Nom],\n\nNous espérons que vous allez bien. Sauf erreur de notre part, le paiement de votre facture d'abonnement [Facture] d'un montant de [Montant] € n'a pas encore été reçu. Nous vous invitons à régulariser votre compte dès que possible.\n\nCordialement,\nL'équipe Sonatel CyberSOC"
  },
  standard: {
    label: "Avertissement Standard (Relance intermédiaire)",
    subject: "URGENT : Régularisation de votre facture Sonatel CyberSOC",
    body: "Bonjour [Nom],\n\nNous vous informons que la facture [Facture] d'un montant de [Montant] € est en attente de paiement depuis le [Echeance]. Veuillez procéder au règlement sous 48h afin de maintenir l'accès complet à vos services de détection d'alertes.\n\nCordialement,\nDirection Commerciale Orange Sonatel"
  },
  severe: {
    label: "Dernière Mise en Demeure (Avant suspension)",
    subject: "MISE EN DEMEURE : Suspension imminente de vos accès de sécurité",
    body: "IMPORTANT - [Nom],\n\nMalgré nos précédentes relances, la facture [Facture] ([Montant] €) reste impayée. Sans règlement reçu d'ici 24 heures, nous serons contraints de suspendre vos quotas d'agents Wazuh et l'accès à la console de réponse aux incidents.\n\nCordialement,\nService Contentieux Orange Business"
  }
};

function Facturation() {
  const hash = useRouterState({ select: (s) => (s.location.hash ?? "").replace(/^#/, "") });
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // State maps
  const [clients, setClients] = useState<Profile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [remindersLog, setRemindersLog] = useState<ReminderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BillingStatus>("all");

  // Drawer reminder state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [reminderChannel, setReminderChannel] = useState<"email" | "sms" | "both">("email");
  const [selectedPreset, setSelectedPreset] = useState<"amical" | "standard" | "severe">("amical");
  const [customBody, setCustomBody] = useState("");
  
  // Animation simulation state
  const [sending, setSending] = useState(false);
  const [sendStep, setSendStep] = useState(0);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  // Synchronize Tab with Page Hash
  useEffect(() => {
    if (["dashboard", "invoices", "contracts", "reminders"].includes(hash)) {
      setActiveTab(hash);
    } else {
      setActiveTab("dashboard");
    }
  }, [hash]);

  const loadData = async () => {
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
      
      setClients(clientProfiles);

      // Load or build Invoices
      const storedInvoices = localStorage.getItem("soc_billing_invoices");
      if (storedInvoices) {
        setInvoices(JSON.parse(storedInvoices));
      } else {
        // Generate dynamic mock invoices based on clients
        const formulas = ["Platine", "Or", "Argent", "Bronze"];
        const amounts = [2500, 1500, 750, 450];
        const generated: Invoice[] = clientProfiles.flatMap((c, index) => {
          const formIdx = index % formulas.length;
          const formula = formulas[formIdx];
          const amount = amounts[formIdx];
          
          return [
            {
              id: `${c.id}-inv-1`,
              invoice_number: `FACT-2026-${1000 + index * 2}`,
              client_id: c.id,
              organization: c.organization || c.full_name || "Client Orange",
              client_email: c.email || "client@sonatel.sn",
              client_phone: "+221 77 432 " + (1000 + index * 13).toString().substring(0, 4),
              amount: amount,
              issue_date: new Date(Date.now() - 35 * 86400000).toLocaleDateString('fr-FR'),
              due_date: new Date(Date.now() - 5 * 86400000).toLocaleDateString('fr-FR'),
              status: index % 3 === 0 ? "en_retard" as const : "a_jour" as const,
              reminders_sent: index % 3 === 0 ? 1 : 0,
              formula: formula
            },
            {
              id: `${c.id}-inv-2`,
              invoice_number: `FACT-2026-${1000 + index * 2 + 1}`,
              client_id: c.id,
              organization: c.organization || c.full_name || "Client Orange",
              client_email: c.email || "client@sonatel.sn",
              client_phone: "+221 77 432 " + (1000 + index * 13).toString().substring(0, 4),
              amount: amount,
              issue_date: new Date(Date.now() - 5 * 86400000).toLocaleDateString('fr-FR'),
              due_date: new Date(Date.now() + 25 * 86400000).toLocaleDateString('fr-FR'),
              status: index % 3 === 0 ? "en_attente" as const : "a_jour" as const,
              reminders_sent: 0,
              formula: formula
            }
          ];
        });

        // Add standard fallback if no database clients exist yet
        if (generated.length === 0) {
          const fallbackOrg = "Orange Business Services";
          generated.push(
            {
              id: "fallback-inv-1",
              invoice_number: "FACT-2026-0982",
              client_id: "obs",
              organization: fallbackOrg,
              client_email: "obs.billing@orange-sonatel.com",
              client_phone: "+221 77 567 43 21",
              amount: 3500,
              issue_date: "01/05/2026",
              due_date: "15/05/2026",
              status: "en_retard",
              reminders_sent: 2,
              last_reminder_date: "18/05/2026",
              last_reminder_channel: "email",
              formula: "Platine"
            },
            {
              id: "fallback-inv-2",
              invoice_number: "FACT-2026-0983",
              client_id: "obs",
              organization: fallbackOrg,
              client_email: "obs.billing@orange-sonatel.com",
              client_phone: "+221 77 567 43 21",
              amount: 3500,
              issue_date: "15/05/2026",
              due_date: "30/05/2026",
              status: "en_attente",
              reminders_sent: 0,
              formula: "Platine"
            }
          );
        }

        setInvoices(generated);
        localStorage.setItem("soc_billing_invoices", JSON.stringify(generated));
      }

      // Load Reminders history logs
      const storedLogs = localStorage.getItem("soc_billing_reminders");
      if (storedLogs) {
        setRemindersLog(JSON.parse(storedLogs));
      } else {
        const dummyLogs: ReminderLog[] = [
          {
            id: "log-1",
            timestamp: new Date(Date.now() - 3 * 3600000 * 24).toLocaleString('fr-FR'),
            client_name: "OBS Security Division",
            invoice_number: "FACT-2026-0982",
            channel: "email",
            message: "Rappel concernant votre facture d'abonnement CyberSOC d'un montant de 3 500 €",
            status: "delivered"
          }
        ];
        setRemindersLog(dummyLogs);
        localStorage.setItem("soc_billing_reminders", JSON.stringify(dummyLogs));
      }

    } catch (e) {
      console.error("Error loading billing data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Update Body when Preset or Invoice changes
  useEffect(() => {
    if (selectedInvoice) {
      const template = PRESET_TEMPLATES[selectedPreset];
      const parsed = template.body
        .replace("[Nom]", selectedInvoice.organization)
        .replace("[Facture]", selectedInvoice.invoice_number)
        .replace("[Montant]", selectedInvoice.amount.toLocaleString())
        .replace("[Echeance]", selectedInvoice.due_date);
      setCustomBody(parsed);
    }
  }, [selectedPreset, selectedInvoice]);

  // Statistics
  const stats = {
    totalRevenue: invoices.reduce((acc, inv) => inv.status === "a_jour" ? acc + inv.amount : acc, 0),
    unpaidRevenue: invoices.reduce((acc, inv) => inv.status !== "a_jour" ? acc + inv.amount : acc, 0),
    overdueRevenue: invoices.reduce((acc, inv) => inv.status === "en_retard" ? acc + inv.amount : acc, 0),
    overdueCount: invoices.filter(inv => inv.status === "en_retard").length,
    remindersCount: remindersLog.length,
    recoveryRate: invoices.length > 0 
      ? Math.round((invoices.filter(i => i.status === "a_jour").length / invoices.length) * 100) 
      : 100
  };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getStatusBadge = (status: BillingStatus) => {
    switch (status) {
      case "a_jour":
        return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 gap-1 text-white font-extrabold shadow-sm"><CheckCircle className="h-3 w-3 stroke-[2.5]" /> À jour</Badge>;
      case "en_attente":
        return <Badge variant="secondary" className="bg-amber-500/10 border border-amber-500/20 text-amber-600 gap-1 font-extrabold"><Clock className="h-3 w-3" /> Échéance proche</Badge>;
      case "en_retard":
        return <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 gap-1 text-white font-extrabold animate-pulse"><XCircle className="h-3 w-3" /> En retard</Badge>;
    }
  };

  const triggerReminder = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setSelectedPreset("amical");
    setReminderChannel("email");
    setDrawerOpen(true);
  };

  const executeReminderSend = async () => {
    if (!selectedInvoice) return;
    setSending(true);
    setSendStep(1);
    setConsoleLogs(["[GATEWAY] Connexion à la passerelle Orange Business...", "[GATEWAY] Initialisation du protocole de transmission sécurisé..."]);

    const steps = [
      { delay: 1200, log: `[SMTP] Validation DKIM/SPF pour l'expéditeur billing@orange-sonatel.com... OK` },
      { delay: 2400, log: `[SMTP] Génération de l'e-mail avec gabarit de relance Sonatel SOC...` },
      { delay: 3500, log: `[SMS-OBS] Connexion au point de routage SMS Sonatel API (+221)...` },
      { delay: 4500, log: `[SMS-OBS] Message SMS encodé en GSM-7... OK` },
      { delay: 5800, log: `[GATEWAY] Dispatch du signal multicanal lancé...` },
      { delay: 6800, log: `[SUCCESS] Rappel envoyé avec succès à ${selectedInvoice.organization} !` }
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, steps[i].delay - (i === 0 ? 0 : steps[i-1].delay)));
      setSendStep(i + 2);
      setConsoleLogs(prev => [...prev, steps[i].log]);
    }

    // Update invoices list
    const updatedInvoices = invoices.map(inv => {
      if (inv.id === selectedInvoice.id) {
        return {
          ...inv,
          reminders_sent: inv.reminders_sent + 1,
          last_reminder_date: new Date().toLocaleDateString('fr-FR'),
          last_reminder_channel: reminderChannel
        };
      }
      return inv;
    });

    setInvoices(updatedInvoices);
    localStorage.setItem("soc_billing_invoices", JSON.stringify(updatedInvoices));

    // Update Logs
    const newLog: ReminderLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString('fr-FR'),
      client_name: selectedInvoice.organization,
      invoice_number: selectedInvoice.invoice_number,
      channel: reminderChannel,
      message: customBody.substring(0, 120) + (customBody.length > 120 ? "..." : ""),
      status: "delivered"
    };

    const updatedLogs = [newLog, ...remindersLog];
    setRemindersLog(updatedLogs);
    localStorage.setItem("soc_billing_reminders", JSON.stringify(updatedLogs));

    toast.success("Rappel transmis", {
      description: `La facture ${selectedInvoice.invoice_number} a fait l'objet d'une relance.`
    });

    setTimeout(() => {
      setSending(false);
      setDrawerOpen(false);
    }, 1000);
  };

  const handleExportCSV = () => {
    const headers = ["Numero Facture", "Client / Organisation", "Formule", "Date d'Emission", "Date d'Echeance", "Montant", "Statut"];
    const csvContent = [
      headers.join(","),
      ...invoices.map(i => 
        `"${i.invoice_number}","${i.organization}","${i.formula}","${i.issue_date}","${i.due_date}","${i.amount}","${i.status}"`
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `facturation_sonatel_soc_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = inv.organization.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0b0c10] transition-colors duration-300 relative overflow-hidden">
      
      {/* Background cyber blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        
        {/* Top Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <CreditCard className="h-6 w-6 text-amber-500 animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-amber-600 to-amber-800 dark:from-white dark:via-amber-500 dark:to-yellow-600 bg-clip-text text-transparent tracking-tight">
                  Module Facturation Clients
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Tableau de bord financier, abonnements actifs et outils de relance automatique.
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" className="shadow-sm rounded-xl font-bold bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-amber-500 transition-all duration-300" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4 text-amber-500" />
            Exporter l'état
          </Button>
        </div>

        {/* Tab Navigation pills */}
        <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-zinc-900 rounded-2xl mb-8 max-w-2xl">
          {[
            { id: "dashboard", label: "Tableau de Bord", icon: BarChart3 },
            { id: "invoices", label: "Factures & Échéances", icon: FileText },
            { id: "contracts", label: "Contrats Clients", icon: Briefcase },
            { id: "reminders", label: "Relances & Rappels", icon: BellRing }
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  window.location.hash = tab.id;
                  setActiveTab(tab.id);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-300 ${
                  active 
                    ? "bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-md scale-102"
                    : "text-muted-foreground hover:bg-slate-200 dark:hover:bg-zinc-850 hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* LOADING SHIMMER */}
        {loading ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-[400px] rounded-2xl" />
          </div>
        ) : (
          <>
            {/* TAB 1: TABLEAU DE BORD */}
            {activeTab === "dashboard" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Metrics row */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  
                  <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-850 shadow-md rounded-2xl hover:shadow-lg transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">Revenu Mensuel Perçu</span>
                      <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {stats.totalRevenue.toLocaleString()} €
                      </div>
                      <p className="text-[10px] text-emerald-500 font-bold mt-1">
                        +12.4% comparé au mois précédent
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-850 shadow-md rounded-2xl hover:shadow-lg transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">Encours non perçu</span>
                      <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
                        <Clock className="h-4 w-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {stats.unpaidRevenue.toLocaleString()} €
                      </div>
                      <p className="text-[10px] text-amber-500 font-bold mt-1">
                        En attente ou retard de facturation
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-850 shadow-md rounded-2xl hover:shadow-lg transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">Factures en Retard</span>
                      <div className="p-1.5 bg-red-500/10 text-red-500 rounded-lg">
                        <XCircle className="h-4 w-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-black text-red-500">
                        {stats.overdueRevenue.toLocaleString()} €
                      </div>
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        {stats.overdueCount} facture(s) en souffrance
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-850 shadow-md rounded-2xl hover:shadow-lg transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">Taux de Recouvrement</span>
                      <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-black text-blue-600">
                        {stats.recoveryRate} %
                      </div>
                      <p className="text-[10px] text-blue-500 font-bold mt-1">
                        {stats.remindersCount} rappels envoyés ce mois
                      </p>
                    </CardContent>
                  </Card>

                </div>

                {/* Main Graph & Alert Cards */}
                <div className="grid gap-8 lg:grid-cols-3">
                  
                  {/* Performance Panel */}
                  <Card className="lg:col-span-2 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800 shadow-xl rounded-2xl p-6">
                    <h3 className="text-sm font-black uppercase text-slate-500 tracking-wider mb-6 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-amber-500" /> Progression Mensuelle de Facturation
                    </h3>
                    <div className="h-[250px] flex items-end justify-between gap-2 pt-6">
                      {[
                        { month: "Jan", val: 4000, max: 7000 },
                        { month: "Féb", val: 5500, max: 7000 },
                        { month: "Mar", val: 6800, max: 7000 },
                        { month: "Avr", val: 7800, max: 9000 },
                        { month: "Mai", val: stats.totalRevenue, max: 12000 }
                      ].map((bar) => {
                        const pct = (bar.val / bar.max) * 100;
                        return (
                          <div key={bar.month} className="flex-1 flex flex-col items-center gap-2">
                            <div className="w-full bg-slate-100 dark:bg-zinc-950 rounded-xl h-[180px] relative overflow-hidden flex items-end">
                              <div 
                                className="w-full bg-gradient-to-t from-amber-600 to-yellow-400 rounded-t-xl transition-all duration-1000 ease-out"
                                style={{ height: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-black text-muted-foreground uppercase">{bar.month}</span>
                            <span className="text-[9px] font-mono text-muted-foreground/80 font-bold">{bar.val.toLocaleString()} €</span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Actions alert box */}
                  <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800 shadow-xl rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-black uppercase text-slate-500 tracking-wider mb-4 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" /> Actions Urgentes Recommandées
                      </h3>
                      <div className="space-y-4">
                        {invoices.filter(i => i.status === "en_retard").slice(0, 3).map(inv => (
                          <div key={inv.id} className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center justify-between">
                            <div className="text-xs">
                              <div className="font-extrabold text-slate-800 dark:text-zinc-200">{inv.organization}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{inv.invoice_number} · {inv.due_date}</div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 text-[10px] font-black uppercase tracking-wider text-red-500 hover:bg-red-500/10"
                              onClick={() => triggerReminder(inv)}
                            >
                              Relancer <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        {invoices.filter(i => i.status === "en_retard").length === 0 && (
                          <div className="text-center py-8 text-xs text-muted-foreground">
                            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                            Aucun retard de facturation ! Tous les comptes sont à jour.
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-150 dark:border-zinc-800 mt-4 flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Total retards :</span>
                      <span className="font-black text-red-500">{stats.overdueCount} facture(s)</span>
                    </div>
                  </Card>

                </div>
              </div>
            )}

            {/* TAB 2: FACTURES ET ECHEANCES */}
            {activeTab === "invoices" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                
                {/* Filters card */}
                <Card className="p-4 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-850 rounded-2xl shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        placeholder="Rechercher par numéro de facture ou client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant={statusFilter === "all" ? "default" : "outline"} className="rounded-xl text-xs font-extrabold uppercase tracking-wider" size="sm" onClick={() => setStatusFilter("all")}>Tous</Button>
                      <Button variant={statusFilter === "a_jour" ? "default" : "outline"} className="rounded-xl text-xs font-extrabold uppercase tracking-wider gap-2" size="sm" onClick={() => setStatusFilter("a_jour")}>
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Payé
                      </Button>
                      <Button variant={statusFilter === "en_attente" ? "default" : "outline"} className="rounded-xl text-xs font-extrabold uppercase tracking-wider gap-2" size="sm" onClick={() => setStatusFilter("en_attente")}>
                        <Clock className="h-3.5 w-3.5 text-amber-500" /> Échéance
                      </Button>
                      <Button variant={statusFilter === "en_retard" ? "default" : "outline"} className="rounded-xl text-xs font-extrabold uppercase tracking-wider gap-2" size="sm" onClick={() => setStatusFilter("en_retard")}>
                        <XCircle className="h-3.5 w-3.5 text-red-500" /> Retard
                      </Button>
                    </div>

                  </div>
                </Card>

                {/* Invoices List */}
                <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800 shadow-xl rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-850">
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4 pl-6">Facture</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4">Client / Organisation</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4">Formule SOC</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4">Échéance</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4">Montant</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4">Statut</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4">Relances</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4 text-right pr-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-16">
                              <CreditCard className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                              <p className="text-xs text-muted-foreground font-semibold">Aucune facture ne correspond à vos critères de recherche.</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredInvoices.map((inv) => (
                            <TableRow key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 border-b border-slate-100 dark:border-zinc-850 transition-colors">
                              <TableCell className="font-mono text-xs font-black text-slate-700 dark:text-zinc-350 py-4 pl-6">
                                {inv.invoice_number}
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="text-xs font-black text-slate-800 dark:text-zinc-100">{inv.organization}</div>
                                <div className="text-[10px] text-muted-foreground font-semibold">{inv.client_email}</div>
                              </TableCell>
                              <TableCell className="py-4">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-full text-[9px] font-extrabold uppercase">
                                  {inv.formula}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs font-semibold text-muted-foreground py-4">
                                {inv.due_date}
                              </TableCell>
                              <TableCell className="text-xs font-black text-slate-800 dark:text-zinc-200 py-4">
                                {inv.amount.toLocaleString()} €
                              </TableCell>
                              <TableCell className="py-4">
                                {getStatusBadge(inv.status)}
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                    {inv.reminders_sent} relance(s)
                                  </span>
                                  {inv.last_reminder_date && (
                                    <span className="text-[9px] text-muted-foreground font-semibold mt-0.5 uppercase">
                                      Le {inv.last_reminder_date} par {inv.last_reminder_channel}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right py-4 pr-6">
                                {inv.status !== "a_jour" ? (
                                  <Button 
                                    onClick={() => triggerReminder(inv)}
                                    className="h-8 text-[10px] font-black uppercase tracking-wider rounded-lg bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                                  >
                                    <Send className="h-3 w-3" />
                                    Relancer
                                  </Button>
                                ) : (
                                  <Button 
                                    variant="outline"
                                    className="h-8 text-[10px] font-black uppercase tracking-wider rounded-lg border-slate-200 dark:border-zinc-800 gap-1.5"
                                    onClick={() => toast.success("Facture payée", { description: `La facture ${inv.invoice_number} est close.` })}
                                  >
                                    <Check className="h-3 w-3 text-emerald-500 stroke-[3]" />
                                    Acquittée
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>

              </div>
            )}

            {/* TAB 3: CONTRATS CLIENTS */}
            {activeTab === "contracts" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800 shadow-xl rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-850">
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4 pl-6">Client / Organisation</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4">Formule active</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4">Contrat Budgétaire</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4">Statut Administratif</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4">Inscriptions</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4 text-right pr-6">Raccordements</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clients.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-16">
                              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                              <p className="text-xs text-muted-foreground font-semibold">Aucun contrat de client SOC enregistré.</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          clients.map((c, index) => {
                            const formulas = ["Platine", "Or", "Argent", "Bronze"];
                            const formula = formulas[index % formulas.length];
                            
                            return (
                              <TableRow key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 border-b border-slate-100 dark:border-zinc-850 transition-colors">
                                <TableCell className="py-4 pl-6">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                      <AvatarFallback className="bg-amber-500/10 text-amber-500 font-extrabold text-xs">
                                        {getInitials(c.organization || c.full_name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="text-xs font-black text-slate-800 dark:text-zinc-100">{c.organization || c.full_name || "—"}</div>
                                      <div className="text-[10px] text-muted-foreground font-semibold">{c.email}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-4">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">
                                    <Sparkles className="h-3 w-3" />
                                    {formula}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs font-mono text-slate-600 dark:text-zinc-400 py-4">
                                  SON-SOC-{1000 + index * 17}
                                </TableCell>
                                <TableCell className="py-4">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    c.is_active 
                                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                                      : "bg-red-500/10 text-red-600 border border-red-500/20"
                                  }`}>
                                    {c.is_active ? "Actif" : "Suspendu"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground py-4">
                                  Créé le {new Date(c.created_at).toLocaleDateString('fr-FR')}
                                </TableCell>
                                <TableCell className="text-right py-4 pr-6">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-zinc-800"
                                    onClick={() => toast.info("Profil Contrat", { description: "Affichage des détails de facturation client..." })}
                                  >
                                    Détails <ChevronRight className="ml-1 h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 4: HISTORIQUE DES RAPPELS */}
            {activeTab === "reminders" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <Card className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-slate-100 dark:border-zinc-800 shadow-xl rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-850">
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4 pl-6">Horodatage</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4">Client Relancé</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4">Facture ciblée</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4">Canal Utilisé</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4">Aperçu du rappel</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-4 text-right pr-6">Statut Passerelle</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {remindersLog.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-16">
                              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                              <p className="text-xs text-muted-foreground font-semibold">Aucun rappel de paiement envoyé pour le moment.</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          remindersLog.map((log) => (
                            <TableRow key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/20 border-b border-slate-100 dark:border-zinc-850 transition-colors">
                              <TableCell className="text-xs font-semibold text-muted-foreground py-4 pl-6">
                                {log.timestamp}
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="text-xs font-black text-slate-800 dark:text-zinc-100">{log.client_name}</div>
                              </TableCell>
                              <TableCell className="font-mono text-xs font-bold text-slate-700 dark:text-zinc-350 py-4">
                                {log.invoice_number}
                              </TableCell>
                              <TableCell className="py-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase ${
                                  log.channel === "email"
                                    ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                    : log.channel === "sms"
                                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                      : "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                                }`}>
                                  {log.channel === "email" && <Mail className="h-3 w-3" />}
                                  {log.channel === "sms" && <Smartphone className="h-3 w-3" />}
                                  {log.channel === "both" && <Phone className="h-3 w-3" />}
                                  {log.channel}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-xs truncate py-4 font-medium">
                                {log.message}
                              </TableCell>
                              <TableCell className="text-right py-4 pr-6">
                                <span className="inline-flex items-center gap-1 text-emerald-500 text-xs font-black">
                                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                                  Transmis
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}

      </div>

      {/* DYNAMIC PAYMENT REMINDER DRAWER */}
      {drawerOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          
          {/* Backdrop click closer */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => !sending && setDrawerOpen(false)} />

          {/* Drawer Body Container */}
          <div className="relative w-full max-w-5xl h-full bg-white dark:bg-[#0b0c10] shadow-2xl border-l border-slate-100 dark:border-zinc-850 flex flex-col z-10 animate-in slide-in-from-right duration-350">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-zinc-850 flex items-center justify-between bg-slate-50 dark:bg-zinc-950/20">
              <div>
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Passerelle de Relance Commerciale</span>
                <h2 className="text-xl font-extrabold text-slate-800 dark:text-zinc-100 mt-0.5">
                  Relance Facture · {selectedInvoice.invoice_number}
                </h2>
                <p className="text-xs text-muted-foreground font-semibold">
                  Envoyez instantanément une alerte de paiement par SMS ou E-mail à {selectedInvoice.organization}.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={sending}
                className="rounded-xl font-bold border-slate-200 dark:border-zinc-800 hover:border-amber-500"
                onClick={() => setDrawerOpen(false)}
              >
                Fermer
              </Button>
            </div>

            {/* Split Body Layout */}
            <div className="flex-1 overflow-y-auto grid lg:grid-cols-2">
              
              {/* Left Column: Input Form Settings */}
              <div className="p-8 space-y-6 border-r border-slate-100 dark:border-zinc-850">
                
                {/* 1. Channel Selector */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">1. Choisir le canal de relance</span>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "email" as const, label: "E-mail", desc: "Alerte de messagerie", icon: Mail },
                      { id: "sms" as const, label: "SMS direct", desc: "Alerte mobile (+221)", icon: Smartphone },
                      { id: "both" as const, label: "Multicanal", desc: "Mail + SMS d'urgence", icon: MessageSquare }
                    ].map((chan) => (
                      <div
                        key={chan.id}
                        onClick={() => !sending && setReminderChannel(chan.id)}
                        className={`cursor-pointer p-3 rounded-xl border flex flex-col justify-between transition-all duration-300 ${
                          reminderChannel === chan.id
                            ? "bg-amber-500/10 border-amber-500 shadow-sm"
                            : "border-slate-150 dark:border-zinc-850 hover:bg-slate-50"
                        }`}
                      >
                        <chan.icon className={`h-5 w-5 ${reminderChannel === chan.id ? "text-amber-500" : "text-muted-foreground"}`} />
                        <div className="mt-3">
                          <div className="text-xs font-black">{chan.label}</div>
                          <div className="text-[9px] text-muted-foreground/80 font-bold leading-tight mt-0.5">{chan.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="border-slate-100 dark:border-zinc-850" />

                {/* 2. Preset Template Selector */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">2. Niveau de sévérité du gabarit</span>
                  <div className="space-y-2">
                    {(["amical", "standard", "severe"] as const).map((pre) => (
                      <div
                        key={pre}
                        onClick={() => !sending && setSelectedPreset(pre)}
                        className={`cursor-pointer p-3.5 rounded-xl border flex items-center justify-between transition-all duration-300 ${
                          selectedPreset === pre
                            ? "bg-amber-500/10 border-amber-500"
                            : "border-slate-150 dark:border-zinc-850 hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-xs">
                          <div className="font-extrabold text-slate-800 dark:text-zinc-200">
                            {PRESET_TEMPLATES[pre].label}
                          </div>
                          <div className="text-[9px] text-muted-foreground font-semibold truncate max-w-xs mt-0.5">
                            {PRESET_TEMPLATES[pre].subject}
                          </div>
                        </div>
                        <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          selectedPreset === pre ? "border-amber-500 bg-amber-500 text-white" : "border-slate-300"
                        }`}>
                          {selectedPreset === pre && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="border-slate-100 dark:border-zinc-850" />

                {/* 3. Custom text editor */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">3. Personnaliser le contenu</span>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-muted-foreground uppercase">Objet de l'e-mail</span>
                    <Input 
                      value={PRESET_TEMPLATES[selectedPreset].subject} 
                      readOnly 
                      className="bg-slate-50 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-850 font-bold text-xs" 
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-muted-foreground uppercase">Corps du message</span>
                    <textarea
                      value={customBody}
                      disabled={sending}
                      onChange={(e) => setCustomBody(e.target.value)}
                      className="w-full min-h-[160px] p-3 text-xs bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-850 rounded-xl focus:border-amber-500 focus:ring-0 outline-none resize-none font-semibold leading-relaxed"
                    />
                  </div>
                </div>

              </div>

              {/* Right Column: Visual Device Mockup Preview */}
              <div className="p-8 bg-slate-50 dark:bg-zinc-950/30 flex flex-col items-center justify-center relative overflow-hidden">
                
                {/* Sending overlay */}
                {sending && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-20 flex flex-col items-center justify-center p-8 text-white font-mono">
                    <div className="w-full max-w-md space-y-4">
                      
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-amber-500 shrink-0" />
                        <div className="text-xs font-black uppercase tracking-widest">Transmission en cours (Étape {sendStep}/8)</div>
                      </div>

                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                          style={{ width: `${(sendStep / 8) * 100}%` }}
                        />
                      </div>

                      <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-800 h-[180px] overflow-y-auto space-y-1.5 text-[10px]">
                        {consoleLogs.map((log, index) => (
                          <div key={index} className="text-amber-500/80 font-bold leading-normal">
                            {log}
                          </div>
                        ))}
                      </div>

                    </div>
                  </div>
                )}

                {/* VISUAL MOCKUP SHELLS CONTAINER */}
                <div className="w-full max-w-sm">
                  
                  {/* SMS PREVIEW SHIELD */}
                  {reminderChannel === "sms" && (
                    <div className="w-[300px] h-[550px] bg-zinc-900 border-[8px] border-zinc-800 rounded-[40px] shadow-2xl relative flex flex-col overflow-hidden mx-auto">
                      
                      {/* Phone top notch */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-zinc-800 rounded-full flex items-center justify-center gap-1.5 z-10">
                        <div className="w-1.5 h-1.5 bg-black rounded-full" />
                        <div className="w-8 h-1 bg-zinc-700 rounded-full" />
                      </div>

                      {/* Screen content */}
                      <div className="flex-1 bg-slate-100 flex flex-col pt-9 px-4">
                        
                        {/* Conversation Header */}
                        <div className="flex flex-col items-center border-b pb-3 mb-4">
                          <Avatar className="h-10 w-10 border shadow-sm">
                            <AvatarFallback className="bg-amber-500 text-white font-extrabold text-sm">OS</AvatarFallback>
                          </Avatar>
                          <span className="text-[9px] font-bold text-slate-800 mt-1">Orange Sonatel SOC</span>
                          <span className="text-[7px] text-slate-400 font-semibold uppercase">En ligne</span>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 flex flex-col justify-end pb-8 space-y-3">
                          
                          <div className="p-3 bg-amber-500 text-white rounded-2xl rounded-tr-none text-[10px] font-bold leading-normal shadow-sm max-w-[85%] self-end">
                            {customBody.length > 200 ? customBody.substring(0, 200) + "..." : customBody}
                          </div>
                          
                          <span className="text-[7px] text-muted-foreground/60 font-semibold self-end">Distribué · À l'instant</span>

                        </div>

                      </div>

                    </div>
                  )}

                  {/* EMAIL CLIENT PREVIEW */}
                  {(reminderChannel === "email" || reminderChannel === "both") && (
                    <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[520px]">
                      
                      {/* Browser header tab */}
                      <div className="bg-slate-100 px-4 py-3 border-b flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2.5 h-2.5 bg-red-400 rounded-full" />
                          <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full" />
                          <div className="w-2.5 h-2.5 bg-green-400 rounded-full" />
                        </div>
                        <span className="text-[9px] text-muted-foreground font-bold tracking-tight bg-white border px-3 py-1 rounded-lg flex-1 text-center truncate">
                          Gabarit Relance Sonatel SOC · Facture {selectedInvoice.invoice_number}
                        </span>
                      </div>

                      {/* Mail Metadata */}
                      <div className="p-4 border-b text-[10px] space-y-1 bg-slate-50/50">
                        <div><span className="text-muted-foreground font-semibold">De :</span> <span className="font-extrabold text-slate-800">billing@orange-sonatel.com</span></div>
                        <div><span className="text-muted-foreground font-semibold">À :</span> <span className="font-extrabold text-slate-800">{selectedInvoice.client_email}</span></div>
                        <div><span className="text-muted-foreground font-semibold">Objet :</span> <span className="font-black text-amber-600">{PRESET_TEMPLATES[selectedPreset].subject}</span></div>
                      </div>

                      {/* Mail Body Layout */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        
                        {/* Email Header */}
                        <div className="flex items-center justify-between pb-3 border-b">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 bg-amber-500 rounded-lg text-white font-black flex items-center justify-center text-xs">O</span>
                            <span className="text-xs font-black tracking-tight">Orange Sonatel Business</span>
                          </div>
                          <span className="text-[8px] font-bold text-slate-400 tracking-wider">CYBERSOC PLATFORM</span>
                        </div>

                        {/* Email Text */}
                        <div className="text-[10px] text-slate-800 font-medium leading-relaxed whitespace-pre-line">
                          {customBody}
                        </div>

                        {/* Premium Billing Box Card */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-3">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-muted-foreground font-semibold">Prestation :</span>
                            <span className="font-black">Abonnement SOC {selectedInvoice.formula}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-muted-foreground font-semibold">N° Facture :</span>
                            <span className="font-black font-mono">{selectedInvoice.invoice_number}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-muted-foreground font-semibold">Échéance de paiement :</span>
                            <span className="font-black text-red-500">{selectedInvoice.due_date}</span>
                          </div>
                          
                          <Separator className="border-slate-100" />
                          
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Montant Net :</span>
                            <span className="text-xs font-extrabold text-amber-500">{selectedInvoice.amount.toLocaleString()} €</span>
                          </div>
                        </div>

                        {/* Payment CTA Call Button */}
                        <div className="text-center pt-2">
                          <Button 
                            className="bg-amber-500 text-white rounded-xl text-[10px] font-extrabold uppercase py-2 px-6 shadow hover:bg-amber-600 gap-1.5"
                            onClick={() => {}}
                          >
                            Régler la facture en ligne
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <div className="text-[8px] text-muted-foreground/80 mt-2 font-semibold">
                            Paiement sécurisé via Orange Money Pro ou virement bancaire.
                          </div>
                        </div>

                      </div>

                    </div>
                  )}

                </div>

              </div>

            </div>

            {/* Footer buttons */}
            <div className="p-4 border-t border-slate-100 dark:border-zinc-850 flex items-center justify-between bg-slate-50 dark:bg-zinc-950/20">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                {reminderChannel === "both" ? "2 messages à transmettre" : "1 message à transmettre"}
              </span>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  disabled={sending}
                  className="rounded-xl font-bold bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                  onClick={() => setDrawerOpen(false)}
                >
                  Annuler
                </Button>
                <Button 
                  disabled={sending}
                  className="rounded-xl font-extrabold bg-amber-500 hover:bg-amber-600 text-white px-6 gap-2"
                  onClick={executeReminderSend}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Envoyer le rappel
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
