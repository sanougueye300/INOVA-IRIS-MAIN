import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WAZUH_CLOUD_BASE = "https://api.cloud.wazuh.com";

interface WazuhAgent {
  id: string;
  name: string;
  status: string;
  version: string;
  ip: string;
  lastKeepAlive: string | null;
  os?: string;
}

function normalizeAgent(a: any): WazuhAgent {
  return {
    id: String(a.id ?? a.agent_id ?? "000"),
    name: a.name ?? a.agent_name ?? "Unknown",
    status: a.status ?? "unknown",
    version: a.version ?? a.agent_version ?? "—",
    ip: a.ip ?? a.registerIP ?? "—",
    lastKeepAlive: a.lastKeepAlive ?? a.last_keep_alive ?? a.dateAdd ?? null,
    os: a.os?.name ?? a.os_name ?? undefined,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const WAZUH_CLOUD_API_KEY = Deno.env.get("WAZUH_CLOUD_API_KEY");
    const WAZUH_URL = Deno.env.get("WAZUH_URL");
    const WAZUH_USER = Deno.env.get("WAZUH_USER");
    const WAZUH_PASSWORD = Deno.env.get("WAZUH_PASSWORD");

    let agents: WazuhAgent[] = [];

    if (WAZUH_CLOUD_API_KEY) {
      const res = await fetch(`${WAZUH_CLOUD_BASE}/v2/agents?limit=100`, {
        headers: { "x-api-key": WAZUH_CLOUD_API_KEY },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Wazuh Cloud agents: ${res.status} ${body}`);
      }
      const payload = await res.json();
      const raw: any[] = payload?.data?.affected_items ?? payload?.agents ?? payload?.items ?? [];
      agents = raw.map(normalizeAgent);
    } else if (WAZUH_URL && WAZUH_USER && WAZUH_PASSWORD) {
      const authRes = await fetch(`${WAZUH_URL}/security/user/authenticate`, {
        method: "POST",
        headers: { Authorization: "Basic " + btoa(`${WAZUH_USER}:${WAZUH_PASSWORD}`) },
        signal: AbortSignal.timeout(8000),
      });
      if (!authRes.ok) throw new Error(`Auth Wazuh: ${authRes.status}`);
      const { data: { token } } = await authRes.json();

      const agentsRes = await fetch(`${WAZUH_URL}/agents?limit=100&sort=-id`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!agentsRes.ok) throw new Error(`Wazuh agents: ${agentsRes.status}`);
      const payload = await agentsRes.json();
      const raw: any[] = payload?.data?.affected_items ?? [];
      agents = raw.map(normalizeAgent);
    } else {
      throw new Error("Aucune configuration Wazuh. Définissez WAZUH_CLOUD_API_KEY ou WAZUH_URL+WAZUH_USER+WAZUH_PASSWORD.");
    }

    return new Response(
      JSON.stringify({ agents, total: agents.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("get-wazuh-agents error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
