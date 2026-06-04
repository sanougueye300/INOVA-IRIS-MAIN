import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as OTPAuth from "https://esm.sh/otpauth@9.2.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AES-256-GCM Encryption Helper
async function encryptSecret(text: string): Promise<string> {
  const rawKey = Deno.env.get("MFA_ENCRYPTION_KEY") || "inova-iris-soc-aes-encryption-key-fallback-32c";
  // Pad or slice key to ensure it is exactly 32 bytes
  const keyData = new TextEncoder().encode(rawKey.padEnd(32, "0").slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoded
  );
  
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, "0")).join("");
  const encryptedHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${ivHex}:${encryptedHex}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      throw new Error("L'identifiant utilisateur et l'email sont requis.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Générer un secret TOTP unique
    const totp = new OTPAuth.TOTP({
      issuer: "INOVA-IRIS SOC",
      label: email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.generate(20),
    });

    const plainSecret = totp.secret.base32;
    const encryptedSecret = await encryptSecret(plainSecret);

    // 2. Stocker le secret (chiffré) dans profiles.totp_secret
    const { error } = await supabase.from("profiles")
      .update({ 
        totp_secret: encryptedSecret, 
        totp_enabled: false 
      })
      .eq("id", userId);

    if (error) throw error;

    // 3. Audit log
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "2fa_enabled",
      metadata: { method: "totp_setup_started" }
    });

    // Retourner l'URI pour générer le QR Code côté frontend
    return new Response(JSON.stringify({
      otpAuthUrl: totp.toString(),
      secret: plainSecret // À afficher pour saisie manuelle
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
