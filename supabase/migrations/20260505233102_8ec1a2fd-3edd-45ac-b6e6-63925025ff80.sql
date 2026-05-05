
CREATE TYPE public.subscription_plan AS ENUM ('free_trial', 'mensal', 'anual');
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'expired', 'canceled', 'past_due');

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  plan public.subscription_plan NOT NULL DEFAULT 'free_trial',
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atualiza trigger de novo usuário para criar trial de 7 dias
CREATE OR REPLACE FUNCTION public.handle_new_user_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_status (user_id, status)
  VALUES (NEW.id, 'pending');
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  INSERT INTO public.subscriptions (user_id, plan, status, trial_ends_at)
  VALUES (NEW.id, 'free_trial', 'trialing', now() + interval '7 days');
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created_status ON auth.users;
CREATE TRIGGER on_auth_user_created_status
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_status();

-- Cria assinaturas para usuários existentes (trial 7d a partir de agora)
INSERT INTO public.subscriptions (user_id, plan, status, trial_ends_at)
SELECT id, 'free_trial', 'trialing', now() + interval '7 days'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Função helper: usuário tem acesso?
CREATE OR REPLACE FUNCTION public.has_active_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND (
        (status = 'trialing' AND trial_ends_at > now())
        OR (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
      )
  );
$function$;

-- Marca trials expirados periodicamente (chamado pelo client/cron)
CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.subscriptions
  SET status = 'expired'
  WHERE status = 'trialing' AND trial_ends_at <= now();
$function$;
