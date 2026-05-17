import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockIncidentTimeline } from "@/lib/soc-mock";
import { cn } from "@/lib/utils";

const sevStyles: Record<string, string> = {
  low: "bg-muted text-foreground",
  medium: "bg-yellow-500/90 text-black",
  high: "bg-orange-500/90 text-white",
  critical: "bg-destructive text-destructive-foreground",
};

/** Chronologie interactive des incidents récents (clic = navigation future vers cas). */
export function SocIncidentTimeline({ onSelect }: { onSelect?: (id: string) => void }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Incidents récents</h2>
        <Badge variant="secondary">Timeline</Badge>
      </div>
      <ol className="relative border-s border-border ps-4">
        {mockIncidentTimeline.map((it, i) => (
          <li key={it.id} className="mb-6 ms-2 last:mb-0">
            <span className="absolute -start-1.5 mt-1.5 flex h-3 w-3 rounded-full border border-background bg-primary" />
            <button
              type="button"
              className={cn(
                "w-full rounded-lg border border-transparent text-left transition-colors hover:border-border hover:bg-secondary/50",
                i === 0 && "ring-1 ring-primary/30",
              )}
              onClick={() => onSelect?.(it.id)}
            >
              <div className="flex flex-wrap items-center gap-2 px-2 py-1.5">
                <Badge className={sevStyles[it.severity] ?? sevStyles.medium}>{it.severity}</Badge>
                <span className="text-sm font-medium">{it.title}</span>
                <span className="text-xs text-muted-foreground">{it.caseRef}</span>
              </div>
              <p className="px-2 pb-1 text-xs text-muted-foreground">
                {new Date(it.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
              </p>
            </button>
          </li>
        ))}
      </ol>
    </Card>
  );
}
