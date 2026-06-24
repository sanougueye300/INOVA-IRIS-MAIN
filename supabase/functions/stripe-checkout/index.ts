import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
        JSON.stringify({ error: "Missing required fields: offerId, amount, email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find or create Stripe customer
    let stripeCustomerId: string;
    const { data: existingCustomer } = await db
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("email", email)
      .maybeSingle();

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
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

    // Build line items — prefer price ID if configured, else create ad-hoc price
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

    if (stripePriceId) {
      lineItems = [{ price: stripePriceId, quantity: 1 }];
    } else {
      // XOF is a zero-decimal currency in Stripe — amount is already in whole units
      lineItems = [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: offerName || offerId,
              description: `Abonnement INOVA-IRIS — ${offerName}`,
              metadata: { offerId },
            },
            unit_amount: amount, // XOF has no minor unit
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ];
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: lineItems,
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}&subscription=success`,
      cancel_url: `${origin}/#offres`,
      locale: "fr",
      metadata: {
        offerId,
        offerName: offerName || "",
        organization: organization || "",
        userId: userId || "",
        phone: phone || "",
      },
      subscription_data: {
        metadata: {
          offerId,
          offerName: offerName || "",
          organization: organization || "",
        },
      },
      customer_update: { address: "auto" },
    });

    // Save pending subscription record
    await db.from("subscriptions").insert({
      stripe_customer_id: stripeCustomerId,
      user_id: userId || null,
      offer_id: offerId,
      offer_name: offerName || offerId,
      status: "pending",
      amount,
      currency: currency.toLowerCase(),
      client_email: email,
      client_name: fullName || null,
      client_phone: phone || null,
      organization: organization || null,
      metadata: { sessionId: session.id },
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
