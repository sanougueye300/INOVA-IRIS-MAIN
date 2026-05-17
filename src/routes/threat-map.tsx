import { createFileRoute } from "@tanstack/react-router";
import { ThreatMapPage } from "@/components/soc/ThreatMapPage";

export const Route = createFileRoute("/threat-map")({
  head: () => ({ meta: [{ title: "Threat Map — INOVA-IRIS" }] }),
  component: ThreatMapPage,
});
