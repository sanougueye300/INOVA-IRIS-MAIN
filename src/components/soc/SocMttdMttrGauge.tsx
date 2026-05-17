import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { mockMttdMttr } from "@/lib/soc-mock";
import { Timer, ShieldCheck } from "lucide-react";

/** MTTD vs MTTR — jauge simple (seuils SOC indicatifs). */
export function SocMttdMttrGauge() {
  const mttdPct = Math.min(100, (mockMttdMttr.mttdMin / 30) * 100);
  const mttrPct = Math.min(100, (mockMttdMttr.mttrMin / 240) * 100);

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-semibold">MTTD vs MTTR</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        <GaugeBlock
          icon={<Timer className="h-4 w-4" />}
          label="Temps moyen de détection (MTTD)"
          valueMin={mockMttdMttr.mttdMin}
          pct={mttdPct}
          hint="Objectif < 15 min"
        />
        <GaugeBlock
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Temps moyen de réponse (MTTR)"
          valueMin={mockMttdMttr.mttrMin}
          pct={mttrPct}
          hint="Objectif < 4 h"
        />
      </div>
    </Card>
  );
}

function GaugeBlock({
  icon,
  label,
  valueMin,
  pct,
  hint,
}: {
  icon: ReactNode;
  label: string;
  valueMin: number;
  pct: number;
  hint: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="text-2xl font-extrabold tracking-tight">
        {valueMin < 60 ? `${valueMin.toFixed(1)} min` : `${(valueMin / 60).toFixed(1)} h`}
      </div>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-primary to-destructive transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
