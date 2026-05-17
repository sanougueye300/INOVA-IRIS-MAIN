import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Activity, Workflow, Database, Search, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import heroImg from "@/assets/hero-cyber.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Plateforme SOC — Détection & Réponse aux incidents Cyber" },
      { name: "description", content: "Mise en place d'une plateforme SOC intégrant Wazuh, Shuffle, TheHive, MISP et VirusTotal pour la détection et la réponse aux incidents." },
    ],
  }),
  component: Index,
});

const tools = [
  { name: "Wazuh", role: "SIEM / XDR", icon: Activity, desc: "Détection des menaces, surveillance d'intégrité et collecte de logs." },
  { name: "Shuffle", role: "SOAR", icon: Workflow, desc: "Orchestration et automatisation des playbooks de réponse." },
  { name: "TheHive", role: "Case Management", icon: Shield, desc: "Gestion collaborative des incidents et investigations." },
  { name: "MISP", role: "Threat Intelligence", icon: Database, desc: "Partage et corrélation d'indicateurs de compromission (IoC)." },
  { name: "VirusTotal", role: "Enrichissement", icon: Search, desc: "Analyse multi-moteurs des fichiers, URLs et hashes." },
];

function Index() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={heroImg} alt="" width={1920} height={1024} className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
              <Zap className="h-3.5 w-3.5" /> Projet de fin d'études · Cybersécurité
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-6xl">
              Plateforme de{" "}
              <span className="bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">
                détection & réponse
              </span>{" "}
              aux incidents Cyber
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Une architecture SOC intégrée combinant <strong className="text-foreground">Wazuh</strong>,{" "}
              <strong className="text-foreground">Shuffle</strong>,{" "}
              <strong className="text-foreground">TheHive</strong>,{" "}
              <strong className="text-foreground">MISP</strong> et{" "}
              <strong className="text-foreground">VirusTotal</strong> pour automatiser la chasse aux menaces.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--glow-primary)] hover:opacity-90">
                <Link to="/architecture">Découvrir l'architecture <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/workflow">Voir le workflow</Link>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { v: "5", l: "Outils intégrés" },
              { v: "24/7", l: "Surveillance" },
              { v: "<5min", l: "Temps de réponse" },
              { v: "100%", l: "Open Source" },
            ].map((s) => (
              <Card key={s.l} className="border-border/60 bg-card/40 p-6 text-center backdrop-blur">
                <div className="text-3xl font-bold text-primary">{s.v}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.l}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TOOLS */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Stack technologique</h2>
          <p className="mt-3 text-muted-foreground">
            Cinq briques open source qui couvrent toute la chaîne SOC : détection, enrichissement, orchestration et investigation.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <Card key={t.name} className="group relative overflow-hidden border-border/60 bg-[image:var(--gradient-card)] p-6 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-[var(--glow-primary)]">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <t.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">{t.name}</h3>
              <p className="text-xs uppercase tracking-wider text-accent">{t.role}</p>
              <p className="mt-3 text-sm text-muted-foreground">{t.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="overflow-hidden border-primary/30 bg-[image:var(--gradient-card)] p-10 text-center md:p-16">
          <h2 className="text-3xl font-bold md:text-4xl">Une réponse aux incidents, automatisée</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            De la détection d'une alerte Wazuh jusqu'à la création d'un cas TheHive enrichi par MISP et VirusTotal — tout est orchestré par Shuffle.
          </p>
          <ul className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
            {[
              "Détection temps réel des menaces",
              "Enrichissement automatique des IoC",
              "Playbooks de réponse personnalisables",
              "Investigation collaborative",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-accent" /> {f}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-10 bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--glow-primary)]">
            <Link to="/deploiement">Voir le déploiement <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </Card>
      </section>
    </>
  );
}
