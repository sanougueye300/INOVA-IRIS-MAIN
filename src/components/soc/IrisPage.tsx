import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockIrisInvestigation } from "@/lib/soc-mock";
import { toast } from "sonner";
import { Shield, Download, Link2, Workflow, FolderSearch, FileSearch, Clock, Users, PlugZap, FileText } from "lucide-react";

/** Page DFIR-IRIS — synthèse enquête, liens TheHive / Shuffle, export légal (mock). */
export function IrisPage() {
  const inv = mockIrisInvestigation;

  const exportLegal = (fmt: "json" | "csv") => {
    const payload =
      fmt === "json"
        ? JSON.stringify(inv, null, 2)
        : ["name,type", ...inv.artifacts.map((a) => `${a.name},${a.type}`)].join("\n");
    const blob = new Blob([payload], { type: fmt === "json" ? "application/json" : "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `iris-export-${inv.id}.${fmt}`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`Export ${fmt.toUpperCase()} téléchargé`);
  };

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-extrabold uppercase tracking-tight">
          <Shield className="h-8 w-8 text-primary" /> DFIR-IRIS
        </h1>
        <p className="text-sm text-muted-foreground">Synthèse d&apos;enquête, preuves et chaîne d&apos;interopérabilité.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex h-auto min-h-10 flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Présentation</TabsTrigger>
          <TabsTrigger value="investigation">Investigation en cours</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-6">
            <h3 className="text-2xl font-bold text-primary mb-2">IRIS : Système d'Investigation et de Réponse aux Incidents</h3>
            <p className="text-muted-foreground mb-8">DFIR-IRIS est un outil open-source puissant conçu spécifiquement pour la gestion, la structuration et la facilitation des investigations techniques poussées lors d'incidents de sécurité majeurs.</p>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><FolderSearch className="w-5 h-5 text-primary"/> Gestion des Investigations</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Structuration rigoureuse et suivi pas-à-pas des étapes clés d'une investigation.</li>
                  <li>Enregistrement et catalogage centralisé des preuves et artefacts trouvés.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><FileSearch className="w-5 h-5 text-primary"/> Outils d'Analyse Forensique</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Orchestration et intégration transparente d'outils spécialisés (ex: Volatility).</li>
                  <li>Facilitation de l'analyse d'artefacts complexes (images disques, dumps mémoire).</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-primary"/> Collecte d'Artefacts & Preuves</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Assistance automatisée à la documentation exhaustive de la collecte de preuves.</li>
                  <li>Suivi strict de la chaîne de possession (chain of custody) pour garantir la validité légale.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-primary"/> Chronologie des Événements</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Création de chronologies (timelines) détaillées pour reconstituer l'incident.</li>
                  <li>Visualisation claire des actions de l'attaquant et des mouvements latéraux.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><Users className="w-5 h-5 text-primary"/> Collaboration Technique</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Flux de travail hautement collaboratif pour les aspects techniques entre analystes.</li>
                  <li>Partage sécurisé, cloisonné et en temps réel de données d'investigation sensibles.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><PlugZap className="w-5 h-5 text-primary"/> Intégrations</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Connexion native à des scanners, des sandboxes d'analyse de malware, et des EDR.</li>
                  <li>Enrichissement automatique du contexte de l'investigation sans quitter la plateforme.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-primary"/> Reporting d'Investigation</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Génération en un clic de rapports structurés, complets et professionnels.</li>
                  <li>Inclusion détaillée des conclusions (causes racines, impacts, recommandations d'atténuation).</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="investigation" className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="gap-1" onClick={() => toast.success("TheHive", { description: "Import cas TH-4819 vers IRIS (simulation)." })}>
              <Link2 className="h-4 w-4" /> Importer depuis TheHive
            </Button>
            <Button className="gap-1" onClick={() => toast.success("Shuffle", { description: "Investigation automatique déclenchée sur cas critique (simulation)." })}>
              <Workflow className="h-4 w-4" /> Déclencher Shuffle
            </Button>
            <Button variant="outline" onClick={() => exportLegal("json")}>
              <Download className="mr-2 h-4 w-4" /> Export JSON
            </Button>
            <Button variant="outline" onClick={() => exportLegal("csv")}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold">{inv.name}</h2>
                <Badge>{inv.id}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{inv.evidenceCount} éléments de preuve indexés (démo).</p>
              <h3 className="mt-4 font-semibold">Artefacts clés</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {inv.artifacts.map((a) => (
                  <li key={a.name} className="flex justify-between rounded-md border border-border/60 px-3 py-2">
                    <span>{a.name}</span>
                    <Badge variant="outline">{a.type}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 font-semibold">Timeline</h3>
              <ol className="relative space-y-4 border-s border-border ps-4 text-sm">
                {inv.timeline.map((t) => (
                  <li key={t.at} className="ms-1">
                    <span className="absolute -start-1.5 mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <p className="font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.at).toLocaleString("fr-FR")}</p>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
