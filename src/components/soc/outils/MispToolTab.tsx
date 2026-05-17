import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockMispEvents } from "@/lib/soc-mock";
import { toast } from "sonner";
import { Database, Search, Zap, Brain, Network, BarChart3, Share2, FileCode2, Globe } from "lucide-react";

const riskColor: Record<number, string> = {
  1: "bg-muted",
  2: "bg-sky-500/80 text-white",
  3: "bg-orange-500/90 text-white",
  4: "bg-destructive text-destructive-foreground",
};

export function MispToolTab() {
  const [q, setQ] = useState("");
  const [linked, setLinked] = useState<Record<string, boolean>>({});

  const filtered = mockMispEvents.filter((e) => e.info.toLowerCase().includes(q.toLowerCase()));

  const generateYaraRules = () => {
    toast.success("Règles YARA générées", { description: "50 règles YARA exportées pour scanning de malwares (démo)." });
  };

  const submitToSandbox = () => {
    toast.promise(
      new Promise((r) => setTimeout(r, 2000)),
      {
        loading: "Soumission à Cuckoo Sandbox…",
        success: "Analyse en cours — IOCs extraits automatiquement.",
        error: "Erreur",
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">MISP</h2>
        <p className="text-sm text-muted-foreground">Intelligence de menace, génération de règles, analyse de malware, partage d'IOCs (démo).</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex h-auto min-h-10 flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Présentation</TabsTrigger>
          <TabsTrigger value="events">Événements</TabsTrigger>
          <TabsTrigger value="rules">Génération de règles</TabsTrigger>
          <TabsTrigger value="analysis">Analyse malware</TabsTrigger>
          <TabsTrigger value="sharing">Partage & API</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-6">
            <h3 className="text-2xl font-bold text-primary mb-2">MISP : Partage d'Informations sur les Menaces (TIP)</h3>
            <p className="text-muted-foreground mb-8">MISP (Malware Information Sharing Platform) est une plateforme open-source essentielle de CTI (Cyber Threat Intelligence) permettant le partage, le stockage et la corrélation structurés d'informations sur les menaces.</p>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><Share2 className="w-5 h-5 text-primary"/> Partage d'IOCs & CTI</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Partage et réception d'IOCs, TTPs, et informations sur les campagnes d'attaques.</li>
                  <li>Synchronisation bidirectionnelle fluide avec d'autres instances MISP partenaires.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><Database className="w-5 h-5 text-primary"/> Gestion des IOCs</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Stockage hautement organisé d'IOCs (IP, hachages, domaines, URL).</li>
                  <li>Ajout de contexte riche pour chaque indicateur (niveau de confiance, source, date).</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><Brain className="w-5 h-5 text-primary"/> Modélisation des Menaces</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Mise en relation d'IOCs avec des événements, campagnes et acteurs malveillants.</li>
                  <li>Alignement et taggage selon le framework MITRE ATT&CK.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><Zap className="w-5 h-5 text-primary"/> Corrélation & Enrichissement</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Corrélation automatique et instantanée d'IOCs entre différents événements.</li>
                  <li>Enrichissement automatique via des services et sources externes (ex: VirusTotal).</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><FileCode2 className="w-5 h-5 text-primary"/> Formats Standards</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Utilisation de formats standardisés pour l'interopérabilité (JSON natif).</li>
                  <li>Support complet de l'import/export via les standards STIX/TAXII.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><Globe className="w-5 h-5 text-primary"/> Flux CTI (Feeds)</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Génération de flux d'IOCs dynamiques, triés par niveau de confiance et pertinence.</li>
                  <li>Consommation directe par les SIEM, EDR et IDS (ex: Wazuh, Suricata).</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Rechercher événement / IOC local…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <div className="grid gap-2">
            {filtered.map((e) => (
              <Card key={e.id} className="flex flex-wrap items-center gap-3 border-l-4 border-l-primary p-4">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${riskColor[e.threatLevel]}`}>
                  L{e.threatLevel}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{e.info}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.org} · {new Date(e.date).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {e.threatLevel === 1 && Date.now() - new Date(e.date).getTime() > 90 * 86400_000 && (
                    <Badge variant="outline" className="text-amber-700">
                      Périmé ?
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toast.message("Mise à jour suggérée", { description: e.info })}
                  >
                    Suggestion
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Corrélation avec alertes Wazuh</h3>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">Cochez les alertes liées à cet événement (session démo).</p>
            <ul className="space-y-2 text-sm">
              {["SSH bruteforce 5710", "DNS tunnel 92050", "PowerShell 6000"].map((label) => (
                <li key={label} className="flex items-center gap-2">
                  <Checkbox
                    id={label}
                    checked={!!linked[label]}
                    onCheckedChange={(v) => setLinked((s) => ({ ...s, [label]: !!v }))}
                  />
                  <label htmlFor={label}>{label}</label>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Génération de règles de détection (Rule Generation & Export)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Conversion automatique d'IOCs en règles YARA, Sigma, Suricata, Snort pour détection proactive.</p>
            <div className="space-y-3">
              {[
                { format: "YARA", desc: "Scanning statique de malwares", example: "rule:emotet_c2" },
                { format: "Sigma", desc: "Format standard SIEM-agnostique", example: "detection: EventID 4688" },
                { format: "Suricata/Snort", desc: "Détection IDS/IPS en temps réel", example: "alert http any any -> any any" },
                { format: "VirusTotal Livehunt", desc: "Détection proactive sur VT", example: "import \"pe\"" },
              ].map((rule) => (
                <Card key={rule.format} className="p-3 border-border/60">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{rule.format}</p>
                      <p className="text-xs text-muted-foreground">{rule.desc}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={generateYaraRules}>
                      Générer
                    </Button>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground bg-secondary/40 p-2 rounded">
                    {rule.example}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Analyse de malware (Malware Analysis Integration)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Soumission automatique à Cuckoo Sandbox, extraction d'IOCs, historique des variants.</p>
            <div className="space-y-3">
              {[
                { sandbox: "Cuckoo Sandbox", status: "Intégré", features: "Comportement, dumps mémoire, extracted IOCs" },
                { sandbox: "VirusTotal", status: "Intégré", features: "Scans AV, YARA matches, détections similaires" },
                { sandbox: "ANY.RUN", status: "Premium", features: "Analyse interactive, network traffic, screenshots" },
              ].map((sb) => (
                <Card key={sb.sandbox} className="p-3 border-border/60">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{sb.sandbox}</p>
                      <p className="text-xs text-muted-foreground">{sb.features}</p>
                    </div>
                    <Badge variant={sb.status === "Intégré" ? "secondary" : "outline"}>{sb.status}</Badge>
                  </div>
                  {sb.status === "Intégré" && (
                    <Button size="sm" className="w-full" onClick={submitToSandbox}>
                      Soumettre sample
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="sharing" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Network className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Partage d'intelligence (Sharing & Governance)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Niveaux de partage TLP, organisations de confiance, audit de distribution.</p>
            <div className="space-y-2 mb-4">
              {[
                { tlp: "TLP:WHITE", recipients: "Public", color: "bg-gray-300" },
                { tlp: "TLP:GREEN", recipients: "Community", color: "bg-green-500" },
                { tlp: "TLP:AMBER", recipients: "Partners", color: "bg-amber-500" },
                { tlp: "TLP:RED", recipients: "Internal only", color: "bg-red-500" },
              ].map((tlp) => (
                <div key={tlp.tlp} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-4 w-4 rounded ${tlp.color}`} />
                    <div>
                      <p className="font-medium text-sm">{tlp.tlp}</p>
                      <p className="text-xs text-muted-foreground">{tlp.recipients}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Visualisation des relations (Graph Visualization)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Graphes interactifs des liens entre IOCs, campaigns, et attaquants pour analyse de menace.</p>
            <div className="grid gap-2">
              {[
                { type: "IOC Clustering", desc: "IP → Domaine → Hash → Malware" },
                { type: "Campaign Analysis", desc: "Regroupement d'attaques liées" },
                { type: "Attacker Profiling", desc: "TTPs et cibles associées" },
              ].map((viz) => (
                <div key={viz.type} className="rounded-lg border border-border/60 p-3">
                  <p className="font-medium text-sm">{viz.type}</p>
                  <p className="text-xs text-muted-foreground">{viz.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="font-semibold text-sm mb-2">API & Connectivité</div>
            <p className="text-sm text-muted-foreground">
              ✓ REST API complète pour création/modification d'événements · ✓ Feed MISP JSON natif · ✓ Webhooks bidirectionnels · ✓ Authentification par clés API
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
