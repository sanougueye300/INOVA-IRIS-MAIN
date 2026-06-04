const PEPPER = "inova-iris-soc-v1";

export async function hashSecret(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase().normalize("NFKC");
  const data = new TextEncoder().encode(`${PEPPER}:${normalized}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateOtpCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

export function generateBackupCode(): string {
  const part = () =>
    crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().slice(0, 4);
  return `IN-${part()}-${part()}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}
