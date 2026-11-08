-- Expose Orange SMS Pro credentials from Supabase Vault to trusted server code only.
CREATE OR REPLACE FUNCTION public.get_orange_sms_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_object_agg(name, decrypted_secret)
  FROM vault.decrypted_secrets
  WHERE name IN (
    'orange_smspro_login',
    'orange_smspro_api_key',
    'orange_smspro_token',
    'orange_smspro_subject',
    'orange_smspro_signature',
    'orange_smspro_base_url'
  );
$$;

REVOKE ALL ON FUNCTION public.get_orange_sms_config() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_orange_sms_config() TO service_role;
