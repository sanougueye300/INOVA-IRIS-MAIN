import { otpEmailHtml, otpSmsMessage } from "./email-templates.ts";
import { normalizePhone } from "./user-provisioning.ts";

export type OtpDeliveryResult = {
  otpChannel: "sms" | "email" | "screen";
  smsDelivered: boolean;
  emailDelivered: boolean;
  failureReason?: string;
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
  const failures: string[] = [];

  if (normalizedPhone) {
    try {
      const sms = await sendSms(normalizedPhone, message);
      smsDelivered = sms.sent && !sms.dev;
      if (!smsDelivered) {
        failures.push("Aucun fournisseur SMS n'a confirmé l'envoi (Orange SMS Pro/Vault ou Twilio).");
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn("[otp-delivery] SMS échoué:", reason);
      failures.push(`SMS : ${reason}`);
    }
  } else {
    failures.push("Aucun numéro de téléphone n'est enregistré.");
  }

  if (email && !smsDelivered) {
    try {
      const html = otpEmailHtml({ code, userEmail: email, fullName, expiresMinutes });
      emailDelivered = await sendEmail(email, "Code OTP de connexion — INOVA-IRIS", html);
      if (!emailDelivered) {
        failures.push("E-mail non envoyé : vérifiez RESEND_API_KEY et l'expéditeur côté serveur.");
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn("[otp-delivery] E-mail échoué:", reason);
      failures.push(`E-mail : ${reason}`);
    }
  } else if (!email) {
    failures.push("Aucune adresse e-mail n'est enregistrée.");
  }

  let otpChannel: "sms" | "email" | "screen" = "screen";
  if (smsDelivered) otpChannel = "sms";
  else if (emailDelivered) otpChannel = "email";

  return {
    otpChannel,
    smsDelivered,
    emailDelivered,
    failureReason: otpChannel === "screen" ? failures.join(" ") : undefined,
  };
}
