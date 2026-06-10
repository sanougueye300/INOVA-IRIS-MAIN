import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SHUFFLE_URL = Deno.env.get("SHUFFLE_URL");
    const SHUFFLE_API_KEY = Deno.env.get("SHUFFLE_API_KEY");
    if (!SHUFFLE_URL || !SHUFFLE_API_KEY) {
      throw new Error("Variables SHUFFLE_URL/SHUFFLE_API_KEY manquantes");
    }

    // Récupérer les workflows Shuffle
    const workflowsRes = await fetch(`${SHUFFLE_URL}/api/v1/workflows`, {
      headers: { Authorization: `Bearer ${SHUFFLE_API_KEY}` },
    });
    if (!workflowsRes.ok) throw new Error(`Shuffle workflows: ${workflowsRes.status}`);
    const workflows: any[] = await workflowsRes.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let imported = 0;

    for (const wf of workflows.slice(0, 20)) {
      // Récupérer les exécutions récentes de chaque workflow
      try {
        const execRes = await fetch(
          `${SHUFFLE_URL}/api/v1/workflows/${wf.id}/executions?limit=10`,
          { headers: { Authorization: `Bearer ${SHUFFLE_API_KEY}` } },
        );
        if (!execRes.ok) continue;
        const execs: any[] = await execRes.json();

        for (const exec of execs) {
          const row = {
            external_id: String(exec.execution_id ?? exec.id),
            workflow_id: String(wf.id),
            workflow_name: wf.name ?? "Workflow sans nom",
            status: (exec.status ?? "unknown").toLowerCase(),
            started_at: exec.start_executed
              ? new Date(Number(exec.start_executed) * 1000).toISOString()
              : new Date().toISOString(),
            duration_sec: exec.execution_duration ?? 0,
            raw_data: exec,
          };

          const { error } = await supabase
            .from("shuffle_runs")
            .upsert(row, { onConflict: "external_id" });
          if (!error) imported++;
        }
      } catch (_) {
        // Continuer même si un workflow échoue
      }
    }

    return new Response(JSON.stringify({ imported, workflows: workflows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-shuffle-runs error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
