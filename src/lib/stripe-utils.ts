/**
 * Stripe Payment Utilities
 * Handles payment processing and checkout flows
 */

export interface PaymentConfig {
  stripePublicKey: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  id: string;
  email: string;
  amount: number;
  currency: string;
  offerId: string;
  offerName: string;
  companyName: string;
  fullName: string;
  phone: string;
}

export interface PaymentResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  paymentIntentId?: string;
}

/**
 * Initialize Stripe checkout
 * In production, this would call your backend to create a checkout session
 */
export async function createCheckoutSession(
  session: CheckoutSession
): Promise<PaymentResult> {
  try {
    // In a real application, you would call your backend API here
    // to create a Stripe checkout session securely
    
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: session.email,
        amount: session.amount,
        currency: session.currency,
        offerId: session.offerId,
        offerName: session.offerName,
        companyName: session.companyName,
        fullName: session.fullName,
        phone: session.phone,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create checkout session");
    }

    const data = await response.json();
    return {
      success: true,
      sessionId: data.sessionId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Verify payment status
 * Check the status of a completed payment
 */
export async function verifyPayment(sessionId: string): Promise<PaymentResult> {
  try {
    const response = await fetch(`/api/verify-payment/${sessionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to verify payment");
    }

    const data = await response.json();
    return {
      success: data.paid,
      paymentIntentId: data.paymentIntentId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Format amount to cents for Stripe
 */
export function formatAmountForStripe(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Format amount from cents for display
 */
export function formatAmountFromStripe(amount: number): number {
  return amount / 100;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format (basic validation for Senegal)
 */
export function isValidPhone(phone: string): boolean {
  // Accept +221, 0, or just digits
  const phoneRegex = /^(\+221|0)?[7-9]\d{7}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = "FCFA"): string {
  return `${amount.toLocaleString("fr-FR")} ${currency}`;
}
