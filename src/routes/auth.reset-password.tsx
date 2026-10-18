import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Lock, Check, X, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  // Password rules validation
  const [checks, setChecks] = useState({
    length: false,
    upper: false,
    number: false,
    special: false
  });

  useEffect(() => {
    // 1. Détecter session active ou événement PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email) {
        setAccountEmail(session.user.email);
      }
      if (event === "PASSWORD_RECOVERY") {
        toast.info("Session de récupération active. Définissez votre nouveau mot de passe.");
      }
    });

    // 2. Échange de code PKCE si présent (?code=...)
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (!error && data?.user?.email) {
          setAccountEmail(data.user.email);
          toast.success("Authentification de sécurité validée.");
        }
      });
    } else {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.email) setAccountEmail(data.user.email);
      });
    }

    return () => subscription.unsubscribe();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
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
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const regUserStr = localStorage.getItem("inova_registered_user");
        if (regUserStr) {
          try {
            const reg = JSON.parse(regUserStr);
            reg.password = password;
            localStorage.setItem("inova_registered_user", JSON.stringify(reg));
            toast.success("Mot de passe mis à jour avec succès ! Vous pouvez vous connecter.");
            navigate({ to: "/auth/login", replace: true });
            return;
          } catch {}
        }
        throw error;
      }

      const regUserStr = localStorage.getItem("inova_registered_user");
      if (regUserStr) {
        try {
          const reg = JSON.parse(regUserStr);
          reg.password = password;
          localStorage.setItem("inova_registered_user", JSON.stringify(reg));
        } catch {}
      }

      toast.success("Mot de passe mis à jour avec succès ! Vous pouvez vous connecter.");
      navigate({ to: "/auth/login", replace: true });
    } catch (err: any) {
      toast.error("Erreur de mise à jour", {
        description: err.message || "Une erreur est survenue lors de la mise à jour.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3.5 animate-fade-in">
      <div className="space-y-1 text-center lg:text-left">
        <h2 className="text-2xl font-bold tracking-tight">Réinitialisation</h2>
        <p className="text-xs text-muted-foreground">
          {accountEmail ? `Compte : ${accountEmail}` : "Définissez un nouveau mot de passe réseau hautement sécurisé."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="password">
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
              className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              required
            />
          </div>
        </div>

        {/* Strength Progress Bar */}
        {password && (
          <div className="space-y-1 py-0.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-muted-foreground">Sécurité :</span>
              <span className="font-semibold text-xs">{strengthText}</span>
            </div>
            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full ${strengthColor} transition-all duration-300`} 
                style={{ width: `${(passedCount / 4) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Security Checklist 2 columns */}
        <div className="rounded-lg border border-border/60 bg-zinc-900/10 p-2 space-y-1 text-xs">
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            {[
              { label: "≥ 8 caractères", passed: checks.length },
              { label: "1 Majuscule (A-Z)", passed: checks.upper },
              { label: "1 Chiffre (0-9)", passed: checks.number },
              { label: "1 Spécial (@,#,$...)", passed: checks.special }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 select-none">
                {item.passed ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <X className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                )}
                <span className={item.passed ? "text-foreground font-medium text-[11px]" : "text-muted-foreground text-[11px]"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="confirm">
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
              className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              required
            />
          </div>
          {confirmPassword && (
            <div className="text-[10px] font-semibold">
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
          className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold shadow-[var(--glow-primary)] py-2 text-sm mt-2"
          disabled={isLoading || !allPassed || !match}
        >
          {isLoading ? "Application..." : "Mettre à jour le mot de passe"}
        </Button>
      </form>
    </div>
  );
}
