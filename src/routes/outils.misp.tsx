import { createFileRoute } from "@tanstack/react-router";
import { MispToolTab } from "@/components/soc/outils/MispToolTab";

export const Route = createFileRoute("/outils/misp")({
  head: () => ({
    meta: [
      { title: "MISP Threat Intelligence — INOVA-IRIS" },
      { name: "description", content: "Console MISP : événements CTI, IOCs, règles YARA et partage de menaces." },
    ],
  }),
  component: MispPage,
});

function MispPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <MispToolTab />
    </div>
  );
}
