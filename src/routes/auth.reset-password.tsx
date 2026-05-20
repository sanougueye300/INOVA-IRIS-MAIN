import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Lock, Check, X, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Password rules validation
  const [checks, setChecks] = useState({
    length: false,
    upper: false,
    number: false,
    special: false
  });

  useEffect(() => {
    setChecks({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    });
  }, [password]);

  const allPassed = Object.values(checks).every(Boolean);
  const match = password && password === confirmPassword;

  // Strength score
  const passedCount = Object.values(checks).filter(Boolean).length;
  const strengthText = ["Très Faible", "Faible", "Moyen", "Fort", "Excellent"][passedCount];
  const strengthColor = [
    "bg-destructive", 
    "bg-destructive/80", 
    "bg-amber-500", 
    "bg-primary/80", 
    "bg-emerald-500"
  ][passedCount];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allPassed) {
      toast.error("Le mot de passe ne respecte pas les critères de sécurité.");
      return;
    }
    if (!match) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Mot de passe mis à jour avec succès ! Vous pouvez vous connecter.");
      navigate({ to: "/auth/login" });
    }, 2000);
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="text-3xl font-extrabold tracking-tight">Réinitialisation</h2>
        <p className="text-sm text-muted-foreground">
          Définissez un nouveau mot de passe réseau hautement sécurisé.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="password">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              required
            />
          </div>
        </div>

        {/* Strength Progress Bar */}
        {password && (
          <div className="space-y-1.5 py-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Sécurité :</span>
              <span className="font-semibold" style={{ color: `var(--color-${strengthColor.split("-")[1]})` }}>{strengthText}</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full ${strengthColor} transition-all duration-300`} 
                style={{ width: `${(passedCount / 4) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Security Checklist */}
        <div className="rounded-lg border border-border/60 bg-zinc-900/10 p-3 space-y-2 text-xs">
          <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider mb-2">Exigences requises :</p>
          {[
            { label: "Au moins 8 caractères", passed: checks.length },
            { label: "Au moins une lettre majuscule (A-Z)", passed: checks.upper },
            { label: "Au moins un chiffre (0-9)", passed: checks.number },
            { label: "Au moins un caractère spécial (@, #, $, etc.)", passed: checks.special }
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 select-none">
              {item.passed ? (
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <X className="h-4 w-4 text-zinc-500 shrink-0" />
              )}
              <span className={item.passed ? "text-foreground font-medium" : "text-muted-foreground"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="confirm">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="confirm"
              type="password"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              required
            />
          </div>
          {confirmPassword && (
            <div className="text-[10px] font-semibold mt-1">
              {match ? (
                <span className="text-emerald-500 flex items-center gap-1"><Check className="h-3 w-3" /> Les mots de passe correspondent</span>
              ) : (
                <span className="text-destructive flex items-center gap-1"><X className="h-3 w-3" /> Les mots de passe ne correspondent pas</span>
              )}
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold shadow-[var(--glow-primary)] py-2.5 mt-4"
          disabled={isLoading || !allPassed || !match}
        >
          {isLoading ? "Application..." : "Mettre à jour le mot de passe"}
        </Button>
      </form>
    </div>
  );
}
