import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldQuestion, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import { invokeAuthSecurity } from "@/lib/auth-security";

export const Route = createFileRoute("/account/security")({
  head: () => ({ meta: [{ title: "Sécurité du compte — INOVA-IRIS" }] }),
  component: () => (
    <RequireAuth>
      <AccountSecurityPage />
    </RequireAuth>
  ),
});

type CatalogQuestion = { id: string; question_text: string; sort_order: number };

function AccountSecurityPage() {
  const [questions, setQuestions] = useState<CatalogQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    invokeAuthSecurity<{ questions: CatalogQuestion[] }>("list_security_question_catalog")
      .then((r) => setQuestions(r.questions ?? []))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const payload = questions.slice(0, 2).map((q) => ({
      questionId: q.id,
      answer: answers[q.id] ?? "",
    }));

    if (payload.some((a) => !a.answer.trim())) {
      toast.error("Répondez à au moins 2 questions de secours.");
      return;
    }

    setSaving(true);
    try {
      await invokeAuthSecurity("save_security_answers", { answers: payload });
      toast.success("Questions de secours enregistrées.", {
        description: "Utilisables en cas de perte d'accès via la page mot de passe oublié.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldQuestion className="h-6 w-6 text-primary" />
            Questions de secours
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez vos réponses pour récupérer votre compte INOVA-IRIS sans e-mail.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Réponses personnelles</CardTitle>
            <CardDescription>
              Choisissez 2 questions et des réponses mémorables. Elles sont stockées de façon chiffrée.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement...
              </div>
            ) : (
              questions.slice(0, 2).map((q) => (
                <div key={q.id} className="space-y-2">
                  <Label>{q.question_text}</Label>
                  <input
                    type="text"
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Votre réponse secrète"
                  />
                </div>
              ))
            )}
            <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer mes questions de secours
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
