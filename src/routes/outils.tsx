import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrchestratorTab } from "@/components/soc/outils/OrchestratorTab";
import { WazuhToolTab } from "@/components/soc/outils/WazuhToolTab";
import { TheHiveToolTab } from "@/components/soc/outils/TheHiveToolTab";
import { MispToolTab } from "@/components/soc/outils/MispToolTab";
import { VirusTotalToolTab } from "@/components/soc/outils/VirusTotalToolTab";
import { ShuffleToolTab } from "@/components/soc/outils/ShuffleToolTab";

const TAB_IDS = ["orchestrator", "wazuh", "thehive", "misp", "virustotal", "shuffle"] as const;
type ToolTab = (typeof TAB_IDS)[number];

export const Route = createFileRoute("/outils")({
  head: () => ({
    meta: [
      { title: "Outils SOC — INOVA-IRIS" },
      { name: "description", content: "Orchestrateur Wazuh, TheHive, MISP, VirusTotal, Shuffle." },
    ],
  }),
  component: OutilsSocPage,
});

function OutilsSocPage() {
  const navigate = useNavigate();
  const rawHash = useRouterState({ select: (s) => (s.location.hash ?? "").replace(/^#/, "") });
  const tab: ToolTab = TAB_IDS.includes(rawHash as ToolTab) ? (rawHash as ToolTab) : "orchestrator";

  const onTab = (v: string) => {
    void navigate({ to: "/outils", hash: v });
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold md:text-4xl">Outils SOC</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Orchestrateur, connecteurs et consoles dédiées. Les données ci-dessous sont mockées pour la démo ; branchez les API
          officielles (REST, webhooks Shuffle) pour la production.
        </p>
      </header>

      <Tabs value={tab} onValueChange={onTab}>
        <TabsList className="mb-6 flex h-auto min-h-10 w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="orchestrator">Orchestrateur</TabsTrigger>
          <TabsTrigger value="wazuh">Wazuh</TabsTrigger>
          <TabsTrigger value="thehive">TheHive</TabsTrigger>
          <TabsTrigger value="misp">MISP</TabsTrigger>
          <TabsTrigger value="virustotal">VirusTotal</TabsTrigger>
          <TabsTrigger value="shuffle">Shuffle</TabsTrigger>
        </TabsList>

        <TabsContent value="orchestrator">
          <OrchestratorTab />
        </TabsContent>
        <TabsContent value="wazuh">
          <WazuhToolTab />
        </TabsContent>
        <TabsContent value="thehive">
          <TheHiveToolTab />
        </TabsContent>
        <TabsContent value="misp">
          <MispToolTab />
        </TabsContent>
        <TabsContent value="virustotal">
          <VirusTotalToolTab />
        </TabsContent>
        <TabsContent value="shuffle">
          <ShuffleToolTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
