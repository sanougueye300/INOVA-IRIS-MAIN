-- Migration : create required tables for real authentication & security

-- 1. Table otp_tokens
CREATE TABLE IF NOT EXISTS public.otp_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- Stocké en clair pour le dev (ou hashé bcrypt/sha256 en prod)
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour requêtes rapides
CREATE INDEX IF NOT EXISTS idx_otp_tokens_user ON public.otp_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_expires ON public.otp_tokens(expires_at);

-- RLS : seul le service role peut y accéder
ALTER TABLE public.otp_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.otp_tokens
  FOR ALL USING (false);

-- 2. Alter profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS two_fa_method TEXT DEFAULT 'sms' CHECK (two_fa_method IN ('sms', 'totp', 'none')),
  ADD COLUMN IF NOT EXISTS backup_codes TEXT[],
  ADD COLUMN IF NOT EXISTS lock_pin_hash TEXT;

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own profile access" ON public.profiles;
CREATE POLICY "Own profile access" ON public.profiles
  FOR ALL USING (
    id = auth.uid() OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 3. Table rate_limit_events
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP ou user_id
  action TEXT NOT NULL,      -- "login", "otp_verify", "forgot_password"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit ON public.rate_limit_events(identifier, action, created_at);

-- Nettoyage auto des entrées > 1h
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits() 
RETURNS void 
LANGUAGE sql 
SECURITY DEFINER
AS $$
  DELETE FROM public.rate_limit_events WHERE created_at < NOW() - INTERVAL '1 hour';
$$;

-- 4. Table audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,        -- "login_success", "login_failed", "otp_sent", "password_reset", etc.
  metadata JSONB,              -- IP, user agent, détails
  organization TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read audit" ON public.audit_logs;
CREATE POLICY "Admin read audit" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 5. Table clients
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  organization TEXT UNIQUE NOT NULL,
  contract_type TEXT,  -- "SOC Basic", "SOC Premium", "SOC Enterprise"
  status TEXT DEFAULT 'pending', -- 'active', 'pending', 'suspended'
  edr_score INT DEFAULT 0,
  machines_count INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Clients RLS policy: staff can read all, clients see their own organization only
DROP POLICY IF EXISTS "Staff can manage all clients" ON public.clients;
CREATE POLICY "Staff can manage all clients" ON public.clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'analyste', 'manager')
    )
  );

DROP POLICY IF EXISTS "Client see own organization only" ON public.clients;
CREATE POLICY "Client see own organization only" ON public.clients
  FOR SELECT USING (
    organization = (
      SELECT organization FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- Alerts RLS policy
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Organization isolation on alerts" ON public.alerts;
CREATE POLICY "Organization isolation on alerts" ON public.alerts
  FOR ALL USING (
    organization = (
      SELECT organization FROM public.profiles
      WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'analyste', 'manager')
    )
  );

-- IOCs RLS policy
ALTER TABLE public.iocs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can read IOCs" ON public.iocs;
CREATE POLICY "Staff can read IOCs" ON public.iocs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'analyste', 'manager')
    )
  );

-- User roles RLS policy
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manages roles" ON public.user_roles;
CREATE POLICY "Admin manages roles" ON public.user_roles
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Self read role" ON public.user_roles;
CREATE POLICY "Self read role" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());
