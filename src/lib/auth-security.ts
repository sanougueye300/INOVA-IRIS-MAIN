import { supabase } from "@/integrations/supabase/client";
import { generateBackupCode, hashSecret } from "./auth-crypto";

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
const VERIFIED_2FA_KEY = "soc-2fa-verified";

export function is2FAVerified(): boolean {
  return typeof window !== "undefined" && sessionStorage.getItem(VERIFIED_2FA_KEY) === "true";
}

/**
 * Statut d'activation du 2FA.
 * Activé par défaut pour la sécurité SOC Sonatel.
 * Pour le désactiver temporairement : définir VITE_ENABLE_2FA="false" dans le fichier .env
 */
export const IS_2FA_ENABLED: boolean =
  typeof import.meta === "undefined" || import.meta.env?.VITE_ENABLE_2FA !== "false";

export type OtpMeta = {
  maskedPhone?: string;
  otpChannel?: "sms" | "email";
  expiresInSeconds: number;
  sentAt: number;
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
  sessionStorage.removeItem("soc-fallback-otp");
  sessionStorage.removeItem(VERIFIED_2FA_KEY);
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
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
    if (error) {
      const message = error.message ?? String(error);
      const isNetworkOrUnavailable =
        message.includes("Failed to send") ||
        message.includes("FunctionsFetchError") ||
        message.includes("Failed to fetch");
      if (!isNetworkOrUnavailable) throw error;
      console.warn("[auth-security] Edge Function réponse:", message);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isNetworkOrUnavailable =
      msg.includes("Failed to send") ||
      msg.includes("FunctionsFetchError") ||
      msg.includes("Failed to fetch");
    if (!isNetworkOrUnavailable) throw e;
    console.warn("[auth-security] Edge function indisponible:", msg);
  }

  throw new Error("Services de sécurité indisponibles. Vérifiez la connexion au serveur, puis réessayez.");
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
  }>("send_sms_otp", payload);

  const meta: OtpMeta = {
    maskedPhone: result.maskedPhone,
    otpChannel: result.otpChannel ?? (result.maskedPhone ? "sms" : "email"),
    expiresInSeconds: result.expiresInSeconds ?? 120,
    sentAt: Date.now(),
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
  sessionStorage.removeItem(PENDING_2FA_KEY);
  sessionStorage.removeItem(OTP_META_KEY);
  sessionStorage.removeItem("soc-fallback-otp");
  sessionStorage.setItem(VERIFIED_2FA_KEY, "true");
  navigate({ to: "/dashboard", replace: true });
}
