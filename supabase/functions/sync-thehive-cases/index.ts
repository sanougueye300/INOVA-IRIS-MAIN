import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const THEHIVE_URL = Deno.env.get("THEHIVE_URL");
    const THEHIVE_API_KEY = Deno.env.get("THEHIVE_API_KEY");
    if (!THEHIVE_URL || !THEHIVE_API_KEY) {
      throw new Error("Variables THEHIVE_URL/THEHIVE_API_KEY manquantes");
    }

    // Récupérer les cas TheHive récents (triés par date de création décroissante)
    const res = await fetch(`${THEHIVE_URL}/api/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${THEHIVE_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: [
          { _name: "listCase" },
          { _name: "sort", _fields: [{ _createdAt: "desc" }] },
          { _name: "page", from: 0, to: 50 },
        ],
      }),
    });
    if (!res.ok) throw new Error(`TheHive query failed: ${res.status}`);
    const cases: any[] = await res.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Assurer que la table thehive_cases existe
    let imported = 0;
    for (const c of cases) {
      const row = {
        external_id: String(c._id ?? c.id),
        title: c.title ?? "Cas sans titre",
        description: (c.description ?? "").slice(0, 1000),
        severity: Number(c.severity ?? 2),
        status: (c.status ?? "open").toLowerCase(),
        stage: (c.stage ?? "open").toLowerCase(),
        case_type: c.tags?.join(", ") ?? null,
        assignee: c.assignee ?? null,
        organization: null,
        created_at_thehive: c._createdAt
          ? new Date(c._createdAt).toISOString()
          : new Date().toISOString(),
        closed_at_thehive: c._updatedAt && c.status === "Resolved"
          ? new Date(c._updatedAt).toISOString()
          : null,
        raw_data: c,
      };

      const { error } = await supabase
        .from("thehive_cases")
        .upsert(row, { onConflict: "external_id" });
      if (!error) imported++;
    }

    return new Response(JSON.stringify({ imported, total: cases.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-thehive-cases error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
