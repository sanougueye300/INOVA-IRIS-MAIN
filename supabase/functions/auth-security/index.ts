import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { generateBackupCode, generateOtpCode, hashSecret, maskPhone } from "../_shared/auth-crypto.ts";
import { passwordResetEmailHtml } from "../_shared/email-templates.ts";
import { deliverLoginOtp } from "../_shared/otp-delivery.ts";
import { normalizePhone, sendBrandedEmail, sendSms } from "../_shared/user-provisioning.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OTP_TTL_MS = 2 * 60 * 1000;

async function getUserFromAuthHeader(admin: ReturnType<typeof createClient>, authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Session requise.");
  const token = authHeader.slice(7);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Session invalide ou expirée.");
  return { id: data.user.id, email: data.user.email ?? undefined };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { action, ...payload } = await req.json();
    const authHeader = req.headers.get("Authorization");
    let result: Record<string, unknown>;

    switch (action) {
      case "send_sms_otp": {
        const user = await getUserFromAuthHeader(admin, authHeader);
        const { data: profile } = await admin
          .from("profiles")
          .select("phone, email, full_name")
          .eq("id", user.id)
          .single();

        const phone = profile?.phone?.trim() ? normalizePhone(profile.phone) : null;
        const userEmail = profile?.email ?? user.email ?? "";
        const fullName = profile?.full_name ?? null;
        const preferEmail = payload.preferEmail === true;

        if (!phone && !userEmail) {
          throw new Error("Aucun téléphone ni e-mail enregistré sur votre profil.");
        }

        const code = generateOtpCode();
        const codeHash = await hashSecret(code);
        await admin.from("login_sms_otps").insert({
          user_id: user.id,
          code_hash: codeHash,
          expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
        });

        const delivery = await deliverLoginOtp({
          code,
          phone: preferEmail ? null : phone,
          email: userEmail,
          fullName,
          sendSms,
          sendEmail: sendBrandedEmail,
        });

        result = {
          ok: true,
          maskedPhone: phone ? maskPhone(phone) : undefined,
          otpChannel: delivery.otpChannel,
          expiresInSeconds: 120,
          smsDelivered: delivery.smsDelivered,
          emailDelivered: delivery.emailDelivered,
        };
        break;
      }
      case "verify_sms_otp": {
        const user = await getUserFromAuthHeader(admin, authHeader);
        const code = String(payload.code ?? "");
        if (!/^\d{6}$/.test(code)) throw new Error("Code OTP invalide.");
        const codeHash = await hashSecret(code);
        const { data: otpRow } = await admin
          .from("login_sms_otps")
          .select("id, code_hash")
          .eq("user_id", user.id)
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!otpRow || otpRow.code_hash !== codeHash) throw new Error("Code OTP incorrect ou expiré.");
        await admin.from("login_sms_otps").update({ used_at: new Date().toISOString() }).eq("id", otpRow.id);
        result = { ok: true, verified: true };
        break;
      }
      case "verify_backup_code": {
        const user = await getUserFromAuthHeader(admin, authHeader);
        const raw = String(payload.code ?? "").trim().toUpperCase();
        const codeHash = await hashSecret(raw);
        const { data: codes } = await admin.from("user_backup_codes").select("id, code_hash").eq("user_id", user.id).is("used_at", null);
        const match = codes?.find((c) => c.code_hash === codeHash);
        if (!match) throw new Error("Code de secours invalide ou déjà utilisé.");
        await admin.from("user_backup_codes").update({ used_at: new Date().toISOString() }).eq("id", match.id);
        result = { ok: true, verified: true };
        break;
      }
      case "generate_backup_codes": {
        const user = await getUserFromAuthHeader(admin, authHeader);
        const plainCodes: string[] = [];
        const rows: { user_id: string; code_hash: string }[] = [];
        for (let i = 0; i < 8; i++) {
          const code = generateBackupCode();
          plainCodes.push(code);
          rows.push({ user_id: user.id, code_hash: await hashSecret(code) });
        }
        await admin.from("user_backup_codes").delete().eq("user_id", user.id).is("used_at", null);
        await admin.from("user_backup_codes").insert(rows);
        await admin.from("user_mfa_settings").upsert({
          user_id: user.id,
          backup_codes_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        result = { ok: true, codes: plainCodes };
        break;
      }
      case "list_backup_codes_status": {
        const user = await getUserFromAuthHeader(admin, authHeader);
        const { count } = await admin.from("user_backup_codes").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("used_at", null);
        const { data: mfa } = await admin.from("user_mfa_settings").select("totp_enrolled, backup_codes_generated_at").eq("user_id", user.id).maybeSingle();
        result = { ok: true, remainingCodes: count ?? 0, totpEnrolled: mfa?.totp_enrolled ?? false, backupCodesGeneratedAt: mfa?.backup_codes_generated_at ?? null };
        break;
      }
      case "mark_totp_enrolled": {
        const user = await getUserFromAuthHeader(admin, authHeader);
        await admin.from("user_mfa_settings").upsert({ user_id: user.id, totp_enrolled: true, updated_at: new Date().toISOString() });
        result = { ok: true };
        break;
      }
      case "get_security_questions": {
        const email = String(payload.email ?? "").trim().toLowerCase();
        const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
        if (!profile) { result = { ok: true, questions: [] }; break; }
        const { data: answers } = await admin.from("user_security_answers").select("question_id").eq("user_id", profile.id);
        if (!answers?.length) { result = { ok: true, questions: [] }; break; }
        const ids = answers.map((a) => a.question_id);
        const { data: questions } = await admin.from("security_questions").select("id, question_text").in("id", ids).eq("is_active", true).order("sort_order");
        result = { ok: true, questions: questions ?? [] };
        break;
      }
      case "verify_security_answers": {
        const email = String(payload.email ?? "").trim().toLowerCase();
        const answers = payload.answers as { questionId: string; answer: string }[];
        const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
        if (!profile) throw new Error("Compte introuvable.");
        const { data: stored } = await admin.from("user_security_answers").select("question_id, answer_hash").eq("user_id", profile.id);
        if (!stored?.length) throw new Error("Aucune question de secours configurée.");
        for (const ans of answers) {
          const row = stored.find((s) => s.question_id === ans.questionId);
          if (!row || (await hashSecret(ans.answer)) !== row.answer_hash) throw new Error("Réponse incorrecte.");
        }
        const origin = String(payload.redirectOrigin ?? "");
        const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: `${origin}/auth/reset-password` },
        });
        if (linkErr) throw linkErr;
        result = { ok: true, resetUrl: linkData.properties?.action_link };
        break;
      }
      case "send_password_reset": {
        const email = String(payload.email ?? "").trim().toLowerCase();
        const origin = String(payload.redirectOrigin ?? "");

        const { data: profile } = await admin
          .from("profiles")
          .select("is_active")
          .eq("email", email)
          .maybeSingle();

        if (profile && profile.is_active === false) {
          throw new Error("Ce compte est suspendu. Contactez l'administrateur SOC.");
        }

        const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: `${origin}/auth/reset-password` },
        });
        if (!linkErr && linkData.properties?.action_link) {
          const html = passwordResetEmailHtml({ resetUrl: linkData.properties.action_link, userEmail: email });
          const branded = await sendBrandedEmail(email, "Réinitialisation de mot de passe — INOVA-IRIS", html);
          if (!branded) {
            const pub = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
            await pub.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/reset-password` });
          }
        }
        result = { ok: true, sent: true };
        break;
      }
      case "save_security_answers": {
        const user = await getUserFromAuthHeader(admin, authHeader);
        const answers = payload.answers as { questionId: string; answer: string }[];
        const rows = await Promise.all(answers.map(async (a) => ({
          user_id: user.id,
          question_id: a.questionId,
          answer_hash: await hashSecret(a.answer),
        })));
        await admin.from("user_security_answers").delete().eq("user_id", user.id);
        await admin.from("user_security_answers").insert(rows);
        result = { ok: true };
        break;
      }
      case "list_security_question_catalog": {
        const { data: questions } = await admin
          .from("security_questions")
          .select("id, question_text, sort_order")
          .eq("is_active", true)
          .order("sort_order");
        result = { ok: true, questions: questions ?? [] };
        break;
      }
      default:
        throw new Error(`Action inconnue: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
