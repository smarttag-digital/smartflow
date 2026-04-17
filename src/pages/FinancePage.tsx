import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, CheckCircle2, Trash2, DollarSign, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useCommissions, Commission, COMMISSION_STATUS_OPTIONS, useFinancialSummary } from "@/hooks/useCommissions";
import { usePartners } from "@/hooks/usePartners";
import { useLeads } from "@/hooks/useLeads";
import { useProfile } from "@/hooks/useLeads";
import CurrencyInput, { formatBRL } from "@/components/CurrencyInput";

const EMPTY: Partial<Commission> = {
  lead_id: "", deal_value: 0, commission_percent: 6, commission_value: 0,
  business_type: "venda", status: "pendente", expected_date: null, received_date: null,
  partner_id: null, partner_percent: 0, partner_value: 0, notes: "",
};

export default function FinancePage() {
  const { commissions, loading, create, update, remove, markReceived } = useCommissions();
  const { partners } = usePartners();
  const { leads } = useLeads();
  const { profile } = useProfile();
  const summary = useFinancialSummary(commissions);

  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Commission | null>(null);
  const [form, setForm] = useState<Partial<Commission>>(EMPTY);

  const filtered = useMemo(() => commissions.filter(c => !filterStatus || c.status === filterStatus), [commissions, filterStatus]);

  const openNew = () => {
    const defaultPct = profile?.default_commission_percent ?? 6;
    setEditing(null);
    setForm({ ...EMPTY, commission_percent: defaultPct });
    setShowForm(true);
  };
  const openEdit = (c: Commission) => { setEditing(c); setForm(c); setShowForm(true); };

  const recalc = (next: Partial<Commission>) => {
    const dv = next.deal_value || 0;
    const pct = next.commission_percent || 0;
    const cv = (dv * pct) / 100;
    const ppct = next.partner_percent || 0;
    const pv = (cv * ppct) / 100;
    return { ...next, commission_value: cv, partner_value: pv };
  };

  const handleSave = async () => {
    if (!form.lead_id) return;
    const final = recalc(form);
    if (editing) await update(editing.id, final);
    else await create(final);
    setShowForm(false); setForm(EMPTY); setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta comissão?")) return;
    await remove(id);
  };

  const leadName = (id: string) => leads.find(l => l.id === id)?.name || "—";
  const partnerName = (id: string | null) => id ? (partners.find(p => p.id === id)?.name || "—") : null;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Controle de comissões e fluxo de caixa</p>
        </div>
        <button onClick={openNew}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Nova Comissão
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Recebido (mês)" value={formatBRL(summary.receivedThisMonth)} icon={<DollarSign className="w-4 h-4" />} color="text-emerald-400 bg-emerald-500/10" />
        <KPI label="Previsto (mês)" value={formatBRL(summary.expectedThisMonth)} icon={<Calendar className="w-4 h-4" />} color="text-blue-400 bg-blue-500/10" />
        <KPI label="Total pendente" value={formatBRL(summary.totalPending)} icon={<TrendingUp className="w-4 h-4" />} color="text-amber-400 bg-amber-500/10" />
        <KPI label="Em atraso" value={formatBRL(summary.totalOverdue)} icon={<AlertCircle className="w-4 h-4" />} color="text-destructive bg-destructive/10" />
      </div>

      {/* Cashflow chart */}
      <div className="rounded-xl border border-border/40 bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Fluxo de Caixa (últimos 6 meses)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                formatter={(v: number) => formatBRL(v)} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="received" fill="hsl(142 76% 45%)" name="Recebido" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expected" fill="hsl(217 91% 60%)" name="Previsto" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter + list */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button onClick={() => setFilterStatus("")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${!filterStatus ? "bg-primary/15 text-primary border-primary/30" : "border-border/50 text-muted-foreground"}`}>
            Todos ({commissions.length})
          </button>
          {COMMISSION_STATUS_OPTIONS.map(s => {
            const count = commissions.filter(c => c.status === s.value).length;
            return (
              <button key={s.value} onClick={() => setFilterStatus(s.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${filterStatus === s.value ? s.color : "border-border/50 text-muted-foreground"}`}>
                {s.label} ({count})
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground rounded-xl border border-border/30">
            <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma comissão registrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => {
              const statusCfg = COMMISSION_STATUS_OPTIONS.find(s => s.value === c.status);
              const net = c.commission_value - (c.partner_value || 0);
              return (
                <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-xl border border-border/40 bg-card p-4 hover:border-primary/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${statusCfg?.color}`}>
                          {statusCfg?.label}
                        </span>
                        <p className="text-sm font-semibold text-foreground truncate">{leadName(c.lead_id)}</p>
                        <span className="text-[10px] text-muted-foreground">{c.business_type === "locacao" ? "Locação" : "Venda"}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                        <span>VGV: <strong className="text-foreground">{formatBRL(c.deal_value)}</strong></span>
                        <span>Comissão: <strong className="text-primary">{formatBRL(c.commission_value)}</strong> ({c.commission_percent}%)</span>
                        {c.partner_id && (
                          <span>Parceiro: <strong className="text-foreground">{partnerName(c.partner_id)}</strong> ({formatBRL(c.partner_value)})</span>
                        )}
                        <span className="text-emerald-400">Líquido: <strong>{formatBRL(net)}</strong></span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
                        {c.expected_date && <span>📅 Previsto: {new Date(c.expected_date).toLocaleDateString("pt-BR")}</span>}
                        {c.received_date && <span className="text-emerald-400">✅ Recebido: {new Date(c.received_date).toLocaleDateString("pt-BR")}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {c.status !== "recebido" && (
                        <button onClick={() => markReceived(c.id)} title="Marcar como recebido"
                          className="px-3 py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Recebi
                        </button>
                      )}
                      <button onClick={() => openEdit(c)} className="px-3 py-1.5 rounded-md bg-muted/40 hover:bg-muted text-foreground text-xs">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="px-2 py-1.5 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl border border-border/50 p-6 w-full max-w-lg my-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{editing ? "Editar" : "Nova"} Comissão</h3>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Lead *</label>
                  <select value={form.lead_id || ""} onChange={(e) => setForm({ ...form, lead_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm">
                    <option value="">Selecione...</option>
                    {leads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.phone}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                    <select value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm">
                      <option value="venda">Venda</option>
                      <option value="locacao">Locação</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm">
                      {COMMISSION_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Valor da venda (VGV)</label>
                  <CurrencyInput value={form.deal_value || 0} onChange={(v) => setForm(recalc({ ...form, deal_value: v }))}
                    className="w-full py-2 rounded-lg bg-background border border-border/50 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Comissão (%)</label>
                    <input type="number" step="0.01" value={form.commission_percent || 0}
                      onChange={(e) => setForm(recalc({ ...form, commission_percent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Comissão (R$)</label>
                    <input value={formatBRL(form.commission_value || 0)} disabled
                      className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-sm text-primary font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Data prevista</label>
                    <input type="date" value={form.expected_date || ""}
                      onChange={(e) => setForm({ ...form, expected_date: e.target.value || null })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Data recebimento</label>
                    <input type="date" value={form.received_date || ""}
                      onChange={(e) => setForm({ ...form, received_date: e.target.value || null })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                  </div>
                </div>

                <div className="pt-3 border-t border-border/30">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Parceria (opcional)</p>
                  <div className="space-y-2">
                    <select value={form.partner_id || ""} onChange={(e) => setForm({ ...form, partner_id: e.target.value || null })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm">
                      <option value="">Sem parceiro</option>
                      {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {form.partner_id && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">% do parceiro</label>
                          <input type="number" step="0.01" value={form.partner_percent || 0}
                            onChange={(e) => setForm(recalc({ ...form, partner_percent: parseFloat(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Valor parceiro</label>
                          <input value={formatBRL(form.partner_value || 0)} disabled
                            className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-sm" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Observações" rows={2} className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
              </div>
              <div className="flex gap-2 pt-4 mt-4 border-t border-border/30">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-border/50 text-sm">Cancelar</button>
                <button onClick={handleSave} disabled={!form.lead_id}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50">
                  {editing ? "Salvar" : "Registrar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KPI({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <p className="text-lg font-bold text-foreground truncate">{value}</p>
    </div>
  );
}
