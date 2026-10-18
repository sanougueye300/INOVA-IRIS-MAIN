import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Mail, CheckCircle2, ArrowRight, ShieldQuestion, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { invokeAuthSecurity, sendPasswordResetWithFallback, getSecurityQuestionsForEmail } from "@/lib/auth-security";

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordPage,
});

type SecurityQuestion = { id: string; question_text: string };

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const [questions, setQuestions] = useState<SecurityQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  useEffect(() => {
    if (!useBackup || !email.trim()) {
      setQuestions([]);
      return;
    }

    const load = async () => {
      setLoadingQuestions(true);
      try {
        const qs = await getSecurityQuestionsForEmail(email);
        setQuestions(qs);
        setAnswers({});
      } catch {
        setQuestions([]);
      } finally {
        setLoadingQuestions(false);
      }
    };

    const t = setTimeout(load, 400);
    return () => clearTimeout(t);
  }, [useBackup, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Veuillez saisir votre e-mail.");
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetWithFallback(email);
      setIsSent(true);
      toast.success("E-mail de récupération envoyé", {
        description: "Consultez votre boîte de réception (vérifiez aussi les spams).",
      });
    } catch (err: unknown) {
      toast.error("Erreur de récupération", {
        description: err instanceof Error ? err.message : "Une erreur est survenue.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Saisissez d'abord votre e-mail.");
      return;
    }
    if (!questions.length) {
      toast.error("Aucune question de secours configurée pour ce compte.");
      return;
    }

    const payload = questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] ?? "",
    }));

    if (payload.some((a) => !a.answer.trim())) {
      toast.error("Veuillez répondre à toutes les questions.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await invokeAuthSecurity<{ resetUrl?: string }>(
        "verify_security_answers",
        { email: email.trim().toLowerCase(), answers: payload },
        { requireAuth: false },
      );

      toast.success("Identité vérifiée. Redirection vers la réinitialisation...");
      if (result.resetUrl) {
        window.location.href = result.resetUrl;
      } else {
        navigate({ to: "/auth/reset-password" });
      }
    } catch (err: unknown) {
      toast.error("Vérification échouée", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4 animate-fade-in">
      <div className="space-y-1 text-center lg:text-left">
        <h2 className="text-2xl font-bold tracking-tight">Récupération</h2>
        <p className="text-xs text-muted-foreground">
          {isSent
            ? "Un e-mail professionnel INOVA-IRIS vous a été envoyé avec les instructions."
            : "Réinitialisez votre accès via e-mail ou questions de secours."}
        </p>
      </div>

      {isSent ? (
        <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-4 space-y-3 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mx-auto">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Consultez votre boîte mail</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Un message <strong className="text-foreground">INOVA-IRIS</strong> contenant le lien sécurisé a été
              envoyé à <strong className="text-foreground">{email}</strong>. Le lien expire dans 15 minutes.
            </p>
          </div>
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            <Button asChild className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold text-xs h-9 shadow-[var(--glow-primary)]">
              <Link to="/auth/reset-password">
                Accéder directement à la page de réinitialisation
              </Link>
            </Button>
            <div className="flex gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setIsSent(false)} className="text-xs h-8 flex-1">
                Renvoyer le lien
              </Button>
              <Button asChild variant="outline" size="sm" className="text-xs h-8 flex-1">
                <Link to="/auth/login">Connexion</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : useBackup ? (
        <form onSubmit={handleBackupSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="backup-email">
              E-mail du compte
            </label>
            <input
              id="backup-email"
              type="email"
              placeholder="nom@sonatel.sn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              required
            />
          </div>

          {loadingQuestions ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground gap-2 text-xs">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des questions de secours...
            </div>
          ) : questions.length === 0 && email.trim() ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg p-2.5">
              Aucune question de secours active pour ce compte. Utilisez la récupération par e-mail ou configurez vos
              questions depuis votre profil après connexion.
            </p>
          ) : (
            questions.map((q) => (
              <div key={q.id} className="border border-dashed border-border/80 rounded-xl p-3 bg-card space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase">
                  <ShieldQuestion className="h-3.5 w-3.5" /> Question de secours
                </div>
                <p className="text-xs text-muted-foreground">{q.question_text}</p>
                <input
                  type="text"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            ))
          )}

          <Button
            type="submit"
            className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold py-2 text-sm"
            disabled={isLoading || !questions.length}
          >
            {isLoading ? "Vérification..." : "Valider mes réponses"}
          </Button>

          <Button type="button" variant="ghost" onClick={() => setUseBackup(false)} className="w-full text-xs h-7">
            Utiliser l'e-mail à la place
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="email">
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
                className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold py-2 text-sm shadow-[var(--glow-primary)]"
            disabled={isLoading}
          >
            {isLoading ? "Envoi..." : "Envoyer le lien de récupération"}
          </Button>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-background px-2 text-muted-foreground font-medium">Ou alternative</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setUseBackup(true)}
            className="w-full border-border/80 hover:bg-accent/40 flex items-center justify-center gap-2 h-8 text-xs"
          >
            <ShieldQuestion className="h-3.5 w-3.5 text-primary" />
            <span>Répondre aux questions de secours</span>
          </Button>

          <div className="text-center text-xs mt-3">
            <Link to="/auth/login" className="text-primary font-semibold hover:underline flex items-center justify-center gap-1">
              Retourner à la connexion <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
