import { otpEmailHtml, otpSmsMessage } from "./auth-email-templates";

export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (digits.startsWith("221") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 9) return `+221${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `+221${digits.slice(1)}`;
  return trimmed;
}

export type OtpDeliveryResult = {
  otpChannel: "sms" | "email" | "screen";
  smsDelivered: boolean;
  emailDelivered: boolean;
};

type DeliverOtpParams = {
  code: string;
  phone?: string | null;
  email: string;
  fullName?: string | null;
  sendSms: (phone: string, message: string) => Promise<{ sent: boolean; dev?: boolean }>;
  sendEmail: (to: string, subject: string, html: string) => Promise<boolean>;
  expiresMinutes?: number;
};

/** Envoie l'OTP par SMS, puis par e-mail si aucun SMS n'a été confirmé. */
export async function deliverLoginOtp(params: DeliverOtpParams): Promise<OtpDeliveryResult> {
  const { code, phone, email, fullName, sendSms, sendEmail, expiresMinutes = 2 } = params;
  const message = otpSmsMessage(code, expiresMinutes);
  const normalizedPhone = phone?.trim() ? normalizePhone(phone) : null;

  let smsDelivered = false;
  let emailDelivered = false;

  if (normalizedPhone) {
    try {
      const sms = await sendSms(normalizedPhone, message);
      smsDelivered = sms.sent && !sms.dev;
    } catch (err) {
      console.warn("[otp-delivery] SMS échoué:", err instanceof Error ? err.message : err);
    }
  }

  if (email && !smsDelivered) {
    try {
      const html = otpEmailHtml({ code, userEmail: email, fullName, expiresMinutes });
      emailDelivered = await sendEmail(email, "Code OTP de connexion — INOVA-IRIS", html);
    } catch (err) {
      console.warn("[otp-delivery] E-mail échoué:", err instanceof Error ? err.message : err);
    }
  }

  let otpChannel: "sms" | "email" | "screen" = "screen";
  if (smsDelivered) otpChannel = "sms";
  else if (emailDelivered) otpChannel = "email";

  return { otpChannel, smsDelivered, emailDelivered };
}
