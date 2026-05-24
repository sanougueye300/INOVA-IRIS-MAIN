import { createFileRoute } from "@tanstack/react-router";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingStack } from "@/components/landing/LandingStack";

export const Route = createFileRoute("/")(  {
  head: () => ({
    meta: [
      { title: "INOVA-IRIS — Plateforme SOC de Cyberdéfense Nouvelle Génération" },
      { name: "description", content: "Plateforme SOC intégrée combinant Wazuh, Shuffle, TheHive, MISP et VirusTotal pour la détection et réponse automatisée aux incidents cyber. Sonatel Group." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="landing-dark">
      <LandingHero />
      <LandingStack />
    </div>
  );
}
