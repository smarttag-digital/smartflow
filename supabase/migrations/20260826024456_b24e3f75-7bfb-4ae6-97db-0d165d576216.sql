CREATE TABLE IF NOT EXISTS public.api_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL DEFAULT 'Padrão',
  api_token text NOT NULL UNIQUE,
  webhook_secret text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  token_rotated_at timestamptz NOT NULL DEFAULT now(),
  secret_rotated_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_credentials_user_idx ON public.api_credentials(user_id);
GRANT SELECT ON public.api_credentials TO authenticated;
GRANT ALL ON public.api_credentials TO service_role;
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own credentials" ON public.api_credentials;
CREATE POLICY "Users view own credentials" ON public.api_credentials
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_type text NOT NULL DEFAULT 'webhook_lead',
  source text NOT NULL DEFAULT '',
  status_code integer NOT NULL DEFAULT 200,
  success boolean NOT NULL DEFAULT true,
  message text NOT NULL DEFAULT '',
  lead_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS integration_logs_user_created_idx ON public.integration_logs(user_id, created_at DESC);
GRANT SELECT ON public.integration_logs TO authenticated;
GRANT ALL ON public.integration_logs TO service_role;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own integration logs" ON public.integration_logs;
CREATE POLICY "Users view own integration logs" ON public.integration_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS leads_user_idempotency_key_idx
  ON public.leads(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ensure_api_credentials()
RETURNS public.api_credentials
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE row public.api_credentials;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT * INTO row FROM public.api_credentials
    WHERE user_id = auth.uid() AND active ORDER BY created_at LIMIT 1;
  IF row.id IS NULL THEN
    INSERT INTO public.api_credentials (user_id, api_token, webhook_secret)
    VALUES (auth.uid(), 'sfk_' || encode(gen_random_bytes(32), 'hex'), encode(gen_random_bytes(32), 'hex'))
    RETURNING * INTO row;
  END IF;
  RETURN row;
END; $$;

CREATE OR REPLACE FUNCTION public.regenerate_api_token()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_token text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  PERFORM public.ensure_api_credentials();
  new_token := 'sfk_' || encode(gen_random_bytes(32), 'hex');
  UPDATE public.api_credentials SET api_token = new_token, token_rotated_at = now()
    WHERE user_id = auth.uid() AND active;
  RETURN new_token;
END; $$;

CREATE OR REPLACE FUNCTION public.regenerate_webhook_secret()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_secret text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  PERFORM public.ensure_api_credentials();
  new_secret := encode(gen_random_bytes(32), 'hex');
  UPDATE public.api_credentials SET webhook_secret = new_secret, secret_rotated_at = now()
    WHERE user_id = auth.uid() AND active;
  RETURN new_secret;
END; $$;

REVOKE ALL ON FUNCTION public.ensure_api_credentials() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.regenerate_api_token() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.regenerate_webhook_secret() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_api_credentials() TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_api_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_webhook_secret() TO authenticated;

ALTER TABLE public.integration_logs REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.integration_logs;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;