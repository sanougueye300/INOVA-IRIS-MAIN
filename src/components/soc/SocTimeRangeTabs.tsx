import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSocPreferences, type SocTimeRange } from "@/lib/soc-preferences";

const LABELS: Record<SocTimeRange, string> = {
  "24h": "24 h",
  "7d": "7 j",
  "30d": "30 j",
};

/** Filtre temporel persistant (localStorage via SocPreferencesProvider). */
export function SocTimeRangeTabs({ className }: { className?: string }) {
  const { timeRange, setTimeRange } = useSocPreferences();
  return (
    <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as SocTimeRange)} className={className}>
      <TabsList className="h-9">
        {(Object.keys(LABELS) as SocTimeRange[]).map((k) => (
          <TabsTrigger key={k} value={k} className="px-3 text-xs">
            {LABELS[k]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
