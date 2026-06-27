import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { normalizePhone, provisionUserSecurity } from "../_shared/user-provisioning.ts";
import { generateDefaultPassword } from "../_shared/auth-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

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
      securityAnswers,
      redirectOrigin,
    } = await req.json();

    if (!email || !role) throw new Error("Email et rôle requis");
    if (!phone?.trim()) {
      throw new Error("Le numéro de téléphone est requis pour l'envoi des codes OTP de connexion.");
    }

    const normalizedPhone = normalizePhone(phone);
    const finalPassword = password?.trim() ? password : generateDefaultPassword();

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      email_confirm: true,
      password: finalPassword,
      user_metadata: { full_name: fullName ?? null },
    });
    if (cErr) throw cErr;
    const newUserId = created.user!.id;

    const { error: profileErr } = await admin.from("profiles").update({
      full_name: fullName ?? null,
      organization: organization ?? null,
      phone: normalizedPhone,
      matricule: matricule ?? null,
      physical_address: physicalAddress ?? null,
      city: city ?? null,
      info: info ?? null,
      generation: generation ?? "v1",
      tag_policy: tagPolicy ?? "group",
      is_active: isActive ?? true,
      perm_dispatching: permissions?.dispatching ?? false,
      perm_show_experiences: permissions?.showExperiences ?? false,
      perm_show_followers: permissions?.showFollowers ?? true,
    }).eq("id", newUserId);

    if (profileErr) console.error("Profile update error:", profileErr);

    // Créer l'entrée du rôle dans user_roles (pour TOUS les rôles, y compris "client")
    await admin.from("user_roles").delete().eq("user_id", newUserId);
    const { error: roleErr } = await admin.from("user_roles").insert({ user_id: newUserId, role });
    if (roleErr) console.error("Role insert error:", roleErr);

    const origin = redirectOrigin ?? Deno.env.get("SITE_URL") ?? "http://localhost:8080";
    const loginUrl = `${origin}/auth/login`;

    const security = await provisionUserSecurity(admin, {
      userId: newUserId,
      email: email.trim().toLowerCase(),
      fullName: fullName ?? email,
      phone: normalizedPhone,
      organization,
      loginUrl,
      password: finalPassword,
      securityAnswers: securityAnswers ?? [],
    });

    return new Response(
      JSON.stringify({
        ok: true,
        userId: newUserId,
        security: {
          welcomeEmailSent: security.welcomeEmailSent,
          otpSentVia: security.otpSentVia,
          maskedPhone: security.maskedPhone,
          devOtp: security.devOtp,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("admin-create-user error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
