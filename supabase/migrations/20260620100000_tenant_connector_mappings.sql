-- Multi-tenant SaaS — Mapping "identifiant externe" -> "organisation cliente"
-- En stack mutualisée (un seul Wazuh/TheHive/MISP hébergé par la plateforme),
-- chaque donnée synchronisée doit être routée vers la bonne organisation cliente.

-- 1. Table de correspondance
CREATE TABLE IF NOT EXISTS public.tenant_connector_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization TEXT NOT NULL REFERENCES public.clients(organization) ON DELETE CASCADE,
  connector TEXT NOT NULL CHECK (connector IN ('wazuh', 'thehive', 'misp', 'shuffle', 'iris')),
  -- Comment on reconnaît l'appartenance d'un enregistrement à ce client :
  --  wazuh   : 'agent_group' (groupe Wazuh) ou 'agent_name_prefix'
  --  thehive : 'thehive_org' (champ organisation du cas)
  --  misp    : 'misp_org' ou 'misp_tag'
  match_type TEXT NOT NULL,
  match_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connector, match_type, match_value)
);

CREATE INDEX IF NOT EXISTS idx_tcm_lookup
  ON public.tenant_connector_mappings(connector, match_type, match_value);
CREATE INDEX IF NOT EXISTS idx_tcm_org
  ON public.tenant_connector_mappings(organization);

ALTER TABLE public.tenant_connector_mappings ENABLE ROW LEVEL SECURITY;

-- Seuls les staff gèrent les mappings ; le service_role (Edge Functions) lit/écrit librement.
DROP POLICY IF EXISTS "Staff manage tenant mappings" ON public.tenant_connector_mappings;
CREATE POLICY "Staff manage tenant mappings" ON public.tenant_connector_mappings
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Service role tenant mappings" ON public.tenant_connector_mappings;
CREATE POLICY "Service role tenant mappings" ON public.tenant_connector_mappings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- NOTE : la colonne organization sur shuffle_runs et la policy d'isolation sur
-- thehive_cases ont été déplacées dans 20260700000000_soc_connectors_tables.sql
-- (qui crée ces deux tables), car cette migration-ci s'exécute AVANT et ces
-- tables n'existeraient pas encore ici.

COMMENT ON TABLE public.tenant_connector_mappings IS
  'Route les données des connecteurs mutualisés (Wazuh, TheHive, MISP...) vers la bonne organisation cliente.';
