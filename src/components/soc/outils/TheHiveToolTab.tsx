import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockTheHiveCases } from "@/lib/soc-mock";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bug, Link2, Webhook, LayoutTemplate, Download, Lock, CheckCircle2, Eye, GitMerge, MessageSquare, PieChart, RefreshCw } from "lucide-react";

const stageStyle: Record<string, string> = {
  open: "border-amber-500/50 bg-amber-500/5",
  in_progress: "border-sky-500/50 bg-sky-500/5",
  resolved: "border-emerald-500/50 bg-emerald-500/5",
  closed: "border-muted bg-muted/30",
};

type KanbanStage = "open" | "in_progress" | "resolved" | "closed";
interface KanbanCase { id: string; title: string; severity: number; stage: KanbanStage }
interface CaseRow { id: string; external_id: string | null; title: string; severity: number; status: string | null; stage: string | null }

/** Mappe le status/stage TheHive vers une colonne du Kanban. */
function toStage(c: { status?: string | null; stage?: string | null }): KanbanStage {
  const s = (c.status ?? "").toLowerCase();
  const st = (c.stage ?? "").toLowerCase();
  if (s.includes("resolv")) return "resolved";
  if (s.includes("clos") || s.includes("duplicat") || st.includes("clos")) return "closed";
  if (st.includes("progress")) return "in_progress";
  return "open";
}

/** Kanban (cas TheHive réels) + timeline + stats + intégrations. */
export function TheHiveToolTab() {
  const [cases, setCases] = useState<KanbanCase[]>(
    mockTheHiveCases.map((c) => ({ id: c.id, title: c.title, severity: c.severity, stage: c.stage as KanbanStage })),
  );
  const [isReal, setIsReal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchCases = useCallback(async () => {
    try {
      // thehive_cases n'est pas dans les types Supabase générés → accès non typé localisé
      const { data, error } = await (supabase.from as unknown as (t: string) => ReturnType<typeof supabase.from>)("thehive_cases")
        .select("id, external_id, title, severity, status, stage")
        .order("created_at_thehive", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data ?? []) as CaseRow[];
      if (rows.length > 0) {
        setCases(rows.map((c) => ({
          id: c.external_id ?? c.id,
          title: c.title,
          severity: c.severity,
          stage: toStage(c),
        })));
        setIsReal(true);
      } else {
        setIsReal(false);
      }
    } catch {
      // conserve les données de démo en cas d'échec
    }
  }, []);

  useEffect(() => { void fetchCases(); }, [fetchCases]);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-thehive-cases");
      if (error) throw error;
      toast.success("Synchronisation TheHive", { description: `${data?.imported ?? 0} cas importés sur ${data?.total ?? 0}` });
      await fetchCases();
    } catch (e) {
      toast.error("Échec de la synchronisation", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSyncing(false);
    }
  }, [fetchCases]);

  const cols: { key: KanbanStage; title: string }[] = [
    { key: "open", title: "Ouvert" },
    { key: "in_progress", title: "En cours" },
    { key: "resolved", title: "Résolu" },
    { key: "closed", title: "Fermé" },
  ];

  const avgByType: Record<string, number> = { intrusion: 18, malware: 42, recon: 6, phishing: 24 };

  const linkMisp = () => {
    toast.success("Lier à MISP", { description: "Observable sélectionné → événement MISP (simulation)." });
  };

  const exportIocs = () => {
    toast.success("Export d'IOCs", { description: "IOCs exportés vers MISP, pare-feu et SIEM (simulation)." });
  };

  const createCaseFromAlert = () => {
    toast.success("Cas créé", { description: "Nouveau cas créé depuis alerte Wazuh avec template « Intrusion »." });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">TheHive</h2>
        <p className="text-sm text-muted-foreground">Gestion de cas, observables, intégrations multi-source et réponse aux incidents (démo).</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex h-auto min-h-10 flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Présentation</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="integrations">Intégrations</TabsTrigger>
          <TabsTrigger value="api">API & Rôles</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-6">
            <h3 className="text-2xl font-bold text-primary mb-2">TheHive : Gestion & Réponse aux Incidents (SIRP)</h3>
            <p className="text-muted-foreground mb-8">TheHive est une plateforme SIRP (Security Incident Response Platform) open-source conçue pour faciliter le travail des analystes SOC grâce à une gestion collaborative, rapide et structurée des incidents de sécurité.</p>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><LayoutTemplate className="w-5 h-5 text-primary"/> Gestion des Cas (Case Management)</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Création, suivi et attribution des cas (statut, priorité, responsable).</li>
                  <li>Regroupement intelligent des alertes pertinentes pour éviter la fatigue d'alerte.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><Eye className="w-5 h-5 text-primary"/> Alertes & Observables</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Ingestion d'alertes provenant de sources multiples (SIEM, IDS/IPS, EDR).</li>
                  <li>Extraction, enrichissement et gestion des IOCs (IP, hachages, URL...).</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary"/> Tâches & Workflows</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Définition de tâches personnalisables pour chaque étape de la réponse à incident.</li>
                  <li>Assignation automatique, suivi de progression et utilisation de modèles (templates).</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary"/> Collaboration Active</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Fonctionnalités de chat et commentaires intégrées directement dans les tâches.</li>
                  <li>Journalisation exhaustive et immuable des actions et décisions prises.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><GitMerge className="w-5 h-5 text-primary"/> Intégrations Puissantes</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Connexion native à des outils externes (Cortex, MISP, VirusTotal, Shuffle).</li>
                  <li>Automatisation de l'enrichissement des observables via des analyseurs.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><PieChart className="w-5 h-5 text-primary"/> Reporting & Statistiques</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Génération de rapports détaillés sur les incidents résolus.</li>
                  <li>Tableaux de bord sur la performance du SOC (MTTD - Mean Time to Detect, MTTR).</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="kanban" className="space-y-4">

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={isReal ? "secondary" : "outline"}>
                {isReal ? "Données réelles · TheHive" : "Démo (aucun cas synchronisé)"}
              </Badge>
              <span className="text-xs text-muted-foreground">{cases.length} cas</span>
            </div>
            <Button size="sm" variant="outline" className="gap-2" onClick={syncNow} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Synchronisation…" : "Synchroniser"}
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {cols.map((c) => (
              <div key={c.key} className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{c.title}</h3>
                <div className="flex min-h-[140px] flex-col gap-2 rounded-lg border border-dashed border-border p-2">
                  {cases
                    .filter((k) => k.stage === c.key)
                    .map((k) => (
                      <Card key={k.id} className={`p-3 text-sm ${stageStyle[k.stage]}`}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">{k.id}</span>
                          <Badge variant="outline">sev {k.severity}</Badge>
                        </div>
                        <p className="mt-1 font-medium leading-snug">{k.title}</p>
                        <Button size="sm" variant="ghost" className="mt-2 h-7 gap-1 px-2 text-xs" onClick={linkMisp}>
                          <Link2 className="h-3 w-3" /> Lier à MISP
                        </Button>
                      </Card>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Bug className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Timeline d&apos;un cas (TH-4821)</h3>
              </div>
              <ol className="relative space-y-4 border-s border-border ps-4 text-sm">
                <li className="ms-1">
                  <span className="absolute -start-1.5 mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  Commentaire analyste — corrélation IP
                </li>
                <li className="ms-1">
                  <span className="absolute -start-1.5 mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  Tâche « collecte auth.log » terminée
                </li>
                <li className="ms-1">
                  <span className="absolute -start-1.5 mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  Artefact PCAP ajouté
                </li>
              </ol>
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 font-semibold">Temps moyen de résolution (h)</h3>
              <ul className="space-y-2 text-sm">
                {Object.entries(avgByType).map(([t, h]) => (
                  <li key={t} className="flex justify-between rounded-md bg-secondary/40 px-3 py-2">
                    <span className="capitalize">{t}</span>
                    <span className="font-bold">{h} h</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <LayoutTemplate className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Modèles de cas (Case Templates)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Workflows prédéfinis avec tâches et observables présélectionnés pour accélérer l'investigation.</p>
            <div className="space-y-2">
              {[
                { name: "Malware Detection", tasks: 8, description: "Analyse sandbox, hash reputation, extraction IOCs" },
                { name: "Phishing Campaign", tasks: 6, description: "Analyse d'email, extraction URL/attachments, notification utilisateurs" },
                { name: "Intrusion Attempt", tasks: 10, description: "Collecte logs, corrélation MISP, isolation machine, timeline forensique" },
                { name: "Data Exfiltration", tasks: 12, description: "Audit accès, analyse trafic, incident response, notification CISO" },
              ].map((template) => (
                <div key={template.name} className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </div>
                    <Badge variant="secondary">{template.tasks} tâches</Badge>
                  </div>
                  <Button size="sm" variant="outline" className="w-full" onClick={createCaseFromAlert}>
                    Créer cas
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Webhook className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Intégration d'alertes (Alert Integration)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Réception automatique d'alertes depuis Wazuh, SIEM, EDR avec mapping d'observables.</p>
            <div className="space-y-2 mb-4">
              {[
                { source: "Wazuh", status: "active", alerts: 152 },
                { source: "Elastic SIEM", status: "active", alerts: 87 },
                { source: "CrowdStrike EDR", status: "degraded", alerts: 23 },
                { source: "Suricata IDS", status: "active", alerts: 45 },
              ].map((conn) => (
                <div key={conn.source} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <div>
                    <p className="font-medium text-sm">{conn.source}</p>
                    <p className="text-xs text-muted-foreground">{conn.alerts} alertes (24h)</p>
                  </div>
                  <Badge variant={conn.status === "active" ? "secondary" : "outline"}>{conn.status}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Download className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Exportation d'IOCs (IOC Export)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Export automatique vers MISP, pare-feu, SIEM avec contrôle de partage TLP.</p>
            <div className="space-y-2">
              {[
                { destination: "MISP (partage interne)", format: "STIX" },
                { destination: "Pare-feu Fortinet", format: "CSV" },
                { destination: "Elastic SIEM", format: "JSON" },
                { destination: "VirusTotal Livehunt", format: "Native" },
              ].map((exp) => (
                <div key={exp.destination} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <div>
                    <p className="text-sm font-medium">{exp.destination}</p>
                    <p className="text-xs text-muted-foreground">Format: {exp.format}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={exportIocs}>
                    Exporter
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">API & Rôles utilisateur</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border/60 p-3">
                <h4 className="text-sm font-medium mb-2">Authentification</h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>✓ OAuth2/OIDC (Azure AD, Okta)</li>
                  <li>✓ LDAP/Active Directory</li>
                  <li>✓ MFA (TOTP, U2F)</li>
                  <li>✓ Clés API pour intégrations</li>
                </ul>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <h4 className="text-sm font-medium mb-2">Rôles prédéfinis</h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• Admin (tous les cas)</li>
                  <li>• Analyst (création, modification)</li>
                  <li>• Viewer (lecture seule)</li>
                  <li>• Custom (permissions granulaires)</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-secondary/40 p-3">
              <p className="text-xs text-muted-foreground">
                <strong>Intégrations API :</strong> Webhooks REST pour Shuffle, Cortex, MISP; SDKs Python/JavaScript disponibles.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
