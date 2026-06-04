-- Auth security: SMS OTP, backup codes, security questions, MFA settings

CREATE TABLE IF NOT EXISTS public.security_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_security_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.security_questions(id) ON DELETE CASCADE,
  answer_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.login_sms_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_mfa_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  totp_enrolled BOOLEAN NOT NULL DEFAULT false,
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  backup_codes_generated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_sms_otps_user_expires
  ON public.login_sms_otps(user_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_backup_codes_user
  ON public.user_backup_codes(user_id) WHERE used_at IS NULL;

ALTER TABLE public.security_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_security_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_sms_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;

-- Catalog: readable by authenticated users
CREATE POLICY "Authenticated can read active security questions"
  ON public.security_questions FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage security questions"
  ON public.security_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User answers: own data only
CREATE POLICY "Users manage own security answers"
  ON public.user_security_answers FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- MFA settings: own data
CREATE POLICY "Users read own mfa settings"
  ON public.user_mfa_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own mfa settings"
  ON public.user_mfa_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- OTP and backup codes: service role only (no client policies)

INSERT INTO public.security_questions (question_text, sort_order, is_active)
SELECT v.question_text, v.sort_order, true
FROM (VALUES
  ('Quel était le nom de votre premier serveur d''administration SOC ?', 1),
  ('Dans quelle ville avez-vous effectué votre première mission SOC ?', 2),
  ('Quel est le nom de votre premier outil SIEM utilisé ?', 3),
  ('Quel était le nom de votre premier manager SOC ?', 4)
) AS v(question_text, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.security_questions sq WHERE sq.question_text = v.question_text
);

CREATE OR REPLACE FUNCTION public.ensure_user_mfa_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_mfa_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_mfa_settings ON public.profiles;
CREATE TRIGGER on_profile_mfa_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_user_mfa_settings();

-- Backfill MFA settings for existing users
INSERT INTO public.user_mfa_settings (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
