
CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE public.subscriptions SET status = 'expired'
    WHERE status = 'trialing' AND trial_ends_at <= now();
END; $$;
REVOKE EXECUTE ON FUNCTION public.expire_trials() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_trials() TO service_role;

CREATE OR REPLACE FUNCTION public.mark_overdue_commissions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  UPDATE public.commissions SET status = 'atrasado'
    WHERE status = 'pendente' AND expected_date IS NOT NULL
      AND expected_date < CURRENT_DATE AND user_id = auth.uid();
END; $$;
REVOKE EXECUTE ON FUNCTION public.mark_overdue_commissions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_overdue_commissions() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_user_status(_user_id uuid)
RETURNS user_account_status LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s user_account_status;
BEGIN
  IF _user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NULL;
  END IF;
  SELECT status INTO s FROM public.user_status WHERE user_id = _user_id LIMIT 1;
  RETURN s;
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_user_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_status(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_access_mode(_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE sub_status text; trial_end timestamptz; period_end timestamptz;
BEGIN
  IF _user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NULL;
  END IF;
  IF public.has_role(_user_id, 'admin'::app_role) THEN RETURN 'full'; END IF;
  SELECT status::text, trial_ends_at, current_period_end INTO sub_status, trial_end, period_end
    FROM public.subscriptions WHERE user_id = _user_id LIMIT 1;
  IF sub_status IS NULL THEN RETURN 'blocked'; END IF;
  IF sub_status = 'trialing' AND trial_end IS NOT NULL AND trial_end > now() THEN RETURN 'full'; END IF;
  IF sub_status = 'active' AND (period_end IS NULL OR period_end > now()) THEN RETURN 'full'; END IF;
  IF sub_status = 'past_due' AND period_end IS NOT NULL THEN
    IF period_end + interval '3 days' > now() THEN RETURN 'full'; ELSE RETURN 'read_only'; END IF;
  END IF;
  IF sub_status = 'trialing' AND trial_end IS NOT NULL AND trial_end <= now() THEN RETURN 'read_only'; END IF;
  RETURN 'blocked';
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_access_mode(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_access_mode(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.has_active_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_access(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Property images are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated can read property images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'property-images');

DROP POLICY IF EXISTS "Users can subscribe to own leads topic" ON realtime.messages;
CREATE POLICY "Users can subscribe to own leads topic"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    realtime.topic() NOT LIKE 'leads-realtime:%'
    OR realtime.topic() = 'leads-realtime:' || auth.uid()::text
  );
