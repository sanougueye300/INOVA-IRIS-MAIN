import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendSocAiChat } from "@/lib/soc-ai-chat";
import { toast } from "sonner";
import { Brain, FileText, Sparkles, Zap } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  { label: "Sigma / LQL Wazuh", prompt: "Génère une règle Sigma + une requête LQL Wazuh pour détecter PowerShell encodé Base64 sur les endpoints Windows." },
  { label: "Résumé alerte critique", prompt: "Résume la dernière alerte critique du SOC (contexte Wazuh) et propose les prochaines étapes." },
  { label: "Playbook Shuffle", prompt: "Suggère un workflow Shuffle pour une attaque par credential stuffing sur SSH." },
  { label: "Comparer deux IOC", prompt: "Compare deux IOC : 203.0.113.44 et evil-update.net (réputation, MITRE, actions)." },
];

function mockFatigueAdvice() {
  return [
    "Réduire le bruit sur la règle 5710 en exigeant > 25 échecs / 10 min.",
    "Créer une exception TheHive pour les scans internes homologués.",
    "Activer la corrélation MISP avant création de cas automatique.",
  ];
}

function buildIncidentMarkdown() {
  return `# Rapport d'incident (démo)
- **ID** : INC-2026-014
- **Synthèse** : Activité PowerShell suspecte sur parc Finance.
- **Sources** : Wazuh 60122, MISP evt-101, VT 42/72.
- **Actions** : Isolation endpoint, collecte mémoire, cas TheHive TH-4819.
`;
}

/** Page Assistant IA — chat, générateur de rapport, fatigue alertes (mock + API Supabase). */
export function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Assistant SOC Wazuh / TheHive / MISP / IRIS. Posez une question ou utilisez une action rapide. Si l'API cloud n'est pas déployée, des réponses de démonstration s'affichent automatiquement.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || busy) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: t }];
    setMessages(next);
    setBusy(true);
    try {
      const reply = await sendSocAiChat(next);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      setMessages([
        ...next,
        {
          role: "assistant",
          content: `⚠️ ${msg}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const downloadMd = () => {
    const blob = new Blob([buildIncidentMarkdown()], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "rapport-incident-demo.md";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Rapport Markdown téléchargé");
  };

  const printPdf = () => {
    toast.message("PDF", { description: "Utilisez Imprimer → PDF à partir du navigateur." });
    window.print();
  };

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-extrabold uppercase tracking-tight">
          <Brain className="h-8 w-8 text-primary" /> Djib'son IA
        </h1>
        <p className="text-sm text-muted-foreground">Chat SOC, génération de règles, rapports et tuning anti-fatigue.</p>
      </div>

      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="report">Rapport incident</TabsTrigger>
          <TabsTrigger value="fatigue">Fatigue alertes</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((a) => (
              <Button key={a.label} size="sm" variant="secondary" className="gap-1" onClick={() => send(a.prompt)}>
                <Zap className="h-3 w-3" /> {a.label}
              </Button>
            ))}
          </div>
          <Card className="flex max-h-[480px] flex-col p-4">
            <div className="flex-1 space-y-3 overflow-y-auto">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start text-sm text-muted-foreground">
                  <Sparkles className="mr-2 h-4 w-4 animate-pulse text-primary" /> Génération…
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2 border-t border-border pt-3">
              <Textarea rows={2} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Question analyste…" />
              <Button className="self-end" onClick={() => send()} disabled={busy}>
                Envoyer
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="mt-4 space-y-3">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Rapport d&apos;incident (Markdown / PDF)</h2>
            </div>
            <pre className="max-h-80 overflow-auto rounded-md bg-muted p-4 text-xs">{buildIncidentMarkdown()}</pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={downloadMd}>
                Télécharger .md
              </Button>
              <Button onClick={printPdf}>Imprimer / PDF</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="fatigue" className="mt-4">
          <Card className="p-4">
            <h2 className="mb-2 font-semibold">Détection de fatigue alertes</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Heuristiques sur volume, doublons et faux positifs récurrents (démonstration — brancher ML / historique).
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm">
              {mockFatigueAdvice().map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
