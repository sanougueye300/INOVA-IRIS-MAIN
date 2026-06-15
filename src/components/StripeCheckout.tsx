import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/js";
import {
  CardElement,
  Elements,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  Phone,
  Building2,
  User,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import type { Offer } from "@/lib/offers";

// Initialize Stripe
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLIC_KEY || "pk_test_placeholder"
);

interface StripeCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer | null;
  onPaymentSuccess?: (sessionId: string) => void;
}

/**
 * Card Payment Form Component
 */
function CardPaymentForm({
  offer,
  loading,
  onSubmit,
}: {
  offer: Offer;
  loading: boolean;
  onSubmit: (token: string) => Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const handleCardChange = (event: any) => {
    setCardError(event.error?.message || null);
    setCardComplete(event.complete);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !cardComplete) {
      setCardError("Veuillez entrer des détails de carte valides");
      return;
    }

    setProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { token, error } = await stripe.createToken(cardElement);

      if (error) {
        setCardError(error.message || "Erreur de paiement");
        setProcessing(false);
        return;
      }

      if (token) {
        await onSubmit(token.id);
      }
    } catch (error) {
      setCardError(
        error instanceof Error ? error.message : "Erreur lors du paiement"
      );
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Lock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900">
            Paiement sécurisé par Stripe
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Vos données bancaires sont chiffrées et traitées de manière sécurisée
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-2">
            Informations de la carte
          </label>
          <div className="border border-slate-300 rounded-lg p-4 bg-white">
            <CardElement
              onChange={handleCardChange}
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#1e293b",
                    "::placeholder": {
                      color: "#cbd5e1",
                    },
                  },
                  invalid: {
                    color: "#ef4444",
                  },
                },
                hidePostalCode: true,
              }}
            />
          </div>
          {cardError && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {cardError}
            </p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={!cardComplete || processing || loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 h-12 rounded-lg flex items-center justify-center gap-2"
      >
        {processing || loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Traitement du paiement...
          </>
        ) : (
          <>
            Payer {offer.value.toLocaleString()} {offer.currency}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}

/**
 * Main Stripe Checkout Modal Component
 */
export function StripeCheckout({
  isOpen,
  onClose,
  offer,
  onPaymentSuccess,
}: StripeCheckoutProps) {
  const [step, setStep] = useState<"details" | "payment" | "success">("details");
  const [loading, setLoading] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      toast.error("Erreur", {
        description: "Veuillez remplir tous les champs requis",
      });
      return;
    }

    if (!email.includes("@")) {
      toast.error("Email invalide", {
        description: "Veuillez entrer une adresse email valide",
      });
      return;
    }

    setStep("payment");
  };

  const handlePaymentSubmit = async (token: string) => {
    if (!offer) return;

    setLoading(true);

    try {
      // In a real application, send token to your backend
      const response = await fetch("/api/charge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          amount: offer.value,
          email,
          name: fullName,
          company: companyName,
          offerId: offer.id,
          phone,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep("success");
        toast.success("Paiement réussi!", {
          description: "Votre abonnement a été activé",
        });
        onPaymentSuccess?.(data.sessionId);

        // Fermer la modale après 3 secondes
        setTimeout(() => {
          onClose();
          setStep("details");
        }, 3000);
      } else {
        throw new Error(data.error || "Payment failed");
      }
    } catch (error) {
      toast.error("Erreur de paiement", {
        description:
          error instanceof Error ? error.message : "Une erreur est survenue",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (step !== "success") {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {step === "success"
              ? "Paiement réussi"
              : step === "payment"
              ? "Paiement sécurisé"
              : "Finaliser votre abonnement"}
          </DialogTitle>
        </DialogHeader>

        {offer && (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">
                  Offre sélectionnée
                </span>
                <Badge variant="outline" className="bg-white">
                  {offer.name}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-slate-600">
                  {offer.value.toLocaleString()} {offer.currency} / {offer.period}
                </span>
                <span className="text-2xl font-bold text-slate-900">
                  {offer.value.toLocaleString()} FCFA
                </span>
              </div>
            </div>

            {step === "success" && (
              <div className="space-y-4 py-6">
                <div className="text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="bg-emerald-100 rounded-full p-4 animate-bounce">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">
                      Bienvenue chez INOVA-IRIS!
                    </p>
                    <p className="text-sm text-slate-600 mt-2">
                      Un email de confirmation a été envoyé à {email}. Vous
                      pouvez accéder à votre tableau de bord immédiatement.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-semibold text-blue-900">
                    Prochaines étapes:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 ml-4">
                    <li>✓ Activation immédiate de votre compte</li>
                    <li>✓ Configuration des agents EDR</li>
                    <li>✓ Onboarding personnalisé</li>
                  </ul>
                </div>
              </div>
            )}

            {step === "details" && (
              <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                      <User className="h-4 w-4" />
                      Nom complet
                    </label>
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jean Dupont"
                      className="border-slate-300"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jean@example.com"
                      className="border-slate-300"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                      <Phone className="h-4 w-4" />
                      Téléphone
                    </label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+221 77 123 45 67"
                      className="border-slate-300"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4" />
                      Entreprise (optionnel)
                    </label>
                    <Input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Nom de votre entreprise"
                      className="border-slate-300"
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 h-11 rounded-lg"
                >
                  Continuer vers le paiement
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </form>
            )}

            {step === "payment" && (
              <Elements
                stripe={stripePromise}
                options={{
                  appearance: {
                    theme: "stripe",
                  },
                }}
              >
                <CardPaymentForm
                  offer={offer}
                  loading={loading}
                  onSubmit={handlePaymentSubmit}
                />
              </Elements>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
