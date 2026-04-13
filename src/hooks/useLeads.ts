import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface DbLead {
  id: string;
  user_id: string;
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
  last_contact: string | null;
  last_response: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbInteraction {
  id: string;
  lead_id: string;
  user_id: string;
  type: string;
  message: string;
  direction: string;
  created_at: string;
}

export function useLeads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<DbLead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar leads", description: error.message, variant: "destructive" });
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const createLead = async (lead: {
    name: string;
    phone: string;
    email?: string;
    interest?: string;
    source?: string;
    score?: string;
    stage?: string;
    tags?: string[];
    notes?: string;
    assigned_to?: string;
  }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("leads")
      .insert({
        user_id: user.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email || "",
        interest: lead.interest || "",
        source: lead.source || "manual",
        score: lead.score || "cold",
        stage: lead.stage || "novo",
        tags: lead.tags || [],
        notes: lead.notes || "",
        assigned_to: lead.assigned_to || user.user_metadata?.full_name || "",
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao criar lead", description: error.message, variant: "destructive" });
      return null;
    }
    toast({ title: "Lead criado com sucesso! 🎉" });
    setLeads((prev) => [data, ...prev]);
    return data;
  };

  const updateLead = async (id: string, updates: Partial<DbLead>) => {
    const { error } = await supabase.from("leads").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar lead", description: error.message, variant: "destructive" });
      return false;
    }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    return true;
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir lead", description: error.message, variant: "destructive" });
      return false;
    }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    return true;
  };

  return { leads, loading, fetchLeads, createLead, updateLead, deleteLead };
}

export function useInteractions(leadId: string | null) {
  const { user } = useAuth();
  const [interactions, setInteractions] = useState<DbInteraction[]>([]);

  const fetchInteractions = useCallback(async () => {
    if (!leadId || !user) {
      setInteractions([]);
      return;
    }
    const { data } = await supabase
      .from("interactions")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    setInteractions(data || []);
  }, [leadId, user]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  const addInteraction = async (interaction: {
    lead_id: string;
    type: string;
    message: string;
    direction: string;
  }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("interactions")
      .insert({ ...interaction, user_id: user.id })
      .select()
      .single();
    if (!error && data) {
      setInteractions((prev) => [data, ...prev]);
    }
    return data;
  };

  return { interactions, fetchInteractions, addInteraction };
}
