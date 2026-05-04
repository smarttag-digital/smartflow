import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Commission {
  id: string;
  user_id: string;
  lead_id: string;
  deal_value: number;
  commission_percent: number;
  commission_value: number;
  business_type: string;
  status: string;
  expected_date: string | null;
  received_date: string | null;
  partner_id: string | null;
  partner_percent: number;
  partner_value: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const COMMISSION_STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { value: "recebido", label: "Recebido", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  { value: "atrasado", label: "Atrasado", color: "text-destructive bg-destructive/10 border-destructive/30" },
];
export const COMMISSION_STATUS_LABELS: Record<string, string> = Object.fromEntries(COMMISSION_STATUS_OPTIONS.map((o) => [o.value, o.label]));

const COMMISSIONS_KEY = ["commissions"] as const;

export function useCommissions() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: COMMISSIONS_KEY,
    enabled: !!user,
    queryFn: async () => {
      await supabase.rpc("mark_overdue_commissions");
      const { data, error } = await supabase
        .from("commissions")
        .select("*")
        .order("expected_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as Commission[]) || [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("commissions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "commissions" }, () => {
        qc.invalidateQueries({ queryKey: COMMISSIONS_KEY });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const createMut = useMutation({
    mutationFn: async (c: Partial<Commission>) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase.from("commissions").insert({ ...c, user_id: user.id } as any).select().single();
      if (error) throw error;
      return data as Commission;
    },
    onMutate: async (c) => {
      await qc.cancelQueries({ queryKey: COMMISSIONS_KEY });
      const previous = qc.getQueryData<Commission[]>(COMMISSIONS_KEY) || [];
      const optimistic = {
        id: `tmp-${crypto.randomUUID()}`, user_id: user?.id || "",
        lead_id: "", deal_value: 0, commission_percent: 0, commission_value: 0,
        business_type: "venda", status: "pendente", expected_date: null, received_date: null,
        partner_id: null, partner_percent: 0, partner_value: 0, notes: "",
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        ...(c as any),
      } as Commission;
      qc.setQueryData<Commission[]>(COMMISSIONS_KEY, [optimistic, ...previous]);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(COMMISSIONS_KEY, ctx.previous);
      toast.error("Erro ao criar comissão");
    },
    onSuccess: () => toast.success("Comissão registrada!"),
    onSettled: () => qc.invalidateQueries({ queryKey: COMMISSIONS_KEY }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Commission> }) => {
      const { error } = await supabase.from("commissions").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: COMMISSIONS_KEY });
      const previous = qc.getQueryData<Commission[]>(COMMISSIONS_KEY) || [];
      qc.setQueryData<Commission[]>(COMMISSIONS_KEY, previous.map(c => c.id === id ? { ...c, ...updates } : c));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(COMMISSIONS_KEY, ctx.previous);
      toast.error("Erro ao atualizar");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: COMMISSIONS_KEY }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commissions").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: COMMISSIONS_KEY });
      const previous = qc.getQueryData<Commission[]>(COMMISSIONS_KEY) || [];
      qc.setQueryData<Commission[]>(COMMISSIONS_KEY, previous.filter(c => c.id !== id));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(COMMISSIONS_KEY, ctx.previous);
      toast.error("Erro ao excluir");
    },
    onSuccess: () => toast.success("Comissão excluída!"),
    onSettled: () => qc.invalidateQueries({ queryKey: COMMISSIONS_KEY }),
  });

  const markReceived = async (id: string) => {
    const today = new Date().toISOString().split("T")[0];
    try {
      await updateMut.mutateAsync({ id, updates: { status: "recebido", received_date: today } });
      toast.success("Comissão recebida!");
      return true;
    } catch { return false; }
  };

  return {
    commissions: query.data || [],
    loading: query.isLoading,
    isFetching: query.isFetching,
    fetch: () => qc.invalidateQueries({ queryKey: COMMISSIONS_KEY }),
    create: async (c: Partial<Commission>) => { try { return await createMut.mutateAsync(c); } catch { return null; } },
    update: async (id: string, updates: Partial<Commission>) => { try { await updateMut.mutateAsync({ id, updates }); return true; } catch { return false; } },
    remove: async (id: string) => { try { await deleteMut.mutateAsync(id); return true; } catch { return false; } },
    markReceived,
  };
}

export function useFinancialSummary(commissions: Commission[]) {
  return useMemo(() => {
    const now = new Date();
    const monthKey = (d: string | null) => d ? d.slice(0, 7) : null;
    const currentMonth = now.toISOString().slice(0, 7);

    const totalReceived = commissions.filter(c => c.status === "recebido").reduce((s, c) => s + (c.commission_value - (c.partner_value || 0)), 0);
    const totalPending = commissions.filter(c => c.status === "pendente").reduce((s, c) => s + (c.commission_value - (c.partner_value || 0)), 0);
    const totalOverdue = commissions.filter(c => c.status === "atrasado").reduce((s, c) => s + (c.commission_value - (c.partner_value || 0)), 0);
    const receivedThisMonth = commissions.filter(c => c.status === "recebido" && monthKey(c.received_date) === currentMonth).reduce((s, c) => s + (c.commission_value - (c.partner_value || 0)), 0);
    const expectedThisMonth = commissions.filter(c => c.status !== "recebido" && monthKey(c.expected_date) === currentMonth).reduce((s, c) => s + (c.commission_value - (c.partner_value || 0)), 0);

    const monthly: Record<string, { received: number; expected: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      monthly[key] = { received: 0, expected: 0 };
    }
    commissions.forEach(c => {
      const net = c.commission_value - (c.partner_value || 0);
      if (c.status === "recebido" && c.received_date) {
        const k = monthKey(c.received_date)!;
        if (monthly[k]) monthly[k].received += net;
      } else if (c.expected_date) {
        const k = monthKey(c.expected_date)!;
        if (monthly[k]) monthly[k].expected += net;
      }
    });
    const monthlyData = Object.entries(monthly).map(([month, v]) => ({
      month: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short" }),
      ...v,
    }));

    return { totalReceived, totalPending, totalOverdue, receivedThisMonth, expectedThisMonth, monthlyData };
  }, [commissions]);
}
