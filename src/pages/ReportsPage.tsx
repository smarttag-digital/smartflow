import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Flame } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { SOURCE_LABELS } from "@/data/mockData";
import type { LeadSource } from "@/data/mockData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };
const chartStyle = { background: "hsl(230 20% 12%)", border: "1px solid hsl(230 15% 18%)", borderRadius: "8px", color: "#fff", fontSize: "12px" };

export default function ReportsPage() {
  const { leads, loading } = useLeads();

  const totalLeads = leads.length;
  const hotLeads = leads.filter((l) => l.score === "hot").length;
  const conversionRate = totalLeads > 0 ? Math.round((leads.filter((l) => l.stage === "fechamento").length / totalLeads) * 100) : 0;

  const sourcePerformance = Object.entries(
    leads.reduce((acc, l) => {
      const key = SOURCE_LABELS[l.source as LeadSource] || l.source;
      if (!acc[key]) acc[key] = { total: 0, hot: 0 };
      acc[key].total++;
      if (l.score === "hot") acc[key].hot++;
      return acc;
    }, {} as Record<string, { total: number; hot: number }>)
  ).map(([name, data]) => ({ name, ...data, rate: data.total > 0 ? Math.round((data.hot / data.total) * 100) : 0 }));

  const stageData = [
    { name: "Novo", value: leads.filter((l) => l.stage === "novo").length },
    { name: "Atendimento", value: leads.filter((l) => l.stage === "atendimento").length },
    { name: "Envio", value: leads.filter((l) => l.stage === "envio_imoveis").length },
    { name: "Visita", value: leads.filter((l) => l.stage === "visita").length },
    { name: "Proposta", value: leads.filter((l) => l.stage === "proposta").length },
    { name: "Fechamento", value: leads.filter((l) => l.stage === "fechamento").length },
  ];

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;

  const stats = [
    { label: "Total de Leads", value: totalLeads, icon: Users },
    { label: "Taxa de conversão", value: `${conversionRate}%`, icon: TrendingUp },
    { label: "Leads quentes", value: hotLeads, icon: Flame },
    { label: "Origens ativas", value: sourcePerformance.length, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div {...fadeUp}>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Análise de performance e conversão</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.05 }} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4 text-primary" />
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {leads.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4">
          <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Leads por Etapa</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 15% 18%)" />
                <XAxis dataKey="name" tick={{ fill: "hsl(230 10% 55%)", fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: "hsl(230 10% 55%)", fontSize: 11 }} axisLine={false} />
                <Tooltip contentStyle={chartStyle} />
                <Bar dataKey="value" fill="hsl(24 95% 53%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Performance por Origem</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sourcePerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 15% 18%)" />
                <XAxis type="number" tick={{ fill: "hsl(230 10% 55%)", fontSize: 11 }} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "hsl(230 10% 55%)", fontSize: 11 }} axisLine={false} width={80} />
                <Tooltip contentStyle={chartStyle} />
                <Bar dataKey="total" fill="#f97316" radius={[0, 6, 6, 0]} name="Total" />
                <Bar dataKey="hot" fill="#22c55e" radius={[0, 6, 6, 0]} name="Quentes" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}

      {leads.length === 0 && (
        <div className="glass-card p-8 text-center text-muted-foreground">
          <p>Nenhum dado disponível ainda. Crie leads para visualizar relatórios.</p>
        </div>
      )}
    </div>
  );
}
