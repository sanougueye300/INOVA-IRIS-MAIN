import { createFileRoute } from "@tanstack/react-router";
import { TheHiveToolTab } from "@/components/soc/outils/TheHiveToolTab";

export const Route = createFileRoute("/outils/thehive")({
  head: () => ({
    meta: [
      { title: "TheHive — Gestion des Incidents — INOVA-IRIS" },
      { name: "description", content: "Console TheHive SIRP : gestion de cas, kanban incidents, intégrations MISP & Shuffle." },
    ],
  }),
  component: TheHivePage,
});

function TheHivePage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <TheHiveToolTab />
    </div>
  );
}
