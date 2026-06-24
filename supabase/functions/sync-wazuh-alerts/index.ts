import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { loadMappings, resolveOrg, serviceClient } from "../_shared/tenant.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WAZUH_CLOUD_BASE = "https://api.cloud.wazuh.com";

async function fetchAlertsCloud(apiKey: string): Promise<any[]> {
  const res = await fetch(`${WAZUH_CLOUD_BASE}/v2/events/alerts?limit=100&sort=-timestamp`, {
    headers: { "x-api-key": apiKey },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Wazuh Cloud alerts: ${res.status} ${body}`);
  }
  const payload = await res.json();
  return payload?.data?.affected_items ?? payload?.alerts ?? payload?.items ?? [];
}

/** Récupère la liste des agents (id -> groupes Wazuh) pour router les alertes vers la bonne org. */
async function fetchAgentGroupsCloud(apiKey: string): Promise<Map<string, string[]>> {
  const res = await fetch(`${WAZUH_CLOUD_BASE}/v2/agents?limit=500`, {
    headers: { "x-api-key": apiKey },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return new Map();
  const payload = await res.json();
  const raw: any[] = payload?.data?.affected_items ?? payload?.agents ?? payload?.items ?? [];
  return buildAgentGroupMap(raw);
}

async function authSelfHosted(url: string, user: string, pass: string): Promise<string> {
  const authRes = await fetch(`${url}/security/user/authenticate`, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${user}:${pass}`) },
    signal: AbortSignal.timeout(8000),
  });
  if (!authRes.ok) throw new Error(`Auth Wazuh: ${authRes.status}`);
  const { data: { token } } = await authRes.json();
  return token;
}

async function fetchAlertsSelfHosted(url: string, token: string): Promise<any[]> {
  const alertsRes = await fetch(`${url}/security/alerts?limit=100&sort=-timestamp`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!alertsRes.ok) throw new Error(`Wazuh alerts: ${alertsRes.status}`);
  const payload = await alertsRes.json();
  return payload?.data?.affected_items ?? payload?.hits?.hits?.map((h: any) => h._source) ?? [];
}

async function fetchAgentGroupsSelfHosted(url: string, token: string): Promise<Map<string, string[]>> {
  const res = await fetch(`${url}/agents?limit=500&select=id,group`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return new Map();
  const payload = await res.json();
  return buildAgentGroupMap(payload?.data?.affected_items ?? []);
}

function buildAgentGroupMap(raw: any[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const a of raw) {
    const id = String(a.id ?? a.agent_id ?? "");
    if (!id) continue;
    const groups: string[] = Array.isArray(a.group) ? a.group : (a.group ? [a.group] : []);
    map.set(id, groups);
  }
  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const WAZUH_CLOUD_API_KEY = Deno.env.get("WAZUH_CLOUD_API_KEY");
    const WAZUH_URL = Deno.env.get("WAZUH_URL");
    const WAZUH_USER = Deno.env.get("WAZUH_USER");
    const WAZUH_PASSWORD = Deno.env.get("WAZUH_PASSWORD");

    let items: any[];
    let agentGroups: Map<string, string[]>;

    if (WAZUH_CLOUD_API_KEY) {
      [items, agentGroups] = await Promise.all([
        fetchAlertsCloud(WAZUH_CLOUD_API_KEY),
        fetchAgentGroupsCloud(WAZUH_CLOUD_API_KEY),
      ]);
    } else if (WAZUH_URL && WAZUH_USER && WAZUH_PASSWORD) {
      const token = await authSelfHosted(WAZUH_URL, WAZUH_USER, WAZUH_PASSWORD);
      [items, agentGroups] = await Promise.all([
        fetchAlertsSelfHosted(WAZUH_URL, token),
        fetchAgentGroupsSelfHosted(WAZUH_URL, token),
      ]);
    } else {
      throw new Error("Aucune configuration Wazuh trouvée. Définissez WAZUH_CLOUD_API_KEY (Cloud) ou WAZUH_URL + WAZUH_USER + WAZUH_PASSWORD (auto-hébergé).");
    }

    const supabase = serviceClient();
    const mappings = await loadMappings(supabase, "wazuh");

    const rows = items.map((it) => {
      const agentId = String(it.agent?.id ?? "");
      const agentName = it.agent?.name ?? null;
      const groups = agentGroups.get(agentId) ?? [];

      // Route vers l'org : d'abord par groupe Wazuh, sinon par nom d'agent (préfixe).
      const organization = resolveOrg(mappings, [
        ...groups.map((g) => ({ type: "agent_group", value: g })),
        { type: "agent_name_prefix", value: agentName },
      ]);

      return {
        external_id: String(it.id ?? it._id ?? crypto.randomUUID()),
        title: it.rule?.description ?? it.description ?? "Alerte Wazuh",
        description: JSON.stringify(it.full_log ?? it.data ?? {}).slice(0, 500),
        severity: Number(it.rule?.level ?? 5),
        source: "wazuh",
        status: "new",
        agent_name: agentName,
        rule_id: String(it.rule?.id ?? ""),
        organization,
        raw_data: it,
        detected_at: it.timestamp ?? new Date().toISOString(),
      };
    });

    let imported = 0;
    let unrouted = 0;
    for (const row of rows) {
      if (!row.organization) unrouted++;
      const { error } = await supabase.from("alerts").upsert(row, { onConflict: "external_id" });
      if (!error) imported++;
    }

    const mode = WAZUH_CLOUD_API_KEY ? "cloud" : "self-hosted";
    return new Response(JSON.stringify({ imported, total: rows.length, unrouted, mode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-wazuh-alerts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
