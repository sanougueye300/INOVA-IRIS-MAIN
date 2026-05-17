import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { mockMitreTactics } from "@/lib/soc-mock";

/** Tendances des alertes par tactique MITRE ATT&CK (données agrégées mock). */
export function SocMitreTacticsChart() {
  const data = mockMitreTactics.map((m) => ({
    name: m.tacticId,
    full: m.tactic,
    count: m.count,
  }));

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Alertes par tactique MITRE</h2>
        <Badge variant="outline">Wazuh + corrélation</Badge>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" allowDecimals={false} stroke="currentColor" fontSize={11} />
            <YAxis type="category" dataKey="name" width={52} stroke="currentColor" fontSize={10} />
            <Tooltip
              formatter={(v: number) => [v, "Alertes"]}
              labelFormatter={(_, p) => (p?.[0]?.payload?.full as string) ?? ""}
            />
            <Bar dataKey="count" fill="var(--primary)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
