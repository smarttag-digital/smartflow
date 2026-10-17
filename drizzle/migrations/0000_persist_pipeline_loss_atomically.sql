CREATE OR REPLACE FUNCTION public.mark_lead_lost(_lead_id uuid, _reason text)
RETURNS SETOF public.leads
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE current_lead public.leads%ROWTYPE; reason_label text; actor_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501'; END IF;
  reason_label := CASE _reason WHEN 'comprou_com_outro' THEN 'Comprou com outro corretor' WHEN 'nao_quer' THEN 'Não tem interesse' WHEN 'nao_respondeu' THEN 'Não respondeu' WHEN 'fora_do_perfil' THEN 'Fora do perfil' END;
  IF reason_label IS NULL THEN RAISE EXCEPTION 'Selecione um motivo válido' USING ERRCODE = '22023'; END IF;
  SELECT * INTO current_lead FROM public.leads WHERE id = _lead_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR NOT public.has_active_access(auth.uid()) THEN RAISE EXCEPTION 'Lead não encontrado ou sem permissão para alterar' USING ERRCODE = '42501'; END IF;
  IF current_lead.stage = 'lead_perdido' AND current_lead.lost_reason = _reason THEN
    RETURN NEXT current_lead; RETURN;
  END IF;
  UPDATE public.leads SET stage = 'lead_perdido', lost_reason = _reason WHERE id = _lead_id AND user_id = auth.uid() RETURNING * INTO current_lead;
  IF NOT FOUND THEN RAISE EXCEPTION 'Não foi possível salvar o lead' USING ERRCODE = '42501'; END IF;
  SELECT NULLIF(full_name, '') INTO actor_name FROM public.profiles WHERE user_id = auth.uid();
  INSERT INTO public.interactions(lead_id, user_id, type, direction, message)
  VALUES (_lead_id, auth.uid(), 'stage_change', 'system', 'Lead perdido. Motivo: ' || reason_label || '. Responsável: ' || COALESCE(actor_name, auth.uid()::text));
  RETURN NEXT current_lead;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_lead_lost(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_lead_lost(uuid,text) TO authenticated, service_role;