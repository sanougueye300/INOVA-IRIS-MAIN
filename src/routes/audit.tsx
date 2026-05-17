import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequireAuth } from "@/components/RequireAuth";
import { FileText, Search, Download, Filter, Eye, ShieldAlert, User, Server, Terminal, Lock } from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredLogs = AUDIT_LOGS.filter((log) => {
    const matchesSearch = 
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success": return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">Succès</Badge>;
      case "failure": return <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/20">Échec</Badge>;
      case "warning": return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20">Alerte</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes("LOGIN")) return <User className="h-4 w-4 text-blue-500" />;
    if (action.includes("CONFIG")) return <Server className="h-4 w-4 text-purple-500" />;
    if (action.includes("INCIDENT") || action.includes("PLAYBOOK")) return <ShieldAlert className="h-4 w-4 text-amber-500" />;
    if (action.includes("CREATE")) return <Lock className="h-4 w-4 text-emerald-500" />;
    return <Terminal className="h-4 w-4 text-muted-foreground" />;
  };

  const handleExportCSV = () => {
    const headers = ["ID Trace", "Date", "Acteur", "Action", "Ressource Cible", "IP", "Statut", "Détails"];
    const csvContent = [
      headers.join(","),
      ...filteredLogs.map(log => 
        `"${log.id}","${log.date}","${log.user}","${log.action}","${log.resource}","${log.ip}","${log.status}","${log.details.replace(/"/g, '""')}"`
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                Journaux d'Audit SOC
              </h1>
            </div>
            <p className="text-muted-foreground">
              Traçabilité complète, immuable et cryptographiquement sécurisée des actions système et utilisateurs.
            </p>
          </div>
          <Button variant="outline" className="shadow-sm bg-white dark:bg-zinc-950" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export CSV / PDF sécurisé
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4 shadow-sm border-border/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher par utilisateur, action, ressource..." 
                className="pl-9 bg-background focus:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="success">Succès</SelectItem>
                  <SelectItem value="failure">Échec</SelectItem>
                  <SelectItem value="warning">Alerte / Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="shadow-lg border-border/50 overflow-hidden bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[180px]">Horodatage</TableHead>
                  <TableHead>Acteur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Ressource Cible</TableHead>
                  <TableHead>IP Source</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      Aucun journal d'audit ne correspond à votre recherche.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {log.date}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{log.user}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="font-mono text-[11px] font-bold tracking-wide">{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{log.resource}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{log.ip}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:text-primary">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Détails de l'événement d'audit
                              </DialogTitle>
                              <DialogDescription>
                                Payload JSON immuable de l'action système.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-lg border border-border">
                                <div><span className="text-muted-foreground">ID Trace:</span> <span className="font-mono font-bold">{log.id}</span></div>
                                <div><span className="text-muted-foreground">Acteur:</span> <span className="font-semibold">{log.user}</span></div>
                                <div><span className="text-muted-foreground">Action:</span> <span className="font-mono font-bold">{log.action}</span></div>
                                <div><span className="text-muted-foreground">Ressource:</span> <span>{log.resource}</span></div>
                                <div><span className="text-muted-foreground">Date:</span> <span>{log.date}</span></div>
                                <div><span className="text-muted-foreground">Adresse IP:</span> <span className="font-mono">{log.ip}</span></div>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Payload (Raw Data)</h4>
                                <pre className="bg-zinc-950 text-emerald-400 font-mono text-xs p-4 rounded-xl border border-zinc-900 overflow-x-auto shadow-inner">
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
        </Card>
      </div>
    </div>
  );
}
