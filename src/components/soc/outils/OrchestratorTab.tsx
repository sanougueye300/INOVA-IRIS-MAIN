import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockConnectors, mockShuffleRuns24h } from "@/lib/soc-mock";
import { toast } from "sonner";
import { Activity, PlugZap, PlayCircle, Workflow, Zap, TrendingUp } from "lucide-react";

function statusEmoji(s: (typeof mockConnectors)[0]["status"]) {
  if (s === "up") return "🟢";
  if (s === "degraded") return "🟡";
  return "🔴";
}

/** Vue orchestrateur : santé des connecteurs, Shuffle 24h, playbooks SOAR enrichis (mock). */
export function OrchestratorTab() {
  const enrichedPct = 72;

  const runChainTest = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2200)),
      {
        loading: "Injection alerte test → TheHive → MISP → IRIS…",
        success: "Chaîne simulée : OK (démo — brancher les webhooks réels).",
        error: "Échec",
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Orchestrateur SOC — Shuffle SOAR</h2>
          <p className="text-sm text-muted-foreground">Orchestration centralisée, playbooks automatisés et réponse aux incidents (démo).</p>
        </div>
        <Button className="gap-2" onClick={runChainTest}>
          <PlayCircle className="h-4 w-4" />
          Tester la chaîne complète
        </Button>
      </div>

      <Tabs defaultValue="connectors" className="space-y-4">
        <TabsList className="flex h-auto min-h-10 flex-wrap justify-start gap-1">
          <TabsTrigger value="connectors">Connecteurs</TabsTrigger>
          <TabsTrigger value="workflows">Playbooks & Workflows</TabsTrigger>
          <TabsTrigger value="automation">Actions automatisées</TabsTrigger>
          <TabsTrigger value="metrics">Métriques</TabsTrigger>
        </TabsList>

        <TabsContent value="connectors" className="space-y-4">

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockConnectors.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-semibold">
                    {statusEmoji(c.status)} {c.label}
                  </span>
                  <Badge variant="outline">{c.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Latence ~{c.latencyMs} ms · sync {new Date(c.lastSync).toLocaleString("fr-FR")}
                </p>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <PlugZap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Alertes enrichies automatiquement</h3>
              </div>
              <Progress value={enrichedPct} className="h-3" />
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{enrichedPct}%</span> des alertes reçoivent MISP + VT (mock).
              </p>
            </Card>
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Shuffle — dernières 24 h</h3>
              </div>
              <ul className="space-y-2 text-sm">
                {mockShuffleRuns24h.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
                    <span className="font-medium">{r.workflow}</span>
                    <Badge
                      variant={r.status === "success" ? "secondary" : r.status === "failed" ? "destructive" : "outline"}
                      className="text-xs"
                    >
                      {r.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Workflow className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Playbooks & Workflows</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Orchestration visuelle d'alertes avec déclenchement conditionnel et exécution parallèle.</p>
            <div className="space-y-3">
              {[
                { name: "Malware Detection", tasks: "Wazuh → MISP → VT → TheHive", status: "active" },
                { name: "SSH Bruteforce Response", tasks: "IP block → Machine isolate → SIEM notify", status: "active" },
                { name: "Phishing Investigation", tasks: "URL analysis → Email extraction → Report gen", status: "testing" },
                { name: "Ransomware Containment", tasks: "Process kill → Backup verify → Incident escalate", status: "draft" },
              ].map((wb) => (
                <div key={wb.name} className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-medium text-sm">{wb.name}</p>
                      <p className="text-xs text-muted-foreground">{wb.tasks}</p>
                    </div>
                    <Badge
                      variant={
                        wb.status === "active" ? "secondary" : wb.status === "testing" ? "outline" : "secondary"
                      }
                    >
                      {wb.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Actions automatisées (Automated Response Actions)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Remédiation instantanée basée sur règles : blocage, isolation, notification, enrichissement.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { action: "Blocage IP/Domaine", targets: "Firewall, Proxy, EDR", icon: "🚫" },
                { action: "Isolation machine", targets: "Network, EDR, VM", icon: "🔒" },
                { action: "Mise en quarantaine", targets: "Fichiers, Processus, Contacts", icon: "⛔" },
                { action: "Enrichissement", targets: "SIEM, SOAR, Case", icon: "📊" },
                { action: "Notifications", targets: "Slack, Email, SMS, PagerDuty", icon: "🔔" },
                { action: "Exports", targets: "MISP, Threat feeds, Blocklists", icon: "📤" },
              ].map((ac) => (
                <Card key={ac.action} className="p-3 border-border/60">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{ac.icon}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{ac.action}</p>
                      <p className="text-xs text-muted-foreground">{ac.targets}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Métriques d'automatisation</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { metric: "Cas auto-créés (7j)", value: "156", unit: "cas" },
                { metric: "Alertes auto-enrichies", value: "87%", unit: "taux" },
                { metric: "MTTD moyen", value: "4.2", unit: "min" },
                { metric: "MTTR moyen", value: "28", unit: "min" },
                { metric: "Taux de succès playbooks", value: "94.3%", unit: "réussi" },
                { metric: "Coûts évités (estimation)", value: "$847k", unit: "année" },
              ].map((m) => (
                <Card key={m.metric} className="p-3 border-border/60">
                  <p className="text-xs text-muted-foreground mb-1">{m.metric}</p>
                  <p className="text-2xl font-bold">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.unit}</p>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
