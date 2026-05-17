import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockCyberRss } from "@/lib/soc-mock";
import { ExternalLink } from "lucide-react";

/** Veille cybersécurité (mock type flux RSS — remplacer par fetch RSS côté backend pour éviter CORS). */
export function SocCyberRssCard() {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Veille cybersécurité</h2>
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          Demo
        </Badge>
      </div>
      <ul className="space-y-3">
        {mockCyberRss.map((item) => (
          <li key={item.id} className="rounded-lg border border-border/60 bg-secondary/20 p-3">
            <p className="text-sm font-medium leading-snug">{item.title}</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                {item.source} · {new Date(item.publishedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
              </span>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
                <a href={item.link} target="_blank" rel="noreferrer">
                  Lire <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
