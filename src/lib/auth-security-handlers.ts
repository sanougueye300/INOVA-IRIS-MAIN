import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateBackupCode, generateOtpCode, hashSecret, maskPhone } from "./auth-crypto";
import { devAuthStore, isDevAuthMode } from "./auth-dev-store";
import { passwordResetEmailHtml } from "./auth-email-templates";
import { deliverLoginOtp, normalizePhone } from "./otp-delivery";

export type AuthSecurityAction =
  | "send_sms_otp"
  | "verify_sms_otp"
  | "verify_backup_code"
  | "generate_backup_codes"
  | "list_backup_codes_status"
  | "mark_totp_enrolled"
  | "get_security_questions"
  | "verify_security_answers"
  | "send_password_reset"
  | "save_security_answers"
  | "list_security_question_catalog"
  | "verify_pin";

const OTP_TTL_MS = 2 * 60 * 1000;

function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL manquant.");
  return url;
}

function getAnonKey(): string {
  const key =
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error("Clé Supabase anon manquante.");
  return key;
}

function getAdmin(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!key) return null;
  return createClient(url, key);
}

function getPublicClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getAnonKey());
}

function getUserClient(authHeader: string): SupabaseClient {
  return createClient(getSupabaseUrl(), getAnonKey(), {
    global: { headers: { Authorization: authHeader } },
  });
}

async function getUserFromAuthHeader(
  admin: SupabaseClient | null,
  authHeader: string | null,
): Promise<{ id: string; email?: string }> {
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Session requise.");
  const token = authHeader.slice(7);
  const client = admin ?? getPublicClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Session invalide ou expirée.");
  return { id: data.user.id, email: data.user.email ?? undefined };
}

async function sendSms(phone: string, message: string): Promise<{ sent: boolean; dev?: boolean }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const normalized = normalizePhone(phone);

  if (!sid || !token || !from) {
    console.info("[auth-security SMS dev]", normalized, message);
    return { sent: true, dev: true };
  }

  const body = new URLSearchParams({ To: normalized, From: from, Body: message });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) throw new Error(`Échec envoi SMS: ${await res.text()}`);
  return { sent: true };
}

async function sendBrandedEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM ?? "INOVA-IRIS <noreply@inova-iris.sn>";
  if (!key) {
    console.info("[auth-security email dev]", to, subject);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (res.ok) return true;
    const errText = await res.text();
    console.warn(`[Resend] Premier envoi échoué avec l'expéditeur "${from}":`, errText);

    // Tentative de secours avec l'expéditeur onboarding@resend.dev
    if (from !== "onboarding@resend.dev") {
      console.info("[Resend] Tentative de secours avec onboarding@resend.dev...");
      const resFallback = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: "onboarding@resend.dev", to: [to], subject, html }),
      });
      if (resFallback.ok) return true;
      throw new Error(`Échec envoi e-mail après secours: ${await resFallback.text()}`);
    }
    throw new Error(`Échec envoi e-mail: ${errText}`);
  } catch (err) {
    console.error("[Resend] Erreur d'envoi:", err);
    throw err;
  }
}

async function sendPasswordResetViaAnon(email: string, origin: string) {
  const pub = getPublicClient();
  const { error } = await pub.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/reset-password`,
  });
  if (error) throw error;
}

async function handleDevRequest(
  action: AuthSecurityAction,
  payload: Record<string, unknown>,
  authHeader: string | null,
): Promise<Record<string, unknown>> {
  switch (action) {
    case "send_sms_otp": {
      const user = await getUserFromAuthHeader(null, authHeader);
      let phone: string | null = null;
      let userEmail = user.email ?? "";
      let fullName: string | null = null;

      if (authHeader) {
        const { data: profile } = await getUserClient(authHeader)
          .from("profiles")
          .select("phone, email, full_name")
          .eq("id", user.id)
          .maybeSingle();
        phone = profile?.phone?.trim() ? normalizePhone(profile.phone) : null;
        userEmail = profile?.email ?? userEmail;
        fullName = profile?.full_name ?? null;
      }

      const preferEmail = payload.preferEmail === true;
      const code = generateOtpCode();
      await devAuthStore.storeOtp(user.id, code, OTP_TTL_MS);

      const delivery = await deliverLoginOtp({
        code,
        phone: preferEmail ? null : phone,
        email: userEmail,
        fullName,
        sendSms,
        sendEmail: sendBrandedEmail,
      });

      console.info(`[dev OTP] user=${user.id} channel=${delivery.otpChannel} code=${code}`);

      return {
        ok: true,
        maskedPhone: phone ? maskPhone(phone) : undefined,
        otpChannel: delivery.otpChannel,
        expiresInSeconds: 120,
        devOtp: delivery.devOtp ?? code,
        devMode: true,
      };
    }
    case "verify_sms_otp": {
      const user = await getUserFromAuthHeader(null, authHeader);
      const code = String(payload.code ?? "");
      if (!/^\d{6}$/.test(code)) throw new Error("Code OTP invalide.");
      if (!(await devAuthStore.verifyOtp(user.id, code))) {
        throw new Error("Code OTP incorrect ou expiré.");
      }
      return { ok: true, verified: true, devMode: true };
    }
    case "verify_backup_code": {
      const user = await getUserFromAuthHeader(null, authHeader);
      const raw = String(payload.code ?? "").trim().toUpperCase();
      if (!(await devAuthStore.verifyBackup(user.id, raw))) {
        throw new Error("Code de secours invalide ou déjà utilisé.");
      }
      return { ok: true, verified: true, devMode: true };
    }
    case "generate_backup_codes": {
      const user = await getUserFromAuthHeader(null, authHeader);
      const plainCodes = devAuthStore.generateBackupCodesPlain(8);
      await devAuthStore.setBackupCodes(user.id, plainCodes);
      return { ok: true, codes: plainCodes, devMode: true };
    }
    case "list_backup_codes_status": {
      const user = await getUserFromAuthHeader(null, authHeader);
      const status = devAuthStore.getMfaStatus(user.id);
      return {
        ok: true,
        remainingCodes: devAuthStore.getBackupCount(user.id),
        totpEnrolled: status.totpEnrolled,
        backupCodesGeneratedAt: status.backupCodesGeneratedAt,
        devMode: true,
      };
    }
    case "mark_totp_enrolled": {
      const user = await getUserFromAuthHeader(null, authHeader);
      devAuthStore.setTotpEnrolled(user.id);
      return { ok: true, devMode: true };
    }
    case "get_security_questions": {
      const email = String(payload.email ?? "").trim().toLowerCase();
      return { ok: true, questions: devAuthStore.getSecurityQuestionsForEmail(email), devMode: true };
    }
    case "verify_security_answers": {
      const email = String(payload.email ?? "").trim().toLowerCase();
      const answers = payload.answers as { questionId: string; answer: string }[];
      if (!(await devAuthStore.verifySecurityAnswers(email, answers))) {
        throw new Error("Réponse incorrecte.");
      }
      return { ok: true, resetUrl: `${String(payload.redirectOrigin ?? "")}/auth/reset-password`, devMode: true };
    }
    case "send_password_reset": {
      const email = String(payload.email ?? "").trim().toLowerCase();
      const origin = String(payload.redirectOrigin ?? "http://localhost:8080");
      await sendPasswordResetViaAnon(email, origin);
      return { ok: true, sent: true, devMode: true };
    }
    case "save_security_answers": {
      const user = await getUserFromAuthHeader(null, authHeader);
      const answers = payload.answers as { questionId: string; answer: string }[];
      const email = user.email ?? "";
      if (!email) throw new Error("E-mail utilisateur introuvable.");
      await devAuthStore.saveSecurityAnswers(email, answers);
      return { ok: true, devMode: true };
    }
    case "list_security_question_catalog": {
      return { ok: true, questions: devAuthStore.listCatalog(), devMode: true };
    }
    default:
      throw new Error(`Action inconnue: ${action}`);
  }
}

export async function handleAuthSecurityRequest(
  action: AuthSecurityAction,
  payload: Record<string, unknown>,
  authHeader: string | null,
): Promise<Record<string, unknown>> {
  const admin = getAdmin();

  if (!admin && isDevAuthMode()) {
    return handleDevRequest(action, payload, authHeader);
  }

  if (!admin) {
    throw new Error("Configuration Supabase serveur manquante.");
  }

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
        throw new Error(
          "Aucun téléphone ni e-mail enregistré sur votre profil. Contactez l'administrateur SOC.",
        );
      }

      // Rate limit check: max 5 OTP send attempts per 15 mins
      const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count: rlCount } = await admin
        .from("rate_limit_events")
        .select("id", { count: "exact", head: true })
        .eq("identifier", user.id)
        .eq("action", "send_otp")
        .gte("created_at", windowStart);

      if ((rlCount ?? 0) >= 5) {
        throw new Error("Trop de demandes d'envoi. Veuillez patienter 15 minutes.");
      }
      await admin.from("rate_limit_events").insert({ identifier: user.id, action: "send_otp" });

      const code = generateOtpCode();
      const codeHash = await hashSecret(code);
      const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

      // Clear existing user tokens and insert new one
      await admin.from("otp_tokens").delete().eq("user_id", user.id);
      const { error: insertErr } = await admin.from("otp_tokens").insert({
        user_id: user.id,
        code: codeHash,
        expires_at: expiresAt,
        verified: false,
        attempts: 0
      });

      if (insertErr) {
        console.warn("[auth-security] DB insert OTP failed, using dev store:", insertErr.message);
        await devAuthStore.storeOtp(user.id, code, OTP_TTL_MS);
      }

      // Log audit
      await admin.from("audit_logs").insert({
        user_id: user.id,
        action: "otp_sent",
        metadata: { phone, expires_at: expiresAt }
      });

      const delivery = await deliverLoginOtp({
        code,
        phone: preferEmail ? null : phone,
        email: userEmail,
        fullName,
        sendSms,
        sendEmail: sendBrandedEmail,
      });

      return {
        ok: true,
        maskedPhone: phone ? maskPhone(phone) : undefined,
        otpChannel: delivery.otpChannel,
        expiresInSeconds: 120,
        devOtp: delivery.devOtp ?? code,
        smsDelivered: delivery.smsDelivered,
        emailDelivered: delivery.emailDelivered,
      };
    }

    case "verify_sms_otp": {
      const user = await getUserFromAuthHeader(admin, authHeader);
      const code = String(payload.code ?? "");
      if (!/^\d{6}$/.test(code)) throw new Error("Code OTP invalide.");
      const codeHash = await hashSecret(code);

      // Rate limit check: max 5 verify attempts per 15 min
      const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count: rlCount } = await admin
        .from("rate_limit_events")
        .select("id", { count: "exact", head: true })
        .eq("identifier", user.id)
        .eq("action", "otp_verify")
        .gte("created_at", windowStart);

      if ((rlCount ?? 0) >= 5) {
        throw new Error("Trop de tentatives de validation. Veuillez patienter 15 minutes.");
      }
      await admin.from("rate_limit_events").insert({ identifier: user.id, action: "otp_verify" });

      const { data: otpRow } = await admin
        .from("otp_tokens")
        .select("*")
        .eq("user_id", user.id)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpRow) {
        // Fallback for dev mode
        if (await devAuthStore.verifyOtp(user.id, code)) {
          return { ok: true, verified: true };
        }
        throw new Error("Code OTP incorrect ou expiré.");
      }

      if (otpRow.attempts >= 5) {
        await admin.from("otp_tokens").delete().eq("id", otpRow.id);
        await admin.from("audit_logs").insert({
          user_id: user.id,
          action: "otp_failed",
          metadata: { reason: "attempts_lockout" }
        });
        throw new Error("Trop de tentatives. Code invalidé.");
      }

      if (otpRow.code === codeHash || otpRow.code === code) {
        await admin.from("otp_tokens").delete().eq("id", otpRow.id);
        
        await admin.from("audit_logs").insert({
          user_id: user.id,
          action: "otp_verified",
          metadata: { method: "sms" }
        });
        return { ok: true, verified: true };
      }

      // Increment attempts
      await admin.from("otp_tokens").update({ attempts: otpRow.attempts + 1 }).eq("id", otpRow.id);
      
      await admin.from("audit_logs").insert({
        user_id: user.id,
        action: "otp_failed",
        metadata: { reason: "Code incorrect", attempts: otpRow.attempts + 1 }
      });
      throw new Error("Code OTP incorrect.");
    }

    case "verify_backup_code": {
      const user = await getUserFromAuthHeader(admin, authHeader);
      const raw = String(payload.code ?? "").trim().toUpperCase();
      const codeHash = await hashSecret(raw);
      
      const { data: profile } = await admin
        .from("profiles")
        .select("backup_codes")
        .eq("id", user.id)
        .single();

      const codes = profile?.backup_codes || [];
      const index = codes.indexOf(codeHash);
      if (index !== -1) {
        const updatedCodes = [...codes];
        updatedCodes.splice(index, 1);
        await admin.from("profiles").update({ backup_codes: updatedCodes }).eq("id", user.id);
        
        await admin.from("audit_logs").insert({
          user_id: user.id,
          action: "backup_code_used",
          metadata: { code_hash: codeHash }
        });
        return { ok: true, verified: true };
      }

      if (await devAuthStore.verifyBackup(user.id, raw)) {
        return { ok: true, verified: true };
      }
      throw new Error("Code de secours invalide ou déjà utilisé.");
    }

    case "generate_backup_codes": {
      const user = await getUserFromAuthHeader(admin, authHeader);
      const plainCodes: string[] = [];
      const hashedCodes: string[] = [];
      for (let i = 0; i < 8; i++) {
        const c = generateBackupCode();
        plainCodes.push(c);
        hashedCodes.push(await hashSecret(c));
      }

      const { error } = await admin.from("profiles")
        .update({ 
          backup_codes: hashedCodes,
          totp_enabled: true,
          two_fa_method: "totp"
        })
        .eq("id", user.id);

      if (error) {
        await devAuthStore.setBackupCodes(user.id, plainCodes);
      }

      await admin.from("audit_logs").insert({
        user_id: user.id,
        action: "2fa_enabled",
        metadata: { method: "totp", backup_codes_count: 8 }
      });

      return { ok: true, codes: plainCodes };
    }

    case "list_backup_codes_status": {
      const user = await getUserFromAuthHeader(admin, authHeader);
      const { data: profile } = await admin
        .from("profiles")
        .select("backup_codes, totp_enabled")
        .eq("id", user.id)
        .maybeSingle();

      const remaining = profile?.backup_codes?.length ?? 0;
      const totpEnrolled = profile?.totp_enabled ?? false;

      return {
        ok: true,
        remainingCodes: remaining || devAuthStore.getBackupCount(user.id),
        totpEnrolled: totpEnrolled || devAuthStore.getMfaStatus(user.id).totpEnrolled,
        backupCodesGeneratedAt: totpEnrolled ? new Date().toISOString() : null,
      };
    }

    case "get_security_questions": {
      const email = String(payload.email ?? "").trim().toLowerCase();
      if (!email) throw new Error("E-mail requis.");
      const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
      if (!profile) return { ok: true, questions: devAuthStore.getSecurityQuestionsForEmail(email) };
      const { data: answers } = await admin
        .from("user_security_answers")
        .select("question_id")
        .eq("user_id", profile.id);
      if (!answers?.length) {
        return { ok: true, questions: devAuthStore.getSecurityQuestionsForEmail(email) };
      }
      const ids = answers.map((a) => a.question_id);
      const { data: questions } = await admin
        .from("security_questions")
        .select("id, question_text")
        .in("id", ids)
        .eq("is_active", true)
        .order("sort_order");
      const dbQs = questions ?? [];
      if (dbQs.length) return { ok: true, questions: dbQs };
      return { ok: true, questions: devAuthStore.getSecurityQuestionsForEmail(email) };
    }

    case "verify_security_answers": {
      const email = String(payload.email ?? "").trim().toLowerCase();
      const answers = payload.answers as { questionId: string; answer: string }[];
      if (!email || !answers?.length) throw new Error("E-mail et réponses requis.");

      const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
      if (profile) {
        const { data: stored } = await admin
          .from("user_security_answers")
          .select("question_id, answer_hash")
          .eq("user_id", profile.id);
        if (stored?.length) {
          for (const ans of answers) {
            const row = stored.find((s) => s.question_id === ans.questionId);
            if (!row || (await hashSecret(ans.answer)) !== row.answer_hash) {
              throw new Error("Réponse incorrecte.");
            }
          }
          const origin = String(payload.redirectOrigin ?? "");
          const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
            type: "recovery",
            email,
            options: { redirectTo: `${origin}/auth/reset-password` },
          });
          if (linkErr) throw linkErr;
          return { ok: true, resetUrl: linkData.properties?.action_link };
        }
      }

      if (!(await devAuthStore.verifySecurityAnswers(email, answers))) {
        throw new Error("Réponse incorrecte.");
      }
      const origin = String(payload.redirectOrigin ?? "");
      try {
        await sendPasswordResetViaAnon(email, origin);
      } catch {
        /* ignore */
      }
      return { ok: true, resetUrl: `${origin}/auth/reset-password` };
    }

    case "send_password_reset": {
      const email = String(payload.email ?? "").trim().toLowerCase();
      const origin = String(payload.redirectOrigin ?? "http://localhost:8080");

      // Rate limit check: max 3 requests per email per hour
      const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: rlCount } = await admin
        .from("rate_limit_events")
        .select("id", { count: "exact", head: true })
        .eq("identifier", email)
        .eq("action", "forgot_password")
        .gte("created_at", windowStart);

      if ((rlCount ?? 0) >= 3) {
        throw new Error("Trop de demandes de réinitialisation. Veuillez patienter 1 heure.");
      }
      await admin.from("rate_limit_events").insert({ identifier: email, action: "forgot_password" });

      const { data: profile } = await admin
        .from("profiles")
        .select("id, full_name, is_active")
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
        if (!branded) await sendPasswordResetViaAnon(email, origin);
      } else {
        await sendPasswordResetViaAnon(email, origin);
      }

      if (profile) {
        await admin.from("audit_logs").insert({
          user_id: profile.id,
          action: "password_reset_requested",
          metadata: { email }
        });
      }

      return { ok: true, sent: true };
    }

    case "mark_totp_enrolled": {
      const user = await getUserFromAuthHeader(admin, authHeader);
      devAuthStore.setTotpEnrolled(user.id);
      await admin.from("profiles")
        .update({ 
          totp_enabled: true,
          two_fa_method: "totp"
        })
        .eq("id", user.id);
      return { ok: true };
    }

    case "save_security_answers": {
      const user = await getUserFromAuthHeader(admin, authHeader);
      const answers = payload.answers as { questionId: string; answer: string }[];
      const email = user.email ?? "";
      if (email) await devAuthStore.saveSecurityAnswers(email, answers);
      const rows = await Promise.all(
        answers.map(async (a) => ({
          user_id: user.id,
          question_id: a.questionId,
          answer_hash: await hashSecret(a.answer),
        })),
      );
      await admin.from("user_security_answers").delete().eq("user_id", user.id);
      const { error } = await admin.from("user_security_answers").insert(rows);
      if (error) console.warn("[auth-security] save_security_answers DB:", error.message);
      return { ok: true };
    }

    case "list_security_question_catalog": {
      const { data: questions } = await admin
        .from("security_questions")
        .select("id, question_text, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (questions?.length) return { ok: true, questions };
      return { ok: true, questions: devAuthStore.listCatalog() };
    }

    case "verify_pin": {
      const user = await getUserFromAuthHeader(admin, authHeader);
      const pin = String(payload.pin ?? "");
      const { data: profile } = await admin
        .from("profiles")
        .select("lock_pin_hash")
        .eq("id", user.id)
        .single();
      
      const inputPinHash = await hashSecret(pin);
      let storedPinHash = profile?.lock_pin_hash;
      
      if (!storedPinHash) {
        // Fallback or initialization of default pin "1234"
        storedPinHash = await hashSecret("1234");
        await admin.from("profiles").update({ lock_pin_hash: storedPinHash }).eq("id", user.id);
      }
      
      const isValid = inputPinHash === storedPinHash;
      await admin.from("audit_logs").insert({
        user_id: user.id,
        action: isValid ? "session_unlocked" : "session_lock_failed",
        metadata: { pin_success: isValid }
      });
      return { ok: true, valid: isValid };
    }

    default:
      throw new Error(`Action inconnue: ${action}`);
  }
}
