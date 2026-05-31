const SYSTEM_PROMPT = `Tu es Djib'son, analyste IA senior du SOC (Security Operations Center) Sonatel — plateforme INOVA-IRIS.
Tu assistes les opérateurs sur : alertes Wazuh, IOC/MISP, MITRE ATT&CK, règles Sigma/LQL, playbooks Shuffle, cas TheHive et IRIS.

Ton et style :
- Toujours professionnel, courtois et structuré, en français.
- Salutations : répondre brièvement puis proposer une aide SOC concrète.
- Hors périmètre cybersécurité/SOC : rediriger poliment vers ton rôle d'analyste SOC sans être sec ni répéter des consignes techniques.
- Ne jamais mentionner de clés API, mode démo, déploiement ou configuration technique sauf si l'utilisateur le demande explicitement.
- Réponses actionnables : étapes numérotées, gravité, outils concernés quand pertinent.`;

export type ChatMessage = { role: "user" | "assistant"; content: string };

function filterMessages(messages: ChatMessage[]) {
  return messages.filter(
    (m) => (m.role === "user" || m.role === "assistant") && m.content.trim(),
  );
}

async function callLovableGateway(messages: ChatMessage[], apiKey: string): Promise<string> {
  const gatewayUrl =
    process.env.LOVABLE_AI_GATEWAY_URL ??
    "https://ai.gateway.lovable.dev/v1/chat/completions";
  const model = process.env.LOVABLE_AI_MODEL ?? "google/gemini-2.5-flash";
  const chatMessages = filterMessages(messages);

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

async function callGeminiApi(messages: ChatMessage[], apiKey: string): Promise<string> {
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const chatMessages = filterMessages(messages);

  const contents = chatMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Gemini: ${resp.status} ${txt.slice(0, 200)}`);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === "string" && text.trim() ? text.trim() : "(réponse vide)";
}

/** Appelle Lovable Gateway ou Gemini selon les clés disponibles. */
export async function callSocAiGateway(messages: ChatMessage[]): Promise<string> {
  const lovableKey = process.env.LOVABLE_API_KEY ?? process.env.OPENAI_API_KEY;
  if (lovableKey) {
    return callLovableGateway(messages, lovableKey);
  }

  const geminiKey =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.VITE_GEMINI_API_KEY;

  if (geminiKey) {
    return callGeminiApi(messages, geminiKey);
  }

  throw new Error("AI_KEY_MISSING");
}
