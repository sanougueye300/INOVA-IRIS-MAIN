ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_scope TEXT NOT NULL DEFAULT 'staff',
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_audit_logs_scope_created
  ON public.audit_logs (actor_scope, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_client_created
  ON public.audit_logs (client_id, created_at DESC)
  WHERE actor_scope = 'client';

DROP POLICY IF EXISTS "Authenticated users can insert own audit events" ON public.audit_logs;
CREATE POLICY "Users insert audit events for their own scope" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND (
      (actor_scope = 'client' AND client_id = auth.uid() AND public.has_role(auth.uid(), 'client')) OR
      (actor_scope = 'staff' AND client_id IS NULL AND (
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'analyste') OR
        public.has_role(auth.uid(), 'manager')
      ))
    )
  );

DROP POLICY IF EXISTS "Clients read own audit events" ON public.audit_logs;
CREATE POLICY "Clients read own audit events" ON public.audit_logs
  FOR SELECT TO authenticated USING (
    actor_scope = 'client' AND client_id = auth.uid() AND user_id = auth.uid()
  );