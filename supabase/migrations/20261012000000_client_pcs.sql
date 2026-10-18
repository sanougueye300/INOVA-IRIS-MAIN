CREATE TABLE IF NOT EXISTS public.client_pcs (
  id TEXT PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hostname TEXT NOT NULL,
  client_name TEXT NOT NULL,
  os TEXT NOT NULL CHECK (os IN ('windows', 'linux', 'macos')),
  ip TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'alert', 'isolated')),
  cpu INTEGER NOT NULL DEFAULT 0,
  ram INTEGER NOT NULL DEFAULT 0,
  version TEXT NOT NULL DEFAULT 'v4.14.5',
  last_seen TEXT NOT NULL DEFAULT 'À l''instant',
  wazuh_id TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_pcs_client_added
  ON public.client_pcs (client_id, added_at DESC);

ALTER TABLE public.client_pcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients and staff can read client PCs" ON public.client_pcs
  FOR SELECT TO authenticated USING (
    client_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyste') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Clients and staff can insert client PCs" ON public.client_pcs
  FOR INSERT TO authenticated WITH CHECK (
    client_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyste') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Clients and staff can update client PCs" ON public.client_pcs
  FOR UPDATE TO authenticated USING (
    client_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyste') OR
    public.has_role(auth.uid(), 'manager')
  ) WITH CHECK (
    client_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyste') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Clients and staff can delete client PCs" ON public.client_pcs
  FOR DELETE TO authenticated USING (
    client_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyste') OR
    public.has_role(auth.uid(), 'manager')
  );