import { motion } from "framer-motion";
import {
  Users, UserPlus, AlertTriangle, Flame, TrendingUp, Clock, MessageSquare, Eye, ArrowRight,
  CalendarClock, XCircle,
} from "lucide-react";
import { useLeads, getAlertLevel, openWhatsApp, SCORE_CONFIG, SOURCE_LABELS, NEXT_ACTION_OPTIONS, isActionOverdue, isActionToday } from "@/hooks/useLeads";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useNavigate } from "react-router-dom";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

export default function DashboardPage() {
  const navigate = useNavigate();
  const { leads, loading } = useLeads();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeLeads = leads.filter(l => l.stage !== "lead_perdido");
  const totalLeads = activeLeads.length;
  const newToday = activeLeads.filter((l) => new Date(l.created_at) >= today).length;
  const noResponse = activeLeads.filter((l) => getAlertLevel(l) !== "none").length;
  const hotLeads = activeLeads.filter((l) => l.score === "hot").length;
  const closedLeads = activeLeads.filter((l) => l.stage === "fechamento").length;
  const lostLeads = leads.filter(l => l.stage === "lead_perdido").length;
  const conversionRate = totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;

  const overdueActions = activeLeads.filter(l => isActionOverdue(l));
  const todayActions = activeLeads.filter(l => isActionToday(l) && !isActionOverdue(l));
  const urgentLeads = activeLeads.filter((l) => getAlertLevel(l) === "red");
  const warningLeads = activeLeads.filter((l) => getAlertLevel(l) === "yellow");
  const hotLeadsList = activeLeads.filter((l) => l.score === "hot");

  const sourceData = Object.entries(
    activeLeads.reduce((acc, l) => {
      const label = SOURCE_LABELS[l.source] || l.source;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const stageData = [
    { name: "Novo", value: activeLeads.filter((l) => l.stage === "novo").length },
    { name: "Atendimento", value: activeLeads.filter((l) => l.stage === "atendimento").length },
    { name: "Envio", value: activeLeads.filter((l) => l.stage === "envio_imoveis").length },
    { name: "Visita", value: activeLeads.filter((l) => l.stage === "visita").length },
    { name: "Proposta", value: activeLeads.filter((l) => l.stage === "proposta").length },
    { name: "Fechamento", value: closedLeads },
  ];

  const PIE_COLORS = ["#f97316", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];

  const stats = [
    { label: "Total de Leads", value: totalLeads, icon: Users, color: "text-primary" },
    { label: "Novos Hoje", value: newToday, icon: UserPlus, color: "text-success" },
    { label: "Sem Resposta", value: noResponse, icon: AlertTriangle, color: "text-destructive", urgent: noResponse > 0 },
    { label: "Leads Quentes", value: hotLeads, icon: Flame, color: "text-hot" },
    { label: "Ações Pendentes", value: overdueActions.length + todayActions.length, icon: CalendarClock, color: "text-warning", urgent: overdueActions.length > 0 },
    { label: "Leads Perdidos", value: lostLeads, icon: XCircle, color: "text-destructive" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <motion.div {...fadeUp}>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral da sua operação de vendas</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.05 }}
            className={`glass-card p-4 ${s.urgent ? "alert-red animate-pulse-glow" : ""}`}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-[11px] text-muted-foreground font-medium truncate">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

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
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum lead quente no momento</p>
            ) : (
              hotLeadsList.slice(0, 4).map((lead) => (
                <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{lead.interest}</p>
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
                {warningLeads.map((lead) => (
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

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="glass-card p-5">
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
                  <Tooltip contentStyle={{ background: "hsl(230 20% 12%)", border: "1px solid hsl(230 15% 18%)", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
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

        <motion.div {...fadeUp} transition={{ delay: 0.35 }} className="glass-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Conversão por Etapa
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 15% 18%)" />
              <XAxis dataKey="name" tick={{ fill: "hsl(230 10% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(230 10% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(230 20% 12%)", border: "1px solid hsl(230 15% 18%)", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
              <Bar dataKey="value" fill="hsl(24 95% 53%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
