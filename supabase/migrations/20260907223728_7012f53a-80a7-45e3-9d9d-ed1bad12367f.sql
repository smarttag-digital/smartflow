ALTER TABLE public.api_credentials
  ADD COLUMN IF NOT EXISTS token_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS api_credentials_active_token_hash_idx
  ON public.api_credentials(token_hash)
  WHERE active AND token_hash IS NOT NULL;

ALTER TABLE public.integration_logs
  ADD COLUMN IF NOT EXISTS endpoint text NOT NULL DEFAULT '/functions/v1/webhook-leads',
  ADD COLUMN IF NOT EXISTS duration_ms integer;

ALTER TABLE public.integration_logs
  DROP CONSTRAINT IF EXISTS integration_logs_duration_ms_nonnegative;
ALTER TABLE public.integration_logs
  ADD CONSTRAINT integration_logs_duration_ms_nonnegative
  CHECK (duration_ms IS NULL OR duration_ms >= 0);

REVOKE ALL ON public.api_credentials FROM anon, authenticated;
GRANT ALL ON public.api_credentials TO service_role;
GRANT SELECT ON public.integration_logs TO authenticated;
GRANT ALL ON public.integration_logs TO service_role;

DROP POLICY IF EXISTS "Users view own credentials" ON public.api_credentials;
DROP POLICY IF EXISTS "Admins view all integration logs" ON public.integration_logs;
CREATE POLICY "Admins view all integration logs"
  ON public.integration_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP FUNCTION IF EXISTS public.ensure_api_credentials();
DROP FUNCTION IF EXISTS public.regenerate_api_token();
DROP FUNCTION IF EXISTS public.regenerate_webhook_secret();

DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins view all leads" ON public.leads;
CREATE POLICY "Admins view all leads"
  ON public.leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins view all properties" ON public.properties;
CREATE POLICY "Admins view all properties"
  ON public.properties FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins view all commissions" ON public.commissions;
CREATE POLICY "Admins view all commissions"
  ON public.commissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins view all partners" ON public.partners;
CREATE POLICY "Admins view all partners"
  ON public.partners FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins view all interactions" ON public.interactions;
CREATE POLICY "Admins view all interactions"
  ON public.interactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins view all lead properties" ON public.lead_properties;
CREATE POLICY "Admins view all lead properties"
  ON public.lead_properties FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins view all automation rules" ON public.automation_rules;
CREATE POLICY "Admins view all automation rules"
  ON public.automation_rules FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));