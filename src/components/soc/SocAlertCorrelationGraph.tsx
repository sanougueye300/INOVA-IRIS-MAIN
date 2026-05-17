import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockAlertGraphEdges, mockAlertGraphNodes } from "@/lib/soc-mock";

/** Graphe simple alertes ↔ similarité IP / hostname (positions fixes pour la démo). */
export function SocAlertCorrelationGraph() {
  const positions: Record<string, { x: number; y: number }> = {
    a1: { x: 80, y: 60 },
    a2: { x: 200, y: 140 },
    a3: { x: 320, y: 80 },
    a4: { x: 260, y: 220 },
    a5: { x: 120, y: 200 },
  };

  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Corrélation visuelle</h3>
        <Badge variant="outline">IP / hostname</Badge>
      </div>
      <div className="relative h-[280px] w-full overflow-hidden rounded-lg border border-border bg-gradient-to-b from-secondary/30 to-background">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 280">
          {mockAlertGraphEdges.map((e) => {
            const a = positions[e.from];
            const b = positions[e.to];
            if (!a || !b) return null;
            return (
              <g key={`${e.from}-${e.to}`}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--primary)" strokeOpacity={0.45} strokeWidth={2} />
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} fill="var(--muted-foreground)" fontSize={9} textAnchor="middle">
                  {e.reason}
                </text>
              </g>
            );
          })}
          {mockAlertGraphNodes.map((n) => {
            const p = positions[n.id];
            if (!p) return null;
            return (
              <g key={n.id}>
                <circle cx={p.x} cy={p.y} r={28} fill="var(--card)" stroke="var(--primary)" strokeWidth={2} />
                <text x={p.x} y={p.y - 4} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--foreground)">
                  {n.id.toUpperCase()}
                </text>
                <text x={p.x} y={p.y + 10} textAnchor="middle" fontSize={7} fill="var(--muted-foreground)">
                  sev {n.severity}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="mt-2 max-h-24 overflow-y-auto text-[11px] text-muted-foreground">
        {mockAlertGraphNodes.map((n) => (
          <li key={n.id}>
            <span className="font-mono font-semibold text-foreground">{n.id}</span> — {n.title} ({n.sourceIp})
          </li>
        ))}
      </ul>
    </Card>
  );
}
