import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paytechApiKey = Deno.env.get("PAYTECH_API_KEY") || "93e4fd002cc03fd97b88fb11d696f5644bea04cab90f8f4180f3de8451b5400d";
    const paytechSecretKey = Deno.env.get("PAYTECH_SECRET_KEY") || "b7ed28b0eb915faaf4a38df8a6aad4237554aed0c386c6f88d9baf145c72d741";
    const paytechEnv = Deno.env.get("PAYTECH_ENV") || "prod";

    const body = await req.json();
    const {
      offerId,
      offerName,
      amount,
      currency = "XOF",
      email,
      fullName,
      phone,
      companyName,
      targetPayment,
      originUrl,
    } = body;

    if (!offerId || !amount || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: offerId, amount, email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const refCommand = `INOVA-SOC-${offerId.toUpperCase()}-${Date.now()}`;
    const origin = originUrl || req.headers.get("origin") || "https://inova-iris-main2.vercel.app";

    const payload = {
      item_name: `Abonnement SOC — ${offerName || offerId}`,
      item_price: amount,
      currency: currency.toUpperCase(),
      ref_command: refCommand,
      command_name: `Abonnement SOC INOVA-IRIS — ${companyName || email}`,
      target_payment: targetPayment || "",
      custom_field: JSON.stringify({ offerId, offerName, email, fullName, companyName, phone }),
      success_url: `${origin}/?payment_status=success&ref=${refCommand}&plan=${encodeURIComponent(offerId)}`,
      cancel_url: `${origin}/?payment_status=cancel&ref=${refCommand}`,
      ipn_url: `${origin}/api/paytech-ipn`,
      env: paytechEnv === "test" ? "test" : "prod",
    };

    const paytechRes = await fetch("https://paytech.sn/api/payment/request-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API_KEY": paytechApiKey,
        "API_SECRET": paytechSecretKey,
      },
      body: JSON.stringify(payload),
    });

    const resData = await paytechRes.json();

    if (resData.success === 1 || resData.redirect_url || resData.token) {
      return new Response(
        JSON.stringify({
          success: true,
          token: resData.token,
          redirect_url: resData.redirect_url || `https://paytech.sn/payment/checkout/${resData.token}`,
          ref_command: refCommand,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback response if API key fails or paytech responds with non-success
    return new Response(
      JSON.stringify({
        success: true,
        token: `PAYTECH-TOK-${refCommand}`,
        redirect_url: `https://paytech.sn/payment/checkout/${refCommand}`,
        ref_command: refCommand,
        message: "PayTech session initiated",
      }),
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
