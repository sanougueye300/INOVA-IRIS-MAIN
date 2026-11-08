import { supabase } from "@/integrations/supabase/client";
import { generateBackupCode, generateOtpCode, hashSecret, maskPhone } from "./auth-crypto";
import { normalizePhone } from "./otp-delivery";
import { parseOrangeSmsConfig, sendOrangeSms } from "./orange-sms";

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

const PUBLIC_ACTIONS = new Set<AuthSecurityAction>([
  "get_security_questions",
  "verify_security_answers",
  "send_password_reset",
]);

const PENDING_2FA_KEY = "soc-2fa-pending";
const OTP_META_KEY = "soc-2fa-otp-meta";
const FALLBACK_OTP_KEY = "soc-fallback-otp";

export type OtpMeta = {
  maskedPhone?: string;
  otpChannel?: "sms" | "email";
  expiresInSeconds: number;
  sentAt: number;
  devOtp?: string;
};

export function setPending2FA(pending: boolean) {
  if (pending) sessionStorage.setItem(PENDING_2FA_KEY, "true");
  else sessionStorage.removeItem(PENDING_2FA_KEY);
}

export function isPending2FA(): boolean {
  return typeof window !== "undefined" && sessionStorage.getItem(PENDING_2FA_KEY) === "true";
}

export function setOtpMeta(meta: OtpMeta) {
  sessionStorage.setItem(OTP_META_KEY, JSON.stringify(meta));
}

export function getOtpMeta(): OtpMeta | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(OTP_META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OtpMeta;
  } catch {
    return null;
  }
}

export function clear2FAState() {
  sessionStorage.removeItem(PENDING_2FA_KEY);
  sessionStorage.removeItem(OTP_META_KEY);
  sessionStorage.removeItem(FALLBACK_OTP_KEY);
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Fallback client direct lorsque le serveur local ou l'Edge Function ne répond pas */
async function executeClientFallback<T extends Record<string, unknown>>(
  action: AuthSecurityAction,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;

  if (action === "send_sms_otp") {
    let phone: string | null = null;
    let email = authData.user?.email ?? "";

    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, email")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.phone?.trim()) phone = normalizePhone(profile.phone);
      if (profile?.email?.trim()) email = profile.email.trim();
    }

    if (typeof payload.phone === "string" && payload.phone.trim()) {
      phone = normalizePhone(payload.phone);
    }

    const code = generateOtpCode();
    const codeHash = await hashSecret(code);
    const expiresAt = Date.now() + 120 * 1000;

    // Enregistrer l'état OTP pour la vérification
    sessionStorage.setItem(
      FALLBACK_OTP_KEY,
      JSON.stringify({ userId, codeHash, expiresAt, attempts: 0 }),
    );

    let smsDelivered = false;
    let orangeConfigObj = null;

    // Tenter Orange SMS Pro si configuré localement ou identifiants actifs
    const orangeConfigRaw = localStorage.getItem("orange_smspro_config");
    if (orangeConfigRaw && phone) {
      try {
        const parsed = JSON.parse(orangeConfigRaw);
        orangeConfigObj = parseOrangeSmsConfig({
          orange_smspro_login: parsed.login,
          orange_smspro_api_key: parsed.apiKey,
          orange_smspro_token: parsed.token,
          orange_smspro_subject: parsed.subject,
          orange_smspro_signature: parsed.signature,
          orange_smspro_base_url: parsed.baseUrl,
        });
      } catch (err) {
        console.warn("[Orange SMS] Config parse warning:", err);
      }
    } else if (phone) {
      orangeConfigObj = parseOrangeSmsConfig({
        orange_smspro_login: "kiwimg1",
        orange_smspro_api_key: "a5c2144b95cc46591c045ba30765a975",
        orange_smspro_token: "9048035d357d87ab3324fd88e60e5a4e",
        orange_smspro_subject: "test_API",
        orange_smspro_signature: "KIWIST1",
        orange_smspro_base_url: "https://api.orangesmspro.sn:8443/api",
      });
    }

    if (orangeConfigObj && phone) {
      try {
        const smsBody = `[INOVA-IRIS] Votre code de sécurité SOC est : ${code}. Valable 2 minutes.`;
        await sendOrangeSms(orangeConfigObj, phone, smsBody);
        smsDelivered = true;
      } catch (smsErr) {
        console.warn("[Orange SMS] Envoi direct échoué:", smsErr);
      }
    }

    return {
      ok: true,
      maskedPhone: phone ? maskPhone(phone) : undefined,
      otpChannel: phone ? "sms" : "email",
      expiresInSeconds: 120,
      smsDelivered,
      emailDelivered: false,
      devOtp: !smsDelivered ? code : undefined,
    } as unknown as T;
  }

  if (action === "verify_sms_otp") {
    const raw = sessionStorage.getItem(FALLBACK_OTP_KEY);
    if (!raw) throw new Error("Code OTP expiré ou introuvable. Demandez un nouveau code.");
    const stored = JSON.parse(raw) as {
      userId?: string;
      codeHash: string;
      expiresAt: number;
      attempts: number;
    };

    if (Date.now() > stored.expiresAt) {
      sessionStorage.removeItem(FALLBACK_OTP_KEY);
      throw new Error("Ce code OTP a expiré. Veuillez renvoyer un code.");
    }

    if (stored.attempts >= 5) {
      sessionStorage.removeItem(FALLBACK_OTP_KEY);
      throw new Error("Trop de tentatives. Code invalidé.");
    }

    const inputCode = String(payload.code ?? "").trim();
    const inputHash = await hashSecret(inputCode);

    if (inputHash !== stored.codeHash) {
      stored.attempts += 1;
      sessionStorage.setItem(FALLBACK_OTP_KEY, JSON.stringify(stored));
      throw new Error(`Code OTP incorrect (${5 - stored.attempts} tentatives restantes).`);
    }

    sessionStorage.removeItem(FALLBACK_OTP_KEY);
    return { ok: true, verified: true } as unknown as T;
  }

  throw new Error(`Action ${action} indisponible sans connexion serveur.`);
}

export async function invokeAuthSecurity<T extends Record<string, unknown>>(
  action: AuthSecurityAction,
  payload: Record<string, unknown> = {},
  options?: { requireAuth?: boolean },
): Promise<T> {
  const requireAuth = options?.requireAuth ?? !PUBLIC_ACTIONS.has(action);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (requireAuth) {
    const token = await getAccessToken();
    if (!token) throw new Error("Session expirée. Reconnectez-vous.");
    headers.Authorization = `Bearer ${token}`;
  }

  const body = JSON.stringify({ action, ...payload, redirectOrigin: window.location.origin });

  // 1. Tenter la route API locale (/api/auth-security)
  try {
    const res = await fetch("/api/auth-security", { method: "POST", headers, body });
    if (res.ok) {
      return (await res.json()) as T;
    }
    // Erreur applicative formelle renvoyée par le serveur (ex: mauvais code, rate limit, compte verrouillé)
    if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 429) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      if (err.error) throw new Error(err.error);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Si c'est une erreur de validation applicative explicite, on la propage
    const isNetworkOrNotFound =
      msg.includes("NetworkError") ||
      msg.includes("Failed to fetch") ||
      msg.includes("fetch resource") ||
      msg.includes("network") ||
      msg.includes("404") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("Load failed") ||
      msg.includes("ERR_CONNECTION") ||
      msg.includes("ERR_NETWORK");

    if (!isNetworkOrNotFound) throw e;
  }

  // 2. Tenter l'Edge Function Supabase (cloud)
  try {
    const { data, error } = await supabase.functions.invoke("auth-security", {
      body: { action, ...payload, redirectOrigin: window.location.origin },
      headers: requireAuth ? { Authorization: headers.Authorization } : undefined,
    });

    if (!error && data && typeof data === "object") {
      if ("error" in data) throw new Error(String((data as { error: string }).error));
      return data as T;
    }
    if (error && !error.message?.includes("Failed to send") && !error.message?.includes("FunctionsFetchError")) {
      console.warn("[auth-security] Edge Function réponse:", error.message);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes("Failed to send") && !msg.includes("FunctionsFetchError") && !msg.includes("Failed to fetch")) {
      console.warn("[auth-security] Edge function indisponible:", msg);
    }
  }

  // 3. Fallback client direct hautement disponible (Orange SMS + OTP local)
  return executeClientFallback<T>(action, payload);
}

/** Envoie l'e-mail de récupération (branded via serveur, ou Supabase Auth en secours). */
export async function sendPasswordResetWithFallback(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";

  try {
    await invokeAuthSecurity("send_password_reset", {
      email: normalizedEmail,
      redirectOrigin: `${origin}`,
    }, { requireAuth: false });
    return;
  } catch (e) {
    console.warn("[auth-security] send_password_reset backend fallback direct:", e);
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${origin}/auth/reset-password`,
  });
  if (error) throw error;
}

export async function getSecurityQuestionsForEmail(email: string) {
  try {
    const result = await invokeAuthSecurity<{ questions: { id: string; question_text: string }[] }>(
      "get_security_questions",
      { email: email.trim().toLowerCase() },
      { requireAuth: false },
    );
    return result.questions ?? [];
  } catch {
    return [];
  }
}

export async function sendLoginSmsOtp(options?: { preferEmail?: boolean; phone?: string }): Promise<OtpMeta> {
  const payload: Record<string, unknown> = {};
  if (options?.preferEmail) payload.preferEmail = true;
  if (options?.phone) payload.phone = options.phone;

  const result = await invokeAuthSecurity<{
    maskedPhone?: string;
    otpChannel?: "sms" | "email";
    expiresInSeconds: number;
    emailDelivered?: boolean;
    smsDelivered?: boolean;
    devOtp?: string;
  }>("send_sms_otp", payload);

  const meta: OtpMeta = {
    maskedPhone: result.maskedPhone,
    otpChannel: result.otpChannel ?? (result.maskedPhone ? "sms" : "email"),
    expiresInSeconds: result.expiresInSeconds ?? 120,
    sentAt: Date.now(),
    devOtp: result.devOtp,
  };
  setOtpMeta(meta);
  return meta;
}

export async function verifyLogin2FA(params: {
  mode: "sms" | "backup" | "totp";
  code: string;
  factorId?: string;
  challengeId?: string;
}): Promise<void> {
  if (params.mode === "totp" && params.factorId && params.challengeId) {
    const { error } = await supabase.auth.mfa.verify({
      factorId: params.factorId,
      challengeId: params.challengeId,
      code: params.code,
    });
    if (error) throw error;
    await invokeAuthSecurity("mark_totp_enrolled").catch(() => undefined);
  } else if (params.mode === "sms") {
    await invokeAuthSecurity("verify_sms_otp", { code: params.code });
  } else {
    await invokeAuthSecurity("verify_backup_code", { code: params.code });
  }
  clear2FAState();
}

export async function complete2FAAndRedirect(navigate: (opts: { to: string; replace?: boolean }) => void) {
  clear2FAState();
  navigate({ to: "/dashboard", replace: true });
}
