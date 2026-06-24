import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ConnectorId = "wazuh" | "thehive" | "misp" | "virustotal" | "shuffle" | "iris";

interface CheckResult {
  id: ConnectorId;
  status: "online" | "offline" | "warning";
  latencyMs: number | null;
  message: string;
}

async function checkWazuh(): Promise<CheckResult> {
  const cloudKey = Deno.env.get("WAZUH_CLOUD_API_KEY");
  const url = Deno.env.get("WAZUH_URL");
  const user = Deno.env.get("WAZUH_USER");
  const pass = Deno.env.get("WAZUH_PASSWORD");

  // Wazuh Cloud prend priorité
  if (cloudKey) {
    const t0 = Date.now();
    try {
      const res = await fetch("https://api.cloud.wazuh.com/v2/info", {
        headers: { "x-api-key": cloudKey },
        signal: AbortSignal.timeout(8000),
      });
      const latencyMs = Date.now() - t0;
      if (res.ok) return { id: "wazuh", status: "online", latencyMs, message: `Cloud OK (${latencyMs}ms)` };
      return { id: "wazuh", status: "warning", latencyMs, message: `Cloud HTTP ${res.status}` };
    } catch (e) {
      return { id: "wazuh", status: "offline", latencyMs: null, message: e instanceof Error ? e.message : "Timeout" };
    }
  }

  // Fallback auto-hébergé
  if (!url || !user || !pass) {
    return { id: "wazuh", status: "offline", latencyMs: null, message: "Variables manquantes (WAZUH_CLOUD_API_KEY ou WAZUH_URL+WAZUH_USER+WAZUH_PASSWORD)" };
  }
  const t0 = Date.now();
  try {
    const res = await fetch(`${url}/security/user/authenticate`, {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(`${user}:${pass}`) },
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - t0;
    if (res.ok) return { id: "wazuh", status: "online", latencyMs, message: `OK (${latencyMs}ms)` };
    return { id: "wazuh", status: "warning", latencyMs, message: `HTTP ${res.status}` };
  } catch (e) {
    return { id: "wazuh", status: "offline", latencyMs: null, message: e instanceof Error ? e.message : "Timeout" };
  }
}

async function checkTheHive(): Promise<CheckResult> {
  const url = Deno.env.get("THEHIVE_URL");
  const key = Deno.env.get("THEHIVE_API_KEY");
  if (!url || !key) {
    return { id: "thehive", status: "offline", latencyMs: null, message: "Variables manquantes" };
  }
  const t0 = Date.now();
  try {
    const res = await fetch(`${url}/api/v1/status`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - t0;
    if (res.ok) return { id: "thehive", status: "online", latencyMs, message: `OK (${latencyMs}ms)` };
    return { id: "thehive", status: "warning", latencyMs, message: `HTTP ${res.status}` };
  } catch (e) {
    return { id: "thehive", status: "offline", latencyMs: null, message: e instanceof Error ? e.message : "Timeout" };
  }
}

async function checkMisp(): Promise<CheckResult> {
  const url = Deno.env.get("MISP_URL");
  const key = Deno.env.get("MISP_API_KEY");
  if (!url || !key) {
    return { id: "misp", status: "offline", latencyMs: null, message: "Variables manquantes" };
  }
  const t0 = Date.now();
  try {
    const res = await fetch(`${url}/servers/getVersion`, {
      headers: { Authorization: key, Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - t0;
    if (res.ok) return { id: "misp", status: "online", latencyMs, message: `OK (${latencyMs}ms)` };
    return { id: "misp", status: "warning", latencyMs, message: `HTTP ${res.status}` };
  } catch (e) {
    return { id: "misp", status: "offline", latencyMs: null, message: e instanceof Error ? e.message : "Timeout" };
  }
}

async function checkVirusTotal(): Promise<CheckResult> {
  const key = Deno.env.get("VIRUSTOTAL_API_KEY");
  if (!key) {
    return { id: "virustotal", status: "offline", latencyMs: null, message: "VIRUSTOTAL_API_KEY manquante" };
  }
  const t0 = Date.now();
  try {
    // Endpoint de quotas : la clé API sert d'identifiant utilisateur dans l'URL.
    const res = await fetch(`https://www.virustotal.com/api/v3/users/${key}/overall_quotas`, {
      headers: { "x-apikey": key },
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - t0;
    if (res.ok) {
      const data = await res.json();
      const daily = data?.data?.api_requests_daily?.user;
      const used = daily?.used ?? 0;
      const limit = daily?.allowed ?? 500;
      const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
      if (pct >= 90) {
        return { id: "virustotal", status: "warning", latencyMs, message: `Quota jour ${pct}% (${used}/${limit})` };
      }
      return { id: "virustotal", status: "online", latencyMs, message: `OK — quota jour ${used}/${limit}` };
    }
    if (res.status === 401) return { id: "virustotal", status: "offline", latencyMs, message: "Clé API invalide (401)" };
    return { id: "virustotal", status: "warning", latencyMs, message: `HTTP ${res.status}` };
  } catch (e) {
    return { id: "virustotal", status: "offline", latencyMs: null, message: e instanceof Error ? e.message : "Timeout" };
  }
}

async function checkShuffle(): Promise<CheckResult> {
  const url = Deno.env.get("SHUFFLE_URL");
  const key = Deno.env.get("SHUFFLE_API_KEY");
  if (!url || !key) {
    return { id: "shuffle", status: "offline", latencyMs: null, message: "Variables manquantes" };
  }
  const t0 = Date.now();
  try {
    const res = await fetch(`${url}/api/v1/health`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - t0;
    if (res.ok) return { id: "shuffle", status: "online", latencyMs, message: `OK (${latencyMs}ms)` };
    return { id: "shuffle", status: "warning", latencyMs, message: `HTTP ${res.status}` };
  } catch (e) {
    return { id: "shuffle", status: "offline", latencyMs: null, message: e instanceof Error ? e.message : "Timeout" };
  }
}

async function checkIris(): Promise<CheckResult> {
  const url = Deno.env.get("IRIS_URL");
  const key = Deno.env.get("IRIS_API_KEY");
  if (!url || !key) {
    return { id: "iris", status: "offline", latencyMs: null, message: "Variables manquantes" };
  }
  const t0 = Date.now();
  try {
    const res = await fetch(`${url}/api/ping`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - t0;
    if (res.ok) return { id: "iris", status: "online", latencyMs, message: `OK (${latencyMs}ms)` };
    return { id: "iris", status: "warning", latencyMs, message: `HTTP ${res.status}` };
  } catch (e) {
    return { id: "iris", status: "offline", latencyMs: null, message: e instanceof Error ? e.message : "Timeout" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const connector: ConnectorId | "all" = body?.connector ?? "all";

    let results: CheckResult[];

    if (connector === "all") {
      results = await Promise.all([
        checkWazuh(),
        checkTheHive(),
        checkMisp(),
        checkVirusTotal(),
        checkShuffle(),
        checkIris(),
      ]);
    } else {
      const checkers: Record<ConnectorId, () => Promise<CheckResult>> = {
        wazuh: checkWazuh,
        thehive: checkTheHive,
        misp: checkMisp,
        virustotal: checkVirusTotal,
        shuffle: checkShuffle,
        iris: checkIris,
      };
      const fn = checkers[connector];
      if (!fn) throw new Error(`Connecteur inconnu: ${connector}`);
      results = [await fn()];
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-connector error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
