-- Properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  property_type TEXT NOT NULL DEFAULT 'apartamento',
  business_type TEXT NOT NULL DEFAULT 'venda',
  status TEXT NOT NULL DEFAULT 'disponivel',
  deal_value NUMERIC DEFAULT 0,
  rent_value NUMERIC DEFAULT 0,
  city TEXT DEFAULT '',
  neighborhood TEXT DEFAULT '',
  address TEXT DEFAULT '',
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  parking_spots INTEGER DEFAULT 0,
  area_m2 NUMERIC DEFAULT 0,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  owner_name TEXT DEFAULT '',
  owner_phone TEXT DEFAULT '',
  owner_email TEXT DEFAULT '',
  owner_notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own properties"
  ON public.properties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own properties"
  ON public.properties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own properties"
  ON public.properties FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own properties"
  ON public.properties FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_properties_user_id ON public.properties(user_id);
CREATE INDEX idx_properties_status ON public.properties(status);

-- Lead-Property relations
CREATE TABLE public.lead_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  property_id UUID NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id, property_id)
);

ALTER TABLE public.lead_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lead_properties"
  ON public.lead_properties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own lead_properties"
  ON public.lead_properties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own lead_properties"
  ON public.lead_properties FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_lead_properties_lead ON public.lead_properties(lead_id);
CREATE INDEX idx_lead_properties_property ON public.lead_properties(property_id);

-- Storage bucket for property images
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true);

CREATE POLICY "Property images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'property-images');

CREATE POLICY "Users can upload their own property images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own property images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own property images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);