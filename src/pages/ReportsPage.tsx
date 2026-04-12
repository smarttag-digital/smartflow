import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Clock } from "lucide-react";
import { MOCK_LEADS, SOURCE_LABELS, STAGE_LABELS } from "@/data/mockData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };
const chartStyle = { background: "hsl(230 20% 12%)", border: "1px solid hsl(230 15% 18%)", borderRadius: "8px", color: "#fff", fontSize: "12px" };

export default function ReportsPage() {
  const weekData = [
    { day: "Seg", leads: 4, conversions: 1 },
    { day: "Ter", leads: 6, conversions: 2 },
    { day: "Qua", leads: 3, conversions: 1 },
    { day: "Qui", leads: 8, conversions: 3 },
    { day: "Sex", leads: 5, conversions: 2 },
    { day: "Sáb", leads: 2, conversions: 0 },
    { day: "Dom", leads: 1, conversions: 0 },
  ];

  const responseData = [
    { hour: "8h", time: 15 },
    { hour: "10h", time: 8 },
    { hour: "12h", time: 22 },
    { hour: "14h", time: 12 },
    { hour: "16h", time: 5 },
    { hour: "18h", time: 18 },
    { hour: "20h", time: 30 },
  ];

  const sourcePerformance = Object.entries(
    MOCK_LEADS.reduce((acc, l) => {
      const key = SOURCE_LABELS[l.source];
      if (!acc[key]) acc[key] = { total: 0, hot: 0 };
      acc[key].total++;
      if (l.score === "hot") acc[key].hot++;
      return acc;
    }, {} as Record<string, { total: number; hot: number }>)
  ).map(([name, data]) => ({ name, ...data, rate: Math.round((data.hot / data.total) * 100) }));

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div {...fadeUp}>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Análise de performance e conversão</p>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Leads esta semana", value: "29", icon: Users, delta: "+12%" },
          { label: "Taxa de conversão", value: "18%", icon: TrendingUp, delta: "+3%" },
          { label: "Tempo médio resposta", value: "2.4h", icon: Clock, delta: "-15min" },
          { label: "Leads quentes", value: "8", icon: BarChart3, delta: "+2" },
        ].map((s, i) => (
          <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.05 }} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4 text-primary" />
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-success mt-1">{s.delta} vs semana anterior</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Leads & Conversões por Dia</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 15% 18%)" />
              <XAxis dataKey="day" tick={{ fill: "hsl(230 10% 55%)", fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: "hsl(230 10% 55%)", fontSize: 11 }} axisLine={false} />
              <Tooltip contentStyle={chartStyle} />
              <Area type="monotone" dataKey="leads" stroke="#f97316" fill="#f97316" fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="conversions" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Tempo de Resposta (min)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={responseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 15% 18%)" />
              <XAxis dataKey="hour" tick={{ fill: "hsl(230 10% 55%)", fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: "hsl(230 10% 55%)", fontSize: 11 }} axisLine={false} />
              <Tooltip contentStyle={chartStyle} />
              <Line type="monotone" dataKey="time" stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Source performance */}
      <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Performance por Origem</h3>
        <ResponsiveContainer width="100%" height={220}>
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
  );
}
