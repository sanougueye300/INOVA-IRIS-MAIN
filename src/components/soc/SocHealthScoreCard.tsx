import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { computeSocHealth, mockConnectors } from "@/lib/soc-mock";
import { Activity } from "lucide-react";

/** Score de santé SOC 0–100 % (données démo — brancher métriques réelles). */
export function SocHealthScoreCard() {
  const avgHandling = 18;
  const iocFresh = 87;
  const health = computeSocHealth(avgHandling, iocFresh, mockConnectors);

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Score de santé SOC</h2>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          {health.score}%
        </Badge>
      </div>
      <Progress value={health.score} className="h-3" />
      <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
        <li className="flex justify-between">
          <span>Délai moyen traitement alertes</span>
          <span className="font-medium text-foreground">{health.avgAlertHandlingMin} min</span>
        </li>
        <li className="flex justify-between">
          <span>IOC à jour</span>
          <span className="font-medium text-foreground">{health.iocFreshnessPct}%</span>
        </li>
        <li className="flex justify-between">
          <span>Connecteurs OK</span>
          <span className="font-medium text-foreground">
            {health.connectorsOk}/{health.connectorsTotal}
          </span>
        </li>
      </ul>
    </Card>
  );
}
