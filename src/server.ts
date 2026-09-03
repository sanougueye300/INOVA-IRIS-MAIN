import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { callSocAiGateway, type ChatMessage } from "./lib/soc-ai-gateway";
import { handleAuthSecurityRequest, type AuthSecurityAction } from "./lib/auth-security-handlers";

const AI_API_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

async function handleAuthSecurityApiRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: AI_API_CORS });
  }

  try {
    const body = (await request.json()) as { action?: AuthSecurityAction } & Record<string, unknown>;
    const action = body.action;
    if (!action) {
      return Response.json({ error: "Action requise" }, { status: 400, headers: AI_API_CORS });
    }
    const { action: _a, ...payload } = body;
    const result = await handleAuthSecurityRequest(action, payload, request.headers.get("Authorization"));
    return Response.json(result, { headers: AI_API_CORS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return Response.json({ error: message }, { status: 400, headers: AI_API_CORS });
  }
}

async function handleSocAiChatRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: AI_API_CORS });
  }

  try {
    const body = (await request.json()) as { messages?: ChatMessage[] };
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const reply = await callSocAiGateway(messages);
    return Response.json({ reply }, { headers: AI_API_CORS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return Response.json({ error: message }, { status: 500, headers: AI_API_CORS });
  }
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

async function handlePaytechCheckoutRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: AI_API_CORS });
  }

  try {
    const body = (await request.json()) as Record<string, any>;
    const {
      offerId,
      offerName,
      amount,
      currency = "XOF",
      email,
      fullName,
      phone,
      companyName,
      targetPayment,
      originUrl,
    } = body;

    const apiKey = process.env.PAYTECH_API_KEY || process.env.VITE_PAYTECH_API_KEY || "93e4fd002cc03fd97b88fb11d696f5644bea04cab90f8f4180f3de8451b5400d";
    const apiSecret = process.env.PAYTECH_SECRET_KEY || process.env.VITE_PAYTECH_SECRET_KEY || "b7ed28b0eb915faaf4a38df8a6aad4237554aed0c386c6f88d9baf145c72d741";
    const configuredEnv = process.env.VITE_PAYTECH_ENV || process.env.PAYTECH_ENV || "test";

    const refCommand = `INV-SOC-${(offerId || "PLAN").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)}-${Date.now()}`;
    const origin = originUrl || request.headers.get("origin") || "https://inova-iris-main2.vercel.app";

    // PayTech EXIGE impérativement que ipn_url, success_url et cancel_url commencent par https://
    const httpsOrigin = origin.startsWith("https://")
      ? origin
      : "https://inova-iris-main2.vercel.app";

    const ipnUrl = `${httpsOrigin}/api/paytech-ipn`;
    const localParam = !origin.startsWith("https://") ? `&local_origin=${encodeURIComponent(origin)}` : "";

    const payload = {
      item_name: `Abonnement SOC — ${offerName || offerId}`,
      item_price: Number(amount) || 100000,
      currency: (currency || "XOF").toUpperCase(),
      ref_command: refCommand,
      command_name: `Abonnement SOC INOVA-IRIS — ${companyName || email}`,
      custom_field: JSON.stringify({ offerId, offerName, email, fullName, companyName, phone }),
      success_url: `${httpsOrigin}/?payment_status=success&ref=${refCommand}&plan=${encodeURIComponent(offerId)}${localParam}`,
      cancel_url: `${httpsOrigin}/?payment_status=cancel&ref=${refCommand}${localParam}`,
      ipn_url: ipnUrl,
      env: configuredEnv === "prod" ? "prod" : "test",
    };

    console.log("Transmission requête à l'API PayTech SN:", payload);

    let resData: Record<string, any> = {};
    try {
      const paytechRes = await fetch("https://paytech.sn/api/payment/request-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "API_KEY": apiKey,
          "API_SECRET": apiSecret,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      resData = (await paytechRes.json()) as Record<string, any>;
      console.log("Réponse PayTech SN:", resData);
    } catch (netErr) {
      console.warn("Lenteur ou erreur réseau PayTech direct, tentative de repli:", netErr);
    }

    if (resData.success === 1 || resData.redirect_url || resData.token) {
      const redirectUrl = resData.redirect_url || resData.redirectUrl || `https://paytech.sn/payment/checkout/${resData.token}`;
      return Response.json(
        {
          success: true,
          token: resData.token,
          redirect_url: redirectUrl,
          ref_command: refCommand,
        },
        { headers: AI_API_CORS }
      );
    }

    // Si le compte en mode prod n'est pas activé, bascule automatique transparente sur env test
    if (resData.success === -1 || !resData.token) {
      console.warn("Tentative avec environnement test PayTech...");
      payload.env = "test";
      try {
        const testRes = await fetch("https://paytech.sn/api/payment/request-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "API_KEY": apiKey,
            "API_SECRET": apiSecret,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000),
        });
        const testData = (await testRes.json()) as Record<string, any>;
        if (testData.success === 1 || testData.redirect_url || testData.token) {
          const redirectUrl = testData.redirect_url || testData.redirectUrl || `https://paytech.sn/payment/checkout/${testData.token}`;
          return Response.json(
            {
              success: true,
              token: testData.token,
              redirect_url: redirectUrl,
              ref_command: refCommand,
              isTestMode: true,
            },
            { headers: AI_API_CORS }
          );
        }
      } catch (e) {
        console.warn("Erreur fallback test PayTech:", e);
      }
    }

    return Response.json(
      {
        success: false,
        error: resData.message || (Array.isArray(resData.error) ? resData.error.join(", ") : "Erreur PayTech"),
      },
      { status: 400, headers: AI_API_CORS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return Response.json({ success: false, error: message }, { status: 500, headers: AI_API_CORS });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/soc-ai-chat") {
      return handleSocAiChatRequest(request);
    }
    if (pathname === "/api/auth-security") {
      return handleAuthSecurityApiRequest(request);
    }
    if (pathname === "/api/paytech-checkout") {
      return handlePaytechCheckoutRequest(request);
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
