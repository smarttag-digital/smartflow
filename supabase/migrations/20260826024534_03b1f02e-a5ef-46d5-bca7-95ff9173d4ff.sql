REVOKE ALL ON FUNCTION public.ensure_api_credentials() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regenerate_api_token() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regenerate_webhook_secret() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_api_credentials() TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_api_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_webhook_secret() TO authenticated;