import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockShuffleWorkflowTemplates } from "@/lib/soc-mock";
import { toast } from "sonner";
import { Workflow, Play, Bug } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const blocks = ["Wazuh", "TheHive", "MISP", "Email", "Slack", "Webhook", "IRIS"];

const metrics = [
  { day: "Lun", ok: 42, fail: 1 },
  { day: "Mar", ok: 38, fail: 2 },
  { day: "Mer", ok: 51, fail: 0 },
  { day: "Jeu", ok: 44, fail: 3 },
  { day: "Ven", ok: 47, fail: 1 },
];

const liveLogs = [
  "[12:01:02] Webhook reçu — rule 5710",
  "[12:01:03] Normalisation JSON OK",
  "[12:01:04] POST TheHive /api/case — 201",
  "[12:01:05] MISP tag ajouté",
];

/** Éditeur visuel simplifié + logs + templates (démo). */
export function ShuffleToolTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Shuffle</h2>
        <p className="text-sm text-muted-foreground">Workflows SOAR — éditeur no-code (maquette) et exécution.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Éditeur visuel (maquette)</h3>
          </div>
          <div className="grid min-h-[220px] grid-cols-2 gap-2 sm:grid-cols-4">
            {blocks.map((b) => (
              <button
                key={b}
                type="button"
                className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 px-2 py-6 text-center text-sm font-medium hover:bg-primary/10"
                onClick={() => toast.message(`Bloc ${b}`, { description: "Glisser-déposer à brancher sur l'API Shuffle." })}
              >
                {b}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">En production : canvas Shuffle embarqué ou lien SSO vers l&apos;instance.</p>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Bug className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Logs temps réel (mock)</h3>
          </div>
          <pre className="max-h-52 overflow-y-auto rounded-md bg-muted p-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
            {liveLogs.join("\n")}
          </pre>
          <Button size="sm" className="mt-3 w-full gap-1" variant="secondary" onClick={() => toast.success("Debug", { description: "Pas d'erreur — run #8821" })}>
            <Play className="h-3 w-3" /> Relancer debug
          </Button>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Templates préfaits</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {mockShuffleWorkflowTemplates().map((t) => (
            <Card key={t.id} className="border-primary/20 bg-primary/5 p-4">
              <p className="font-semibold">{t.name}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t.blocks.join(" → ")}</p>
              <Button size="sm" className="mt-3" variant="outline" onClick={() => toast.success("Template importé (démo)")}>
                Utiliser
              </Button>
            </Card>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Métriques — workflows / jour</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="ok" stackId="a" fill="var(--chart-2)" name="Réussis" />
              <Bar dataKey="fail" stackId="a" fill="var(--destructive)" name="Échoués" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
