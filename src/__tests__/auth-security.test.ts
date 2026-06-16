import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  setPending2FA,
  isPending2FA,
  setOtpMeta,
  getOtpMeta,
  clear2FAState,
  type OtpMeta,
} from "@/lib/auth-security";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const mockOtpMeta: OtpMeta = {
  maskedPhone: "***4567",
  otpChannel: "sms",
  expiresInSeconds: 120,
  sentAt: Date.now(),
};

// ─────────────────────────────────────────────────────────────────────────────
// setPending2FA / isPending2FA
// ─────────────────────────────────────────────────────────────────────────────
describe("setPending2FA() / isPending2FA()", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("isPending2FA() retourne false par défaut (sessionStorage vide)", () => {
    expect(isPending2FA()).toBe(false);
  });

  it("setPending2FA(true) → isPending2FA() retourne true", () => {
    setPending2FA(true);
    expect(isPending2FA()).toBe(true);
  });

  it("setPending2FA(false) → isPending2FA() retourne false", () => {
    setPending2FA(true);
    setPending2FA(false);
    expect(isPending2FA()).toBe(false);
  });

  it("plusieurs appels successifs n'altèrent pas le résultat", () => {
    setPending2FA(true);
    setPending2FA(true);
    expect(isPending2FA()).toBe(true);
    setPending2FA(false);
    expect(isPending2FA()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// setOtpMeta / getOtpMeta
// ─────────────────────────────────────────────────────────────────────────────
describe("setOtpMeta() / getOtpMeta()", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("getOtpMeta() retourne null si rien n'est stocké", () => {
    expect(getOtpMeta()).toBeNull();
  });

  it("stocke et relit correctement l'OtpMeta complet", () => {
    setOtpMeta(mockOtpMeta);
    const result = getOtpMeta();
    expect(result).toEqual(mockOtpMeta);
  });

  it("conserve le canal 'sms'", () => {
    setOtpMeta({ ...mockOtpMeta, otpChannel: "sms" });
    expect(getOtpMeta()?.otpChannel).toBe("sms");
  });

  it("conserve le canal 'email'", () => {
    setOtpMeta({ ...mockOtpMeta, otpChannel: "email" });
    expect(getOtpMeta()?.otpChannel).toBe("email");
  });

  it("conserve le canal 'screen' (mode dev)", () => {
    setOtpMeta({ ...mockOtpMeta, otpChannel: "screen", devOtp: "123456" });
    const result = getOtpMeta();
    expect(result?.otpChannel).toBe("screen");
    expect(result?.devOtp).toBe("123456");
  });

  it("retourne null si le sessionStorage contient du JSON invalide", () => {
    sessionStorage.setItem("soc-2fa-otp-meta", "INVALID_JSON{{{");
    expect(getOtpMeta()).toBeNull();
  });

  it("écrase les métadonnées précédentes lors d'un second appel", () => {
    setOtpMeta({ ...mockOtpMeta, maskedPhone: "***1111" });
    setOtpMeta({ ...mockOtpMeta, maskedPhone: "***9999" });
    expect(getOtpMeta()?.maskedPhone).toBe("***9999");
  });

  it("préserve la valeur sentAt", () => {
    const now = Date.now();
    setOtpMeta({ ...mockOtpMeta, sentAt: now });
    expect(getOtpMeta()?.sentAt).toBe(now);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// clear2FAState
// ─────────────────────────────────────────────────────────────────────────────
describe("clear2FAState()", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("supprime l'état pending 2FA et l'OtpMeta en un seul appel", () => {
    setPending2FA(true);
    setOtpMeta(mockOtpMeta);

    clear2FAState();

    expect(isPending2FA()).toBe(false);
    expect(getOtpMeta()).toBeNull();
  });

  it("n'échoue pas si sessionStorage est déjà vide", () => {
    expect(() => clear2FAState()).not.toThrow();
  });

  it("après clear, un nouveau setPending2FA(true) fonctionne normalement", () => {
    setPending2FA(true);
    clear2FAState();
    setPending2FA(true);
    expect(isPending2FA()).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests d'expiration OTP
// ─────────────────────────────────────────────────────────────────────────────
describe("Logique d'expiration OTP", () => {
  it("détecte qu'un OTP est expiré si sentAt + expiresInSeconds < maintenant", () => {
    const expiredMeta: OtpMeta = {
      ...mockOtpMeta,
      sentAt: Date.now() - 200_000, // Il y a 200 secondes
      expiresInSeconds: 120,
    };
    setOtpMeta(expiredMeta);
    const meta = getOtpMeta()!;
    const isExpired = Date.now() > meta.sentAt + meta.expiresInSeconds * 1000;
    expect(isExpired).toBe(true);
  });

  it("détecte qu'un OTP est encore valide si sentAt est récent", () => {
    const freshMeta: OtpMeta = {
      ...mockOtpMeta,
      sentAt: Date.now() - 10_000, // Il y a 10 secondes
      expiresInSeconds: 120,
    };
    setOtpMeta(freshMeta);
    const meta = getOtpMeta()!;
    const isExpired = Date.now() > meta.sentAt + meta.expiresInSeconds * 1000;
    expect(isExpired).toBe(false);
  });
});
