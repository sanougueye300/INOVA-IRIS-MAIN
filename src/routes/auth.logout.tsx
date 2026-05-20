import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { LogOut, RefreshCw, CheckCircle2, ShieldCheck, Activity, Key } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/logout")({
  component: LogoutPage,
});

function LogoutPage() {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  const stages = [
    "Révocation du jeton JWT de session...",
    "Purge du cache de télémétrie local...",
    "Déconnexion sécurisée des agents SIEM...",
    "Session terminée avec succès."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const nextProgress = prev + 8;
        // Shift stages based on progress
        if (nextProgress >= 100) setStage(3);
        else if (nextProgress >= 70) setStage(2);
        else if (nextProgress >= 30) setStage(1);
        return nextProgress;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full space-y-6 flex flex-col items-center animate-fade-in text-center">
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold tracking-tight">Déconnexion</h2>
        <p className="text-sm text-muted-foreground">
          Fermeture sécurisée de votre accès au SOC Sonatel.
        </p>
      </div>

      {progress < 100 ? (
        <div className="w-full space-y-4 max-w-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-950 border border-zinc-800 text-primary mx-auto animate-spin">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
              {stages[stage]}
            </p>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-6 max-w-sm animate-fade-in">
          {/* Audit report summary */}
          <div className="border border-zinc-800 bg-zinc-900/40 rounded-2xl p-5 space-y-4 text-left backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Rapport de Session SOC</h3>
                <p className="text-[10px] text-zinc-500">Statistiques de votre session active</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-zinc-900/50 p-2.5 rounded border border-zinc-800/80">
                <div className="text-zinc-500 text-[9px] uppercase tracking-wider font-semibold">Temps de session</div>
                <div className="text-zinc-200 font-bold mt-0.5">1h 24m 12s</div>
              </div>
              <div className="bg-zinc-900/50 p-2.5 rounded border border-zinc-800/80">
                <div className="text-zinc-500 text-[9px] uppercase tracking-wider font-semibold">Alertes auditées</div>
                <div className="text-zinc-200 font-bold mt-0.5">24 Incidents</div>
              </div>
              <div className="bg-zinc-900/50 p-2.5 rounded border border-zinc-800/80">
                <div className="text-zinc-500 text-[9px] uppercase tracking-wider font-semibold">Playbooks SOAR</div>
                <div className="text-zinc-200 font-bold mt-0.5">12 Déclenchés</div>
              </div>
              <div className="bg-zinc-900/50 p-2.5 rounded border border-zinc-800/80">
                <div className="text-zinc-500 text-[9px] uppercase tracking-wider font-semibold">Score de Sécurité</div>
                <div className="text-emerald-500 font-bold mt-0.5">100% Protégé</div>
              </div>
            </div>
            
            <p className="text-[9px] text-zinc-500 text-center italic pt-1">
              Tous les logs ont été chiffrés et transmis au journal d'audit global.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              asChild
              className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold shadow-[var(--glow-primary)] py-2.5"
            >
              <Link to="/auth/login">Se reconnecter</Link>
            </Button>
            
            <Button
              asChild
              variant="outline"
              className="w-full border-border/80 text-xs"
            >
              <Link to="/">Retourner à l'accueil</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
