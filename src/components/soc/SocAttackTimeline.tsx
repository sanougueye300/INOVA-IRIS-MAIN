import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockMispEvents } from "@/lib/soc-mock";

/** Chronologie d'attaque reconstruite (Wazuh + MISP — données démo). */
export function SocAttackTimeline() {
  const events = [
    { t: "T0", label: "Première connexion SSH anormale (Wazuh 5710)", src: "Wazuh" },
    { t: "T+4m", label: "Montée en privilèges locale (60122)", src: "Wazuh" },
    { t: "T+12m", label: "IOC domaine correlé MISP", src: "MISP" },
    ...mockMispEvents.slice(0, 1).map((e) => ({
      t: "T+20m",
      label: `Partage TI : ${e.info}`,
      src: "MISP",
    })),
  ];

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Chronologie d&apos;attaque</h3>
        <Badge variant="outline">Wazuh + MISP</Badge>
      </div>
      <ol className="relative space-y-4 border-s border-primary/40 ps-4">
        {events.map((ev, i) => (
          <li key={i} className="text-sm">
            <span className="absolute -start-1.5 mt-1 h-3 w-3 rounded-full bg-primary" />
            <span className="font-mono text-xs text-muted-foreground">{ev.t}</span>{" "}
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {ev.src}
            </Badge>
            <p className="mt-1">{ev.label}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
