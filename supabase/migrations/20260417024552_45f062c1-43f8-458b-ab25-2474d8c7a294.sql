-- Partners table
CREATE TABLE public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  partner_type TEXT NOT NULL DEFAULT 'corretor',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  company TEXT DEFAULT '',
  region TEXT DEFAULT '',
  specialty TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own partners" ON public.partners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own partners" ON public.partners FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own partners" ON public.partners FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own partners" ON public.partners FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_partners_user ON public.partners(user_id);

-- Commissions table
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  deal_value NUMERIC NOT NULL DEFAULT 0,
  commission_percent NUMERIC DEFAULT 0,
  commission_value NUMERIC NOT NULL DEFAULT 0,
  business_type TEXT NOT NULL DEFAULT 'venda',
  status TEXT NOT NULL DEFAULT 'pendente',
  expected_date DATE,
  received_date DATE,
  partner_id UUID,
  partner_percent NUMERIC DEFAULT 0,
  partner_value NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own commissions" ON public.commissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own commissions" ON public.commissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own commissions" ON public.commissions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own commissions" ON public.commissions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_commissions_user ON public.commissions(user_id);
CREATE INDEX idx_commissions_status ON public.commissions(status);
CREATE INDEX idx_commissions_expected ON public.commissions(expected_date);
CREATE INDEX idx_commissions_partner ON public.commissions(partner_id);

-- Add default commission percent to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_commission_percent NUMERIC DEFAULT 6;

-- Function to auto-mark overdue commissions
CREATE OR REPLACE FUNCTION public.mark_overdue_commissions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.commissions
  SET status = 'atrasado'
  WHERE status = 'pendente'
    AND expected_date IS NOT NULL
    AND expected_date < CURRENT_DATE;
$$;