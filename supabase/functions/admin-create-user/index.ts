import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    /*
    // Vérifier que le caller est admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non authentifié");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) throw new Error("Session invalide");

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Accès refusé" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    */

    // Récupérer tous les champs du formulaire
    const {
      email,
      fullName,
      organization,
      role,
      generation,
      phone,
      matricule,
      physicalAddress,
      city,
      info,
      tagPolicy,
      isActive,
      permissions,
      password,
    } = await req.json();

    if (!email || !role) throw new Error("Email et rôle requis");

    // Créer l'utilisateur (le trigger handle_new_user créera le profil et le rôle par défaut)
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: password || undefined,
      user_metadata: { full_name: fullName ?? null },
    });
    if (cErr) throw cErr;
    const newUserId = created.user!.id;

    // Mettre à jour le profil avec tous les champs
    const { error: profileErr } = await admin.from("profiles").update({
      full_name:            fullName ?? null,
      organization:         organization ?? null,
      phone:                phone ?? null,
      matricule:            matricule ?? null,
      physical_address:     physicalAddress ?? null,
      city:                 city ?? null,
      info:                 info ?? null,
      generation:           generation ?? "v1",
      tag_policy:           tagPolicy ?? "group",
      is_active:            isActive ?? true,
      perm_dispatching:     permissions?.dispatching ?? false,
      perm_show_experiences: permissions?.showExperiences ?? false,
      perm_show_followers:  permissions?.showFollowers ?? true,
    }).eq("id", newUserId);

    if (profileErr) console.error("Profile update error:", profileErr);

    // Remplacer le rôle par défaut "client" si différent
    if (role !== "client") {
      await admin.from("user_roles").delete().eq("user_id", newUserId);
      await admin.from("user_roles").insert({ user_id: newUserId, role });
    }

    // Envoyer un OTP de connexion par email
    const { error: otpErr } = await admin.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (otpErr) console.error("OTP error:", otpErr);

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