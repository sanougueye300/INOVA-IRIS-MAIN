import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { mockAttackFlows } from "@/lib/soc-mock";
import { mockAlertGraphNodes } from "@/lib/soc-mock";

/** Carte « globe » stylisée 3D (CSS) + flux et panneau pays (données mock). */
export function ThreatMapPage() {
  const [hour, setHour] = useState(24);
  const [country, setCountry] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - hour * 3600_000;
    return mockAttackFlows.filter((f) => new Date(f.at).getTime() >= cutoff);
  }, [hour]);

  const topAttackers = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((f) => m.set(f.sourceCountry, (m.get(f.sourceCountry) ?? 0) + f.volume));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered]);

  const topTargets = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((f) => m.set(f.targetCountry, (m.get(f.targetCountry) ?? 0) + f.volume));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered]);

  const alertsForCountry = country
    ? mockAlertGraphNodes.filter((a) => a.title.toLowerCase().includes(country.toLowerCase()) || a.sourceIp.includes("203"))
    : [];

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-extrabold uppercase tracking-tight">Threat Map</h1>
        <p className="text-sm text-muted-foreground">Globe interactif, replay 24 h, corrélations MISP (démonstration).</p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/30 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Rejouer la fenêtre</p>
            <p className="text-sm font-medium">Dernières {hour} h</p>
          </div>
          <div className="flex min-w-[200px] max-w-md flex-1 items-center gap-3 px-2">
            <span className="text-xs text-muted-foreground">1h</span>
            <Slider min={1} max={24} step={1} value={[hour]} onValueChange={(v) => setHour(v[0] ?? 24)} />
            <span className="text-xs text-muted-foreground">24h</span>
          </div>
        </div>

        <div className="relative grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="relative min-h-[360px] bg-gradient-to-b from-sky-950/20 via-background to-background">
            {/* Globe 3D (CSS) */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
              <div
                className="relative h-64 w-64 rounded-full bg-gradient-to-br from-primary/30 via-sky-500/20 to-emerald-600/30 shadow-[0_0_80px_rgba(0,0,0,0.15)]"
                style={{
                  transform: "rotateX(12deg) rotateY(-18deg)",
                  animation: "soc-globe-spin 48s linear infinite",
                }}
              >
                <div className="absolute inset-4 rounded-full border border-white/20 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.35),transparent_55%)]" />
                {/* MISP hot zones overlay */}
                <span className="absolute left-[18%] top-[32%] flex h-4 w-4 items-center justify-center rounded-full bg-destructive/90 text-[8px] font-bold text-white ring-2 ring-background">
                  M
                </span>
                <span className="absolute right-[22%] top-[40%] flex h-4 w-4 items-center justify-center rounded-full bg-destructive/90 text-[8px] font-bold text-white ring-2 ring-background">
                  M
                </span>
              </div>
            </div>

            <svg className="relative z-[1] h-full min-h-[320px] w-full" viewBox="0 0 800 400">
              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="var(--primary)" />
                </marker>
              </defs>
              {filtered.map((f, i) => {
                const x1 = 100 + (i * 180) % 500;
                const y1 = 80 + (i % 3) * 40;
                const x2 = x1 + 120 + (i % 2) * 40;
                const y2 = y1 + 100;
                return (
                  <g key={`${f.sourceCountry}-${f.targetCountry}-${i}`}>
                    <path
                      d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${y1 - 40} ${x2} ${y2}`}
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth={2 + (f.volume % 4)}
                      strokeOpacity={0.55}
                      markerEnd="url(#arrow)"
                    />
                    <text x={x1} y={y1 - 8} fontSize={11} fill="var(--foreground)" className="cursor-pointer" onClick={() => setCountry(f.sourceCountry)}>
                      {f.sourceCountry}
                    </text>
                    <text x={x2} y={y2 + 18} fontSize={11} fill="var(--foreground)" className="cursor-pointer" onClick={() => setCountry(f.targetCountry)}>
                      {f.targetCountry}
                    </text>
                  </g>
                );
              })}
            </svg>
            <style>{`@keyframes soc-globe-spin { to { transform: rotateX(12deg) rotateY(-18deg) rotateY(360deg); } }`}</style>
          </div>

          <div className="space-y-3 border-t border-border p-4 lg:border-l lg:border-t-0">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Top pays</h3>
            <Card className="p-3">
              <p className="mb-2 text-xs font-semibold text-destructive">Attaquants</p>
              <ol className="space-y-1 text-sm">
                {topAttackers.map(([c, v], i) => (
                  <li key={c}>
                    <button type="button" className="flex w-full justify-between rounded hover:bg-secondary" onClick={() => setCountry(c)}>
                      <span>
                        {i + 1}. {c}
                      </span>
                      <Badge variant="secondary">{v}</Badge>
                    </button>
                  </li>
                ))}
              </ol>
            </Card>
            <Card className="p-3">
              <p className="mb-2 text-xs font-semibold text-primary">Cibles</p>
              <ol className="space-y-1 text-sm">
                {topTargets.map(([c, v], i) => (
                  <li key={c}>
                    <button type="button" className="flex w-full justify-between rounded hover:bg-secondary" onClick={() => setCountry(c)}>
                      <span>
                        {i + 1}. {c}
                      </span>
                      <Badge variant="outline">{v}</Badge>
                    </button>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      </Card>

      <Sheet open={!!country} onOpenChange={(o) => !o && setCountry(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Alertes — {country}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 text-sm">
            {alertsForCountry.length === 0 && <p className="text-muted-foreground">Aucune alerte mock liée (brancher agrégation géo-IP).</p>}
            {alertsForCountry.map((a) => (
              <Card key={a.id} className="p-3">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.sourceIp}</p>
              </Card>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
