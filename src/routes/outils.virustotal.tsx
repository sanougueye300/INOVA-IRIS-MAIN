import { createFileRoute } from "@tanstack/react-router";
import { VirusTotalToolTab } from "@/components/soc/outils/VirusTotalToolTab";

export const Route = createFileRoute("/outils/virustotal")({
  head: () => ({
    meta: [
      { title: "VirusTotal — Analyse de Menaces — INOVA-IRIS" },
      { name: "description", content: "Console VirusTotal : analyse hash, URL, fichiers et corrélation MISP." },
    ],
  }),
  component: VirusTotalPage,
});

function VirusTotalPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <VirusTotalToolTab />
    </div>
  );
}
