import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hash function matching PEPPER hash
async function hashSecret(value: string): Promise<string> {
  const PEPPER = "inova-iris-soc-v1";
  const normalized = value.trim().normalize("NFKC");
  const data = new TextEncoder().encode(`${PEPPER}:${normalized}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId, pin } = await req.json();

    if (!userId || !pin) {
      throw new Error("L'identifiant utilisateur et le code PIN sont requis.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch user lock_pin_hash
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("lock_pin_hash")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      throw new Error("Profil utilisateur introuvable.");
    }

    const inputPinHash = await hashSecret(pin);
    let storedPinHash = profile.lock_pin_hash;

    // Fallback default PIN "1234" if not set in database
    if (!storedPinHash) {
      storedPinHash = await hashSecret("1234");
      // Proactively save the default pin hash to db
      await supabase.from("profiles")
        .update({ lock_pin_hash: storedPinHash })
        .eq("id", userId);
    }

    const isValid = inputPinHash === storedPinHash;

    // 2. Audit log
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: isValid ? "session_unlocked" : "session_lock_failed",
      metadata: { attempts_failed_increment: !isValid }
    });

    return new Response(JSON.stringify({ valid: isValid }), {
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
