import { describe, expect, it, vi } from "vitest";
import { formatOrangeRecipient, parseOrangeSmsConfig, sendOrangeSms } from "@/lib/orange-sms";

const config = {
  login: "orange-login",
  apiKey: "api-key",
  token: "access-token",
  subject: "INOVA",
  signature: "INOVA-IRIS",
  baseUrl: "https://sms.example.test/api",
};

describe("Orange SMS Pro", () => {
  it("normalizes phone numbers to Senegal international MSISDN without '+'", () => {
    expect(formatOrangeRecipient("+221771234567")).toBe("221771234567");
    expect(formatOrangeRecipient("221771234567")).toBe("221771234567");
    expect(formatOrangeRecipient("771234567")).toBe("221771234567");
    expect(formatOrangeRecipient("0771234567")).toBe("221771234567");
    expect(formatOrangeRecipient("+221 77 123 45 67")).toBe("221771234567");
  });

  it("parses Vault settings without accepting an incomplete configuration", () => {
    expect(
      parseOrangeSmsConfig({
        orange_smspro_login: config.login,
        orange_smspro_api_key: config.apiKey,
        orange_smspro_token: config.token,
        orange_smspro_subject: config.subject,
        orange_smspro_signature: config.signature,
        orange_smspro_base_url: config.baseUrl,
      }),
    ).toEqual(config);
    expect(parseOrangeSmsConfig(null)).toBeNull();
    expect(() => parseOrangeSmsConfig({ orange_smspro_login: config.login })).toThrow(
      "Configuration Orange SMS incomplète",
    );
  });

  it("signs and sends the OTP using the Orange SMS Pro request format", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ STATUS: 0, message_id: "MSG12345" }), { status: 200 })
    );

    const result = await sendOrangeSms(config, "+221771234567", "Code OTP 123456", fetchMock);

    expect(result.sent).toBe(true);
    expect(result.messageId).toBe("MSG12345");

    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    const url = new URL(String(requestUrl));
    const timestamp = url.searchParams.get("timestamp");
    const expectedRecipient = "221771234567";
    const message = `${config.token}${config.subject}${config.signature}${expectedRecipient}Code OTP 123456${timestamp}`;
    const hmacKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(config.apiKey),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"],
    );
    const digest = await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(message));
    const expectedKey = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");

    expect(url.origin + url.pathname).toBe(config.baseUrl);
    expect(url.searchParams.get("key")).toBe(expectedKey);
    expect(url.searchParams.get("recipient")).toBe(expectedRecipient);
    expect(requestInit?.method).toBe("GET");
    expect(new Headers(requestInit?.headers).get("authorization")).toBe(
      `Basic ${btoa(`${config.login}:${config.token}`)}`,
    );
  });

  it("reports provider HTTP errors", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 503 }));

    await expect(sendOrangeSms(config, "+221771234567", "Code OTP", fetchMock)).rejects.toThrow(
      "statut HTTP 503",
    );
  });

  it("reports Orange SMS Pro logical errors when STATUS is not 0", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ STATUS: 1, message: "Token invalide ou expiré" }), { status: 200 })
    );

    await expect(sendOrangeSms(config, "221771234567", "Code OTP", fetchMock)).rejects.toThrow(
      "Token invalide ou expiré",
    );
  });
});
