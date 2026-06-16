import { describe, it, expect, beforeEach } from "vitest";
import {
  hashSecret,
  generateOtpCode,
  generateBackupCode,
  maskPhone,
} from "@/lib/auth-crypto";

// ─────────────────────────────────────────────────────────────────────────────
// hashSecret
// ─────────────────────────────────────────────────────────────────────────────
describe("hashSecret()", () => {
  it("retourne une chaîne hexadécimale de 64 caractères (SHA-256)", async () => {
    const hash = await hashSecret("monOTP123");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produit le même hash pour la même valeur (déterministe)", async () => {
    const h1 = await hashSecret("abc123");
    const h2 = await hashSecret("abc123");
    expect(h1).toBe(h2);
  });

  it("normalise : trim + lowercase avant de hacher", async () => {
    const h1 = await hashSecret("  ABC123  ");
    const h2 = await hashSecret("abc123");
    expect(h1).toBe(h2);
  });

  it("produit des hashs différents pour des valeurs différentes", async () => {
    const h1 = await hashSecret("code1");
    const h2 = await hashSecret("code2");
    expect(h1).not.toBe(h2);
  });

  it("gère une chaîne vide sans erreur", async () => {
    const hash = await hashSecret("");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("gère les caractères spéciaux et unicode", async () => {
    const hash = await hashSecret("🔐 Sécurité! @#$%");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateOtpCode
// ─────────────────────────────────────────────────────────────────────────────
describe("generateOtpCode()", () => {
  it("retourne un code à 6 chiffres", () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("est toujours padé avec des zéros si < 100000", () => {
    // On génère 50 codes et on vérifie qu'ils ont tous 6 chiffres
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      expect(code.length).toBe(6);
    }
  });

  it("reste dans la plage [000000, 999999]", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it("génère des codes différents (aléatoires)", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateOtpCode()));
    // Sur 20 générations, on devrait avoir au moins 5 valeurs uniques
    expect(codes.size).toBeGreaterThan(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateBackupCode
// ─────────────────────────────────────────────────────────────────────────────
describe("generateBackupCode()", () => {
  it("respecte le format IN-XXXX-XXXX", () => {
    const code = generateBackupCode();
    expect(code).toMatch(/^IN-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("génère des codes différents à chaque appel", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateBackupCode()));
    expect(codes.size).toBeGreaterThan(5);
  });

  it("commence toujours par 'IN-'", () => {
    for (let i = 0; i < 10; i++) {
      expect(generateBackupCode()).toMatch(/^IN-/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// maskPhone
// ─────────────────────────────────────────────────────────────────────────────
describe("maskPhone()", () => {
  it("masque un numéro sénégalais standard (221XXXXXXXXX)", () => {
    const masked = maskPhone("+221771234567");
    expect(masked).toBe("***4567");
  });

  it("masque un numéro avec espaces et tirets", () => {
    const masked = maskPhone("+33 6 12-34-56-78");
    expect(masked).toBe("***5678");
  });

  it("retourne '***' si le numéro a moins de 4 chiffres", () => {
    expect(maskPhone("12")).toBe("***");
    expect(maskPhone("")).toBe("***");
    expect(maskPhone("abc")).toBe("***");
  });

  it("fonctionne avec un numéro déjà numérique", () => {
    const masked = maskPhone("0612345678");
    expect(masked).toBe("***5678");
  });

  it("préserve exactement les 4 derniers chiffres", () => {
    expect(maskPhone("1234567890")).toBe("***7890");
    expect(maskPhone("9999")).toBe("***9999");
  });
});
