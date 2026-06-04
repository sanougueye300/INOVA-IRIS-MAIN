-- ============================================================
-- Migration : Tables manquantes pour l'authentification 2FA
-- Projet INOVA-IRIS — Sonatel SOC
-- ============================================================

-- 1. OTP SMS de connexion (table principale utilisée par auth-security)
CREATE TABLE IF NOT EXISTS public.login_sms_otps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash     TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_sms_otps_user_idx ON public.login_sms_otps(user_id);
CREATE INDEX IF NOT EXISTS login_sms_otps_expires_idx ON public.login_sms_otps(expires_at);

ALTER TABLE public.login_sms_otps ENABLE ROW LEVEL SECURITY;

-- Seul le service role peut lire/écrire (Edge Functions utilisent service_role)
CREATE POLICY "Service role only - login_sms_otps"
  ON public.login_sms_otps FOR ALL
  USING (auth.role() = 'service_role');

-- 2. Codes de secours MFA
CREATE TABLE IF NOT EXISTS public.user_backup_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_backup_codes_user_idx ON public.user_backup_codes(user_id);

ALTER TABLE public.user_backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - user_backup_codes"
  ON public.user_backup_codes FOR ALL
  USING (auth.role() = 'service_role');

-- 3. Paramètres MFA par utilisateur
CREATE TABLE IF NOT EXISTS public.user_mfa_settings (
  user_id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  totp_enrolled              BOOLEAN NOT NULL DEFAULT false,
  backup_codes_generated_at  TIMESTAMPTZ,
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - user_mfa_settings"
  ON public.user_mfa_settings FOR ALL
  USING (auth.role() = 'service_role');

-- 4. Questions de sécurité (catalogue)
CREATE TABLE IF NOT EXISTS public.security_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_questions ENABLE ROW LEVEL SECURITY;

-- Questions lisibles par tous les utilisateurs authentifiés (pour le formulaire de récupération)
CREATE POLICY "Authenticated users can read security questions"
  ON public.security_questions FOR SELECT
  USING (true);

-- Quelques questions de sécurité par défaut
INSERT INTO public.security_questions (question_text, sort_order) VALUES
  ('Quel est le nom de votre premier animal de compagnie ?', 1),
  ('Dans quelle ville êtes-vous né(e) ?', 2),
  ('Quel est le prénom de votre mère ?', 3),
  ('Quel était le nom de votre école primaire ?', 4),
  ('Quel est votre plat préféré ?', 5)
ON CONFLICT DO NOTHING;

-- 5. Réponses aux questions de sécurité
CREATE TABLE IF NOT EXISTS public.user_security_answers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id  UUID NOT NULL REFERENCES public.security_questions(id),
  answer_hash  TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id)
);

CREATE INDEX IF NOT EXISTS user_security_answers_user_idx ON public.user_security_answers(user_id);

ALTER TABLE public.user_security_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - user_security_answers"
  ON public.user_security_answers FOR ALL
  USING (auth.role() = 'service_role');

-- 6. Nettoyage automatique des OTP expirés (évite l'accumulation)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.login_sms_otps WHERE expires_at < now() - INTERVAL '1 hour';
  DELETE FROM public.otp_tokens      WHERE expires_at < now() - INTERVAL '1 hour';
END;
$$;
