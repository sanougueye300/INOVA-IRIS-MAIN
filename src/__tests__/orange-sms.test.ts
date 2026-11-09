import { describe, expect, it, vi } from "vitest";
import { formatOrangeRecipient, parseOrangeSmsConfig, sendOrangeSms } from "@/lib/orange-sms";

const config = {
  login: "orange-login",
  apiKey: "api-key",
  token: "access-token",
  subject: "INOVA",
  signature: "INOVA-IRIS",
  baseUrl: "https://sms.example.test/api/json",
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

  it("signs and sends the OTP using the Orange SMS Pro JSON POST format", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ STATUS: 0, message_id: "MSG12345" }), { status: 200 })
    );

    const result = await sendOrangeSms(config, "+221771234567", "Code OTP 123456", fetchMock);

    expect(result.sent).toBe(true);
    expect(result.messageId).toBe("MSG12345");

    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    const url = new URL(String(requestUrl));
    expect(url.origin + url.pathname).toBe(config.baseUrl);
    expect(url.searchParams.get("token")).toBe(config.token);
    expect(url.searchParams.get("key")).toBeTruthy();
    expect(url.searchParams.get("timestamp")).toBeTruthy();

    expect(requestInit?.method).toBe("POST");
    expect(new Headers(requestInit?.headers).get("content-type")).toBe("application/json");

    const body = JSON.parse(String(requestInit?.body));
    expect(body.messages[0].signature).toBe(config.signature);
    expect(body.messages[0].subject).toBe(config.subject);
    expect(body.messages[0].content).toBe("Code OTP 123456");
    expect(body.messages[0].recipients[0].value).toBe("221771234567");
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

  it("accepts Orange SMS Pro's nested status_code 100 success response", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          response: [{ status_code: 100, status_text: "Message envoyé", message_id: "MSG100" }],
        }),
        { status: 200 },
      ),
    );

    await expect(sendOrangeSms(config, "+221771234567", "Code OTP", fetchMock)).resolves.toMatchObject({
      sent: true,
      messageId: "MSG100",
    });
  });

  it("reports Orange SMS Pro's nested status_code errors", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          response: [{ status_code: 102, status_text: "Signature invalide" }],
        }),
        { status: 200 },
      ),
    );

    await expect(sendOrangeSms(config, "+221771234567", "Code OTP", fetchMock)).rejects.toThrow(
      "statut 102): Signature invalide",
    );
  });

  it("accepts Orange SMS Pro JSON API { responses: { response: [...] } } structure", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          responses: {
            response: [
              {
                message_ID: 9999,
                status: { status_CODE: 200, status_TEXT: "OK" },
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    await expect(sendOrangeSms(config, "771234567", "Code 123", fetchMock)).resolves.toMatchObject({
      sent: true,
      messageId: "9999",
    });
  });
});
