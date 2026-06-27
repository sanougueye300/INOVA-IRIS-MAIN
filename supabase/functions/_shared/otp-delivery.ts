import { otpEmailHtml, otpSmsMessage } from "./email-templates.ts";
import { normalizePhone } from "./user-provisioning.ts";

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

export async function deliverLoginOtp(params: DeliverOtpParams): Promise<OtpDeliveryResult> {
  const { code, phone, email, fullName, sendSms, sendEmail, expiresMinutes = 2 } = params;
  const message = otpSmsMessage(code, expiresMinutes);
  const normalizedPhone = phone?.trim() ? normalizePhone(phone) : null;

  let smsDelivered = false;
  let emailDelivered = false;

  if (normalizedPhone) {
    try {
      const sms = await sendSms(normalizedPhone, message);
      smsDelivered = !sms.dev;
    } catch (err) {
      console.warn("[otp-delivery] SMS échoué:", err instanceof Error ? err.message : err);
    }
  }

  if (email) {
    try {
      const html = otpEmailHtml({ code, userEmail: email, fullName, expiresMinutes });
      emailDelivered = await sendEmail(email, "Code OTP de connexion — INOVA-IRIS", html);
    } catch (err) {
      console.warn("[otp-delivery] E-mail échoué:", err instanceof Error ? err.message : err);
    }
  }

  let otpChannel: "sms" | "email" | "screen" = "screen";
  if (emailDelivered) otpChannel = "email";
  else if (smsDelivered) otpChannel = "sms";

  return { otpChannel, smsDelivered, emailDelivered };
}
