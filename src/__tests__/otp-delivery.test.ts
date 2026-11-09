import { describe, expect, it, vi } from "vitest";
import { deliverLoginOtp } from "@/lib/otp-delivery";

describe("deliverLoginOtp SMS-first delivery", () => {
  it("uses SMS as the primary channel and does not send a duplicate email", async () => {
    const sendSms = vi.fn().mockResolvedValue({ sent: true });
    const sendEmail = vi.fn().mockResolvedValue(true);

    const result = await deliverLoginOtp({
      code: "123456",
      phone: "+221771234567",
      email: "user@example.com",
      sendSms,
      sendEmail,
    });

    expect(result.otpChannel).toBe("sms");
    expect(result.smsDelivered).toBe(true);
    expect(result.emailDelivered).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("falls back to email when SMS fails", async () => {
    const sendSms = vi.fn().mockRejectedValue(new Error("provider unavailable"));
    const sendEmail = vi.fn().mockResolvedValue(true);

    const result = await deliverLoginOtp({
      code: "123456",
      phone: "+221771234567",
      email: "user@example.com",
      sendSms,
      sendEmail,
    });

    expect(result.otpChannel).toBe("email");
    expect(result.smsDelivered).toBe(false);
    expect(result.emailDelivered).toBe(true);
    expect(result.failureReason).toBeUndefined();
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("explains why login OTP delivery failed when neither channel is available", async () => {
    const sendSms = vi.fn().mockRejectedValue(new Error("Orange SMS Pro: signature invalide"));
    const sendEmail = vi.fn().mockResolvedValue(false);

    const result = await deliverLoginOtp({
      code: "123456",
      phone: "+221771234567",
      email: "user@example.com",
      sendSms,
      sendEmail,
    });

    expect(result.otpChannel).toBe("screen");
    expect(result.failureReason).toContain("Orange SMS Pro: signature invalide");
    expect(result.failureReason).toContain("RESEND_API_KEY");
  });
});
