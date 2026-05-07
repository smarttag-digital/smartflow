
-- 1) Promote existing user vivabemeco@gmail.com to admin (if exists)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'vivabemeco@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Also approve their status if not already approved
UPDATE public.user_status
SET status = 'approved', reviewed_at = now()
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'vivabemeco@gmail.com')
  AND status <> 'approved';

-- 2) Update handle_new_user_status to auto-promote the founder email
CREATE OR REPLACE FUNCTION public.handle_new_user_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email = 'vivabemeco@gmail.com' THEN
    INSERT INTO public.user_status (user_id, status, reviewed_at)
    VALUES (NEW.id, 'approved', now());
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
      ON CONFLICT (user_id, role) DO NOTHING;
    -- Admin doesn't need a real subscription, but keep a row for consistency
    INSERT INTO public.subscriptions (user_id, plan, status, trial_ends_at)
    VALUES (NEW.id, 'free_trial', 'active', NULL);
  ELSE
    INSERT INTO public.user_status (user_id, status)
    VALUES (NEW.id, 'pending');
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    INSERT INTO public.subscriptions (user_id, plan, status, trial_ends_at)
    VALUES (NEW.id, 'free_trial', 'trialing', now() + interval '7 days');
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) has_active_access: admin always true; add 3-day grace for past_due
CREATE OR REPLACE FUNCTION public.has_active_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = _user_id
        AND (
          (status = 'trialing' AND trial_ends_at > now())
          OR (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
          OR (status = 'past_due' AND current_period_end IS NOT NULL AND current_period_end + interval '3 days' > now())
        )
    );
$function$;

-- 4) get_access_mode: full | read_only | blocked
CREATE OR REPLACE FUNCTION public.get_access_mode(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sub_status text;
  trial_end timestamptz;
  period_end timestamptz;
BEGIN
  -- Admin = full
  IF public.has_role(_user_id, 'admin'::app_role) THEN
    RETURN 'full';
  END IF;

  SELECT status::text, trial_ends_at, current_period_end
    INTO sub_status, trial_end, period_end
  FROM public.subscriptions
  WHERE user_id = _user_id
  LIMIT 1;

  IF sub_status IS NULL THEN
    RETURN 'blocked';
  END IF;

  -- Trial active
  IF sub_status = 'trialing' AND trial_end IS NOT NULL AND trial_end > now() THEN
    RETURN 'full';
  END IF;

  -- Active subscription
  IF sub_status = 'active' AND (period_end IS NULL OR period_end > now()) THEN
    RETURN 'full';
  END IF;

  -- Past due within grace period (3 days) = read_only
  IF sub_status = 'past_due' AND period_end IS NOT NULL THEN
    IF period_end + interval '3 days' > now() THEN
      RETURN 'full';
    ELSE
      RETURN 'read_only';
    END IF;
  END IF;

  -- Expired trial = read_only (allow viewing data, block mutations)
  IF sub_status = 'trialing' AND trial_end IS NOT NULL AND trial_end <= now() THEN
    RETURN 'read_only';
  END IF;

  -- Expired/canceled = blocked
  RETURN 'blocked';
END;
$function$;
