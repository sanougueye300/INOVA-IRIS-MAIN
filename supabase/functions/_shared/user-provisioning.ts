import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { generateBackupCode, generateOtpCode, hashSecret, maskPhone } from "./auth-crypto.ts";
import { welcomeAccountEmailHtml } from "./email-templates.ts";
import { deliverLoginOtp } from "./otp-delivery.ts";

const OTP_TTL_MS = 2 * 60 * 1000;

export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (digits.startsWith("221") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 9) return `+221${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `+221${digits.slice(1)}`;
  return trimmed;
}

export async function sendSms(
  phone: string,
  message: string,
): Promise<{ sent: boolean; dev?: boolean }> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_PHONE_NUMBER");
  const normalized = normalizePhone(phone);

  if (!sid || !token || !from) {
    console.info("[provisioning SMS dev]", normalized, message);
    return { sent: true, dev: true };
  }

  const body = new URLSearchParams({ To: normalized, From: from, Body: message });
  const cred = btoa(`${sid}:${token}`);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${cred}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new Error(`Échec envoi SMS: ${await res.text()}`);
  return { sent: true };
}

export async function sendBrandedEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("AUTH_EMAIL_FROM") ?? "INOVA-IRIS <noreply@inova-iris.sn>";
  if (!key) {
    console.info("[provisioning email dev]", to, subject);
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

export async function storeLoginOtp(
  admin: SupabaseClient,
  userId: string,
  code: string,
): Promise<void> {
  const codeHash = await hashSecret(code);
  await admin.from("login_sms_otps").insert({
    user_id: userId,
    code_hash: codeHash,
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  });
}

export async function saveSecurityAnswers(
  admin: SupabaseClient,
  userId: string,
  answers: { questionId: string; answer: string }[],
): Promise<void> {
  if (!answers?.length) return;
  const rows = await Promise.all(
    answers.map(async (a) => ({
      user_id: userId,
      question_id: a.questionId,
      answer_hash: await hashSecret(a.answer),
    })),
  );
  await admin.from("user_security_answers").delete().eq("user_id", userId);
  const { error } = await admin.from("user_security_answers").insert(rows);
  if (error) console.warn("[provisioning] save security answers:", error.message);
}

export async function generateAndStoreBackupCodes(
  admin: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const plainCodes: string[] = [];
  const rows: { user_id: string; code_hash: string }[] = [];
  for (let i = 0; i < 8; i++) {
    const c = generateBackupCode();
    plainCodes.push(c);
    rows.push({ user_id: userId, code_hash: await hashSecret(c) });
  }
  await admin.from("user_backup_codes").delete().eq("user_id", userId).is("used_at", null);
  await admin.from("user_backup_codes").insert(rows);
  await admin.from("user_mfa_settings").upsert({
    user_id: userId,
    sms_enabled: true,
    backup_codes_generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return plainCodes;
}

export type ProvisionSecurityParams = {
  userId: string;
  email: string;
  fullName: string;
  phone?: string | null;
  organization?: string | null;
  loginUrl: string;
  securityAnswers?: { questionId: string; answer: string }[];
};

export type ProvisionSecurityResult = {
  welcomeEmailSent: boolean;
  otpSentVia: "sms" | "email" | null;
  maskedPhone?: string;
  devOtp?: string;
  backupCodesGenerated: boolean;
};

/** Provisionne la sécurité d'un nouvel agent à partir des données du formulaire RH. */
export async function provisionUserSecurity(
  admin: SupabaseClient,
  params: ProvisionSecurityParams,
): Promise<ProvisionSecurityResult> {
  const { userId, email, fullName, phone, organization, loginUrl, securityAnswers } = params;
  const normalizedPhone = phone?.trim() ? normalizePhone(phone) : null;

  await saveSecurityAnswers(admin, userId, securityAnswers ?? []);
  await generateAndStoreBackupCodes(admin, userId);

  const welcomeHtml = welcomeAccountEmailHtml({
    fullName,
    userEmail: email,
    organization,
    maskedPhone: normalizedPhone ? maskPhone(normalizedPhone) : undefined,
    loginUrl,
  });
  const welcomeEmailSent = await sendBrandedEmail(
    email,
    "Bienvenue sur INOVA-IRIS — Votre accès SOC",
    welcomeHtml,
  );

  const code = generateOtpCode();
  await storeLoginOtp(admin, userId, code);

  const delivery = await deliverLoginOtp({
    code,
    phone: normalizedPhone,
    email,
    fullName,
    sendSms,
    sendEmail: sendBrandedEmail,
  });

  const otpSentVia =
    delivery.otpChannel === "sms" ? "sms" : delivery.otpChannel === "email" ? "email" : null;

  return {
    welcomeEmailSent,
    otpSentVia,
    maskedPhone: normalizedPhone ? maskPhone(normalizedPhone) : undefined,
    devOtp: delivery.devOtp,
    backupCodesGenerated: true,
  };
}
