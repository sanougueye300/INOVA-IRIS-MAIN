// Helpers multi-tenant partagés par les Edge Functions de synchronisation.
// En stack mutualisée, on route chaque enregistrement vers l'organisation cliente
// via la table public.tenant_connector_mappings.
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type Connector = "wazuh" | "thehive" | "misp" | "shuffle" | "iris";

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export interface TenantMapping {
  organization: string;
  match_type: string;
  match_value: string;
}

/**
 * Charge les mappings d'un connecteur, indexés par "match_type:match_value" (en minuscules).
 */
export async function loadMappings(
  supabase: SupabaseClient,
  connector: Connector,
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("tenant_connector_mappings")
    .select("organization, match_type, match_value")
    .eq("connector", connector);

  if (error) throw new Error(`loadMappings(${connector}): ${error.message}`);

  const map = new Map<string, string>();
  for (const m of (data ?? []) as TenantMapping[]) {
    map.set(`${m.match_type}:${m.match_value.toLowerCase()}`, m.organization);
  }
  return map;
}

/**
 * Résout l'organisation à partir d'une liste de candidats (type, valeur).
 * Renvoie la première correspondance trouvée, sinon null (visible staff seulement).
 */
export function resolveOrg(
  mappings: Map<string, string>,
  candidates: Array<{ type: string; value: string | null | undefined }>,
): string | null {
  for (const c of candidates) {
    if (!c.value) continue;
    const org = mappings.get(`${c.type}:${String(c.value).toLowerCase()}`);
    if (org) return org;
  }
  return null;
}
