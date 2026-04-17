import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Partner {
  id: string;
  user_id: string;
  name: string;
  partner_type: string;
  phone: string;
  email: string;
  company: string;
  region: string;
  specialty: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const PARTNER_TYPE_OPTIONS = [
  { value: "corretor", label: "Corretor" },
  { value: "imobiliaria", label: "Imobiliária" },
];

export const PARTNER_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  PARTNER_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

export function usePartners() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from("partners").select("*").order("name");
    if (error) toast.error("Erro ao carregar parceiros");
    else setPartners((data as Partner[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("partners-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "partners" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetch]);

  const create = async (p: Partial<Partner>) => {
    if (!user) return null;
    const { data, error } = await supabase.from("partners").insert({ ...p, user_id: user.id } as any).select().single();
    if (error) { toast.error("Erro ao cadastrar parceiro"); return null; }
    toast.success("Parceiro cadastrado!");
    return data as Partner;
  };

  const update = async (id: string, updates: Partial<Partner>) => {
    const { error } = await supabase.from("partners").update(updates as any).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return false; }
    toast.success("Parceiro atualizado!");
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("partners").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return false; }
    toast.success("Parceiro excluído!");
    return true;
  };

  return { partners, loading, fetch, create, update, remove };
}
