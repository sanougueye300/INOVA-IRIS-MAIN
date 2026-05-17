import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Server, Cpu, HardDrive, Network } from "lucide-react";

export const Route = createFileRoute("/deploiement")({
  head: () => ({
    meta: [
      { title: "Déploiement — Plateforme SOC" },
      { name: "description", content: "Prérequis matériels, étapes d'installation et configuration de la plateforme SOC." },
    ],
  }),
  component: DeploiementPage,
});

const reqs = [
  { icon: Cpu, label: "CPU", value: "8 vCPU minimum" },
  { icon: HardDrive, label: "RAM", value: "16 Go (32 Go recommandé)" },
  { icon: Server, label: "Stockage", value: "500 Go SSD" },
  { icon: Network, label: "OS", value: "Ubuntu Server 22.04 LTS" },
];

const steps = [
  { n: "01", title: "Préparation de l'environnement", code: `sudo apt update && sudo apt upgrade -y\nsudo apt install -y docker.io docker-compose curl` },
  { n: "02", title: "Installation de Wazuh", code: `curl -sO https://packages.wazuh.com/4.7/wazuh-install.sh\nsudo bash ./wazuh-install.sh -a` },
  { n: "03", title: "Déploiement de Shuffle", code: `git clone https://github.com/Shuffle/Shuffle\ncd Shuffle && docker-compose up -d` },
  { n: "04", title: "Installation de TheHive + Cortex", code: `docker-compose -f thehive-cortex.yml up -d\n# Accès : http://server:9000` },
  { n: "05", title: "Mise en place de MISP", code: `docker run -d -p 443:443 \\\n  -e MYSQL_PASSWORD=secret \\\n  coolacid/misp-docker:core-latest` },
  { n: "06", title: "Configuration VirusTotal", code: `# Récupérer l'API key sur virustotal.com\n# L'ajouter dans Shuffle App > VirusTotal > Authentication` },
  { n: "07", title: "Intégration Wazuh → Shuffle", code: `# /var/ossec/etc/ossec.conf\n<integration>\n  <name>shuffle</name>\n  <hook_url>http://shuffle:3001/api/v1/hooks/...</hook_url>\n  <level>10</level>\n  <alert_format>json</alert_format>\n</integration>` },
];

function DeploiementPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold md:text-5xl">Guide de déploiement</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Prérequis et étapes pour mettre en place la plateforme dans un environnement de production.
        </p>
      </header>

      {/* Prérequis */}
      <section className="mt-12">
        <h2 className="mb-4 text-2xl font-semibold">Prérequis matériels</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reqs.map((r) => (
            <Card key={r.label} className="border-border/60 bg-card/40 p-5 text-center">
              <r.icon className="mx-auto h-7 w-7 text-primary" />
              <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">{r.label}</div>
              <div className="mt-1 font-semibold">{r.value}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Étapes */}
      <section className="mt-16">
        <h2 className="mb-6 text-2xl font-semibold">Étapes d'installation</h2>
        <div className="space-y-4">
          {steps.map((s) => (
            <Card key={s.n} className="overflow-hidden border-border/60 bg-[image:var(--gradient-card)]">
              <div className="flex items-center gap-4 border-b border-border/50 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[image:var(--gradient-hero)] text-sm font-bold text-primary-foreground">
                  {s.n}
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
              </div>
              <pre className="overflow-x-auto bg-background/50 p-5 text-xs leading-relaxed text-muted-foreground"><code>{s.code}</code></pre>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}