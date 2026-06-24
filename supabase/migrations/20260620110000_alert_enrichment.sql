-- Résultat du playbook SOAR (soar-enrich-alert) stocké sur l'alerte.
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS enriched_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS risk_score       INTEGER,          -- 0-100
  ADD COLUMN IF NOT EXISTS verdict          TEXT,             -- 'malicious' | 'suspicious' | 'clean' | 'unknown'
  ADD COLUMN IF NOT EXISTS thehive_case_id  TEXT;             -- cas TheHive créé automatiquement

CREATE INDEX IF NOT EXISTS idx_alerts_verdict ON public.alerts(verdict);
CREATE INDEX IF NOT EXISTS idx_alerts_enriched ON public.alerts(enriched_at);

COMMENT ON COLUMN public.alerts.verdict IS
  'Verdict du playbook SOAR après corrélation VirusTotal + MISP.';
