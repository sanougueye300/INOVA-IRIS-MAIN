import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  CardElement,
  Elements,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Loader2, Lock, AlertCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Offer } from "@/lib/offers";

const PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined;
const stripePromise = PUBLIC_KEY ? loadStripe(PUBLIC_KEY) : null;

interface StripeCardFormProps {
  offer: Offer;
  customer: {
    email: string;
    fullName: string;
    phone: string;
    organization?: string;
  };
  onSuccess: (subscriptionId: string) => void;
  onBack: () => void;
}

const CARD_OPTIONS = {
  style: {
    base: {
      fontSize: "15px",
      color: "#1e293b",
      fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
      "::placeholder": { color: "#94a3b8" },
    },
    invalid: { color: "#ef4444" },
  },
  hidePostalCode: true,
};

function CardFormInner({ offer, customer, onSuccess, onBack }: StripeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      setError("Stripe n'est pas encore chargé. Réessayez dans un instant.");
      return;
    }
    if (!cardComplete) {
      setError("Veuillez saisir des informations de carte valides.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // 1. Ask backend to create the subscription → get the clientSecret
      const { data, error: fnError } = await supabase.functions.invoke(
        "stripe-create-subscription",
        {
          body: {
            offerId: offer.id,
            offerName: offer.name,
            amount: offer.value,
            currency: "xof",
            email: customer.email,
            fullName: customer.fullName,
            phone: customer.phone,
            organization: customer.organization,
          },
        }
      );

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.clientSecret) {
        throw new Error("Aucun secret de paiement reçu du serveur.");
      }

      // 2. Confirm the card payment on the client
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Champ carte introuvable.");

      const { error: confirmError, paymentIntent } =
        await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: customer.fullName,
              email: customer.email,
              phone: customer.phone,
            },
          },
        });

      if (confirmError) {
        throw new Error(confirmError.message || "Le paiement a été refusé.");
      }

      if (paymentIntent?.status === "succeeded") {
        onSuccess(data.subscriptionId);
      } else {
        throw new Error(`Paiement non finalisé (statut: ${paymentIntent?.status}).`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Secure notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
        <Lock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-blue-800 leading-relaxed">
          Paiement chiffré et sécurisé par <strong>Stripe</strong>. Vos données bancaires
          ne transitent jamais par nos serveurs.
        </p>
      </div>

      {/* Card element */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Informations de la carte
        </label>
        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3.5 focus-within:border-[#FF7900] focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
          <CardElement
            options={CARD_OPTIONS}
            onChange={(e) => {
              setCardComplete(e.complete);
              setError(e.error?.message || null);
            }}
          />
        </div>
        <p className="text-[10px] text-slate-400">
          Carte de test : 4242 4242 4242 4242 · date future · CVC quelconque
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={processing}
          className="flex-1 rounded-full border border-slate-200 h-10 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Retour
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!cardComplete || processing || !stripe}
          className="flex-1 bg-[#FF7900] hover:bg-[#e06b00] text-white font-bold text-xs h-10 rounded-full shadow-md shadow-orange-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {processing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5" />
              Payer {offer.value.toLocaleString("fr-FR")} {offer.currency}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function StripeCardForm(props: StripeCardFormProps) {
  if (!stripePromise) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Stripe non configuré</p>
          <p className="mt-1">
            La variable <code className="font-mono">VITE_STRIPE_PUBLIC_KEY</code> est
            manquante. Ajoutez-la dans votre fichier <code>.env</code> puis redémarrez le
            serveur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CardFormInner {...props} />
    </Elements>
  );
}
