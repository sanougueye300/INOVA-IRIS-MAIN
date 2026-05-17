import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockVtRecentSearches } from "@/lib/soc-mock";
import { toast } from "sonner";
import { ScanSearch, GitCompare } from "lucide-react";

export function VirusTotalToolTab() {
  const [hashA, setHashA] = useState("a3f2c9…");
  const [hashB, setHashB] = useState("b91e4d…");
  const [query, setQuery] = useState("");

  const analyze = () => {
    toast.success("Analyse VirusTotal (démo)", { description: query || "Résultats enrichis mock affichés ci-dessous." });
  };

  const proposeMisp = () => {
    toast.message("Proposition MISP", { description: "Brouillon d'événement créé à partir du rapport VT (API à brancher)." });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">VirusTotal</h2>
        <p className="text-sm text-muted-foreground">Analyse hash / URL / fichier — comparaison et lien MISP (démo).</p>
      </div>

      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Upload &amp; recherche</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="SHA256, URL ou chemin fichier…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button className="shrink-0" onClick={analyze}>
            <ScanSearch className="mr-2 h-4 w-4" />
            Analyser
          </Button>
        </div>
        <div className="mt-4 grid gap-3 rounded-lg border border-dashed border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Résultat mock :</strong> 42/72 moteurs · famille Win32/Trojan.Generic ·
            comportements réseau suspects.
          </p>
          <Button size="sm" variant="outline" className="w-fit" onClick={proposeMisp}>
            Créer un event MISP depuis ce rapport
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Comparaison de deux hashs</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input value={hashA} onChange={(e) => setHashA(e.target.value)} placeholder="Hash A" />
          <Input value={hashB} onChange={(e) => setHashB(e.target.value)} placeholder="Hash B" />
        </div>
        <Button className="mt-3" variant="secondary" onClick={() => toast.message("Diff VT", { description: "Mêmes 58 signatures, réputation différente sur 2 moteurs." })}>
          Comparer
        </Button>
        <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <Badge className="mb-2">A</Badge>
            <p>Détections : 42/72 · First seen : 2024-11-02</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <Badge className="mb-2">B</Badge>
            <p>Détections : 39/72 · First seen : 2025-01-18</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 font-semibold">VT Intelligence — recherches récentes (équipe)</h3>
        <ul className="space-y-2 text-sm">
          {mockVtRecentSearches().map((r, i) => (
            <li key={i} className="flex justify-between rounded-md bg-secondary/40 px-3 py-2 font-mono text-xs">
              <span>{r.query}</span>
              <span className="text-muted-foreground">
                {r.engines} · {new Date(r.at).toLocaleString("fr-FR")}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
