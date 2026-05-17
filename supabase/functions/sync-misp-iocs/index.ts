import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const levelMap: Record<string, string> = { "1": "high", "2": "medium", "3": "low", "4": "low" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const MISP_URL = Deno.env.get("MISP_URL");
    const MISP_API_KEY = Deno.env.get("MISP_API_KEY");
    const VT_API_KEY = Deno.env.get("VIRUSTOTAL_API_KEY");
    if (!MISP_URL || !MISP_API_KEY) throw new Error("Variables MISP_URL/MISP_API_KEY manquantes");

    // Récupérer les attributs MISP récents
    const res = await fetch(`${MISP_URL}/attributes/restSearch`, {
      method: "POST",
      headers: {
        Authorization: MISP_API_KEY,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit: 100, page: 1, returnFormat: "json", to_ids: 1 }),
    });
    if (!res.ok) throw new Error(`MISP error: ${res.status}`);
    const data = await res.json();
    const attrs: any[] = data?.response?.Attribute ?? [];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let imported = 0;
    for (const a of attrs) {
      // Optional VirusTotal enrichment for hashes/IPs/domains
      let vtTags: string[] = [];
      if (VT_API_KEY && ["md5", "sha1", "sha256", "ip-src", "ip-dst", "domain", "url"].includes(a.type)) {
        try {
          const path = a.type.startsWith("ip") ? `ip_addresses/${a.value}`
                     : a.type === "domain" ? `domains/${a.value}`
                     : a.type === "url" ? `urls/${btoa(a.value).replace(/=+$/, "")}`
                     : `files/${a.value}`;
          const vtRes = await fetch(`https://www.virustotal.com/api/v3/${path}`, {
            headers: { "x-apikey": VT_API_KEY },
          });
          if (vtRes.ok) {
            const vt = await vtRes.json();
            const stats = vt?.data?.attributes?.last_analysis_stats;
            if (stats?.malicious > 0) vtTags.push(`vt:malicious=${stats.malicious}`);
          }
        } catch (_) { /* ignore */ }
      }

      const row = {
        external_id: String(a.id ?? a.uuid),
        ioc_type: a.type,
        value: a.value,
        threat_name: a.Event?.info ?? null,
        threat_level: levelMap[a.Event?.threat_level_id ?? "3"] ?? "medium",
        source: "misp",
        tags: [...(a.Tag?.map((t: any) => t.name) ?? []), ...vtTags],
        first_seen: a.first_seen ?? null,
        last_seen: a.last_seen ?? new Date().toISOString(),
      };
      const { error } = await supabase.from("iocs").upsert(row, { onConflict: "external_id" });
      if (!error) imported++;
    }

    return new Response(JSON.stringify({ imported, total: attrs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-misp-iocs error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});