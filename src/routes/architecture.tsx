import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Activity, Workflow, Shield, Database, Search, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture — Plateforme SOC" },
      { name: "description", content: "Architecture technique de la plateforme SOC intégrant Wazuh, Shuffle, TheHive, MISP et VirusTotal." },
    ],
  }),
  component: ArchitecturePage,
});

const layers = [
  {
    title: "1. Collecte & Détection",
    icon: Activity,
    color: "text-primary",
    items: ["Agents Wazuh sur endpoints (Linux/Windows)", "Collecte des logs systèmes et applicatifs", "Règles de détection MITRE ATT&CK", "FIM (File Integrity Monitoring)"],
  },
  {
    title: "2. Orchestration",
    icon: Workflow,
    color: "text-accent",
    items: ["Shuffle reçoit les alertes Wazuh via webhook", "Déclenchement automatique des playbooks", "Routage selon la criticité", "Notifications (email, Slack, Teams)"],
  },
  {
    title: "3. Enrichissement",
    icon: Database,
    color: "text-primary",
    items: ["Recherche d'IoC dans MISP", "Analyse de hash/URL via VirusTotal", "Corrélation avec la threat intel", "Scoring de risque automatique"],
  },
  {
    title: "4. Investigation & Réponse",
    icon: Shield,
    color: "text-accent",
    items: ["Création automatique d'un cas TheHive", "Assignation à un analyste SOC", "Tâches d'investigation pré-remplies", "Actions de remédiation (blocage IP, isolation)"],
  },
];

function ArchitecturePage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold md:text-5xl">Architecture de la plateforme</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Une architecture en 4 couches qui transforme une alerte brute en un cas d'incident enrichi et actionnable.
        </p>
      </header>

      {/* Diagramme de flux */}
      <Card className="mt-12 overflow-x-auto border-border/60 bg-[image:var(--gradient-card)] p-6 md:p-10">
        <div className="flex min-w-max items-center justify-between gap-4">
          {[
            { name: "Wazuh", icon: Activity, sub: "SIEM" },
            { name: "Shuffle", icon: Workflow, sub: "SOAR" },
            { name: "MISP / VT", icon: Search, sub: "Enrichissement" },
            { name: "TheHive", icon: Shield, sub: "IR" },
          ].map((node, i, arr) => (
            <div key={node.name} className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary shadow-[var(--glow-primary)]">
                  <node.icon className="h-9 w-9" />
                </div>
                <div className="mt-3 text-sm font-semibold">{node.name}</div>
                <div className="text-xs text-muted-foreground">{node.sub}</div>
              </div>
              {i < arr.length - 1 && <ArrowRight className="h-6 w-6 text-accent" />}
            </div>
          ))}
        </div>
      </Card>

      {/* Couches */}
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {layers.map((l) => (
          <Card key={l.title} className="border-border/60 bg-card/40 p-6">
            <div className="flex items-center gap-3">
              <l.icon className={`h-7 w-7 ${l.color}`} />
              <h2 className="text-xl font-semibold">{l.title}</h2>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {l.items.map((it) => (
                <li key={it} className="flex gap-2"><span className="text-primary">›</span>{it}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}