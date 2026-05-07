
-- Enforce subscription access on mutations across user-owned tables.
-- Pattern: drop existing INSERT/UPDATE/DELETE policies and recreate them
-- requiring auth.uid() = user_id AND has_active_access(auth.uid()).
-- SELECT policies are left untouched (read-only mode allows viewing).

-- LEADS
DROP POLICY IF EXISTS "Users can create their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete their own leads" ON public.leads;
CREATE POLICY "Users can create their own leads" ON public.leads
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users can update their own leads" ON public.leads
  FOR UPDATE USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users can delete their own leads" ON public.leads
  FOR DELETE USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

-- PROPERTIES
DROP POLICY IF EXISTS "Users can create their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;
CREATE POLICY "Users can create their own properties" ON public.properties
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users can update their own properties" ON public.properties
  FOR UPDATE USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users can delete their own properties" ON public.properties
  FOR DELETE USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

-- COMMISSIONS
DROP POLICY IF EXISTS "Users create own commissions" ON public.commissions;
DROP POLICY IF EXISTS "Users update own commissions" ON public.commissions;
DROP POLICY IF EXISTS "Users delete own commissions" ON public.commissions;
CREATE POLICY "Users create own commissions" ON public.commissions
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users update own commissions" ON public.commissions
  FOR UPDATE USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users delete own commissions" ON public.commissions
  FOR DELETE USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

-- PARTNERS
DROP POLICY IF EXISTS "Users create own partners" ON public.partners;
DROP POLICY IF EXISTS "Users update own partners" ON public.partners;
DROP POLICY IF EXISTS "Users delete own partners" ON public.partners;
CREATE POLICY "Users create own partners" ON public.partners
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users update own partners" ON public.partners
  FOR UPDATE USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users delete own partners" ON public.partners
  FOR DELETE USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

-- INTERACTIONS
DROP POLICY IF EXISTS "Users can create their own interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can delete their own interactions" ON public.interactions;
CREATE POLICY "Users can create their own interactions" ON public.interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users can delete their own interactions" ON public.interactions
  FOR DELETE USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

-- LEAD_PROPERTIES
DROP POLICY IF EXISTS "Users can create their own lead_properties" ON public.lead_properties;
DROP POLICY IF EXISTS "Users can delete their own lead_properties" ON public.lead_properties;
CREATE POLICY "Users can create their own lead_properties" ON public.lead_properties
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users can delete their own lead_properties" ON public.lead_properties
  FOR DELETE USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));

-- AUTOMATION_RULES
DROP POLICY IF EXISTS "Users can create their own rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Users can update their own rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Users can delete their own rules" ON public.automation_rules;
CREATE POLICY "Users can create their own rules" ON public.automation_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users can update their own rules" ON public.automation_rules
  FOR UPDATE USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users can delete their own rules" ON public.automation_rules
  FOR DELETE USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));
