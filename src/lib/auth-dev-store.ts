/**
 * Dev in-memory store when SUPABASE_SERVICE_ROLE_KEY is not configured.
 * Development only — not used in production on Vercel.
 */
import { generateBackupCode, hashSecret } from "./auth-crypto";

type DevOtp = { codeHash: string; expiresAt: number };
type DevBackup = { codeHash: string; used: boolean };

const devOtps = new Map<string, DevOtp>();
const devBackupCodes = new Map<string, DevBackup[]>();
const devSecurityByEmail = new Map<string, Map<string, string>>();
const devMfaSettings = new Map<string, { totpEnrolled: boolean; backupAt: string | null }>();

export const DEV_QUESTIONS = [
  { id: "dev-q1", question_text: "Quel était le nom de votre premier serveur d'administration SOC ?", sort_order: 1 },
  { id: "dev-q2", question_text: "Dans quelle ville avez-vous effectué votre première mission SOC ?", sort_order: 2 },
  { id: "dev-q3", question_text: "Quel est le nom de votre premier outil SIEM utilisé ?", sort_order: 3 },
  { id: "dev-q4", question_text: "Quel était le nom de votre premier manager SOC ?", sort_order: 4 },
];

export function isDevAuthMode(): boolean {
  if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
    return !key;
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  return !key;
}

export const devAuthStore = {
  async storeOtp(userId: string, code: string, ttlMs: number) {
    devOtps.set(userId, {
      codeHash: await hashSecret(code),
      expiresAt: Date.now() + ttlMs,
    });
  },

  async verifyOtp(userId: string, code: string): Promise<boolean> {
    const row = devOtps.get(userId);
    if (!row || Date.now() > row.expiresAt) return false;
    if ((await hashSecret(code)) !== row.codeHash) return false;
    devOtps.delete(userId);
    return true;
  },

  async setBackupCodes(userId: string, codes: string[]) {
    devBackupCodes.set(
      userId,
      await Promise.all(codes.map(async (c) => ({ codeHash: await hashSecret(c), used: false }))),
    );
    const cur = devMfaSettings.get(userId) ?? { totpEnrolled: false, backupAt: null };
    devMfaSettings.set(userId, { ...cur, backupAt: new Date().toISOString() });
  },

  async verifyBackup(userId: string, code: string): Promise<boolean> {
    const rows = devBackupCodes.get(userId) ?? [];
    const h = await hashSecret(code.trim().toUpperCase());
    const match = rows.find((r) => !r.used && r.codeHash === h);
    if (!match) return false;
    match.used = true;
    return true;
  },

  getBackupCount(userId: string) {
    return (devBackupCodes.get(userId) ?? []).filter((r) => !r.used).length;
  },

  async saveSecurityAnswers(email: string, answers: { questionId: string; answer: string }[]) {
    const map = new Map<string, string>();
    for (const a of answers) {
      map.set(a.questionId, await hashSecret(a.answer));
    }
    devSecurityByEmail.set(email.toLowerCase(), map);
  },

  getSecurityQuestionsForEmail(email: string) {
    const answers = devSecurityByEmail.get(email.toLowerCase());
    if (!answers?.size) return [];
    return DEV_QUESTIONS.filter((q) => answers.has(q.id)).map(({ id, question_text }) => ({
      id,
      question_text,
    }));
  },

  async verifySecurityAnswers(
    email: string,
    answers: { questionId: string; answer: string }[],
  ): Promise<boolean> {
    const stored = devSecurityByEmail.get(email.toLowerCase());
    if (!stored?.size) return false;
    for (const a of answers) {
      const hash = stored.get(a.questionId);
      if (!hash || hash !== (await hashSecret(a.answer))) return false;
    }
    return true;
  },

  listCatalog() {
    return DEV_QUESTIONS;
  },

  setTotpEnrolled(userId: string) {
    const cur = devMfaSettings.get(userId) ?? { totpEnrolled: false, backupAt: null };
    devMfaSettings.set(userId, { ...cur, totpEnrolled: true });
  },

  getMfaStatus(userId: string) {
    const s = devMfaSettings.get(userId);
    return {
      totpEnrolled: s?.totpEnrolled ?? false,
      backupCodesGeneratedAt: s?.backupAt ?? null,
    };
  },

  generateBackupCodesPlain(count = 8) {
    return Array.from({ length: count }, () => generateBackupCode());
  },
};
