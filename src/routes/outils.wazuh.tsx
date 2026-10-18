import { createFileRoute } from "@tanstack/react-router";
import { WazuhToolTab } from "@/components/soc/outils/WazuhToolTab";

export const Route = createFileRoute("/outils/wazuh")({
  head: () => ({
    meta: [
      { title: "Wazuh SIEM & EDR — INOVA-IRIS" },
      { name: "description", content: "Console Wazuh : agents EDR, règles SIEM, inventaire et conformité." },
    ],
  }),
  component: WazuhPage,
});

function WazuhPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <WazuhToolTab />
    </div>
  );
}
