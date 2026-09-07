CREATE POLICY "No direct browser access to credentials"
  ON public.api_credentials FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);