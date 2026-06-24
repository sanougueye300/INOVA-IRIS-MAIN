import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  Phone,
  Building2,
  User,
  ArrowRight,
  ExternalLink,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Offer } from "@/lib/offers";

interface StripeCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer | null;
  onPaymentSuccess?: (sessionId: string) => void;
}

export function StripeCheckout({
  isOpen,
  onClose,
  offer,
  onPaymentSuccess,
}: StripeCheckoutProps) {
  const [step, setStep] = useState<"details" | "confirm">("details");
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }
    if (!email.includes("@")) {
      toast.error("Adresse email invalide");
      return;
    }

    setStep("confirm");
  };

  const handlePaymentSubmit = async () => {
    if (!offer) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: {
          offerId: offer.id,
          offerName: offer.name,
          amount: offer.value,
          currency: "xof",
          email,
          fullName,
          phone,
          organization: companyName,
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.url) throw new Error("Aucune URL de paiement reçue");

      onPaymentSuccess?.(data.sessionId);

      // Redirect to Stripe Checkout hosted page
      window.location.href = data.url;
    } catch (err) {
      toast.error("Erreur lors de la création de la session", {
        description: err instanceof Error ? err.message : "Une erreur est survenue",
      });
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setStep("details");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {step === "confirm" ? "Confirmer et payer" : "Finaliser votre abonnement"}
          </DialogTitle>
        </DialogHeader>

        {offer && (
          <div className="space-y-5">
            {/* Order Summary */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">Offre sélectionnée</span>
                <Badge variant="outline" className="bg-white font-bold">
                  {offer.name}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-500">{offer.period}</span>
                <span className="text-2xl font-black text-slate-900">
                  {offer.value.toLocaleString()} FCFA
                </span>
              </div>
            </div>

            {step === "details" && (
              <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1.5">
                      <User className="h-3.5 w-3.5" />
                      Nom complet *
                    </label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jean Dupont"
                      className="border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      Email *
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jean@example.com"
                      className="border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      Téléphone *
                    </label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+221 77 123 45 67"
                      className="border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      Entreprise (optionnel)
                    </label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Nom de votre entreprise"
                      className="border-slate-300"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-11 rounded-lg"
                >
                  Continuer
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </form>
            )}

            {step === "confirm" && (
              <div className="space-y-4">
                {/* Summary of entered data */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nom</span>
                    <span className="font-semibold">{fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email</span>
                    <span className="font-semibold">{email}</span>
                  </div>
                  {companyName && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Entreprise</span>
                      <span className="font-semibold">{companyName}</span>
                    </div>
                  )}
                </div>

                {/* Stripe secure notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3">
                  <Lock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-900">Paiement sécurisé Stripe</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Vous serez redirigé vers la page de paiement Stripe hébergée. Vos données bancaires sont chiffrées.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-lg"
                    onClick={() => setStep("details")}
                    disabled={loading}
                  >
                    Retour
                  </Button>
                  <Button
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg gap-2"
                    onClick={handlePaymentSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Création de la session...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        Payer avec Stripe
                        <ExternalLink className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
