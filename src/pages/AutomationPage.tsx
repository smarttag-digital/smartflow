import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap, MessageSquare, Clock, ToggleLeft, ToggleRight, Pencil, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Rule {
  id: string;
  name: string;
  trigger_type: string;
  action: string;
  message: string;
  enabled: boolean;
  delay: string;
}

const DEFAULT_RULES = [
  { name: "Boas-vindas", trigger_type: "Lead criado", action: "whatsapp", message: "Olá {nome}! Recebemos seu interesse em {interesse}. Um de nossos corretores entrará em contato em breve!", delay: "Imediato" },
  { name: "Follow-up 24h", trigger_type: "24h sem resposta", action: "whatsapp", message: "Olá {nome}! Notei que ainda não conseguimos conversar. Posso ajudar com alguma dúvida sobre {interesse}?", delay: "24 horas" },
  { name: "Reativação 72h", trigger_type: "72h sem resposta", action: "whatsapp", message: "{nome}, temos novidades! Novos imóveis que podem te interessar. Quer dar uma olhada?", delay: "72 horas" },
  { name: "Pós-visita", trigger_type: "Após visita", action: "whatsapp", message: "Olá {nome}! Como foi sua impressão do imóvel? Ficou com alguma dúvida?", delay: "2 horas" },
];

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function AutomationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("automation_rules").select("*").order("created_at");
    if (data && data.length > 0) {
      setRules(data as Rule[]);
    } else {
      // Seed default rules
      const toInsert = DEFAULT_RULES.map((r) => ({ ...r, user_id: user.id, enabled: true }));
      const { data: inserted } = await supabase.from("automation_rules").insert(toInsert).select();
      setRules((inserted as Rule[]) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const toggleRule = async (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (!rule) return;
    await supabase.from("automation_rules").update({ enabled: !rule.enabled }).eq("id", id);
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const updateMessage = async (id: string, message: string) => {
    await supabase.from("automation_rules").update({ message }).eq("id", id);
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, message } : r)));
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div {...fadeUp}>
        <h1 className="text-2xl font-bold text-foreground">Automação</h1>
        <p className="text-sm text-muted-foreground">Configure follow-ups automáticos via WhatsApp</p>
      </motion.div>

      <div className="space-y-3">
        {rules.map((rule, i) => (
          <motion.div key={rule.id} {...fadeUp} transition={{ delay: i * 0.05 }} className="glass-card p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${rule.enabled ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"}`}>
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{rule.name}</h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {rule.delay}</span>
                    <span className="text-[10px] text-muted-foreground">Gatilho: {rule.trigger_type}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => toggleRule(rule.id)} className="flex-shrink-0">
                {rule.enabled ? <ToggleRight className="w-8 h-8 text-primary" /> : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
              </button>
            </div>
            <div className="bg-muted/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Mensagem</span>
                <button onClick={() => setEditingId(editingId === rule.id ? null : rule.id)} className="text-[10px] text-primary flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> Editar
                </button>
              </div>
              {editingId === rule.id ? (
                <textarea
                  value={rule.message}
                  onChange={(e) => updateMessage(rule.id, e.target.value)}
                  className="w-full bg-muted/40 border border-border/50 rounded-lg px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                  rows={3}
                />
              ) : (
                <p className="text-xs text-foreground/80">{rule.message}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
