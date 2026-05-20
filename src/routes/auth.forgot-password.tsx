import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, CheckCircle2, AlertTriangle, ArrowRight, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const [securityAnswer, setSecurityAnswer] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Veuillez saisir votre e-mail.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSent(true);
      toast.success("Lien de récupération envoyé ! Vérifiez votre boîte de réception.");
    }, 1500);
  };

  const handleBackupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityAnswer) {
      toast.error("Veuillez répondre à la question.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Réponses de sécurité validées. Redirection vers la réinitialisation...");
      window.location.hash = "/auth/reset-password"; // Simple simulation bypass
    }, 1500);
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="text-3xl font-extrabold tracking-tight">Récupération</h2>
        <p className="text-sm text-muted-foreground">
          {isSent 
            ? "Un lien de réinitialisation sécurisé vous a été envoyé." 
            : "Saisissez votre e-mail SOC ou utilisez vos questions de secours."}
        </p>
      </div>

      {isSent ? (
        <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-6 space-y-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Consultez votre boîte mail</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Un message contenant les instructions de récupération a été envoyé à <strong className="text-foreground">{email}</strong>.
              Le lien expirera dans 15 minutes.
            </p>
          </div>
          <div className="pt-4 border-t border-border flex flex-col gap-2">
            <Button 
              variant="outline"
              size="sm" 
              onClick={() => setIsSent(false)} 
              className="text-xs"
            >
              Renvoyer le lien
            </Button>
            <Button 
              asChild
              variant="link"
              className="text-xs text-zinc-500 hover:text-foreground"
            >
              <Link to="/auth/login">Retourner à la connexion</Link>
            </Button>
          </div>
        </div>
      ) : useBackup ? (
        <form onSubmit={handleBackupSubmit} className="space-y-4">
          <div className="border border-dashed border-border/80 rounded-xl p-4 bg-card space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase">
              <ShieldQuestion className="h-4 w-4" /> Questions de secours actives
            </div>
            <p className="text-xs text-muted-foreground">
              Quel était le nom de votre premier serveur d'administration SOC ?
            </p>
            <input
              type="text"
              placeholder="Ex: wazuh-master-01"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold shadow-[var(--glow-primary)] py-2.5"
            disabled={isLoading}
          >
            {isLoading ? "Vérification..." : "Valider mes réponses"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setUseBackup(false)}
            className="w-full text-xs text-zinc-500 hover:text-foreground"
          >
            Utiliser l'e-mail à la place
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="email">
              Adresse e-mail de récupération
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

          <Button
            type="submit"
            className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold shadow-[var(--glow-primary)] py-2.5"
            disabled={isLoading}
          >
            {isLoading ? "Envoi..." : "Envoyer le lien de récupération"}
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground font-medium">Ou alternative de secours</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setUseBackup(true)}
            className="w-full border-border/80 hover:bg-accent/40 flex items-center justify-center gap-2"
          >
            <ShieldQuestion className="h-4 w-4 text-primary" />
            <span className="text-xs">Répondre aux questions de secours</span>
          </Button>

          <div className="text-center text-xs mt-6">
            <Link to="/auth/login" className="text-primary font-semibold hover:underline flex items-center justify-center gap-1">
              Retourner à la connexion <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
