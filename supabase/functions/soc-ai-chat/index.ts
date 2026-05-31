// Edge function: SOC AI assistant via Lovable AI Gateway (no API key required from user).
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey =
      Deno.env.get("LOVABLE_API_KEY") ??
      Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error(
        "LOVABLE_API_KEY manquant. Définissez le secret sur Supabase : npx supabase secrets set LOVABLE_API_KEY=...",
      );
    }

    const gatewayUrl =
      Deno.env.get("LOVABLE_AI_GATEWAY_URL") ??
      "https://ai.gateway.lovable.dev/v1/chat/completions";
    const model =
      Deno.env.get("LOVABLE_AI_MODEL") ?? "google/gemini-2.5-flash";
    const { messages = [] } = await req.json();
    const chatMessages = Array.isArray(messages)
      ? messages.filter(
          (m: { role?: string; content?: string }) =>
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string",
        )
      : [];

    const payload = {
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...chatMessages],
    };

    const resp = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      if (resp.status === 429) throw new Error("Trop de requêtes, réessayez dans un instant.");
      if (resp.status === 402) throw new Error("Crédits IA épuisés. Ajoutez des crédits à Lovable.");
      throw new Error(`Gateway IA: ${resp.status} ${txt}`);
    }

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content ?? "(réponse vide)";

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
