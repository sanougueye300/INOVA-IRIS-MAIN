import { defineEventHandler, readBody } from "h3";
import { callSocAiGateway } from "../../../src/lib/soc-ai-gateway";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{ messages?: { role: string; content: string }[] }>(event);
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const reply = await callSocAiGateway(
      messages.filter(
        (m): m is { role: "user" | "assistant"; content: string } =>
          (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
      ),
    );
    return { reply };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return { error: msg };
  }
});
