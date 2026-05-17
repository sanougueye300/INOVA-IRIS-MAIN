import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non authentifié");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Vérifier que le caller est admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) throw new Error("Session invalide");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Accès refusé" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const { email, fullName, organization, role } = await req.json();
    if (!email || !role) throw new Error("Email et rôle requis");

    // Créer l'utilisateur (sera créé via trigger handle_new_user)
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName ?? null },
    });
    if (cErr) throw cErr;
    const newUserId = created.user!.id;

    // Mettre à jour profil
    await admin.from("profiles").update({
      full_name: fullName ?? null,
      organization: organization ?? null,
    }).eq("id", newUserId);

    // Remplacer le rôle par défaut "client" si différent
    if (role !== "client") {
      await admin.from("user_roles").delete().eq("user_id", newUserId);
      await admin.from("user_roles").insert({ user_id: newUserId, role });
    }

    // Envoyer un OTP de connexion par email
    await admin.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });

    return new Response(JSON.stringify({ ok: true, userId: newUserId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-create-user error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});