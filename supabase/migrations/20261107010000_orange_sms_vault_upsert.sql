-- Migration : helper RPC pour upsert sécurisé des secrets Vault
-- Utilisé par la Edge Function configure-orange-sms (service_role uniquement)

-- ── Fonction d'upsert atomique ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_vault_secret(
  p_name  TEXT,
  p_value TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Chercher l'ID du secret existant
  SELECT id INTO v_id
  FROM vault.secrets
  WHERE name = p_name
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    -- Mise à jour du secret existant
    PERFORM vault.update_secret(v_id, p_value);
  ELSE
    -- Création d'un nouveau secret
    PERFORM vault.create_secret(p_value, p_name);
  END IF;
END;
$$;

-- Restreindre l'accès à service_role uniquement (jamais anon ni authenticated)
REVOKE ALL ON FUNCTION public.upsert_vault_secret(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_vault_secret(TEXT, TEXT) TO service_role;

-- ── Rappel : get_orange_sms_config (déjà créé dans migration précédente) ─────
-- La fonction get_orange_sms_config() expose déjà les secrets en lecture.
-- Elle est accessible uniquement à service_role.
