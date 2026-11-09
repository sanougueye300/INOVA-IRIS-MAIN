import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, MessageSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { authenticateRegisteredClient } from "@/lib/registered-client-auth";
import { clear2FAState, IS_2FA_ENABLED, sendLoginSmsOtp, setPending2FA } from "@/lib/auth-security";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    // Vérifier d'abord s'il s'agit de l'utilisateur inscrit via la souscription locale
    const registeredUserStr = localStorage.getItem("inova_registered_user");
    if (registeredUserStr) {
      try {
        const regUser = JSON.parse(registeredUserStr);
        if (email.toLowerCase() === regUser.email.toLowerCase() && password === regUser.password) {
          setIsLoading(true);
          try {
            await authenticateRegisteredClient({
              ...regUser,
              fullName: regUser.fullName || "Abonné",
              companyName: regUser.companyName || "Client",
            });

            if (!IS_2FA_ENABLED) {
              clear2FAState();
              setPending2FA(false);
              toast.success("Connexion réussie", {
                description: "Bienvenue sur le SOC INOVA-IRIS.",
              });
              navigate({ to: "/dashboard", replace: true });
              return;
            }

            let otp: Awaited<ReturnType<typeof sendLoginSmsOtp>>;
            try {
              otp = await sendLoginSmsOtp();
            } catch (error) {
              await supabase.auth.signOut();
              throw error;
            }
            setPending2FA(true);
            toast.success("Identifiants validés", {
              description: otp.otpChannel === "email"
                ? "Votre code 2FA a été envoyé par e-mail."
                : `Votre code 2FA a été envoyé par SMS${otp.maskedPhone ? ` au ${otp.maskedPhone}` : ""}.`,
            });
            navigate({ to: "/auth/2fa", replace: true });
          } catch (error) {
            toast.error("Impossible d'activer votre compte", {
              description: error instanceof Error ? error.message : "Vérifiez votre connexion Supabase.",
            });
          } finally {
            setIsLoading(false);
          }
          return;
        }
      } catch (e) {
        // ignore
      }
    }

    // Vérifier le lockout local (côté client, doublé côté serveur)
    if (lockoutUntil && new Date() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil.getTime() - Date.now()) / 1000);
      toast.error(`Compte temporairement verrouillé. Réessayez dans ${remaining}s.`);
      return;
    }

    setIsLoading(true);
    let credentialsValidated = false;
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", authData.user.id)
        .single();

      if (profileErr || !profile) {
        await supabase.auth.signOut();
        throw new Error("Profil utilisateur introuvable. Contactez l'administrateur SOC.");
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        throw new Error("Votre compte est suspendu. Contactez l'administrateur SOC.");
      }

      credentialsValidated = true;

      // Si le 2FA est en pause (en attente de validation de la signature Orange SMS)
      if (!IS_2FA_ENABLED) {
        clear2FAState();
        setPending2FA(false);
        toast.success("Connexion réussie", {
          description: "Bienvenue sur la console de cyberdéfense INOVA-IRIS SOC.",
        });
        navigate({ to: "/dashboard", replace: true });
        return;
      }

      let otp: Awaited<ReturnType<typeof sendLoginSmsOtp>>;
      try {
        otp = await sendLoginSmsOtp();
      } catch (error) {
        await supabase.auth.signOut();
        throw new Error(
          `Connexion vérifiée, mais le code 2FA n'a pas pu être envoyé. ${error instanceof Error ? error.message : ""}`.trim(),
        );
      }

      setPending2FA(true);
      toast.success("Identifiants validés", {
        description:
          otp.otpChannel === "email"
            ? "Votre code 2FA a été envoyé par e-mail."
            : `Votre code 2FA a été envoyé par SMS Orange${otp.maskedPhone ? ` au ${otp.maskedPhone}` : ""}.`,
      });

      // Redirection directe vers la double authentification
      navigate({ to: "/auth/2fa", replace: true });
    } catch (err: unknown) {
      if (!credentialsValidated) {
        setLoginAttempts(prev => {
          const next = prev + 1;
          if (next >= 5) {
            const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
            setLockoutUntil(lockUntil);
            toast.error("Trop de tentatives. Compte verrouillé 15 minutes.");
          }
          return next;
        });
      }
      const message = err instanceof Error ? err.message : "Email ou mot de passe incorrect.";
      const isServerConfig = message.includes("Configuration Supabase") || message.includes("manquante");
      toast.error(credentialsValidated ? "Code 2FA non envoyé" : "Échec de l'authentification", {
        description: isServerConfig
          ? "Ajoutez SUPABASE_SERVICE_ROLE_KEY dans .env (Supabase → Settings → API), puis redémarrez le serveur."
          : message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="space-y-1 text-center lg:text-left">
        {IS_2FA_ENABLED ? (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-[10px] font-semibold mb-1">
            <MessageSquare className="h-3 w-3" />
            <span>Double facteur par Orange SMS Pro</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-semibold mb-1">
            <ShieldCheck className="h-3 w-3" />
            <span>2FA en pause temporaire (validation signature Orange en attente)</span>
          </div>
        )}
        <h2 className="text-2xl font-bold tracking-tight">Connexion au SOC</h2>
        <p className="text-xs text-muted-foreground">
          Saisissez vos identifiants réseau pour accéder au SOC INOVA-IRIS.
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-3.5">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="email">
            Adresse e-mail SOC
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              type="email"
              placeholder="nom@sonatel.sn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="password">
              Mot de passe de sécurité
            </label>
            <Link to="/auth/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-card pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold shadow-[var(--glow-primary)] py-2 text-sm mt-1"
          disabled={isLoading}
        >
          {isLoading ? "Vérification réseau..." : "Se connecter"}
        </Button>
      </form>
    </div>
  );
}
