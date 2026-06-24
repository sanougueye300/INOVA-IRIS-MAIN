import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { 
  FileText, Search, Download, Filter, Eye, ShieldAlert, User, 
  Server, Terminal, Lock, CheckCircle2, AlertTriangle, XCircle, 
  Activity, Database, Calendar, ChevronLeft, ChevronRight, Building2 
} from "lucide-react";
import * as XLSX from "xlsx-js-style";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Journaux d'Audit — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><AdminAuditLogs /></RequireAuth>,
});

// Mock Audit Logs
const AUDIT_LOGS = [
  { id: "al-001", date: "17 Mai 2026 14:32:01", user: "admin@sonatel.com", action: "UPDATE_CONFIG", resource: "Wazuh API", ip: "192.168.1.45", status: "success", details: '{"endpoint":"/manager/configuration", "method":"PUT", "changes":["syscheck.frequency: 43200"]}' },
  { id: "al-002", date: "17 Mai 2026 14:15:22", user: "analyst1@sonatel.com", action: "CLOSE_INCIDENT", resource: "TheHive Case #TH-4829", ip: "10.0.4.12", status: "success", details: '{"caseId":"TH-4829", "resolutionStatus":"TruePositive", "summary":"Malware isolé et supprimé par EDR."}' },
  { id: "al-003", date: "17 Mai 2026 13:05:11", user: "system", action: "TRIGGER_PLAYBOOK", resource: "Shuffle Workflow", ip: "127.0.0.1", status: "success", details: '{"playbook":"Auto_Isolate_Host", "trigger":"Wazuh_Alert_100200", "executionTime":"1.2s"}' },
  { id: "al-004", date: "17 Mai 2026 11:42:55", user: "manager@sonatel.com", action: "USER_LOGIN_FAILED", resource: "Auth Service", ip: "41.82.19.123", status: "failure", details: '{"reason":"Invalid MFA Token", "attempts": 3, "location":"Dakar, SN"}' },
  { id: "al-005", date: "17 Mai 2026 11:45:02", user: "manager@sonatel.com", action: "USER_LOGIN", resource: "Auth Service", ip: "41.82.19.123", status: "success", details: '{"mfa":"Verified", "sessionType":"Web", "userAgent":"Mozilla/5.0"}' },
  { id: "al-006", date: "16 Mai 2026 18:20:00", user: "system", action: "API_QUOTA_WARNING", resource: "VirusTotal API", ip: "127.0.0.1", status: "warning", details: '{"quota_used": 850, "quota_limit": 1000, "message":"Approaching daily limit"}' },
  { id: "al-007", date: "16 Mai 2026 09:12:33", user: "admin@sonatel.com", action: "CREATE_CLIENT", resource: "Client Management", ip: "192.168.1.45", status: "success", details: '{"clientId":"cl-8821", "organization":"Orange CI", "role":"Client"}' },
];

function AdminAuditLogs() {
  const { roles, organization, user } = useAuth();
  const isClientOnly = roles.includes("client") && !roles.includes("admin") && !roles.includes("analyste") && !roles.includes("manager");

  // Filter logs to show only the client's organization when client-only
  const BASE_LOGS = isClientOnly
    ? AUDIT_LOGS.filter(log =>
        // Show logs related to this user's email or organization
        log.user === (user?.email ?? "") ||
        log.user === "system" && log.resource.toLowerCase().includes((organization ?? "").toLowerCase())
      )
    : AUDIT_LOGS;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const filteredLogs = BASE_LOGS.filter((log) => {
    const matchesSearch = 
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Paginated items
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const paginatedLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);


  // Calculate statistics
  const totalEvents = BASE_LOGS.length;
  const successEvents = BASE_LOGS.filter(l => l.status === "success").length;
  const failureEvents = BASE_LOGS.filter(l => l.status === "failure").length;
  const warningEvents = BASE_LOGS.filter(l => l.status === "warning").length;
  const successRate = totalEvents > 0 ? Math.round((successEvents / totalEvents) * 100) : 0;
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success": 
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100/80 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit font-bold text-[10px]">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Succès
          </Badge>
        );
      case "failure": 
        return (
          <Badge className="bg-rose-50 text-rose-700 border border-rose-200/60 hover:bg-rose-100/80 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit font-bold text-[10px]">
            <XCircle className="h-3 w-3 text-rose-600" /> Échec
          </Badge>
        );
      case "warning": 
        return (
          <Badge className="bg-amber-50 text-amber-750 border border-amber-200/65 hover:bg-amber-100/80 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit font-bold text-[10px]">
            <AlertTriangle className="h-3 w-3 text-amber-600" /> Alerte
          </Badge>
        );
      default: 
        return <Badge variant="outline" className="px-2.5 py-1 rounded-full font-bold text-[10px]">{status}</Badge>;
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes("LOGIN")) return <User className="h-3.5 w-3.5 text-blue-600" />;
    if (action.includes("CONFIG")) return <Server className="h-3.5 w-3.5 text-purple-650" />;
    if (action.includes("INCIDENT") || action.includes("PLAYBOOK")) return <ShieldAlert className="h-3.5 w-3.5 text-orange-600" />;
    if (action.includes("CREATE")) return <Lock className="h-3.5 w-3.5 text-emerald-650" />;
    return <Terminal className="h-3.5 w-3.5 text-slate-500" />;
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      
      const headers = [
        "ID Trace",
        "Horodatage",
        "Acteur (Utilisateur)",
        "Action",
        "Ressource Cible",
        "IP Source",
        "Statut de l'action",
        "Détails techniques (JSON Payload)"
      ];
      
      const dataRows = filteredLogs.map(log => [
        log.id,
        log.date,
        log.user,
        log.action,
        log.resource,
        log.ip,
        log.status.toUpperCase(),
        log.details
      ]);
      
      const aoa = [headers, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      
      // Auto-fit widths with limits
      const maxLen = headers.map((h, i) => {
        return Math.max(h.length, ...dataRows.map(row => String(row[i] || '').length));
      });
      ws['!cols'] = maxLen.map(len => ({ wch: Math.min(Math.max(len + 3, 10), 60) }));
      
      // Theme Orange / Sonatel styling for the spreadsheet
      const headerStyle = {
        font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "FF7900" } }, // Orange Sonatel
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "D3D3D3" } },
          bottom: { style: "medium", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "D3D3D3" } },
          right: { style: "thin", color: { rgb: "D3D3D3" } }
        }
      };
      
      const rowStyleEven = {
        font: { name: "Segoe UI", sz: 10 },
        fill: { fgColor: { rgb: "F9FAFB" } }, // Light grey zebra
        border: {
          bottom: { style: "thin", color: { rgb: "E5E7EB" } },
          left: { style: "thin", color: { rgb: "E5E7EB" } },
          right: { style: "thin", color: { rgb: "E5E7EB" } }
        }
      };
      
      const rowStyleOdd = {
        font: { name: "Segoe UI", sz: 10 },
        fill: { fgColor: { rgb: "FFFFFF" } },
        border: {
          bottom: { style: "thin", color: { rgb: "E5E7EB" } },
          left: { style: "thin", color: { rgb: "E5E7EB" } },
          right: { style: "thin", color: { rgb: "E5E7EB" } }
        }
      };
      
      // Apply styles to all sheet cells
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:H1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[cellRef];
          if (!cell) continue;
          
          if (R === 0) {
            cell.s = headerStyle;
          } else {
            const baseStyle = R % 2 === 0 ? rowStyleEven : rowStyleOdd;
            if (C === 6) { // Statut cell styling
              const val = String(cell.v).toLowerCase();
              let statusColor = "1F2937";
              let statusBg = "F3F4F6";
              if (val === "success") {
                statusColor = "16A34A"; // green-600
                statusBg = "DCFCE7";    // green-100
              } else if (val === "failure") {
                statusColor = "DC2626"; // red-600
                statusBg = "FEE2E2";    // red-100
              } else if (val === "warning") {
                statusColor = "D97706"; // amber-600
                statusBg = "FEF3C7";    // amber-100
              }
              cell.s = {
                ...baseStyle,
                font: { ...baseStyle.font, color: { rgb: statusColor }, bold: true },
                fill: { fgColor: { rgb: statusBg } },
                alignment: { horizontal: "center", vertical: "center" }
              };
            } else if (C === 7) { // JSON Payload wrap text
              cell.s = {
                ...baseStyle,
                alignment: { horizontal: "left", vertical: "top", wrapText: true }
              };
            } else {
              cell.s = baseStyle;
            }
          }
        }
      }
      
      XLSX.utils.book_append_sheet(wb, ws, "Journaux d'Audit SOC");
      XLSX.writeFile(wb, `Audit_Logs_Sonatel_SOC_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Failed to export Excel", error);
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* Decorative gradient overlay - constrained within the relative wrapper */}
      <div className="absolute top-0 left-0 right-0 h-[280px] bg-gradient-to-b from-orange-500/5 via-slate-50/0 to-slate-50 dark:via-slate-950/0 to-slate-950 pointer-events-none" />

      <div className="relative container mx-auto px-6 py-10 max-w-7xl space-y-10">
        
        {/* Header Block — bandeau photo Sonatel HQ en arrière-plan */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-800/60 shadow-xl"
          style={{ backgroundColor: "#0f172a" }}>
          {/* Image de fond : tente .jpg → .png → .webp → .jpeg, sinon fond sombre */}
          <img
            src="/sonatel-hq.jpg"
            alt=""
            aria-hidden="true"
            onError={(e) => {
              const el = e.currentTarget;
              const exts = ["/sonatel-hq.png", "/sonatel-hq.webp", "/sonatel-hq.jpeg"];
              const i = Number(el.dataset.i || "0");
              if (i < exts.length) { el.dataset.i = String(i + 1); el.src = exts[i]; }
              else { el.style.display = "none"; }
            }}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
          {/* Overlay dégradé pour lisibilité du texte */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-900/40 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300" />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-7 lg:p-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 shadow-md shadow-orange-500/30">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl drop-shadow-lg">
                    {isClientOnly ? "Mes Journaux d'Activité" : "Journaux d'Audit SOC"}
                  </h1>
                  <p className="text-[11px] font-mono text-orange-400 uppercase tracking-wider">
                    {isClientOnly ? "HISTORIQUE DE VOTRE ORGANISATION" : "TRAÇABILITÉ IMMUABLE & CONTRÔLE DE SÉCURITÉ"}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-200/90 max-w-2xl drop-shadow">
                {isClientOnly
                  ? "Consultez l'historique de toutes les actions effectuées par les utilisateurs de votre organisation."
                  : "Historique complet et cryptographiquement sécurisé de toutes les actions administratives, techniques et utilisateurs effectuées sur la plateforme."}
              </p>
              {isClientOnly && organization && (
                <div className="flex items-center gap-2 mt-1">
                  <Building2 className="h-3.5 w-3.5 text-sky-400" />
                  <span className="text-xs font-bold text-sky-300">{organization}</span>
                  <Badge className="bg-sky-500/20 text-sky-200 border-sky-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Mon organisation
                  </Badge>
                </div>
              )}
            </div>

            <Button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="relative overflow-hidden group h-12 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold shadow-lg shadow-orange-500/30 border-none transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shrink-0"
            >
              <span className="flex items-center gap-2">
                <Download className={`h-4.5 w-4.5 ${isExporting ? 'animate-bounce' : 'group-hover:translate-y-0.5 transition-transform'}`} />
                {isExporting ? "Génération Excel..." : "Exporter au format Excel"}
              </span>
            </Button>
          </div>
        </div>

        {/* Next-gen Dashboard Statistics Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              title: "Événements Total",
              value: totalEvents,
              description: "Actions enregistrées au total",
              icon: Activity,
              color: "text-blue-600 bg-blue-50 border-blue-100 dark:text-blue-400 dark:bg-blue-500/5 dark:border-blue-500/10",
            },
            {
              title: "Taux de Réussite",
              value: `${successRate}%`,
              description: `${successEvents} opérations réussies`,
              icon: CheckCircle2,
              color: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/5 dark:border-emerald-500/10",
            },
            {
              title: "Alertes / Warnings",
              value: warningEvents,
              description: "Attention requise",
              icon: AlertTriangle,
              color: "text-amber-600 bg-amber-50 border-amber-105 dark:text-amber-450 dark:bg-amber-500/5 dark:border-amber-500/10",
            },
            {
              title: "Échecs Critiques",
              value: failureEvents,
              description: "Erreurs système ou authentification",
              icon: XCircle,
              color: "text-rose-600 bg-rose-50 border-rose-100 dark:text-rose-450 dark:bg-rose-500/5 dark:border-rose-500/10",
            }
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className={`relative overflow-hidden border ${stat.color} bg-white dark:bg-slate-900/40 dark:backdrop-blur-xl rounded-2xl p-5 shadow-sm hover:shadow-md transition-all`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{stat.title}</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                  </div>
                  <div className="p-2.5 rounded-xl">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2.5 text-[10px] text-slate-500 font-medium">{stat.description}</p>
              </Card>
            );
          })}
        </div>

        {/* Filter and Control Area */}
        <Card className="border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/30 dark:backdrop-blur-xl rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-450" />
              <Input 
                placeholder="Rechercher par utilisateur, action, ressource ou IP..." 
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/5 focus:border-orange-500/50 dark:focus:border-orange-500/50 focus:bg-white dark:focus:bg-slate-950 text-sm text-slate-800 dark:text-slate-105 placeholder-slate-400 dark:placeholder-slate-500 transition-all focus:ring-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/5">
                <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Filtrer</span>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/5 focus:border-orange-500/50 dark:focus:border-orange-500/50 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs rounded-xl">
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="success">Succès</SelectItem>
                  <SelectItem value="failure">Échec</SelectItem>
                  <SelectItem value="warning">Alerte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Audit Log Table Container */}
        <Card className="border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/30 dark:backdrop-blur-xl rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-white/5">
                <TableRow>
                  <TableHead className="w-[160px] py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Horodatage</TableHead>
                  <TableHead className="py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Acteur / Initiateur</TableHead>
                  <TableHead className="py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Action</TableHead>
                  <TableHead className="py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ressource Cible</TableHead>
                  <TableHead className="py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">IP Source</TableHead>
                  <TableHead className="py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Statut</TableHead>
                  <TableHead className="w-[100px] text-right py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 dark:divide-white/5">
                {paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-slate-400 dark:text-slate-500">
                      Aucun journal d'audit ne correspond aux critères de recherche.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors duration-150 group">
                      <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400 py-4.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-450 dark:text-slate-500" />
                          <span>{log.date}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4.5">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            {log.user === "system" ? "SYS" : log.user.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs">{log.user}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5">
                            {getActionIcon(log.action)}
                          </div>
                          <span className="font-mono text-[10px] font-bold tracking-wide text-slate-700 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/40 px-2 py-0.5 rounded border border-slate-200 dark:border-white/5">{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-300 py-4.5">
                        <div className="flex items-center gap-2">
                          <Database className="h-3.5 w-3.5 text-orange-500/70" />
                          <span>{log.resource}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400 py-4.5">
                        <span className="px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5">{log.ip}</span>
                      </TableCell>
                      <TableCell className="py-4.5">{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-right py-4.5">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-950 hover:bg-orange-500 dark:hover:bg-orange-500 hover:text-white border border-slate-200 dark:border-white/5 hover:border-orange-500 dark:hover:border-orange-500 text-slate-400 dark:text-slate-500 transition-all duration-200 cursor-pointer">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-3xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-slate-900 dark:text-white">
                                <div className="h-8 w-8 rounded-lg bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center">
                                  <FileText className="h-4.5 w-4.5 text-orange-600 dark:text-orange-500" />
                                </div>
                                Détails de l'événement d'audit
                              </DialogTitle>
                              <DialogDescription className="text-slate-500 dark:text-slate-405 text-xs">
                                Payload JSON immuable et métadonnées de l'action enregistrée.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-5 py-4">
                              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                                <div><span className="text-slate-500 dark:text-slate-500 font-bold">ID Trace :</span> <span className="font-mono font-bold text-slate-700 dark:text-slate-300 ml-1">{log.id}</span></div>
                                <div><span className="text-slate-500 dark:text-slate-500 font-bold">Acteur :</span> <span className="font-semibold text-slate-700 dark:text-slate-300 ml-1">{log.user}</span></div>
                                <div><span className="text-slate-500 dark:text-slate-500 font-bold">Action :</span> <span className="font-mono font-bold text-orange-650 dark:text-orange-500 ml-1">{log.action}</span></div>
                                <div><span className="text-slate-500 dark:text-slate-500 font-bold">Ressource :</span> <span className="text-slate-700 dark:text-slate-300 ml-1">{log.resource}</span></div>
                                <div><span className="text-slate-550 dark:text-slate-500 font-bold">Date & Heure :</span> <span className="text-slate-750 dark:text-slate-305 ml-1">{log.date}</span></div>
                                <div><span className="text-slate-500 dark:text-slate-500 font-bold">Adresse IP :</span> <span className="font-mono text-slate-700 dark:text-slate-300 ml-1">{log.ip}</span></div>
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payload technique (Brut)</h4>
                                <pre className="bg-slate-900 text-orange-400 font-mono text-xs p-5 rounded-2xl border border-slate-800 overflow-x-auto shadow-inner max-h-[200px]">
                                  <code>{JSON.stringify(JSON.parse(log.details), null, 2)}</code>
                                </pre>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-200 dark:border-white/5">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium sm:w-1/3 text-left">
                Affichage de <span className="font-semibold text-slate-700 dark:text-slate-200">{indexOfFirstItem + 1}</span> à{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {Math.min(indexOfLastItem, totalItems)}
                </span>{" "}
                sur <span className="font-semibold text-slate-700 dark:text-slate-200">{totalItems}</span> entrées
              </p>
              
              <div className="flex items-center justify-center gap-1.5 sm:w-1/3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-800 disabled:opacity-50 cursor-pointer"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  const isActive = currentPage === pageNum;
                  return (
                    <Button
                      key={pageNum}
                      variant={isActive ? "default" : "outline"}
                      className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-none shadow-sm"
                          : "bg-white dark:bg-slate-950 border-slate-200 dark:border-white/5 text-slate-650 hover:text-slate-850"
                      }`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-800 disabled:opacity-50 cursor-pointer"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="hidden sm:block sm:w-1/3" />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

