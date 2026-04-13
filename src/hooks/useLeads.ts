import { useState, useEffect, useCallback } from "react";
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

export const SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  SOURCE_OPTIONS.map((s) => [s.value, s.label])
);

export const STAGE_OPTIONS = [
  { value: "novo", label: "Novo Lead" },
  { value: "atendimento", label: "Atendimento" },
  { value: "envio_imoveis", label: "Envio de Imóveis" },
  { value: "visita", label: "Visita" },
  { value: "proposta", label: "Proposta" },
  { value: "fechamento", label: "Fechamento" },
];

export const STAGE_LABELS: Record<string, string> = Object.fromEntries(
  STAGE_OPTIONS.map((s) => [s.value, s.label])
);

export const SCORE_CONFIG: Record<string, { label: string; emoji: string }> = {
  hot: { label: "Quente", emoji: "🔥" },
  warm: { label: "Morno", emoji: "🌡️" },
  cold: { label: "Frio", emoji: "❄️" },
};

export function getAlertLevel(lead: Lead): "red" | "yellow" | "none" {
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

export function openWhatsApp(phone: string, message?: string) {
  const url = message
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${phone}`;
  window.open(url, "_blank");
}

export function useLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching leads:", error);
      toast.error("Erro ao carregar leads");
    } else {
      setLeads((data as Lead[]) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchLeads]);

  const createLead = async (lead: Partial<Lead>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("leads")
      .insert({ ...lead, user_id: user.id } as any)
      .select()
      .single();

    if (error) {
      console.error("Error creating lead:", error);
      toast.error("Erro ao criar lead");
      return null;
    }
    toast.success("Lead criado com sucesso!");
    return data as Lead;
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const { error } = await supabase
      .from("leads")
      .update(updates as any)
      .eq("id", id);

    if (error) {
      console.error("Error updating lead:", error);
      toast.error("Erro ao atualizar lead");
      return false;
    }
    toast.success("Lead atualizado!");
    return true;
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) {
      console.error("Error deleting lead:", error);
      toast.error("Erro ao excluir lead");
      return false;
    }
    toast.success("Lead excluído!");
    return true;
  };

  return { leads, loading, fetchLeads, createLead, updateLead, deleteLead };
}

export function useInteractions(leadId: string | null) {
  const { user } = useAuth();
  const [interactions, setInteractions] = useState<Interaction[]>([]);

  const fetchInteractions = useCallback(async () => {
    if (!user || !leadId) { setInteractions([]); return; }
    const { data } = await supabase
      .from("interactions")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });
    setInteractions((data as Interaction[]) || []);
  }, [user, leadId]);

  useEffect(() => { fetchInteractions(); }, [fetchInteractions]);

  const addInteraction = async (interaction: Partial<Interaction>) => {
    if (!user || !leadId) return;
    await supabase.from("interactions").insert({
      ...interaction,
      lead_id: leadId,
      user_id: user.id,
    } as any);
    fetchInteractions();
  };

  return { interactions, addInteraction, fetchInteractions };
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setProfile(data);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateProfile = async (updates: any) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Erro ao atualizar perfil");
      return false;
    }
    toast.success("Perfil atualizado!");
    fetchProfile();
    return true;
  };

  return { profile, updateProfile, fetchProfile };
}
