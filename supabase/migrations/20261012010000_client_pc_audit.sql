ALTER TABLE public.client_pcs
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_client_pcs_active_client_added
  ON public.client_pcs (client_id, added_at DESC)
  WHERE deleted_at IS NULL;

DROP POLICY IF EXISTS "Authenticated users can insert own audit events" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert own audit events" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());