import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, Facebook, Search as SearchIcon, Link2, Copy, Check, ArrowRight } from "lucide-react";
import { useLeads, SOURCE_LABELS } from "@/hooks/useLeads";

const CHANNELS = [
  { id: "meta_ads", label: "Meta Ads", icon: Facebook, color: "text-[#1877F2]", desc: "Facebook & Instagram Ads" },
  { id: "google", label: "Google", icon: SearchIcon, color: "text-[#4285F4]", desc: "Google Ads & Forms" },
  { id: "zap_imoveis", label: "Zap Imóveis", icon: Globe, color: "text-primary", desc: "Portal Zap Imóveis" },
  { id: "viva_real", label: "Viva Real", icon: Globe, color: "text-success", desc: "Portal Viva Real" },
  { id: "olx", label: "OLX", icon: Globe, color: "text-warning", desc: "Portal OLX" },
  { id: "webhook", label: "Webhook", icon: Link2, color: "text-accent-foreground", desc: "Integração externa" },
];

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function CapturePage() {
  const [copied, setCopied] = useState(false);
  const { leads } = useLeads();
  const webhookUrl = "https://api.smarttag.com/webhook/leads/abc123xyz";

  const recentLeads = [...leads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  const leadsPerSource = CHANNELS.map((ch) => ({
    ...ch,
    count: leads.filter((l) => l.source === ch.id).length,
  }));

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div {...fadeUp}>
        <h1 className="text-2xl font-bold text-foreground">Entrada de Leads</h1>
        <p className="text-sm text-muted-foreground">Central única de captação de leads imobiliários</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {leadsPerSource.map((ch, i) => (
          <motion.div key={ch.id} {...fadeUp} transition={{ delay: i * 0.05 }} className="glass-card-hover p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center ${ch.color}`}>
                <ch.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{ch.label}</h3>
                <p className="text-[10px] text-muted-foreground">{ch.desc}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-foreground">{ch.count}</span>
              <span className="text-[10px] text-success bg-success/10 px-2 py-0.5 rounded-full">Ativo</span>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="glass-card p-5">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Link2 className="w-4 h-4 text-primary" /> Webhook Genérico
        </h2>
        <p className="text-xs text-muted-foreground mb-3">Use esta URL para receber leads de qualquer plataforma externa.</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-muted/40 border border-border/50 rounded-lg px-3 py-2.5 text-xs text-foreground font-mono truncate">{webhookUrl}</code>
          <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="glass-card p-5">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <ArrowRight className="w-4 h-4 text-primary" /> Últimos Leads Capturados
        </h2>
        <div className="space-y-2">
          {recentLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum lead capturado ainda</p>
          ) : (
            recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                  <p className="text-[10px] text-muted-foreground">{lead.interest}</p>
                </div>
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{SOURCE_LABELS[lead.source] || lead.source}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
