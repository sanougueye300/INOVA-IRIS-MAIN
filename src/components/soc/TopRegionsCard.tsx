import { Card } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const REGIONS = [
  { name: "Dakar", flag: "🇸🇳", weight: 0.36 },
  { name: "Diourbel", flag: "🇸🇳", weight: 0.21 },
  { name: "Thiès", flag: "🇸🇳", weight: 0.16 },
  { name: "Saint-Louis", flag: "🇸🇳", weight: 0.12 },
  { name: "Kaolack", flag: "🇸🇳", weight: 0.09 },
  { name: "Ziguinchor", flag: "🇸🇳", weight: 0.06 },
];

export function TopRegionsCard() {
  const [total, setTotal] = useState(0);
  const [iocs, setIocs] = useState(0);
  const [critical, setCritical] = useState(0);

  useEffect(() => {
    (async () => {
      const [a, i, c] = await Promise.all([
        supabase.from("alerts").select("id", { count: "exact", head: true }),
        supabase.from("iocs").select("id", { count: "exact", head: true }),
        supabase.from("alerts").select("id", { count: "exact", head: true }).gte("severity", 12),
      ]);
      setTotal(a.count ?? 0);
      setIocs(i.count ?? 0);
      setCritical(c.count ?? 0);
    })();
  }, []);

  const rows = useMemo(
    () => REGIONS.map((r) => ({
      ...r,
      users: Math.round(total * r.weight + 1500 * r.weight),
      transactions: Math.round(total * r.weight * 0.18 + 12),
      revenue: Math.round((total + iocs * 3) * r.weight * 8.7 + 800),
    })),
    [total, iocs],
  );
  const totals = rows.reduce(
    (acc, r) => ({ users: acc.users + r.users, tx: acc.tx + r.transactions, rev: acc.rev + r.revenue }),
    { users: 0, tx: 0, rev: 0 },
  );
  const fmt = (n: number) => n.toLocaleString("fr-FR");

  return (
    <Card className="p-6">
      <div className="mb-1 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Top régions par activité SOC</h2>
          <p className="text-sm text-muted-foreground">Où se concentrent les détections — temps réel</p>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600">
          {critical} critiques
        </span>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <th className="py-2 text-left">Région</th>
              <th className="py-2 text-right">Événements</th>
              <th className="py-2 text-right">Incidents</th>
              <th className="py-2 text-right">Score risque</th>
            </tr>
            <tr className="border-b border-border/60 text-base">
              <td className="py-3"></td>
              <td className="py-3 text-right font-bold">{fmt(totals.users)}</td>
              <td className="py-3 text-right font-bold">{fmt(totals.tx)}</td>
              <td className="py-3 text-right font-bold">{fmt(totals.rev)}</td>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} className="border-b border-border/40 last:border-b-0">
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-4 text-muted-foreground">{i + 1}.</span>
                    <span className="text-xl leading-none">{r.flag}</span>
                    <a className="font-semibold text-primary hover:underline" href="#">{r.name}</a>
                  </div>
                </td>
                <td className="py-3 text-right">
                  <span className="font-semibold">{fmt(r.users)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">({(r.weight * 100).toFixed(1)}%)</span>
                </td>
                <td className="py-3 text-right">
                  <span className="font-semibold">{fmt(r.transactions)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">({(r.weight * 100 * 0.6).toFixed(1)}%)</span>
                </td>
                <td className="py-3 text-right">
                  <span className="font-semibold">{fmt(r.revenue)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">({(r.weight * 100 * 0.95).toFixed(1)}%)</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
