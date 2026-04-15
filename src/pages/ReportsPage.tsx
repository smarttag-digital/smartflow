import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Clock, DollarSign, Home } from "lucide-react";
import { useLeads, SOURCE_LABELS } from "@/hooks/useLeads";
import { formatBRL } from "@/components/CurrencyInput";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };
const chartStyle = { background: "hsl(230 20% 12%)", border: "1px solid hsl(230 15% 18%)", borderRadius: "8px", color: "#fff", fontSize: "12px" };
const PIE_COLORS = ["#f97316", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6", "#ef4444"];

export default function ReportsPage() {
  const { leads, loading } = useLeads();

  const vendas = leads.filter((l) => l.business_type === "venda" && l.stage === "fechamento");
  const locacoes = leads.filter((l) => l.business_type === "locacao" && l.stage === "fechamento");
  const totalVGV = vendas.reduce((s, l) => s + (l.deal_value || 0), 0);
  const totalVGC = vendas.reduce((s, l) => s + (l.commission_value || 0), 0);
  const totalRentRevenue = locacoes.reduce((s, l) => s + (l.rent_value || 0), 0);
  const totalRentCommission = locacoes.reduce((s, l) => s + (l.commission_value || 0), 0);
  const hotLeads = leads.filter((l) => l.score === "hot").length;
  const conversionRate = leads.length > 0 ? Math.round(((vendas.length + locacoes.length) / leads.length) * 100) : 0;

  const sourceData = Object.entries(
    leads.reduce((acc, l) => {
      const label = SOURCE_LABELS[l.source] || l.source;
      if (!acc[label]) acc[label] = { total: 0, hot: 0 };
      acc[label].total++;
      if (l.score === "hot") acc[label].hot++;
      return acc;
    }, {} as Record<string, { total: number; hot: number }>)
  ).map(([name, data]) => ({ name, ...data }));

  const businessTypeData = [
    { name: "Venda", value: leads.filter((l) => l.business_type === "venda").length },
    { name: "Locação", value: leads.filter((l) => l.business_type === "locacao").length },
  ];

  const fmt = (v: number) => formatBRL(v);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div {...fadeUp}>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Análise de performance e conversão</p>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total de Leads", value: leads.length, icon: Users },
          { label: "Taxa de Conversão", value: `${conversionRate}%`, icon: TrendingUp },
          { label: "Leads Quentes", value: hotLeads, icon: BarChart3 },
          { label: "Fechamentos", value: vendas.length + locacoes.length, icon: Clock },
        ].map((s, i) => (
          <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.05 }} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4 text-primary" />
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Financial - Vendas */}
      <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" /> Vendas
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground">VGV Total</p>
            <p className="text-lg font-bold text-foreground">{fmt(totalVGV)}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground">Comissão Total (VGC)</p>
            <p className="text-lg font-bold text-success">{fmt(totalVGC)}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground">Qtd. Vendas</p>
            <p className="text-lg font-bold text-foreground">{vendas.length}</p>
          </div>
        </div>
      </motion.div>

      {/* Financial - Locações */}
      <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Home className="w-4 h-4 text-primary" /> Locações
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground">Receita Mensal</p>
            <p className="text-lg font-bold text-foreground">{fmt(totalRentRevenue)}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground">Comissão Locação</p>
            <p className="text-lg font-bold text-success">{fmt(totalRentCommission)}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground">Qtd. Locações</p>
            <p className="text-lg font-bold text-foreground">{locacoes.length}</p>
          </div>
        </div>
      </motion.div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Performance por Origem</h3>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sourceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 15% 18%)" />
                <XAxis type="number" tick={{ fill: "hsl(230 10% 55%)", fontSize: 11 }} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "hsl(230 10% 55%)", fontSize: 11 }} axisLine={false} width={80} />
                <Tooltip contentStyle={chartStyle} />
                <Bar dataKey="total" fill="#f97316" radius={[0, 6, 6, 0]} name="Total" />
                <Bar dataKey="hot" fill="#22c55e" radius={[0, 6, 6, 0]} name="Quentes" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Adicione leads para ver o gráfico</p>
          )}
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Venda vs Locação</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={businessTypeData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {businessTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={chartStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center mt-2">
            {businessTypeData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
