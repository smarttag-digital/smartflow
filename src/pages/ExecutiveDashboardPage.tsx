import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, Target, TrendingUp, AlertTriangle, Trophy, Lightbulb,
  CalendarClock, Activity, Crown, Sparkles, Wallet, BarChart3, Pencil, Check,
} from "lucide-react";
import { useLeads, SOURCE_LABELS, STAGE_LABELS, getAlertLevel, isActionOverdue, isActionToday } from "@/hooks/useLeads";
import { useCommissions, useFinancialSummary } from "@/hooks/useCommissions";
import { usePartners } from "@/hooks/usePartners";
import { useGoals } from "@/hooks/useGoals";
import { formatBRL } from "@/components/CurrencyInput";
import PrivateValue from "@/components/PrivateValue";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };
const chartStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--foreground))",
  fontSize: "12px",
};

type Period = "30d" | "90d" | "ytd" | "all";

function periodStart(p: Period): Date | null {
  if (p === "all") return null;
  const d = new Date();
  if (p === "30d") d.setDate(d.getDate() - 30);
  else if (p === "90d") d.setDate(d.getDate() - 90);
  else if (p === "ytd") return new Date(d.getFullYear(), 0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function ExecutiveDashboardPage() {
  const navigate = useNavigate();
  const { leads, loading: loadingLeads } = useLeads();
  const { commissions, loading: loadingCom } = useCommissions();
  const { partners } = usePartners();
  const { goals, setGoals } = useGoals();
  const summary = useFinancialSummary(commissions);
  const [period, setPeriod] = useState<Period>("30d");
  const [editingGoals, setEditingGoals] = useState(false);
  const [draftSales, setDraftSales] = useState(goals.salesGoal);
  const [draftCom, setDraftCom] = useState(goals.commissionGoal);

  const start = periodStart(period);
  const periodLeads = useMemo(
    () => (start ? leads.filter((l) => new Date(l.created_at) >= start) : leads),
    [leads, start]
  );

  // ---- Financial executive metrics
  const closed = periodLeads.filter((l) => l.stage === "fechamento");
  const vendas = closed.filter((l) => l.business_type === "venda");
  const totalVGV = vendas.reduce((s, l) => s + (l.deal_value || 0), 0);
  const totalVGC = vendas.reduce((s, l) => s + (l.commission_value || 0), 0);
  const ticketMedio = vendas.length > 0 ? totalVGV / vendas.length : 0;

  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);
  const vendasMes = vendas.filter((l) => l.updated_at.slice(0, 7) === monthKey);
  const vgvMes = vendasMes.reduce((s, l) => s + (l.deal_value || 0), 0);
  const vgcMes = vendasMes.reduce((s, l) => s + (l.commission_value || 0), 0);

  const salesProgress = goals.salesGoal > 0 ? Math.min(100, (vgvMes / goals.salesGoal) * 100) : 0;
  const comProgress = goals.commissionGoal > 0 ? Math.min(100, (summary.receivedThisMonth / goals.commissionGoal) * 100) : 0;

  // ---- Executive funnel
  const stages = ["novo", "atendimento", "envio_imoveis", "visita", "proposta", "cca", "fechamento"];
  const funnel = stages.map((stg) => {
    const ls = periodLeads.filter((l) => l.stage === stg);
    return {
      name: STAGE_LABELS[stg],
      count: ls.length,
      vgv: ls.reduce((s, l) => s + (l.deal_value || 0), 0),
    };
  });
  const topCount = Math.max(...funnel.map((f) => f.count), 1);

  // ---- Source performance
  const sourceStats = useMemo(() => {
    const map: Record<string, { total: number; closed: number; vgv: number; vgc: number }> = {};
    periodLeads.forEach((l) => {
      const label = SOURCE_LABELS[l.source] || l.source;
      if (!map[label]) map[label] = { total: 0, closed: 0, vgv: 0, vgc: 0 };
      map[label].total++;
      if (l.stage === "fechamento") {
        map[label].closed++;
        map[label].vgv += l.deal_value || 0;
        map[label].vgc += l.commission_value || 0;
      }
    });
    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        ...d,
        conv: d.total > 0 ? Math.round((d.closed / d.total) * 100) : 0,
      }))
      .sort((a, b) => b.vgv - a.vgv);
  }, [periodLeads]);

  const bestSource = sourceStats[0];

  // ---- Partner ranking (by lead.assigned_to matching partner name OR commission.partner_id)
  const partnerRanking = useMemo(() => {
    return partners
      .map((p) => {
        const partnerCommissions = commissions.filter((c) => c.partner_id === p.id);
        const vgv = partnerCommissions.reduce((s, c) => s + (c.deal_value || 0), 0);
        const vgc = partnerCommissions.reduce((s, c) => s + (c.partner_value || 0), 0);
        return { name: p.name, deals: partnerCommissions.length, vgv, vgc };
      })
      .filter((p) => p.deals > 0)
      .sort((a, b) => b.vgv - a.vgv)
      .slice(0, 5);
  }, [partners, commissions]);

  // ---- Monthly chart (last 6 months) — sales VGV + commissions received + expected
  const monthlyChart = useMemo(() => {
    const map: Record<string, { month: string; vgv: number; received: number; expected: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = d.toISOString().slice(0, 7);
      map[k] = {
        month: d.toLocaleDateString("pt-BR", { month: "short" }),
        vgv: 0,
        received: 0,
        expected: 0,
      };
    }
    vendas.forEach((l) => {
      const k = l.updated_at.slice(0, 7);
      if (map[k]) map[k].vgv += l.deal_value || 0;
    });
    commissions.forEach((c) => {
      const net = (c.commission_value || 0) - (c.partner_value || 0);
      if (c.status === "recebido" && c.received_date) {
        const k = c.received_date.slice(0, 7);
        if (map[k]) map[k].received += net;
      } else if (c.expected_date) {
        const k = c.expected_date.slice(0, 7);
        if (map[k]) map[k].expected += net;
      }
    });
    return Object.values(map);
  }, [vendas, commissions, now]);

  // ---- Executive alerts
  const overdueActions = leads.filter((l) => isActionOverdue(l) && l.stage !== "fechamento" && l.stage !== "lead_perdido");
  const todayActions = leads.filter((l) => isActionToday(l) && !isActionOverdue(l));
  const stuckLeads = leads.filter((l) => getAlertLevel(l) === "red");
  const upcomingComs = commissions.filter((c) => {
    if (c.status !== "pendente" || !c.expected_date) return false;
    const days = (new Date(c.expected_date).getTime() - now.getTime()) / 86400000;
    return days >= 0 && days <= 7;
  });

  // ---- Insights
  const insights = useMemo(() => {
    const out: { text: string; tone: "info" | "success" | "warning" }[] = [];
    if (bestSource && bestSource.closed > 0) {
      out.push({ text: `${bestSource.name} é sua origem mais lucrativa (${formatBRL(bestSource.vgv)} em VGV)`, tone: "success" });
    }
    if (summary.expectedThisMonth > 0) {
      out.push({ text: `Você tem ${formatBRL(summary.expectedThisMonth)} previstos para este mês`, tone: "info" });
    }
    if (summary.totalOverdue > 0) {
      out.push({ text: `${formatBRL(summary.totalOverdue)} em comissões atrasadas — priorize cobrança`, tone: "warning" });
    }
    if (salesProgress >= 100) {
      out.push({ text: `Meta de vendas batida este mês! 🎉`, tone: "success" });
    } else if (salesProgress >= 70) {
      out.push({ text: `Faltam ${formatBRL(goals.salesGoal - vgvMes)} para a meta de vendas`, tone: "info" });
    }
    sourceStats.forEach((s) => {
      if (s.total >= 5 && s.closed === 0) {
        out.push({ text: `${s.name} traz leads mas não fecha (${s.total} sem conversão)`, tone: "warning" });
      }
    });
    return out.slice(0, 5);
  }, [bestSource, summary, salesProgress, sourceStats, goals, vgvMes]);

  if (loadingLeads || loadingCom) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div {...fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 rounded-md bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 text-[10px] font-semibold text-primary uppercase tracking-wider">
              Executivo
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground">Visão estratégica, financeira e gerencial do seu negócio</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate("/operacional")}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors flex items-center gap-1.5"
          >
            <Activity className="w-3.5 h-3.5" /> Operacional
          </button>
          <div className="flex gap-1.5">
            {([["30d", "30d"], ["90d", "90d"], ["ytd", "Ano"], ["all", "Tudo"]] as [Period, string][]).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setPeriod(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  period === v
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Financial executive cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: "vgv", label: "VGV Total", value: formatBRL(totalVGV), icon: DollarSign, accent: "from-emerald-500/20 to-emerald-500/5", text: "text-emerald-500" },
          { key: "vgcprev", label: "VGC Previsto", value: formatBRL(summary.totalPending + summary.totalOverdue), icon: Target, accent: "from-amber-500/20 to-amber-500/5", text: "text-amber-500" },
          { key: "vgcrec", label: "VGC Recebido", value: formatBRL(summary.totalReceived), icon: Wallet, accent: "from-primary/25 to-primary/5", text: "text-primary" },
          { key: "atraso", label: "Em Atraso", value: formatBRL(summary.totalOverdue), icon: AlertTriangle, accent: "from-destructive/25 to-destructive/5", text: "text-destructive" },
          { key: "ticket", label: "Ticket Médio", value: formatBRL(ticketMedio), icon: BarChart3, accent: "from-blue-500/20 to-blue-500/5", text: "text-blue-500" },
          { key: "meta", label: "Meta do Mês", value: `${Math.round(salesProgress)}%`, icon: Trophy, accent: "from-purple-500/20 to-purple-500/5", text: "text-purple-500", financial: false },
        ].map((c, i) => (
          <motion.div
            key={c.key}
            {...fadeUp}
            transition={{ delay: i * 0.04 }}
            className={`relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br ${c.accent} p-4 backdrop-blur-sm`}
          >
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`w-4 h-4 ${c.text}`} />
              <span className="text-[11px] text-muted-foreground font-medium truncate">{c.label}</span>
            </div>
            <p className={`text-xl font-bold ${c.text} truncate`}>
              {c.financial === false ? c.value : <PrivateValue value={c.value} revealKey={`exec-${c.key}`} />}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Goals */}
      <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="rounded-xl border border-border/50 bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" /> Metas do Mês
          </h2>
          {editingGoals ? (
            <button
              onClick={() => {
                setGoals({ salesGoal: draftSales, commissionGoal: draftCom });
                setEditingGoals(false);
              }}
              className="text-xs flex items-center gap-1 text-primary hover:text-primary/80"
            >
              <Check className="w-3.5 h-3.5" /> Salvar
            </button>
          ) : (
            <button
              onClick={() => {
                setDraftSales(goals.salesGoal);
                setDraftCom(goals.commissionGoal);
                setEditingGoals(true);
              }}
              className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar metas
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Meta de Vendas (VGV)</span>
              {editingGoals ? (
                <input
                  type="number"
                  value={draftSales}
                  onChange={(e) => setDraftSales(Number(e.target.value))}
                  className="w-32 bg-background border border-border rounded px-2 py-0.5 text-xs text-right"
                />
              ) : (
                <span className="font-semibold text-foreground">
                  <PrivateValue value={`${formatBRL(vgvMes)} / ${formatBRL(goals.salesGoal)}`} revealKey="goal-sales" />
                </span>
              )}
            </div>
            <Progress value={salesProgress} className="h-2.5" />
            <p className="text-[10px] text-muted-foreground mt-1.5">{Math.round(salesProgress)}% atingido</p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Meta de Comissão</span>
              {editingGoals ? (
                <input
                  type="number"
                  value={draftCom}
                  onChange={(e) => setDraftCom(Number(e.target.value))}
                  className="w-32 bg-background border border-border rounded px-2 py-0.5 text-xs text-right"
                />
              ) : (
                <span className="font-semibold text-foreground">
                  <PrivateValue
                    value={`${formatBRL(summary.receivedThisMonth)} / ${formatBRL(goals.commissionGoal)}`}
                    revealKey="goal-com"
                  />
                </span>
              )}
            </div>
            <Progress value={comProgress} className="h-2.5" />
            <p className="text-[10px] text-muted-foreground mt-1.5">{Math.round(comProgress)}% atingido</p>
          </div>
        </div>
      </motion.div>

      {/* Insights */}
      {insights.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.18 }} className="rounded-xl border border-border/50 bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-warning" /> Insights Automáticos
          </h2>
          <div className="grid md:grid-cols-2 gap-2">
            {insights.map((i, idx) => (
              <div
                key={idx}
                className={`text-xs p-3 rounded-lg border flex items-start gap-2 ${
                  i.tone === "warning"
                    ? "bg-warning/10 border-warning/20 text-warning"
                    : i.tone === "success"
                    ? "bg-success/10 border-success/20 text-success"
                    : "bg-primary/10 border-primary/20 text-primary"
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{i.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Executive funnel */}
      <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="rounded-xl border border-border/50 bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Funil Executivo
        </h2>
        <div className="space-y-2.5">
          {funnel.map((f, idx) => {
            const width = topCount > 0 ? (f.count / topCount) * 100 : 0;
            const prev = idx > 0 ? funnel[idx - 1].count : null;
            const conv = prev && prev > 0 ? Math.round((f.count / prev) * 100) : null;
            return (
              <div key={f.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{f.name}</span>
                  <div className="flex items-center gap-3">
                    {conv !== null && (
                      <span className={`text-[10px] ${conv >= 50 ? "text-success" : conv >= 25 ? "text-warning" : "text-muted-foreground"}`}>
                        {conv}% avanço
                      </span>
                    )}
                    <span className="text-muted-foreground">{f.count} leads</span>
                    <span className="font-semibold text-success min-w-[80px] text-right">
                      <PrivateValue value={formatBRL(f.vgv)} revealKey={`funnel-${f.name}`} showToggle={false} />
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Monthly chart */}
      <motion.div {...fadeUp} transition={{ delay: 0.22 }} className="rounded-xl border border-border/50 bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Visão Mensal (6 meses)
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={monthlyChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
            />
            <Tooltip contentStyle={chartStyle} formatter={(v: number) => formatBRL(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="vgv" stroke="hsl(var(--primary))" strokeWidth={2} name="VGV" dot={{ r: 3 }} />
            <Line type="monotone" dataKey="received" stroke="#22c55e" strokeWidth={2} name="VGC Recebido" dot={{ r: 3 }} />
            <Line type="monotone" dataKey="expected" stroke="#eab308" strokeWidth={2} strokeDasharray="4 4" name="VGC Previsto" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Source performance + Partner ranking */}
      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div {...fadeUp} transition={{ delay: 0.24 }} className="rounded-xl border border-border/50 bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" /> Origens Mais Lucrativas
          </h2>
          {sourceStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados ainda</p>
          ) : (
            <div className="space-y-2">
              {sourceStats.slice(0, 6).map((s, i) => (
                <div
                  key={s.name}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                    i === 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-muted/20 border-transparent"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === 0 ? "bg-amber-500 text-background" : "bg-muted text-muted-foreground"
                  }`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.total} leads · {s.closed} fechados · {s.conv}%</p>
                  </div>
                  <p className="text-xs font-bold text-success">
                    <PrivateValue value={formatBRL(s.vgv)} revealKey={`src-${s.name}`} showToggle={false} />
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.26 }} className="rounded-xl border border-border/50 bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" /> Ranking de Parceiros
          </h2>
          {partnerRanking.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma comissão atribuída a parceiros</p>
          ) : (
            <div className="space-y-2">
              {partnerRanking.map((p, i) => (
                <div
                  key={p.name}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                    i === 0 ? "bg-primary/10 border-primary/30" : "bg-muted/20 border-transparent"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.deals} negócios</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-success">
                      <PrivateValue value={formatBRL(p.vgv)} revealKey={`p-${p.name}`} showToggle={false} />
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      <PrivateValue value={`Com: ${formatBRL(p.vgc)}`} revealKey={`pc-${p.name}`} showToggle={false} />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Executive alerts */}
      <motion.div {...fadeUp} transition={{ delay: 0.28 }} className="rounded-xl border border-border/50 bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" /> Alertas Executivos
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => navigate("/leads")}
            className="text-left p-3 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Leads parados</p>
            <p className="text-xl font-bold text-destructive">{stuckLeads.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">+48h sem resposta</p>
          </button>
          <button
            onClick={() => navigate("/leads")}
            className="text-left p-3 rounded-lg border border-warning/30 bg-warning/5 hover:bg-warning/10 transition-colors"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ações Atrasadas</p>
            <p className="text-xl font-bold text-warning">{overdueActions.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">tarefas em atraso</p>
          </button>
          <button
            onClick={() => navigate("/leads")}
            className="text-left p-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Agendado hoje</p>
            <p className="text-xl font-bold text-primary">{todayActions.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">visitas e contatos</p>
          </button>
          <button
            onClick={() => navigate("/finance")}
            className="text-left p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Comissões a vencer</p>
            <p className="text-xl font-bold text-amber-500">{upcomingComs.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">nos próximos 7 dias</p>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
