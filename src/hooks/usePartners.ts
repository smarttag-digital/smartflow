import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
export const PARTNER_TYPE_LABELS: Record<string, string> = Object.fromEntries(PARTNER_TYPE_OPTIONS.map((o) => [o.value, o.label]));

const PARTNERS_KEY = ["partners"] as const;

export function usePartners() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: PARTNERS_KEY,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("*").order("name");
      if (error) throw error;
      return (data as Partner[]) || [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("partners-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "partners" }, () => {
        qc.invalidateQueries({ queryKey: PARTNERS_KEY });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const createMut = useMutation({
    mutationFn: async (p: Partial<Partner>) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase.from("partners").insert({ ...p, user_id: user.id } as any).select().single();
      if (error) throw error;
      return data as Partner;
    },
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: PARTNERS_KEY });
      const previous = qc.getQueryData<Partner[]>(PARTNERS_KEY) || [];
      const optimistic = {
        id: `tmp-${crypto.randomUUID()}`, user_id: user?.id || "",
        name: "", partner_type: "corretor", phone: "", email: "", company: "", region: "", specialty: "", notes: "",
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        ...(p as any),
      } as Partner;
      qc.setQueryData<Partner[]>(PARTNERS_KEY, [...previous, optimistic].sort((a, b) => a.name.localeCompare(b.name)));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(PARTNERS_KEY, ctx.previous);
      toast.error("Erro ao cadastrar parceiro");
    },
    onSuccess: () => toast.success("Parceiro cadastrado!"),
    onSettled: () => qc.invalidateQueries({ queryKey: PARTNERS_KEY }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Partner> }) => {
      const { error } = await supabase.from("partners").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: PARTNERS_KEY });
      const previous = qc.getQueryData<Partner[]>(PARTNERS_KEY) || [];
      qc.setQueryData<Partner[]>(PARTNERS_KEY, previous.map(p => p.id === id ? { ...p, ...updates } : p));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(PARTNERS_KEY, ctx.previous);
      toast.error("Erro ao atualizar");
    },
    onSuccess: () => toast.success("Parceiro atualizado!"),
    onSettled: () => qc.invalidateQueries({ queryKey: PARTNERS_KEY }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: PARTNERS_KEY });
      const previous = qc.getQueryData<Partner[]>(PARTNERS_KEY) || [];
      qc.setQueryData<Partner[]>(PARTNERS_KEY, previous.filter(p => p.id !== id));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(PARTNERS_KEY, ctx.previous);
      toast.error("Erro ao excluir");
    },
    onSuccess: () => toast.success("Parceiro excluído!"),
    onSettled: () => qc.invalidateQueries({ queryKey: PARTNERS_KEY }),
  });

  return {
    partners: query.data || [],
    loading: query.isLoading,
    isFetching: query.isFetching,
    fetch: () => qc.invalidateQueries({ queryKey: PARTNERS_KEY }),
    create: async (p: Partial<Partner>) => { try { return await createMut.mutateAsync(p); } catch { return null; } },
    update: async (id: string, updates: Partial<Partner>) => { try { await updateMut.mutateAsync({ id, updates }); return true; } catch { return false; } },
    remove: async (id: string) => { try { await deleteMut.mutateAsync(id); return true; } catch { return false; } },
  };
}
