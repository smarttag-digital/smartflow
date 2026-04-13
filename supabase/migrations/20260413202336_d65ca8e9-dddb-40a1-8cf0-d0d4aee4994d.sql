
-- Add business fields to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'venda';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS deal_value numeric DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS commission_percent numeric DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS commission_value numeric DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS rent_value numeric DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contract_duration text DEFAULT '';

-- Add whatsapp template to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_template text DEFAULT 'Olá, sou {{nome_do_usuario}} da imobiliária Smart Tag 👋
Vi seu interesse em {{tipo_de_negocio}} de {{tipo_de_imovel}}.
Posso te enviar algumas opções?';

-- Create trigger for handle_new_user if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Create updated_at triggers
CREATE OR REPLACE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for leads
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
