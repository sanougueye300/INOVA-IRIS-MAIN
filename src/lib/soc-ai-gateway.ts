const SYSTEM_PROMPT = `Tu es l'analyste IA du SOC (Security Operations Center) de Sonatel.
Tu aides les opérateurs à comprendre les alertes Wazuh, les IOC, MITRE ATT&CK,
les règles de détection, les workflows Shuffle/TheHive/MISP/VirusTotal.
Réponds en français, structuré, concis, professionnel. Donne des étapes
de remédiation concrètes quand pertinent.`;

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function callSocAiGateway(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY ?? process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY_MISSING");
  }

  const gatewayUrl =
    process.env.LOVABLE_AI_GATEWAY_URL ??
    "https://ai.gateway.lovable.dev/v1/chat/completions";
  const model = process.env.LOVABLE_AI_MODEL ?? "google/gemini-2.5-flash";

  const chatMessages = messages.filter(
    (m) => (m.role === "user" || m.role === "assistant") && m.content.trim(),
  );

  const resp = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...chatMessages],
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    if (resp.status === 429) throw new Error("Trop de requêtes, réessayez dans un instant.");
    if (resp.status === 402) throw new Error("Crédits IA épuisés.");
    throw new Error(`Gateway IA: ${resp.status} ${txt.slice(0, 200)}`);
  }

  const data = await resp.json();
  return data?.choices?.[0]?.message?.content?.trim() || "(réponse vide)";
}
