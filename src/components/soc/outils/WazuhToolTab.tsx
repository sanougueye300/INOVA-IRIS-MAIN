import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockWazuhAgents, mockWazuhRules, mockMitreTechniques } from "@/lib/soc-mock";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Server, Shield, Settings, Package, Network, PlugZap, FileText } from "lucide-react";

export function WazuhToolTab() {
  const [rules, setRules] = useState(mockWazuhRules);

  const toggleRule = (id: string, enabled: boolean) => {
    setRules((r) => r.map((x) => (x.id === id ? { ...x, enabled } : x)));
    toast.message(`Règle ${id}`, { description: enabled ? "Réactivée (session démo)" : "Désactivée temporairement (session démo)" });
  };

  const exportToHive = () => {
    toast.success("Export vers TheHive", { description: "Simulation : cas brouillon TH-XXXX créé (API TheHive à brancher)." });
  };

  const generateReport = () => {
    toast.success("Rapport généré", { description: "Rapport de conformité CIS Benchmark (PDF) — télécharger." });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Wazuh</h2>
        <p className="text-sm text-muted-foreground">SIEM & détection : agents, règles, corrélation MITRE, inventaire, conformité — données de démonstration.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex h-auto min-h-10 flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Présentation</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="rules">Règles</TabsTrigger>
          <TabsTrigger value="inventory">Inventaire</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="reports">Rapports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-6">
            <h3 className="text-2xl font-bold text-primary mb-2">Wazuh : Plateforme de Sécurité Unifiée</h3>
            <p className="text-muted-foreground mb-8">Wazuh est une solution open-source complète de SIEM (Security Information and Event Management) et XDR (Extended Detection and Response), constituant le cœur de la détection et de la surveillance pour un SOC.</p>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-primary"/> Collecte & Analyse de Logs</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Surveillance temps réel des journaux systèmes, applications et réseau.</li>
                  <li>Normalisation, enrichissement et corrélation automatique des événements.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-primary"/> Intégrité des Fichiers (FIM)</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Détection des modifications non autorisées (fichiers, base de registre).</li>
                  <li>Alerte immédiate en cas de changement ou de suppression suspecte.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><Network className="w-5 h-5 text-primary"/> Détection des Vulnérabilités</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Scan automatisé des systèmes pour détecter les logiciels obsolètes (CVE).</li>
                  <li>Comparaison en continu avec les bases de données de vulnérabilités globales.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><Server className="w-5 h-5 text-primary"/> Détection Malware & Rootkits</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Analyse comportementale des processus, des ports ouverts et des fichiers cachés.</li>
                  <li>Utilisation de signatures croisées et d'heuristiques avancées.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><PlugZap className="w-5 h-5 text-primary"/> Réponse aux Incidents</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Exécution d'actions de réponse prédéfinies (Active Response).</li>
                  <li>Intégration fluide pour l'automatisation et l'orchestration des workflows.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><Settings className="w-5 h-5 text-primary"/> Conformité & Audits</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Aide à la conformité aux standards du marché (PCI DSS, GDPR, NIS2, CIS).</li>
                  <li>Génération de rapports et tableaux de bord d'audit consolidés.</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="agents">

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Arbre des agents</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Dernières logs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockWazuhAgents.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.id}</TableCell>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === "active" ? "secondary" : "destructive"}>{a.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.version}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(a.lastLogAt).toLocaleString("fr-FR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Règles actives</h3>
              </div>
              <Button size="sm" variant="outline" onClick={exportToHive}>
                Exporter alertes → TheHive
              </Button>
            </div>
            <ul className="space-y-3">
              {rules.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs">{r.id}</p>
                    <p className="text-sm">{r.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">niv. {r.level}</span>
                    <Switch checked={r.enabled} onCheckedChange={(v) => toggleRule(r.id, v)} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 font-semibold">Techniques MITRE détectées</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockMitreTechniques}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="id" stroke="currentColor" fontSize={10} />
                  <YAxis allowDecimals={false} stroke="currentColor" fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Inventaire des logiciels</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Détection automatique des applications installées et versions vulnérables (CVE).</p>
            <div className="space-y-2">
              {[
                { name: "OpenSSL", version: "1.1.1a", vulnerable: true, cve: "CVE-2023-1255" },
                { name: "Apache2", version: "2.4.52", vulnerable: false, cve: null },
                { name: "Python", version: "3.8.10", vulnerable: true, cve: "CVE-2021-3737" },
                { name: "Node.js", version: "14.21.3", vulnerable: true, cve: "CVE-2022-43548" },
              ].map((pkg) => (
                <div key={pkg.name} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{pkg.name}</p>
                    <p className="text-xs text-muted-foreground">{pkg.version}</p>
                  </div>
                  {pkg.vulnerable && (
                    <Badge variant="destructive" className="text-xs">{pkg.cve}</Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Gestion de configuration & Durcissement</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Audit et application de configurations sécurisées (CIS, GDPR, PCI-DSS).</p>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { benchmark: "CIS Benchmark (Linux)", compliance: 87 },
                { benchmark: "PCI-DSS 3.2", compliance: 92 },
                { benchmark: "GDPR Readiness", compliance: 78 },
                { benchmark: "SSH Hardening", compliance: 95 },
              ].map((item) => (
                <Card key={item.benchmark} className="p-3 border-border/60">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium">{item.benchmark}</p>
                    <Badge variant="secondary">{item.compliance}%</Badge>
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${item.compliance}%` }} />
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Génération de rapports personnalisés</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Rapports de sécurité, conformité et métriques automatisés.</p>
            <div className="space-y-2">
              {[
                { title: "Rapport hebdomadaire de sécurité", format: "PDF" },
                { title: "Métriques de conformité CIS", format: "HTML" },
                { title: "Alertes par technique MITRE", format: "CSV" },
                { title: "Résumé exécutif", format: "PDF" },
              ].map((report) => (
                <div key={report.title} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <div>
                    <p className="text-sm font-medium">{report.title}</p>
                    <p className="text-xs text-muted-foreground">{report.format}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={generateReport}>
                    Générer
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
