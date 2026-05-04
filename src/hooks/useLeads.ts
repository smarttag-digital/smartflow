import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  interest: string;
  source: string;
  score: string;
  stage: string;
  tags: string[];
  notes: string;
  assigned_to: string;
  business_type: string;
  deal_value: number;
  commission_percent: number;
  commission_value: number;
  rent_value: number;
  contract_duration: string;
  last_contact: string | null;
  last_response: string | null;
  next_action: string;
  next_action_date: string | null;
  lost_reason: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface Interaction {
  id: string;
  lead_id: string;
  type: string;
  message: string;
  direction: string;
  created_at: string;
  user_id: string;
}

export const SOURCE_OPTIONS = [
  { value: "meta_ads", label: "Meta Ads" },
  { value: "google", label: "Google" },
  { value: "organico", label: "Orgânico" },
  { value: "indicacao", label: "Indicação" },
  { value: "portais", label: "Portais Imobiliários" },
  { value: "marketplace", label: "Marketplace" },
  { value: "zap_imoveis", label: "Zap Imóveis" },
  { value: "viva_real", label: "Viva Real" },
  { value: "olx", label: "OLX" },
  { value: "webhook", label: "Webhook" },
  { value: "manual", label: "Manual" },
  { value: "outros", label: "Outros" },
];

export const SOURCE_LABELS: Record<string, string> = Object.fromEntries(SOURCE_OPTIONS.map((s) => [s.value, s.label]));

export const STAGE_OPTIONS = [
  { value: "novo", label: "Novo Lead" },
  { value: "atendimento", label: "Atendimento" },
  { value: "envio_imoveis", label: "Envio de Imóveis" },
  { value: "visita", label: "Visita" },
  { value: "proposta", label: "Proposta" },
  { value: "cca", label: "CCA - Avaliação Bancária" },
  { value: "fechamento", label: "Fechamento" },
  { value: "lead_perdido", label: "Lead Perdido" },
];

export const STAGE_LABELS: Record<string, string> = Object.fromEntries(STAGE_OPTIONS.map((s) => [s.value, s.label]));

export const NEXT_ACTION_OPTIONS = [
  { value: "", label: "Nenhuma" },
  { value: "ligar", label: "Ligar" },
  { value: "follow_up", label: "Follow-up" },
  { value: "enviar_imoveis", label: "Enviar imóveis" },
  { value: "agendar_visita", label: "Agendar visita" },
  { value: "enviar_proposta", label: "Enviar proposta" },
  { value: "retornar_contato", label: "Retornar contato" },
];

export const LOST_REASON_OPTIONS = [
  { value: "comprou_com_outro", label: "Comprou com outro corretor" },
  { value: "nao_quer", label: "Não quer mais" },
  { value: "nao_respondeu", label: "Não respondeu" },
  { value: "fora_do_perfil", label: "Fora do perfil" },
  { value: "outro", label: "Outro motivo" },
];

export const SCORE_CONFIG: Record<string, { label: string; emoji: string }> = {
  hot: { label: "Quente", emoji: "🔥" },
  warm: { label: "Morno", emoji: "🌡️" },
  cold: { label: "Frio", emoji: "❄️" },
};

export function getAlertLevel(lead: Lead): "red" | "yellow" | "none" {
  if (lead.stage === "lead_perdido" || lead.stage === "fechamento" || lead.stage === "cca") return "none";
  const hoursAgo = (dateStr: string | null) => {
    if (!dateStr) return null;
    return Math.round((Date.now() - new Date(dateStr).getTime()) / 3600000);
  };
  if (!lead.last_response && !lead.last_contact) {
    const h = hoursAgo(lead.created_at);
    if (h !== null && h >= 48) return "red";
    if (h !== null && h >= 24) return "yellow";
  }
  if (lead.last_contact && !lead.last_response) {
    const h = hoursAgo(lead.last_contact);
    if (h !== null && h >= 48) return "red";
    if (h !== null && h >= 24) return "yellow";
  }
  return "none";
}

export function isActionOverdue(lead: Lead): boolean {
  if (!lead.next_action_date) return false;
  return new Date(lead.next_action_date) < new Date();
}

export function isActionToday(lead: Lead): boolean {
  if (!lead.next_action_date) return false;
  const d = new Date(lead.next_action_date);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function openWhatsApp(phone: string, message?: string) {
  const url = message
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${phone}`;
  window.open(url, "_blank");
}

const LEADS_KEY = ["leads"] as const;

export function useLeads() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: LEADS_KEY,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Lead[]) || [];
    },
  });

  // Realtime → invalidate cache (revalida automaticamente)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        qc.invalidateQueries({ queryKey: LEADS_KEY });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const createMut = useMutation({
    mutationFn: async (lead: Partial<Lead>) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("leads")
        .insert({ ...lead, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Lead;
    },
    onMutate: async (newLead) => {
      await qc.cancelQueries({ queryKey: LEADS_KEY });
      const previous = qc.getQueryData<Lead[]>(LEADS_KEY) || [];
      const optimistic: Lead = {
        id: `tmp-${crypto.randomUUID()}`,
        user_id: user?.id || "",
        name: "", phone: "", email: "", interest: "", source: "manual",
        score: "cold", stage: "novo", tags: [], notes: "", assigned_to: "",
        business_type: "venda", deal_value: 0, commission_percent: 0, commission_value: 0,
        rent_value: 0, contract_duration: "", last_contact: null, last_response: null,
        next_action: "", next_action_date: null, lost_reason: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(newLead as any),
      };
      qc.setQueryData<Lead[]>(LEADS_KEY, [optimistic, ...previous]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(LEADS_KEY, ctx.previous);
      toast.error("Erro ao criar lead");
    },
    onSuccess: () => { toast.success("Lead criado com sucesso!"); },
    onSettled: () => { qc.invalidateQueries({ queryKey: LEADS_KEY }); },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Lead> }) => {
      const { error } = await supabase.from("leads").update(updates as any).eq("id", id);
      if (error) throw error;
      return { id, updates };
    },
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: LEADS_KEY });
      const previous = qc.getQueryData<Lead[]>(LEADS_KEY) || [];
      qc.setQueryData<Lead[]>(LEADS_KEY, previous.map(l => l.id === id ? { ...l, ...updates } : l));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(LEADS_KEY, ctx.previous);
      toast.error("Erro ao atualizar lead");
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: LEADS_KEY }); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: LEADS_KEY });
      const previous = qc.getQueryData<Lead[]>(LEADS_KEY) || [];
      qc.setQueryData<Lead[]>(LEADS_KEY, previous.filter(l => l.id !== id));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(LEADS_KEY, ctx.previous);
      toast.error("Erro ao excluir lead");
    },
    onSuccess: () => { toast.success("Lead excluído!"); },
    onSettled: () => { qc.invalidateQueries({ queryKey: LEADS_KEY }); },
  });

  return {
    leads: query.data || [],
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    fetchLeads: () => qc.invalidateQueries({ queryKey: LEADS_KEY }),
    createLead: async (lead: Partial<Lead>): Promise<Lead | null> => {
      try { return await createMut.mutateAsync(lead); } catch { return null; }
    },
    updateLead: async (id: string, updates: Partial<Lead>): Promise<boolean> => {
      try { await updateMut.mutateAsync({ id, updates }); return true; } catch { return false; }
    },
    deleteLead: async (id: string): Promise<boolean> => {
      try { await deleteMut.mutateAsync(id); return true; } catch { return false; }
    },
  };
}

export function useInteractions(leadId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["interactions", leadId],
    enabled: !!user && !!leadId,
    queryFn: async () => {
      const { data } = await supabase
        .from("interactions")
        .select("*")
        .eq("lead_id", leadId!)
        .order("created_at", { ascending: true });
      return (data as Interaction[]) || [];
    },
  });

  const addInteraction = async (interaction: Partial<Interaction>) => {
    if (!user || !leadId) return;
    await supabase.from("interactions").insert({
      ...interaction,
      lead_id: leadId,
      user_id: user.id,
    } as any);
    qc.invalidateQueries({ queryKey: ["interactions", leadId] });
  };

  return {
    interactions: query.data || [],
    addInteraction,
    fetchInteractions: () => qc.invalidateQueries({ queryKey: ["interactions", leadId] }),
  };
}

export function useProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
  });

  const updateProfile = async (updates: any) => {
    if (!user) return false;
    const { error } = await supabase.from("profiles").update(updates).eq("user_id", user.id);
    if (error) { toast.error("Erro ao atualizar perfil"); return false; }
    toast.success("Perfil atualizado!");
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
    return true;
  };

  return { profile: query.data, updateProfile, fetchProfile: () => qc.invalidateQueries({ queryKey: ["profile", user?.id] }) };
}
