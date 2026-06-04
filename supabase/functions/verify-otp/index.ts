import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SHA-256 hash function (same as send-otp)
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
    const { userId, code } = await req.json();

    if (!userId || !code) {
      throw new Error("L'identifiant utilisateur et le code OTP sont requis.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Rate Limiting Check on IP/User for OTP Verification
    const ip = req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip") || userId;
    const { allowed } = await checkRateLimit(supabase, ip, "verify_otp", 10, 15); // max 10 verify attempts globally
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Trop de tentatives de validation. Veuillez patienter 15 minutes." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Fetch the most recent OTP token
    const { data: otp, error } = await supabase
      .from("otp_tokens")
      .select("*")
      .eq("user_id", userId)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !otp) {
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "otp_failed",
        metadata: { reason: "OTP expiré ou introuvable" }
      });
      return new Response(JSON.stringify({ valid: false, reason: "OTP expiré ou introuvable" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Vérifier les tentatives (max 5)
    if (otp.attempts >= 5) {
      await supabase.from("otp_tokens").delete().eq("id", otp.id);
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "otp_failed",
        metadata: { reason: "Trop de tentatives", attempts: otp.attempts }
      });
      return new Response(JSON.stringify({ valid: false, reason: "Trop de tentatives. Code invalidé." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Hash user input code to compare
    const codeHash = await hashSecret(code);

    if (otp.code !== codeHash && otp.code !== code) { // Support both plain text and SHA-256 for dev fallback
      // Incrémenter les tentatives
      await supabase
        .from("otp_tokens")
        .update({ attempts: otp.attempts + 1 })
        .eq("id", otp.id);

      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "otp_failed",
        metadata: { reason: "Code incorrect", attempts: otp.attempts + 1 }
      });

      return new Response(JSON.stringify({ valid: false, reason: "Code incorrect" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. Marquer comme vérifié et supprimer
    await supabase.from("otp_tokens").delete().eq("id", otp.id);

    // Audit log success
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "otp_verified",
      metadata: { method: "sms" }
    });

    return new Response(JSON.stringify({ valid: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
