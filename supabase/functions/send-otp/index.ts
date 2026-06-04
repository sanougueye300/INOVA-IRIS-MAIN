import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SHA-256 hash function (same as _shared/auth-crypto)
async function hashSecret(value: string): Promise<string> {
  const PEPPER = "inova-iris-soc-v1";
  const normalized = value.trim().toLowerCase().normalize("NFKC");
  const data = new TextEncoder().encode(`${PEPPER}:${normalized}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId, phone } = await req.json();

    if (!userId) {
      throw new Error("L'identifiant utilisateur est requis.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Rate Limiting Check
    const ip = req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip") || userId;
    const { allowed } = await checkRateLimit(supabase, ip, "send_otp", 5, 15);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Trop de tentatives d'envoi. Veuillez patienter 15 minutes." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Générer le code OTP (6 chiffres)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await hashSecret(otp);
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    // 3. Supprimer les anciens OTP du user et stocker le nouveau
    await supabase.from("otp_tokens").delete().eq("user_id", userId);
    await supabase.from("otp_tokens").insert({
      user_id: userId,
      code: otpHash,
      expires_at: expiresAt.toISOString(),
      verified: false,
      attempts: 0
    });

    // 4. Audit log
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "otp_sent",
      metadata: { phone, expires_at: expiresAt.toISOString() }
    });

    // 5. Envoyer le SMS via Twilio
    const smsBody = `[INOVA-IRIS] Votre code de vérification SOC est : ${otp}. Valable 2 minutes. Ne le partagez jamais.`;
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_PHONE_FROM");

    let smsSent = false;
    let otpChannel = "screen";

    if (twilioSid && twilioToken && twilioFrom && phone) {
      try {
        const twilioRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: "Basic " + btoa(`${twilioSid}:${twilioToken}`),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ To: phone, From: twilioFrom, Body: smsBody }),
          }
        );
        if (twilioRes.ok) {
          smsSent = true;
          otpChannel = "sms";
        } else {
          const errText = await twilioRes.text();
          console.error("Twilio error response:", errText);
        }
      } catch (err) {
        console.error("Failed to send Twilio SMS:", err);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        otpChannel,
        maskedPhone: phone ? `***${phone.slice(-4)}` : undefined,
        expiresInSeconds: 120
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
