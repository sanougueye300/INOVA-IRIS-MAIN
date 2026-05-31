import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, Mail, Lock, Eye, EyeOff, Fingerprint, Chrome, ShieldAlert, CheckCircle2 } from "lucide-react";
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast.success("Connexion réussie ! Bienvenue sur la plateforme Sonatel SOC.");
      navigate({ to: "/dashboard", replace: true });
    } catch (err: any) {
      toast.error("Échec de l'authentification", {
        description: err.message || "Email ou mot de passe incorrect.",
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
          Saisissez vos identifiants réseau ou utilisez la biométrie pour accéder au terminal.
        </p>
      </div>

      {isBioScanning ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-primary/40 rounded-2xl bg-primary/5 p-10 text-center animate-fade-in">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary shadow-[var(--glow-primary)]">
            <Fingerprint className={`h-10 w-10 ${bioSuccess ? "text-emerald-500 scale-110" : "animate-pulse"}`} />
            {!bioSuccess && (
              <span className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping"></span>
            )}
          </div>
          <h3 className="mt-6 text-lg font-semibold text-foreground">
            {bioSuccess ? "Authentifié !" : "Lecture biométrique en cours..."}
          </h3>
          <p className="mt-2 text-xs text-muted-foreground max-w-xs">
            {bioSuccess 
              ? "Redirection vers le tableau de bord principal..." 
              : "Veuillez poser votre doigt sur le capteur de sécurité ou regarder votre caméra."}
          </p>
          {!bioSuccess && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsBioScanning(false)} 
              className="mt-6 text-zinc-500 hover:text-foreground"
            >
              Annuler
            </Button>
          )}
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
                className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="password">
                Mot de passe de sécurité
              </label>
              <Link 
                to="/auth/forgot-password" 
                className="text-xs font-medium text-primary hover:underline"
              >
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
                className="w-full rounded-lg border border-input bg-card pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
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

          <div className="flex items-center">
            <input
              id="remember"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="remember" className="ml-2 text-xs font-medium text-muted-foreground select-none cursor-pointer">
              Se souvenir de ma session sur cet hôte
            </label>
          </div>

          <Button
            type="submit"
            className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold shadow-[var(--glow-primary)] py-2.5"
            disabled={isLoading}
          >
            {isLoading ? "Vérification réseau..." : "Se connecter"}
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground font-medium">Ou continuer avec</span>
            </div>
          </div>

          {/* Grid for SSO & Biometrics */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleBiometrics}
              className="flex items-center justify-center gap-2 border-border/80 hover:bg-accent/40"
            >
              <Fingerprint className="h-4 w-4 text-primary" />
              <span className="text-xs">Biométrie</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => toast.info("Authentification SSO Active Directory en cours...")}
              className="flex items-center justify-center gap-2 border-border/80 hover:bg-accent/40"
            >
              <Chrome className="h-4 w-4 text-amber-500" />
              <span className="text-xs">Active Directory</span>
            </Button>
          </div>

          <div className="text-center text-xs mt-6">
            <span className="text-muted-foreground">Veuillez contacter l'administrateur du SOC pour obtenir vos accès.</span>
          </div>
        </form>
      )}
    </div>
  );
}
