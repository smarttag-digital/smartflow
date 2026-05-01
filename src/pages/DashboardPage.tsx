import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users, UserPlus, AlertTriangle, Flame, TrendingUp, Clock, MessageSquare, Eye, ArrowRight,
  CalendarClock, XCircle, DollarSign, Target, BarChart3, Lightbulb, Filter,
} from "lucide-react";
import { useLeads, getAlertLevel, openWhatsApp, SCORE_CONFIG, SOURCE_LABELS, NEXT_ACTION_OPTIONS, isActionOverdue, isActionToday, STAGE_LABELS } from "@/hooks/useLeads";
import { formatBRL } from "@/components/CurrencyInput";
import PrivateValue from "@/components/PrivateValue";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, Funnel, FunnelChart } from "recharts";
import { useNavigate } from "react-router-dom";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };
const PIE_COLORS = ["#f97316", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];
const chartStyle = { background: "hsl(230 20% 12%)", border: "1px solid hsl(230 15% 18%)", borderRadius: "8px", color: "#fff", fontSize: "12px" };

type Period = "7d" | "30d" | "90d" | "all";

function getPeriodDate(period: Period): Date | null {
  if (period === "all") return null;
  const d = new Date();
  if (period === "7d") d.setDate(d.getDate() - 7);
  else if (period === "30d") d.setDate(d.getDate() - 30);
  else if (period === "90d") d.setDate(d.getDate() - 90);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { leads, loading } = useLeads();
  const [period, setPeriod] = useState<Period>("30d");

  const periodDate = getPeriodDate(period);
  const periodLeads = useMemo(() => periodDate ? leads.filter(l => new Date(l.created_at) >= periodDate) : leads, [leads, periodDate]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeLeads = periodLeads.filter(l => l.stage !== "lead_perdido");
  const totalLeads = activeLeads.length;
  const newToday = activeLeads.filter(l => new Date(l.created_at) >= today).length;
  const noResponse = activeLeads.filter(l => getAlertLevel(l) !== "none").length;
  const hotLeads = activeLeads.filter(l => l.score === "hot").length;
  const lostLeads = periodLeads.filter(l => l.stage === "lead_perdido").length;

  // Financial
  const closedLeads = activeLeads.filter(l => l.stage === "fechamento");
  const vendas = closedLeads.filter(l => l.business_type === "venda");
  const totalVGV = vendas.reduce((s, l) => s + (l.deal_value || 0), 0);
  const totalVGC = vendas.reduce((s, l) => s + (l.commission_value || 0), 0);
  const ticketMedio = vendas.length > 0 ? totalVGV / vendas.length : 0;
  const comissaoMedia = vendas.length > 0 ? totalVGC / vendas.length : 0;
  const conversionRate = totalLeads > 0 ? Math.round((closedLeads.length / totalLeads) * 100) : 0;

  // Operational stages only (exclude cca, fechamento and lead_perdido — these don't need urgent action)
  const operationalStages = ["novo", "atendimento", "envio_imoveis", "visita", "proposta"];
  const operationalLeads = activeLeads.filter(l => operationalStages.includes(l.stage));

  const overdueActions = operationalLeads.filter(l => isActionOverdue(l));
  const todayActions = operationalLeads.filter(l => isActionToday(l) && !isActionOverdue(l));
  const urgentLeads = operationalLeads.filter(l => getAlertLevel(l) === "red");
  const warningLeads = operationalLeads.filter(l => getAlertLevel(l) === "yellow");
  const hotLeadsList = operationalLeads.filter(l => l.score === "hot");

  // CCA leads (highlighted: bank evaluation = almost closed)
  const ccaLeads = activeLeads.filter(l => l.stage === "cca");
  const ccaVGV = ccaLeads.reduce((s, l) => s + (l.deal_value || 0), 0);

  // Revenue funnel
  const funnelData = [
    { name: "Novo", value: activeLeads.filter(l => l.stage === "novo").length, vgv: activeLeads.filter(l => l.stage === "novo").reduce((s, l) => s + (l.deal_value || 0), 0) },
    { name: "Atendimento", value: activeLeads.filter(l => l.stage === "atendimento").length, vgv: activeLeads.filter(l => l.stage === "atendimento").reduce((s, l) => s + (l.deal_value || 0), 0) },
    { name: "Envio", value: activeLeads.filter(l => l.stage === "envio_imoveis").length, vgv: activeLeads.filter(l => l.stage === "envio_imoveis").reduce((s, l) => s + (l.deal_value || 0), 0) },
    { name: "Visita", value: activeLeads.filter(l => l.stage === "visita").length, vgv: activeLeads.filter(l => l.stage === "visita").reduce((s, l) => s + (l.deal_value || 0), 0) },
    { name: "Proposta", value: activeLeads.filter(l => l.stage === "proposta").length, vgv: activeLeads.filter(l => l.stage === "proposta").reduce((s, l) => s + (l.deal_value || 0), 0) },
    { name: "CCA", value: ccaLeads.length, vgv: ccaVGV },
    { name: "Fechamento", value: closedLeads.length, vgv: totalVGV },
  ];

  // Performance by source
  const sourcePerf = useMemo(() => {
    const map: Record<string, { total: number; closed: number; vgv: number; vgc: number }> = {};
    activeLeads.forEach(l => {
      const label = SOURCE_LABELS[l.source] || l.source;
      if (!map[label]) map[label] = { total: 0, closed: 0, vgv: 0, vgc: 0 };
      map[label].total++;
      if (l.stage === "fechamento") {
        map[label].closed++;
        map[label].vgv += l.deal_value || 0;
        map[label].vgc += l.commission_value || 0;
      }
    });
    return Object.entries(map).map(([name, d]) => ({
      name,
      ...d,
      conversion: d.total > 0 ? Math.round((d.closed / d.total) * 100) : 0,
    }));
  }, [activeLeads]);

  // Insights
  const insights = useMemo(() => {
    const msgs: { text: string; type: "warning" | "success" | "info" }[] = [];
    // VGV stuck in stages
    const maxStage = funnelData.slice(0, 5).reduce((max, s) => s.vgv > max.vgv ? s : max, funnelData[0]);
    if (maxStage.vgv > 0 && maxStage.name !== "Fechamento") {
      const pct = totalVGV > 0 ? Math.round((maxStage.vgv / (maxStage.vgv + totalVGV)) * 100) : 100;
      msgs.push({ text: `${formatBRL(maxStage.vgv)} em potencial parado em "${maxStage.name}"`, type: "warning" });
    }
    // Open proposals
    const propostas = activeLeads.filter(l => l.stage === "proposta");
    const propostaVGV = propostas.reduce((s, l) => s + (l.deal_value || 0), 0);
    if (propostas.length > 0) {
      msgs.push({ text: `Você tem ${formatBRL(propostaVGV)} em propostas abertas (${propostas.length} leads)`, type: "info" });
    }
    // Source without conversion
    sourcePerf.forEach(s => {
      if (s.total >= 3 && s.closed === 0) {
        msgs.push({ text: `"${s.name}" gera leads mas não gera vendas (${s.total} leads, 0 fechamentos)`, type: "warning" });
      }
    });
    if (conversionRate > 20) {
      msgs.push({ text: `Taxa de conversão de ${conversionRate}% — excelente!`, type: "success" });
    }
    return msgs;
  }, [funnelData, activeLeads, sourcePerf, conversionRate, totalVGV]);

  // Source pie data
  const sourceData = Object.entries(
    activeLeads.reduce((acc, l) => {
      const label = SOURCE_LABELS[l.source] || l.source;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <motion.div {...fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral da sua operação de vendas</p>
        </div>
        <div className="flex gap-1.5">
          {([["7d", "7 dias"], ["30d", "30 dias"], ["90d", "90 dias"], ["all", "Todos"]] as [Period, string][]).map(([v, label]) => (
            <button key={v} onClick={() => setPeriod(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${period === v ? "bg-primary/15 text-primary border-primary/30" : "border-border/50 text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Financial Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: "vgv", label: "VGV Total", value: formatBRL(totalVGV), icon: DollarSign, color: "text-success", financial: true },
          { key: "vgc", label: "VGC Total", value: formatBRL(totalVGC), icon: Target, color: "text-primary", financial: true },
          { key: "ticket", label: "Ticket Médio", value: formatBRL(ticketMedio), icon: BarChart3, color: "text-foreground", financial: true },
          { key: "conv", label: "Conversão", value: `${conversionRate}%`, icon: TrendingUp, color: conversionRate > 15 ? "text-success" : "text-warning", financial: false },
          { key: "leads", label: "Total Leads", value: String(totalLeads), icon: Users, color: "text-foreground", financial: false },
          { key: "hot", label: "Leads Quentes", value: String(hotLeads), icon: Flame, color: "text-hot", financial: false },
        ].map((s, i) => (
          <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.05 }}
            className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-[11px] text-muted-foreground font-medium truncate">{s.label}</span>
            </div>
            <p className={`text-xl font-bold ${s.color} truncate`}>
              {s.financial ? <PrivateValue value={s.value} revealKey={`dash-${s.key}`} /> : s.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Novos Hoje", value: newToday, icon: UserPlus, color: "text-success" },
          { label: "Sem Resposta", value: noResponse, icon: AlertTriangle, color: "text-destructive", urgent: noResponse > 0 },
          { label: "Ações Pendentes", value: overdueActions.length + todayActions.length, icon: CalendarClock, color: "text-warning", urgent: overdueActions.length > 0 },
          { label: "Leads Perdidos", value: lostLeads, icon: XCircle, color: "text-destructive" },
        ].map((s, i) => (
          <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.03 }}
            className={`glass-card p-3 ${s.urgent ? "alert-red animate-pulse-glow" : ""}`}>
            <div className="flex items-center gap-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-[11px] text-muted-foreground font-medium truncate">{s.label}</span>
              <p className={`text-lg font-bold ${s.color} ml-auto`}>{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="glass-card p-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-warning" /> Insights
          </h2>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div key={i} className={`text-xs p-2.5 rounded-lg border ${
                insight.type === "warning" ? "bg-warning/10 border-warning/20 text-warning" :
                insight.type === "success" ? "bg-success/10 border-success/20 text-success" :
                "bg-primary/10 border-primary/20 text-primary"
              }`}>
                {insight.type === "warning" ? "⚠️" : insight.type === "success" ? "✅" : "💡"} {insight.text}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tasks Today + Overdue */}
      {(overdueActions.length > 0 || todayActions.length > 0) && (
        <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="glass-card p-5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <CalendarClock className="w-4 h-4 text-primary" /> Minhas Tarefas do Dia
          </h2>
          <div className="space-y-2">
            {overdueActions.map((lead) => (
              <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg alert-red">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                  <p className="text-xs text-destructive">
                    ⏰ {NEXT_ACTION_OPTIONS.find(o => o.value === lead.next_action)?.label} — Atrasada
                  </p>
                </div>
                <button onClick={() => openWhatsApp(lead.phone)}
                  className="whatsapp-btn px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Agir
                </button>
              </div>
            ))}
            {todayActions.map((lead) => (
              <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                  <p className="text-xs text-accent-foreground">
                    📋 {NEXT_ACTION_OPTIONS.find(o => o.value === lead.next_action)?.label}
                    {lead.next_action_date && ` — ${new Date(lead.next_action_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
                  </p>
                </div>
                <button onClick={() => openWhatsApp(lead.phone)}
                  className="whatsapp-btn px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Agir
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Priority actions + Leads at risk */}
      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="glass-card p-5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-primary" /> Ações Prioritárias
          </h2>
          <div className="space-y-2">
            {hotLeadsList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum lead quente em etapas ativas</p>
            ) : (
              hotLeadsList.slice(0, 4).map((lead) => (
                <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{STAGE_LABELS[lead.stage]} · {lead.interest}</p>
                  </div>
                  <span className="score-hot text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                    {SCORE_CONFIG[lead.score]?.emoji} {SCORE_CONFIG[lead.score]?.label}
                  </span>
                  <button onClick={() => openWhatsApp(lead.phone)}
                    className="whatsapp-btn px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Agir
                  </button>
                </div>
              ))
            )}
            <button onClick={() => navigate("/leads")}
              className="w-full text-xs text-primary hover:text-primary/80 flex items-center justify-center gap-1 pt-2">
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="glass-card p-5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Leads em Risco
          </h2>
          <div className="space-y-2">
            {urgentLeads.length === 0 && warningLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum lead em risco! 🎉</p>
            ) : (
              <>
                {urgentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg alert-red">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                      <p className="text-xs text-destructive">Sem resposta há +48h</p>
                    </div>
                    <button onClick={() => openWhatsApp(lead.phone)}
                      className="whatsapp-btn px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Agora
                    </button>
                  </div>
                ))}
                {warningLeads.slice(0, 3).map((lead) => (
                  <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg alert-yellow">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                      <p className="text-xs text-warning">Sem resposta há +24h</p>
                    </div>
                    <button onClick={() => openWhatsApp(lead.phone)}
                      className="whatsapp-btn px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Agora
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Em Fechamento */}
      {closedLeads.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.28 }} className="glass-card p-5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-success" /> Em Fechamento ({closedLeads.length})
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {closedLeads.map((lead) => (
              <div key={lead.id} className="p-3 rounded-lg bg-success/5 border border-success/20">
                <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                <p className="text-xs text-muted-foreground truncate">{lead.interest}</p>
                {lead.deal_value ? (
                  <p className="text-sm font-bold text-success mt-1">{formatBRL(lead.deal_value)}</p>
                ) : lead.rent_value ? (
                  <p className="text-sm font-bold text-success mt-1">{formatBRL(lead.rent_value)}/mês</p>
                ) : null}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Revenue Funnel */}
      <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="glass-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Funil de Receita (VGV por Etapa)
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={funnelData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 15% 18%)" />
            <XAxis dataKey="name" tick={{ fill: "hsl(230 10% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(230 10% 55%)", fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip contentStyle={chartStyle}
              formatter={(value: number) => [formatBRL(value), "VGV"]}
            />
            <Bar dataKey="vgv" fill="hsl(24 95% 53%)" radius={[6, 6, 0, 0]} name="VGV" />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 mt-3 justify-center">
          {funnelData.map((s) => (
            <div key={s.name} className="text-center">
              <p className="text-[10px] text-muted-foreground">{s.name}</p>
              <p className="text-xs font-bold text-foreground">{s.value} leads</p>
              <p className="text-[10px] text-success">{formatBRL(s.vgv)}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Performance by Source */}
        <motion.div {...fadeUp} transition={{ delay: 0.35 }} className="glass-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> Performance por Origem
          </h2>
          {sourcePerf.length > 0 ? (
            <div className="space-y-2">
              {sourcePerf.sort((a, b) => b.vgv - a.vgv).map((s) => (
                <div key={s.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.total} leads · {s.closed} fechamentos</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-success">{formatBRL(s.vgv)}</p>
                    <p className="text-[10px] text-muted-foreground">{s.conversion}% conv.</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Adicione leads para ver dados</p>
          )}
        </motion.div>

        {/* Leads by Source Pie */}
        <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="glass-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> Leads por Origem
          </h2>
          {sourceData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {sourceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={chartStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {sourceData.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {s.name}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Adicione leads para ver o gráfico</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
