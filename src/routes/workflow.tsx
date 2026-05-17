import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Webhook, Search, FileText, ShieldCheck, Bell } from "lucide-react";

export const Route = createFileRoute("/workflow")({
  head: () => ({
    meta: [
      { title: "Workflow d'incident — Plateforme SOC" },
      { name: "description", content: "Scénario type de réponse à un incident : de l'alerte Wazuh à la résolution." },
    ],
  }),
  component: WorkflowPage,
});

const steps = [
  { icon: AlertTriangle, title: "Détection", who: "Wazuh", desc: "Un agent détecte une connexion SSH suspecte (brute-force) et génère une alerte de niveau 10." },
  { icon: Webhook, title: "Notification", who: "Wazuh → Shuffle", desc: "L'alerte est envoyée à Shuffle via un webhook configuré dans ossec.conf." },
  { icon: Search, title: "Enrichissement", who: "Shuffle → MISP + VirusTotal", desc: "Le playbook interroge MISP (IP connue ?) puis VirusTotal (réputation IP/hash). Score de risque calculé." },
  { icon: FileText, title: "Création du cas", who: "Shuffle → TheHive", desc: "Si malveillant : création automatique d'un cas TheHive avec observables, tags et tâches préremplies." },
  { icon: Bell, title: "Notification analyste", who: "Shuffle", desc: "L'équipe SOC est notifiée (email/Slack) avec le lien direct vers le cas TheHive." },
  { icon: ShieldCheck, title: "Réponse", who: "TheHive + Shuffle", desc: "L'analyste valide, déclenche le blocage de l'IP via firewall et l'isolation de la machine. Cas clôturé." },
];

function WorkflowPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold md:text-5xl">Scénario de réponse</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Cas d'usage : détection d'une attaque par force brute SSH, de l'alerte à la remédiation.
        </p>
      </header>

      <div className="relative mx-auto mt-16 max-w-3xl">
        <div className="absolute left-6 top-0 h-full w-px bg-gradient-to-b from-primary via-accent to-transparent md:left-1/2" />
        <div className="space-y-8">
          {steps.map((s, i) => (
            <div key={s.title} className={`relative flex flex-col gap-4 md:flex-row md:items-center ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
              <div className="absolute left-6 z-10 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-2 border-primary bg-background shadow-[var(--glow-primary)] md:left-1/2">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="md:w-1/2" />
              <Card className="ml-16 border-border/60 bg-[image:var(--gradient-card)] p-5 md:ml-0 md:w-1/2 md:mx-8">
                <div className="text-xs font-medium uppercase tracking-wider text-accent">{`Étape ${i + 1} · ${s.who}`}</div>
                <h3 className="mt-1 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}