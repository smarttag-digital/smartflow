import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  AlertTriangle,
  Flame,
  TrendingUp,
  Clock,
  MessageSquare,
  Eye,
  ArrowRight,
} from "lucide-react";
import { useLeads, DbLead } from "@/hooks/useLeads";
import { useProfile } from "@/hooks/useProfile";
import { SCORE_CONFIG, SOURCE_LABELS } from "@/data/mockData";
import type { LeadSource, LeadScore } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useNavigate } from "react-router-dom";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

function getAlertLevel(lead: DbLead): "red" | "yellow" | "none" {
  const ref = lead.last_contact || lead.created_at;
  if (!ref) return "none";
  const h = Math.round((Date.now() - new Date(ref).getTime()) / 3600000);
  if (!lead.last_response) {
    if (h >= 48) return "red";
    if (h >= 24) return "yellow";
  }
  return "none";
}

function openWhatsApp(phone: string, message?: string) {
  const url = message ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/${phone}`;
  window.open(url, "_blank");
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { leads, loading } = useLeads();
  const { profile } = useProfile();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalLeads = leads.length;
  const newToday = leads.filter((l) => new Date(l.created_at) >= today).length;
  const noResponse = leads.filter((l) => getAlertLevel(l) !== "none").length;
  const hotLeads = leads.filter((l) => l.score === "hot").length;
  const conversionRate = totalLeads > 0 ? Math.round((leads.filter((l) => l.stage === "fechamento").length / totalLeads) * 100) : 0;

  const urgentLeads = leads.filter((l) => getAlertLevel(l) === "red");
  const warningLeads = leads.filter((l) => getAlertLevel(l) === "yellow");
  const hotLeadsList = leads.filter((l) => l.score === "hot");

  const sourceData = Object.entries(
    leads.reduce((acc, l) => {
      const label = SOURCE_LABELS[l.source as LeadSource] || l.source;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const stageData = [
    { name: "Novo", value: leads.filter((l) => l.stage === "novo").length },
    { name: "Atendimento", value: leads.filter((l) => l.stage === "atendimento").length },
    { name: "Envio", value: leads.filter((l) => l.stage === "envio_imoveis").length },
    { name: "Visita", value: leads.filter((l) => l.stage === "visita").length },
    { name: "Proposta", value: leads.filter((l) => l.stage === "proposta").length },
    { name: "Fechamento", value: leads.filter((l) => l.stage === "fechamento").length },
  ];

  const PIE_COLORS = ["#f97316", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6", "#ef4444"];

  const stats = [
    { label: "Total de Leads", value: totalLeads, icon: Users, color: "text-primary" },
    { label: "Novos Hoje", value: newToday, icon: UserPlus, color: "text-success" },
    { label: "Sem Resposta", value: noResponse, icon: AlertTriangle, color: "text-destructive", urgent: noResponse > 0 },
    { label: "Leads Quentes", value: hotLeads, icon: Flame, color: "text-primary" },
    { label: "Taxa Conversão", value: `${conversionRate}%`, icon: TrendingUp, color: "text-primary" },
    { label: "Total Fontes", value: sourceData.length, icon: Clock, color: "text-muted-foreground" },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando dashboard...</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <motion.div {...fadeUp}>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {profile?.full_name ? `Olá, ${profile.full_name}! ` : ""}Visão geral da sua operação
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.05 }} className={`glass-card p-4 ${s.urgent ? "alert-red" : ""}`}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-[11px] text-muted-foreground font-medium truncate">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="glass-card p-5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-primary" /> Ações Prioritárias
          </h2>
          <div className="space-y-2">
            {hotLeadsList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum lead quente no momento</p>
            ) : hotLeadsList.slice(0, 3).map((lead) => (
              <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{lead.interest}</p>
                </div>
                <button onClick={() => openWhatsApp(lead.phone)} className="whatsapp-btn px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Responder
                </button>
              </div>
            ))}
            <button onClick={() => navigate("/leads")} className="w-full text-xs text-primary hover:text-primary/80 flex items-center justify-center gap-1 pt-2">
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
                    <button onClick={() => openWhatsApp(lead.phone)} className="whatsapp-btn px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
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
                    <button onClick={() => openWhatsApp(lead.phone)} className="whatsapp-btn px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Agora
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </motion.div>
      </div>

      {leads.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4">
          <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="glass-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" /> Leads por Origem
            </h2>
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
      )}
    </div>
  );
}
