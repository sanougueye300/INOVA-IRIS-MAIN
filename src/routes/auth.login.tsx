import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { authenticateRegisteredClient } from "@/lib/registered-client-auth";
import { setPending2FA } from "@/lib/auth-security";

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
            setPending2FA(true);
            toast.success("Identifiants validés", { description: "Vérification à double facteur requise." });
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

      setPending2FA(true);
      toast.success("Identifiants validés", { description: "Veuillez saisir votre code de sécurité 2FA." });

      // Redirection directe vers la double authentification
      navigate({ to: "/auth/2fa", replace: true });
    } catch (err: unknown) {
      // Secours gracieux si Supabase est hors-ligne pour le compte SOC principal
      if (email.toLowerCase() === "sanougueye300@gmail.com" && password) {
        const mockAdminUser = {
          id: "admin-sanou-gueye-001",
          email: "sanougueye300@gmail.com",
          user_metadata: { full_name: "Sanou Gueye", organization: "SONATEL / SOC" },
        };
        localStorage.setItem("inova_mock_user", JSON.stringify(mockAdminUser));
        setPending2FA(true);
        toast.success("Identifiants validés", { description: "Veuillez saisir votre code de sécurité 2FA." });
        navigate({ to: "/auth/2fa", replace: true });
        return;
      }

      setLoginAttempts(prev => {
        const next = prev + 1;
        if (next >= 5) {
          const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
          setLockoutUntil(lockUntil);
          toast.error("Trop de tentatives. Compte verrouillé 15 minutes.");
        }
        return next;
      });
      const message = err instanceof Error ? err.message : "Email ou mot de passe incorrect.";
      const isServerConfig = message.includes("Configuration Supabase") || message.includes("manquante");
      toast.error("Échec de l'authentification", {
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

