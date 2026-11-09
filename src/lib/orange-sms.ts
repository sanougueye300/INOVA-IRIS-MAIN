/**
 * Orange SMS Pro Sénégal — API JSON
 * Endpoint : POST https://api.orangesmspro.sn:8443/api/json
 *
 * Formule HMAC-SHA1 : HMAC_SHA1(token + flux_JSON + timestamp, clé_privée)
 * Les paramètres token, key et timestamp sont passés dans l'URL (query string).
 * Le corps de la requête est le payload JSON (Content-Type: application/json).
 */

export type OrangeSmsConfig = {
  login: string;
  /** Clé privée (API Key) — utilisée pour signer le HMAC */
  apiKey: string;
  /** Token — passé en query string et inclus dans le HMAC */
  token: string;
  /** Sujet/objet du message */
  subject: string;
  /** Signature/Sender ID validée sur le portail Orange */
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

const DEFAULT_BASE_URL = "https://api.orangesmspro.sn:8443/api/json";

/**
 * Normalise le numéro de téléphone pour l'API Orange SMS Pro Sénégal.
 * Format requis : indicatif international sans signe "+" (ex: 221770000000).
 */
export function formatOrangeRecipient(phone: string): string {
  if (!phone) return "";
  const digits = phone.trim().replace(/\D/g, "");

  // Déjà au format 221XXXXXXXXX (12 chiffres pour le Sénégal)
  if (digits.startsWith("221") && digits.length === 12) return digits;
  // Numéro local sénégalais à 9 chiffres (ex: 77 123 45 67)
  if (digits.length === 9) return `221${digits}`;
  // Numéro avec 0 initial (ex: 077 123 45 67)
  if (digits.length === 10 && digits.startsWith("0")) return `221${digits.slice(1)}`;
  return digits;
}

export function parseOrangeSmsConfig(value: unknown): OrangeSmsConfig | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Configuration Orange SMS invalide.");
  }

  const s = value as Record<string, unknown>;
  const login = s.orange_smspro_login;
  const apiKey = s.orange_smspro_api_key;
  const token = s.orange_smspro_token;
  const subject = s.orange_smspro_subject;
  const signature = s.orange_smspro_signature;
  const baseUrl = s.orange_smspro_base_url;

  if (
    typeof login !== "string" || !login ||
    typeof apiKey !== "string" || !apiKey ||
    typeof token !== "string" || !token ||
    typeof subject !== "string" || !subject ||
    typeof signature !== "string" || !signature
  ) {
    throw new Error("Configuration Orange SMS incomplète dans Supabase Vault.");
  }

  return { login, apiKey, token, subject, signature, baseUrl: typeof baseUrl === "string" ? baseUrl : undefined };
}

/**
 * Envoie un SMS via l'API JSON Orange SMS Pro Sénégal.
 *
 * Méthode : POST
 * URL     : {baseUrl}?token={TOKEN}&key={HMAC}&timestamp={TS}
 * Body    : JSON { messages: [{ signature, subject, content, recipients: [{id, value}] }] }
 * HMAC    : SHA1( token + JSON_body_string + timestamp,  clé_privée )
 */
export async function sendOrangeSms(
  config: OrangeSmsConfig,
  recipient: string,
  content: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrangeSmsResult> {
  const formattedRecipient = formatOrangeRecipient(recipient);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // ── 1. Construction du payload JSON ────────────────────────────────────────
  const payload = JSON.stringify({
    messages: [
      {
        signature: config.signature,
        subject: config.subject,
        content,
        recipients: [
          { id: "1", value: formattedRecipient },
        ],
      },
    ],
  });

  // ── 2. Génération HMAC-SHA1 : token + JSON_payload + timestamp ──────────────
  const msgToSign = `${config.token}${payload}${timestamp}`;

  let key: string;
  if (typeof process !== "undefined" && process.versions?.node) {
    const { createHmac } = await import("node:crypto");
    key = createHmac("sha1", config.apiKey).update(msgToSign).digest("hex");
  } else {
    const hmacKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(config.apiKey),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"],
    );
    const digest = await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(msgToSign));
    key = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // ── 3. Construction de l'URL avec les paramètres query ─────────────────────
  const baseUrl = (config.baseUrl?.trim() || DEFAULT_BASE_URL);
  const url = new URL(baseUrl);
  url.searchParams.set("token", config.token);
  url.searchParams.set("key", key);
  url.searchParams.set("timestamp", timestamp);

  // ── 4. Préparation de la requête POST ──────────────────────────────────────
  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: payload,
    signal: AbortSignal.timeout(30_000),
  };

  // Désactivation SSL pour certificats auto-signés Orange (Node.js uniquement)
  if (config.verifySSL === false && typeof process !== "undefined" && process.versions?.node) {
    try {
      const { Agent } = await import("undici");
      (requestInit as any).dispatcher = new Agent({
        connect: { rejectUnauthorized: false },
      });
    } catch {
      // continuer si non disponible
    }
  }

  // ── 5. Envoi de la requête ─────────────────────────────────────────────────
  const response = await fetchImpl(url.toString(), requestInit);
  const text = await response.text();

  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!response.ok) {
    const details = typeof body === "object" ? JSON.stringify(body) : text;
    throw new Error(`Orange SMS Pro a répondu avec le statut HTTP ${response.status}: ${details}`);
  }

  // ── 6. Vérification de la réponse Orange ──────────────────────────────────
  if (body && typeof body === "object") {
    // Vérifier format standard / legacy { STATUS: 1, message: "..." }
    const rootStatus = body.STATUS ?? body.status;
    if (rootStatus !== undefined && rootStatus !== 0 && rootStatus !== "0" && rootStatus !== "OK" && rootStatus !== 200 && rootStatus !== 100) {
      const reason = body.message || body.messageReason || body.error || JSON.stringify(body);
      throw new Error(`Orange SMS Pro a retourné une erreur (statut ${rootStatus}): ${reason}`);
    }

    // Vérifier tableau de réponses { responses: { response: [...] } } ou { response: [...] }
    const responseArr: any[] =
      body?.responses?.response ??
      body?.response ??
      (Array.isArray(body) ? body : []);

    for (const r of (Array.isArray(responseArr) ? responseArr : [])) {
      const sc = r?.status?.status_CODE ?? r?.status_code ?? r?.STATUS ?? r?.status;
      if (sc !== undefined && sc !== 100 && sc !== 200 && sc !== "OK" && sc !== 0) {
        const reason =
          r?.status?.status_TEXT ?? r?.status_text ?? r?.message ?? JSON.stringify(r);
        throw new Error(`Orange SMS Pro a retourné une erreur (statut ${sc}): ${reason}`);
      }
    }
  }

  // Extraction de l'ID de message
  const responseArr: any[] =
    body?.responses?.response ?? body?.response ?? (Array.isArray(body) ? body : []);
  const firstResponse = Array.isArray(responseArr) ? responseArr[0] : null;
  const messageId =
    body?.message_id ?? body?.messageId ??
    firstResponse?.message_ID ?? firstResponse?.message_id ??
    firstResponse?.messagedetail_ID ?? firstResponse?.messagedetail_id;

  return {
    sent: true,
    statusCode: response.status,
    response: body,
    messageId: messageId != null ? String(messageId) : undefined,
  };
}
