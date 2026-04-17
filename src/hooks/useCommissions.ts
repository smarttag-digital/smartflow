import { useState, useEffect, useCallback, useMemo } from "react";
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
export const COMMISSION_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  COMMISSION_STATUS_OPTIONS.map((o) => [o.value, o.label])
);

export function useCommissions() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Auto-mark overdue first
    await supabase.rpc("mark_overdue_commissions");
    const { data, error } = await supabase.from("commissions").select("*").order("expected_date", { ascending: true, nullsFirst: false });
    if (error) toast.error("Erro ao carregar comissões");
    else setCommissions((data as Commission[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("commissions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "commissions" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetch]);

  const create = async (c: Partial<Commission>) => {
    if (!user) return null;
    const { data, error } = await supabase.from("commissions").insert({ ...c, user_id: user.id } as any).select().single();
    if (error) { toast.error("Erro ao criar comissão"); return null; }
    toast.success("Comissão registrada!");
    return data as Commission;
  };

  const update = async (id: string, updates: Partial<Commission>) => {
    const { error } = await supabase.from("commissions").update(updates as any).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return false; }
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("commissions").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return false; }
    toast.success("Comissão excluída!");
    return true;
  };

  const markReceived = async (id: string) => {
    const today = new Date().toISOString().split("T")[0];
    const ok = await update(id, { status: "recebido", received_date: today });
    if (ok) toast.success("Comissão recebida!");
    return ok;
  };

  return { commissions, loading, fetch, create, update, remove, markReceived };
}

export function useFinancialSummary(commissions: Commission[]) {
  return useMemo(() => {
    const now = new Date();
    const monthKey = (d: string | null) => d ? d.slice(0, 7) : null;
    const currentMonth = now.toISOString().slice(0, 7);

    const totalReceived = commissions
      .filter(c => c.status === "recebido")
      .reduce((s, c) => s + (c.commission_value - (c.partner_value || 0)), 0);

    const totalPending = commissions
      .filter(c => c.status === "pendente")
      .reduce((s, c) => s + (c.commission_value - (c.partner_value || 0)), 0);

    const totalOverdue = commissions
      .filter(c => c.status === "atrasado")
      .reduce((s, c) => s + (c.commission_value - (c.partner_value || 0)), 0);

    const receivedThisMonth = commissions
      .filter(c => c.status === "recebido" && monthKey(c.received_date) === currentMonth)
      .reduce((s, c) => s + (c.commission_value - (c.partner_value || 0)), 0);

    const expectedThisMonth = commissions
      .filter(c => c.status !== "recebido" && monthKey(c.expected_date) === currentMonth)
      .reduce((s, c) => s + (c.commission_value - (c.partner_value || 0)), 0);

    // Monthly cashflow (last 6 months)
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
