import { createFileRoute } from "@tanstack/react-router";
import { ShuffleToolTab } from "@/components/soc/outils/ShuffleToolTab";

export const Route = createFileRoute("/outils/shuffle")({
  head: () => ({
    meta: [
      { title: "Shuffle SOAR — Automatisation — INOVA-IRIS" },
      { name: "description", content: "Console Shuffle SOAR : workflows no-code, playbooks automatisés et métriques d'exécution." },
    ],
  }),
  component: ShufflePage,
});

function ShufflePage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <ShuffleToolTab />
    </div>
  );
}
