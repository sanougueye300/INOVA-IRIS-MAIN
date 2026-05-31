// Edge function: SOC AI assistant (Lovable Gateway ou Gemini).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Tu es l'analyste IA du SOC (Security Operations Center) de Sonatel.
Tu aides les opérateurs à comprendre les alertes Wazuh, les IOC, MITRE ATT&CK,
les règles de détection, les workflows Shuffle/TheHive/MISP/VirusTotal.
Réponds en français, structuré, concis, professionnel. Donne des étapes
de remédiation concrètes quand pertinent.`;

async function callLovable(messages: { role: string; content: string }[], apiKey: string) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("LOVABLE_AI_MODEL") ?? "google/gemini-2.5-flash",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Gateway IA: ${resp.status} ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content ?? "(réponse vide)";
}

async function callGemini(messages: { role: string; content: string }[], apiKey: string) {
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const contents = messages.map((m) => ({
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
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "(réponse vide)";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages = [] } = await req.json();
    const chatMessages = Array.isArray(messages)
      ? messages.filter(
          (m: { role?: string; content?: string }) =>
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string",
        )
      : [];

    const lovableKey = Deno.env.get("LOVABLE_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
    const geminiKey =
      Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");

    let reply: string;
    if (lovableKey) {
      reply = await callLovable(chatMessages, lovableKey);
    } else if (geminiKey) {
      reply = await callGemini(chatMessages, geminiKey);
    } else {
      throw new Error(
        "Configurez LOVABLE_API_KEY ou GEMINI_API_KEY dans les secrets Supabase.",
      );
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
