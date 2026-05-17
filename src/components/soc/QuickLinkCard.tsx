import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Props {
  to: string;
  hash?: string;
  label: string;
  icon: LucideIcon;
  tone: "orange" | "amber" | "emerald" | "sky" | "rose" | "violet";
}

const tones: Record<Props["tone"], string> = {
  orange: "bg-primary/10 text-primary",
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  sky: "bg-sky-100 text-sky-700",
  rose: "bg-rose-100 text-rose-700",
  violet: "bg-violet-100 text-violet-700",
};

export function QuickLinkCard({ to, hash, label, icon: Icon, tone }: Props) {
  return (
    <Link
      to={to}
      hash={hash}
      className="group flex items-center gap-3 rounded-xl bg-card p-4 shadow-sm ring-1 ring-border transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-foreground">{label}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          Visiter <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}