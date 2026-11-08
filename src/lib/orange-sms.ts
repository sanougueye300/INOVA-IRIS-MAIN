export type OrangeSmsConfig = {
  login: string;
  apiKey: string;
  token: string;
  subject: string;
  signature: string;
  baseUrl?: string;
  verifySSL?: boolean;
};

export type OrangeSmsResult = {
  sent: true;
  statusCode: number;
  response?: any;
  messageId?: string;
};

const DEFAULT_BASE_URL = "https://api.orangesmspro.sn:8443/api";

/**
 * Normalise le numéro de téléphone pour l'API Orange SMS Pro Sénégal.
 * Format requis : indicatif international sans signe "+" (ex: 221770000000).
 */
export function formatOrangeRecipient(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.trim();
  const digits = cleaned.replace(/\D/g, "");

  // Si le numéro commence déjà par 221 (Sénégal)
  if (digits.startsWith("221")) {
    return digits;
  }
  // Numéro local sénégalais à 9 chiffres (ex: 77 123 45 67)
  if (digits.length === 9) {
    return `221${digits}`;
  }
  // Numéro avec 0 initial (ex: 077 123 45 67)
  if (digits.length === 10 && digits.startsWith("0")) {
    return `221${digits.slice(1)}`;
  }
  return digits;
}

export function parseOrangeSmsConfig(value: unknown): OrangeSmsConfig | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Configuration Orange SMS invalide.");
  }

  const settings = value as Record<string, unknown>;
  const login = settings.orange_smspro_login;
  const apiKey = settings.orange_smspro_api_key;
  const token = settings.orange_smspro_token;
  const subject = settings.orange_smspro_subject;
  const signature = settings.orange_smspro_signature;
  const baseUrl = settings.orange_smspro_base_url;

  if (
    typeof login !== "string" || !login ||
    typeof apiKey !== "string" || !apiKey ||
    typeof token !== "string" || !token ||
    typeof subject !== "string" || !subject ||
    typeof signature !== "string" || !signature
  ) {
    throw new Error("Configuration Orange SMS incomplète dans Supabase Vault.");
  }
  if (baseUrl !== undefined && typeof baseUrl !== "string") {
    throw new Error("URL de l'API Orange SMS invalide.");
  }
  if (typeof baseUrl === "string" && baseUrl.trim()) {
    try {
      if (new URL(baseUrl).protocol !== "https:") throw new Error();
    } catch {
      throw new Error("L'URL de l'API Orange SMS doit être une URL HTTPS valide.");
    }
  }

  return {
    login,
    apiKey,
    token,
    subject,
    signature,
    baseUrl,
  };
}

/**
 * Envoie un SMS via l'API Orange SMS Pro Sénégal avec signature dynamique HMAC-SHA1
 * et authentification HTTP Basic (login:token).
 */
export async function sendOrangeSms(
  config: OrangeSmsConfig,
  recipient: string,
  content: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrangeSmsResult> {
  const formattedRecipient = formatOrangeRecipient(recipient);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = `${config.token}${config.subject}${config.signature}${formattedRecipient}${content}${timestamp}`;

  const hmacKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(config.apiKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(message));
  const key = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");

  const url = new URL(config.baseUrl?.trim() || DEFAULT_BASE_URL);
  url.search = new URLSearchParams({
    token: config.token,
    subject: config.subject,
    signature: config.signature,
    recipient: formattedRecipient,
    content,
    timestamp,
    key,
  }).toString();

  const credentials = `${config.login}:${config.token}`;
  const authHeader = typeof Buffer !== "undefined"
    ? Buffer.from(credentials).toString("base64")
    : btoa(credentials);

  const requestInit: RequestInit = {
    method: "GET",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(30_000),
  };

  // En environnement Node.js, supporter verifySSL = false (comme en PHP) pour les certificats auto-signés
  if (config.verifySSL === false && typeof process !== "undefined" && process.versions?.node) {
    try {
      const { Agent } = await import("undici");
      (requestInit as any).dispatcher = new Agent({
        connect: { rejectUnauthorized: false },
      });
    } catch {
      // Ignorer si undici n'est pas importable
    }
  }

  const response = await fetchImpl(url, requestInit);

  const text = await response.text();
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!response.ok) {
    const errorDetails = typeof body === "object" ? JSON.stringify(body) : text;
    throw new Error(`Orange SMS Pro a répondu avec le statut HTTP ${response.status}: ${errorDetails}`);
  }

  // Vérification de la réponse logique Orange SMS Pro (STATUS === 0 pour succès)
  if (body && typeof body === "object") {
    const statusCode = body.STATUS ?? body.status;
    if (statusCode !== undefined && statusCode !== 0 && statusCode !== "0" && statusCode !== "OK" && statusCode !== 200) {
      const reason = body.message || body.messageReason || body.error || JSON.stringify(body);
      throw new Error(`Orange SMS Pro a retourné une erreur (statut ${statusCode}): ${reason}`);
    }
  }

  const messageId = body?.message_id ?? body?.messageId ?? body?.messagedetail_id;

  return {
    sent: true,
    statusCode: response.status,
    response: body,
    messageId: messageId ? String(messageId) : undefined,
  };
}
