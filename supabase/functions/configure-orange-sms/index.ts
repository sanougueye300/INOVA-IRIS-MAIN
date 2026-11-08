import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseOrangeSmsConfig, sendOrangeSms } from "../../../src/lib/orange-sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Résout l'utilisateur à partir du Bearer token et vérifie qu'il est admin. */
async function requireAdmin(admin: ReturnType<typeof createClient>, authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Session requise.");
  const token = authHeader.slice(7);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Session invalide ou expirée.");

  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);

  const isAdmin = roles?.some((r: { role: string }) => r.role === "admin");
  if (!isAdmin) throw new Error("Accès refusé. Rôle administrateur requis.");
  return data.user;
}

/**
 * Upsert un secret dans Supabase Vault.
 * Si le secret existe déjà, on le met à jour ; sinon on l'insère.
 */
async function upsertVaultSecret(
  admin: ReturnType<typeof createClient>,
  name: string,
  value: string,
): Promise<void> {
  // Vérifier si le secret existe
  const { data: existing } = await admin
    .from("vault.secrets")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing?.id) {
    // Mettre à jour via RPC sécurisée
    const { error } = await admin.rpc("vault_update_secret", { secret_id: existing.id, new_secret: value });
    if (error) {
      // Fallback : suppression + insertion
      await admin.from("vault.secrets").delete().eq("id", existing.id);
      await admin.rpc("vault_insert_secret", { secret_name: name, secret_value: value });
    }
  } else {
    await admin.rpc("vault_insert_secret", { secret_name: name, secret_value: value });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const authHeader = req.headers.get("Authorization");
    const { action, ...payload } = await req.json();

    switch (action) {
      // ─── Lecture de la config actuelle ───────────────────────────────
      case "get_config": {
        await requireAdmin(admin, authHeader);
        const { data, error } = await admin.rpc("get_orange_sms_config");
        if (error) throw new Error(`Lecture Vault échouée : ${error.message}`);

        const configured = data !== null && typeof data === "object" &&
          ["orange_smspro_login", "orange_smspro_api_key", "orange_smspro_token",
           "orange_smspro_subject", "orange_smspro_signature"].every(
            (k) => typeof (data as Record<string, unknown>)[k] === "string" &&
                   (data as Record<string, unknown>)[k] !== "",
          );

        return new Response(
          JSON.stringify({
            ok: true,
            configured,
            baseUrl: configured
              ? ((data as Record<string, unknown>).orange_smspro_base_url as string | null) ?? null
              : null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ─── Sauvegarde de la config dans Vault ──────────────────────────
      case "save_config": {
        await requireAdmin(admin, authHeader);

        const { login, apiKey, token, subject, signature, baseUrl } = payload as {
          login: string;
          apiKey: string;
          token: string;
          subject: string;
          signature: string;
          baseUrl?: string;
        };

        // Validation de base
        const missing = [
          !login?.trim() && "login",
          !apiKey?.trim() && "apiKey",
          !token?.trim() && "token",
          !subject?.trim() && "subject",
          !signature?.trim() && "signature",
        ].filter(Boolean);
        if (missing.length) {
          throw new Error(`Champs requis manquants : ${missing.join(", ")}`);
        }

        if (baseUrl?.trim()) {
          try {
            if (new URL(baseUrl.trim()).protocol !== "https:") throw new Error();
          } catch {
            throw new Error("L'URL de l'API Orange SMS doit être une URL HTTPS valide.");
          }
        }

        // Écrire dans Vault via SQL direct (service_role)
        const secrets: Record<string, string> = {
          orange_smspro_login: login.trim(),
          orange_smspro_api_key: apiKey.trim(),
          orange_smspro_token: token.trim(),
          orange_smspro_subject: subject.trim(),
          orange_smspro_signature: signature.trim(),
        };
        if (baseUrl?.trim()) {
          secrets.orange_smspro_base_url = baseUrl.trim();
        }

        // Upsert chaque secret
        for (const [name, value] of Object.entries(secrets)) {
          const { error } = await admin.rpc("upsert_vault_secret", {
            p_name: name,
            p_value: value,
          });
          if (error) {
            throw new Error(`Impossible de sauvegarder le secret "${name}" : ${error.message}`);
          }
        }

        // Journaliser
        await admin.from("audit_logs").insert({
          action: "orange_sms_config_updated",
          metadata: { fields: Object.keys(secrets) },
        });

        return new Response(
          JSON.stringify({ ok: true, message: "Configuration Orange SMS Pro sauvegardée." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ─── Test d'envoi SMS ─────────────────────────────────────────────
      case "test_sms": {
        await requireAdmin(admin, authHeader);

        const recipient = String(payload.phone ?? "").trim();
        if (!recipient) throw new Error("Numéro de téléphone requis pour le test.");

        // Charger la config depuis Vault
        const { data, error: vaultErr } = await admin.rpc("get_orange_sms_config");
        if (vaultErr) throw new Error(`Lecture Vault échouée : ${vaultErr.message}`);

        const config = parseOrangeSmsConfig(data);
        if (!config) {
          throw new Error(
            "Orange SMS Pro n'est pas configuré. Renseignez d'abord vos identifiants.",
          );
        }

        await sendOrangeSms(config, recipient, "[INOVA-IRIS] 🔐 Test SMS Orange — Configuration 2FA validée.");

        await admin.from("audit_logs").insert({
          action: "orange_sms_test_sent",
          metadata: { recipient: `***${recipient.slice(-4)}` },
        });

        return new Response(
          JSON.stringify({ ok: true, message: `SMS de test envoyé au ${recipient.slice(-4).padStart(recipient.length, "*")}.` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      default:
        throw new Error(`Action inconnue : ${action}`);
    }
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
