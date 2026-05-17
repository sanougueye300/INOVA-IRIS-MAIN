import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const WAZUH_URL = Deno.env.get("WAZUH_URL");
    const WAZUH_USER = Deno.env.get("WAZUH_USER");
    const WAZUH_PASSWORD = Deno.env.get("WAZUH_PASSWORD");
    if (!WAZUH_URL || !WAZUH_USER || !WAZUH_PASSWORD) {
      throw new Error("Variables WAZUH_URL/WAZUH_USER/WAZUH_PASSWORD manquantes");
    }

    // Auth Wazuh API
    const authRes = await fetch(`${WAZUH_URL}/security/user/authenticate`, {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(`${WAZUH_USER}:${WAZUH_PASSWORD}`) },
    });
    if (!authRes.ok) throw new Error(`Auth Wazuh échouée: ${authRes.status}`);
    const { data: { token } } = await authRes.json();

    // Récupérer les alertes récentes
    const alertsRes = await fetch(`${WAZUH_URL}/security/alerts?limit=100&sort=-timestamp`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!alertsRes.ok) throw new Error(`Wazuh alerts: ${alertsRes.status}`);
    const payload = await alertsRes.json();
    const items: any[] = payload?.data?.affected_items ?? payload?.hits?.hits?.map((h: any) => h._source) ?? [];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rows = items.map((it) => ({
      external_id: String(it.id ?? it._id ?? crypto.randomUUID()),
      title: it.rule?.description ?? it.description ?? "Alerte Wazuh",
      description: JSON.stringify(it.full_log ?? it.data ?? {}).slice(0, 500),
      severity: Number(it.rule?.level ?? 5),
      source: "wazuh",
      status: "new",
      agent_name: it.agent?.name ?? null,
      rule_id: String(it.rule?.id ?? ""),
      raw_data: it,
      detected_at: it.timestamp ?? new Date().toISOString(),
    }));

    let imported = 0;
    for (const row of rows) {
      const { error } = await supabase.from("alerts").upsert(row, { onConflict: "external_id" });
      if (!error) imported++;
    }

    return new Response(JSON.stringify({ imported, total: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-wazuh-alerts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});