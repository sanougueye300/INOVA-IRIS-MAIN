import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Creates a Stripe subscription with an integrated card payment (Elements flow).
 * Returns a clientSecret the frontend confirms with stripe.confirmCardPayment().
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceKey);

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const {
      offerId,
      offerName,
      amount,
      currency = "xof",
      email,
      fullName,
      phone,
      organization,
      userId,
      stripePriceId,
    } = await req.json();

    if (!offerId || !amount || !email) {
      return new Response(
        JSON.stringify({ error: "Champs requis manquants: offerId, amount, email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Find or create the Stripe customer
    let stripeCustomerId: string;
    const { data: existing } = await db
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("email", email)
      .maybeSingle();

    if (existing?.stripe_customer_id) {
      stripeCustomerId = existing.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email,
        name: fullName,
        phone,
        metadata: { organization: organization || "", userId: userId || "" },
      });
      stripeCustomerId = customer.id;
      await db.from("stripe_customers").insert({
        user_id: userId || null,
        stripe_customer_id: stripeCustomerId,
        email,
        organization,
      });
    }

    // 2. Resolve the price — use configured price ID, or create one on the fly
    let priceId = stripePriceId;
    if (!priceId) {
      const price = await stripe.prices.create({
        currency: currency.toLowerCase(),
        unit_amount: amount, // XOF is zero-decimal
        recurring: { interval: "month" },
        product_data: { name: offerName || offerId },
      });
      priceId = price.id;
    }

    // 3. Create the subscription with an incomplete payment (Elements flow)
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        offerId,
        offerName: offerName || "",
        organization: organization || "",
        userId: userId || "",
      },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

    // 4. Persist the pending subscription
    await db.from("subscriptions").insert({
      stripe_subscription_id: subscription.id,
      stripe_customer_id: stripeCustomerId,
      user_id: userId || null,
      offer_id: offerId,
      offer_name: offerName || offerId,
      status: subscription.status, // "incomplete" until paid
      amount,
      currency: currency.toLowerCase(),
      stripe_price_id: priceId,
      stripe_payment_intent_id: paymentIntent?.id || null,
      client_email: email,
      client_name: fullName || null,
      client_phone: phone || null,
      organization: organization || null,
    });

    return new Response(
      JSON.stringify({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent?.client_secret,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
