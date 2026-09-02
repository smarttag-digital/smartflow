-- 1) Trigger-only SECURITY DEFINER functions must not be callable via the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 2) Ensure no anonymous execution on any remaining definer RPCs
REVOKE ALL ON FUNCTION public.ensure_api_credentials() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regenerate_api_token() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regenerate_webhook_secret() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_access_mode(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_status(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_overdue_commissions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.expire_trials() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_active_access(uuid) FROM PUBLIC, anon;

-- has_role / has_active_access are used inside RLS policies, so signed-in users need EXECUTE
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_api_credentials() TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_api_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_webhook_secret() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_access_mode(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_overdue_commissions() TO authenticated;

-- 3) integration_logs is not consumed via Realtime by the app; remove it from the publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'integration_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.integration_logs;
  END IF;
END $$;