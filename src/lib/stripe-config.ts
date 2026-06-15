/**
 * Configuration Stripe pour INOVA-IRIS
 * Clés publiques et paramètres de paiement
 */

// Variable d'environnement pour la clé publique Stripe
// À définir dans .env.local : VITE_STRIPE_PUBLIC_KEY=pk_test_...
export const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || "";

// Vérifier que Stripe est configuré
export function isStripeConfigured(): boolean {
  return STRIPE_PUBLIC_KEY.length > 0 && STRIPE_PUBLIC_KEY.startsWith("pk_");
}

// Configuration Stripe
export const stripeConfig = {
  publicKey: STRIPE_PUBLIC_KEY,
  successUrl: `${window.location.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
  cancelUrl: `${window.location.origin}/#offres`,
  locale: "fr",
  currency: "xof", // Franc CFA Ouest
};

// Currency codes
export const CURRENCY_MAP = {
  "FCFA": "xof",
  "CFA": "xof",
  "EUR": "eur",
  "USD": "usd",
};

// Stripe display settings
export const stripeDisplaySettings = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#FF7900",
    colorText: "#1e293b",
    colorDanger: "#ef4444",
    fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  },
};

/**
 * Map offres to Stripe products
 * Format: offerId -> stripeProductId
 */
export const OFFER_TO_STRIPE_PRODUCT: Record<string, string> = {
  "inova-secure": process.env.VITE_STRIPE_PRODUCT_INOVA || "",
  "terranga-secure": process.env.VITE_STRIPE_PRODUCT_TERRANGA || "",
  "gainde-secure": process.env.VITE_STRIPE_PRODUCT_GAINDE || "",
};

/**
 * Get Stripe product ID for an offer
 */
export function getStripeProductId(offerId: string): string | null {
  return OFFER_TO_STRIPE_PRODUCT[offerId] || null;
}

/**
 * Format price for Stripe (in cents)
 */
export function formatPriceForStripe(amountInFCFA: number): number {
  // Stripe expects amount in smallest currency unit
  // For XOF (Franc CFA), we use cents equivalent
  return Math.round(amountInFCFA * 100);
}

/**
 * Create Stripe checkout params
 */
export interface StripeCheckoutParams {
  email: string;
  offerId: string;
  amount: number;
  currency: string;
  companyName: string;
  fullName: string;
  phone: string;
}

/**
 * Validate Stripe configuration
 */
export function validateStripeConfig(): { valid: boolean; error?: string } {
  if (!STRIPE_PUBLIC_KEY) {
    return {
      valid: false,
      error: "Stripe public key not configured. Set VITE_STRIPE_PUBLIC_KEY env variable.",
    };
  }

  if (!STRIPE_PUBLIC_KEY.startsWith("pk_")) {
    return {
      valid: false,
      error: "Invalid Stripe public key format.",
    };
  }

  return { valid: true };
}
