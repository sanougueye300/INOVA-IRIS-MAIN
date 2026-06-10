-- Table thehive_cases : cas d'incidents synchronisés depuis TheHive 5
CREATE TABLE IF NOT EXISTS public.thehive_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'open',
  stage TEXT NOT NULL DEFAULT 'open',
  case_type TEXT,
  assignee TEXT,
  organization TEXT,
  created_at_thehive TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at_thehive TIMESTAMPTZ,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.thehive_cases ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_thehive_cases_status ON public.thehive_cases(status);
CREATE INDEX IF NOT EXISTS idx_thehive_cases_severity ON public.thehive_cases(severity DESC);
CREATE INDEX IF NOT EXISTS idx_thehive_cases_created ON public.thehive_cases(created_at_thehive DESC);

CREATE POLICY "Staff can view thehive cases" ON public.thehive_cases
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyste') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Service role can upsert thehive cases" ON public.thehive_cases
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER thehive_cases_updated_at BEFORE UPDATE ON public.thehive_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Table shuffle_runs : exécutions de workflows Shuffle SOAR
CREATE TABLE IF NOT EXISTS public.shuffle_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL,
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_sec INTEGER NOT NULL DEFAULT 0,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shuffle_runs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_shuffle_runs_status ON public.shuffle_runs(status);
CREATE INDEX IF NOT EXISTS idx_shuffle_runs_started ON public.shuffle_runs(started_at DESC);

CREATE POLICY "Staff can view shuffle runs" ON public.shuffle_runs
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyste') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Service role can upsert shuffle runs" ON public.shuffle_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER shuffle_runs_updated_at BEFORE UPDATE ON public.shuffle_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Index UNIQUE sur alerts.external_id (nécessaire pour les upserts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_external_id ON public.alerts(external_id)
  WHERE external_id IS NOT NULL;

-- Index UNIQUE sur iocs.external_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_iocs_external_id ON public.iocs(external_id)
  WHERE external_id IS NOT NULL;

-- Commentaires de documentation
COMMENT ON TABLE public.thehive_cases IS 'Cas d''incidents synchronisés depuis TheHive 5 via la Edge Function sync-thehive-cases';
COMMENT ON TABLE public.shuffle_runs IS 'Exécutions de workflows SOAR synchronisées depuis Shuffle via la Edge Function sync-shuffle-runs';
COMMENT ON TABLE public.alerts IS 'Alertes SIEM synchronisées depuis Wazuh via la Edge Function sync-wazuh-alerts';
COMMENT ON TABLE public.iocs IS 'Indicateurs de compromission synchronisés depuis MISP (enrichis VirusTotal) via sync-misp-iocs';
