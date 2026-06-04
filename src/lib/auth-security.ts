import { supabase } from "@/integrations/supabase/client";

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

export type OtpMeta = {
  maskedPhone?: string;
  otpChannel?: "sms" | "email" | "screen";
  devOtp?: string;
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

  // 1. Local / Nitro API route
  try {
    const res = await fetch("/api/auth-security", { method: "POST", headers, body });
    if (res.ok) return (await res.json()) as T;
    if (res.status !== 404) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `Erreur serveur (${res.status})`);
    }
  } catch (e) {
    if (e instanceof Error && !e.message.includes("404")) throw e;
  }

  // 2. Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke("auth-security", {
      body: { action, ...payload, redirectOrigin: window.location.origin },
      headers: requireAuth ? { Authorization: headers.Authorization } : undefined,
    });

    if (error) throw new Error(error.message);
    if (data && typeof data === "object" && "error" in data) {
      throw new Error(String((data as { error: string }).error));
    }
    return data as T;
  } catch (e) {
    throw e instanceof Error ? e : new Error("Service de sécurité indisponible.");
  }
}

/** Envoie l'e-mail de récupération (branded via serveur, ou Supabase Auth en secours). */
export async function sendPasswordResetWithFallback(email: string): Promise<void> {
  try {
    await invokeAuthSecurity("send_password_reset", { email: email.trim().toLowerCase() }, { requireAuth: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const useFallback =
      msg.includes("Configuration Supabase") ||
      msg.includes("manquante") ||
      msg.includes("NOT_FOUND") ||
      msg.includes("Failed to send") ||
      msg.includes("FunctionsFetchError") ||
      msg.includes("indisponible");

    if (!useFallback) throw e;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  }
}

/** Charge les questions de secours ; retourne [] si le serveur n'est pas configuré. */
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

export async function sendLoginSmsOtp(options?: { preferEmail?: boolean }): Promise<OtpMeta & { devOtp?: string }> {
  const result = await invokeAuthSecurity<{
    maskedPhone?: string;
    otpChannel?: "sms" | "email" | "screen";
    expiresInSeconds: number;
    devOtp?: string;
    emailDelivered?: boolean;
    smsDelivered?: boolean;
  }>("send_sms_otp", options?.preferEmail ? { preferEmail: true } : {});

  const meta: OtpMeta = {
    maskedPhone: result.maskedPhone,
    otpChannel: result.otpChannel ?? (result.maskedPhone ? "sms" : "email"),
    devOtp: result.devOtp,
    expiresInSeconds: result.expiresInSeconds ?? 120,
    sentAt: Date.now(),
  };
  setOtpMeta(meta);
  return { ...meta, devOtp: result.devOtp };
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
