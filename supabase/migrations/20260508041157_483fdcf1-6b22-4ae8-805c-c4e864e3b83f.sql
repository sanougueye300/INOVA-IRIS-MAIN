
-- Enum des rôles
CREATE TYPE public.app_role AS ENUM ('admin', 'analyste', 'manager', 'client');

-- Table profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  organization TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Table user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Fonction security definer pour vérifier les rôles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Fonction pour récupérer l'organisation d'un user
CREATE OR REPLACE FUNCTION public.get_user_org(_user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization FROM public.profiles WHERE id = _user_id
$$;

-- RLS profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger pour créer profil + role client à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Table alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  severity INTEGER NOT NULL DEFAULT 5,
  source TEXT NOT NULL DEFAULT 'wazuh',
  status TEXT NOT NULL DEFAULT 'new',
  agent_name TEXT,
  rule_id TEXT,
  organization TEXT,
  raw_data JSONB,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_alerts_org ON public.alerts(organization);
CREATE INDEX idx_alerts_severity ON public.alerts(severity DESC);
CREATE INDEX idx_alerts_detected ON public.alerts(detected_at DESC);

CREATE POLICY "Staff can view all alerts" ON public.alerts
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyste') OR
    public.has_role(auth.uid(), 'manager')
  );
CREATE POLICY "Clients view org alerts" ON public.alerts
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'client') AND organization = public.get_user_org(auth.uid())
  );
CREATE POLICY "Staff can insert alerts" ON public.alerts
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'analyste')
  );
CREATE POLICY "Staff can update alerts" ON public.alerts
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'analyste')
  );

CREATE TRIGGER alerts_updated_at BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Table iocs
CREATE TABLE public.iocs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,
  ioc_type TEXT NOT NULL,
  value TEXT NOT NULL,
  threat_name TEXT,
  threat_level TEXT NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL DEFAULT 'misp',
  tags TEXT[],
  organization TEXT,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.iocs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_iocs_type ON public.iocs(ioc_type);
CREATE INDEX idx_iocs_org ON public.iocs(organization);

CREATE POLICY "Staff can view all iocs" ON public.iocs
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyste') OR
    public.has_role(auth.uid(), 'manager')
  );
CREATE POLICY "Clients view org iocs" ON public.iocs
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'client') AND
    (organization = public.get_user_org(auth.uid()) OR organization IS NULL)
  );
CREATE POLICY "Staff can insert iocs" ON public.iocs
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'analyste')
  );
CREATE POLICY "Staff can update iocs" ON public.iocs
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'analyste')
  );

CREATE TRIGGER iocs_updated_at BEFORE UPDATE ON public.iocs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
