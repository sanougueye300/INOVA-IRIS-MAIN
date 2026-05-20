import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, Mail, Lock, Building, Layers, CheckCircle2, ChevronRight, ChevronLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [sector, setSector] = useState("");
  const [plan, setPlan] = useState("pro");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNextStep = () => {
    if (step === 1) {
      if (!name || !email || !password) {
        toast.error("Veuillez remplir tous les champs du compte.");
        return;
      }
    } else if (step === 2) {
      if (!company || !sector) {
        toast.error("Veuillez remplir les détails de votre organisation.");
        return;
      }
    }
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    toast.info("Initialisation de votre environnement SOC...");

    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Organisation créée avec succès ! Votre bac à sable de sécurité est prêt.");
      navigate({ to: "/auth/login" });
    }, 2000);
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="text-3xl font-extrabold tracking-tight">Nouvelle Organisation</h2>
        <p className="text-sm text-muted-foreground">
          Enregistrez votre entité sur la plateforme d'orchestration Sonatel SOC.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between max-w-sm mx-auto lg:mx-0 py-4 border-b border-border/60">
        {[
          { label: "Compte", num: 1 },
          { label: "Organisation", num: 2 },
          { label: "Validation", num: 3 }
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
              step >= s.num 
                ? "bg-primary text-primary-foreground shadow-[var(--glow-primary)]" 
                : "border border-zinc-700 text-zinc-500"
            }`}>
              {step > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
            </div>
            <span className={`text-xs font-medium ${step >= s.num ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Form Steps */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="name">
                Nom complet de l'administrateur
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="name"
                  type="text"
                  placeholder="Sanou Gueye"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="email">
                Adresse e-mail professionnelle
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  placeholder="sanou.gueye@sonatel.sn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="password">
                Créer un mot de passe fort
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
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="company">
                Nom de l'entreprise / Entité
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="company"
                  type="text"
                  placeholder="Sonatel Corporate"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="sector">
                Secteur d'activité
              </label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  id="sector"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none"
                  required
                >
                  <option value="">Sélectionnez un secteur...</option>
                  <option value="telecoms">Télécommunications & FAI</option>
                  <option value="banque">Banques & Institutions Financières</option>
                  <option value="sante">Santé & Assurance</option>
                  <option value="gouvernement">Gouvernement & Secteur Public</option>
                  <option value="industrie">Industrie & Énergie</option>
                </select>
              </div>
            </div>

            {/* Plan Tier Choice */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Plan de protection SOC
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "standard", name: "Standard", desc: "SIEM & 5 Agents max" },
                  { id: "pro", name: "Professional", desc: "SOAR, SIEM, Agents illimités" }
                ].map((p) => (
                  <Card 
                    key={p.id}
                    onClick={() => setPlan(p.id)}
                    className={`p-3 border cursor-pointer transition-all select-none ${
                      plan === p.id 
                        ? "border-primary bg-primary/5 shadow-[var(--glow-primary)]" 
                        : "border-border/60 hover:border-zinc-500"
                    }`}
                  >
                    <div className="text-xs font-bold">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in border border-dashed border-primary/20 rounded-xl p-5 bg-primary/5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mt-2">Dernière étape</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Vous êtes sur le point d'initialiser une instance SOC pour <strong className="text-foreground">{company}</strong>. 
              Le compte administrateur sera <strong className="text-foreground">{email}</strong>.
            </p>
            <div className="text-left space-y-2 bg-zinc-900/40 p-3 rounded-lg border border-zinc-800 text-xs font-mono mt-4">
              <div className="flex justify-between"><span className="text-zinc-500">PROV:</span> <span>AWS Cluster West</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">TIER:</span> <span>{plan.toUpperCase()} LICENSE</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">SOAR:</span> <span>SHUFFLE RUNNERS [ON]</span></div>
            </div>
          </div>
        )}

        {/* Buttons Nav */}
        <div className="flex justify-between gap-3 mt-6 pt-4 border-t border-border/40">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              className="flex items-center gap-1 border-border/80"
              disabled={isSubmitting}
            >
              <ChevronLeft className="h-4 w-4" /> Précédent
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              asChild
              className="text-zinc-500 hover:text-foreground"
            >
              <Link to="/auth/login">Annuler</Link>
            </Button>
          )}

          {step < 3 ? (
            <Button
              type="button"
              onClick={handleNextStep}
              className="bg-primary text-primary-foreground font-semibold flex items-center gap-1"
            >
              Suivant <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              className="bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold shadow-[var(--glow-primary)]"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Provisioning..." : "Confirmer & Créer"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
