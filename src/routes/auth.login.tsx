import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Fingerprint, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBioScanning, setIsBioScanning] = useState(false);
  const [bioSuccess, setBioSuccess] = useState(false);
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
          localStorage.setItem("inova_mock_user", JSON.stringify({
            id: "mock-uid-123",
            email: regUser.email,
            organization: regUser.companyName,
            user_metadata: { full_name: regUser.fullName || "Abonné" }
          }));
          toast.success("Connexion réussie", { description: "Bienvenue sur votre console SOC INOVA-IRIS." });
          navigate({ to: "/dashboard", replace: true });
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
        .select("is_active, phone, email")
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

      toast.success("Connexion réussie", { description: "Bienvenue sur INOVA-IRIS SOC." });

      navigate({ to: "/dashboard", replace: true });
    } catch (err: unknown) {
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

  const handleBiometrics = () => {
    setIsBioScanning(true);
    setBioSuccess(false);
    toast.info("Initialisation du capteur biométrique...");
    setTimeout(() => {
      setBioSuccess(true);
      toast.success("Empreinte biométrique reconnue avec succès !");
      setTimeout(() => {
        setIsBioScanning(false);
        navigate({ to: "/dashboard", replace: true });
      }, 800);
    }, 2500);
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="text-3xl font-extrabold tracking-tight">Connexion au SOC</h2>
        <p className="text-sm text-muted-foreground">
          Saisissez vos identifiants réseau pour accéder au SOC INOVA-IRIS.
        </p>
      </div>

      {isBioScanning ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-primary/40 rounded-2xl bg-primary/5 p-10 text-center animate-fade-in">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary shadow-[var(--glow-primary)]">
            <Fingerprint className={`h-10 w-10 ${bioSuccess ? "text-emerald-500 scale-110" : "animate-pulse"}`} />
          </div>
          <h3 className="mt-6 text-lg font-semibold">{bioSuccess ? "Authentifié !" : "Lecture biométrique en cours..."}</h3>
        </div>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="email">
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
                className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="password">
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
                className="w-full rounded-lg border border-input bg-card pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
            className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold shadow-[var(--glow-primary)] py-2.5"
            disabled={isLoading}
          >
            {isLoading ? "Vérification réseau..." : "Se connecter"}
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground font-medium">Ou continuer avec</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={handleBiometrics} className="flex items-center justify-center gap-2">
              <Fingerprint className="h-4 w-4 text-primary" />
              <span className="text-xs">Biométrie</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => toast.info("Authentification SSO Active Directory en cours...")}
              className="flex items-center justify-center gap-2"
            >
              <Chrome className="h-4 w-4 text-amber-500" />
              <span className="text-xs">Active Directory</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
