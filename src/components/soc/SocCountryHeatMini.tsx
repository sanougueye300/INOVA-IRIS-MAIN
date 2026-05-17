import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockCountryTraffic } from "@/lib/soc-mock";
import { cn } from "@/lib/utils";

/** Mini carte thermique par pays (intensité relative mock). */
export function SocCountryHeatMini() {
  const max = Math.max(...mockCountryTraffic.map((c) => c.intensity), 0.001);
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Trafic suspect par pays</h2>
        <Badge variant="outline">7 jours</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {mockCountryTraffic.map((c) => {
          const ratio = c.intensity / max;
          return (
            <div
              key={c.code}
              className={cn(
                "rounded-lg border border-border px-2 py-3 text-center transition-opacity",
                ratio > 0.7 && "ring-1 ring-destructive/40",
              )}
              style={{
                background: `color-mix(in oklch, var(--primary) ${Math.round(ratio * 85)}%, transparent)`,
              }}
            >
              <div className="text-lg font-bold">{c.code}</div>
              <div className="truncate text-[10px] text-muted-foreground">{c.country}</div>
              <div className="mt-1 text-xs font-semibold">{Math.round(c.intensity * 100)}%</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
