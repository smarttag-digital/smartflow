import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap, MessageSquare, Clock, ToggleLeft, ToggleRight, Pencil, Plus, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AutomationRule {
  id: string;
  name: string;
  trigger_type: string;
  action: string;
  message: string;
  enabled: boolean;
  delay: string;
  user_id: string;
}

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function AutomationPage() {
  const { user } = useAuth();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", trigger_type: "lead_created", action: "whatsapp", message: "", delay: "Imediato" });

  const fetchRules = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("automation_rules").select("*").order("created_at");
    setRules((data as AutomationRule[]) || []);
  }, [user]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const toggleRule = async (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (!rule) return;
    await supabase.from("automation_rules").update({ enabled: !rule.enabled }).eq("id", id);
    fetchRules();
  };

  const updateMessage = async (id: string, message: string) => {
    await supabase.from("automation_rules").update({ message }).eq("id", id);
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, message } : r)));
  };

  const createRule = async () => {
    if (!user || !formData.name.trim()) { toast.error("Nome é obrigatório"); return; }
    await supabase.from("automation_rules").insert({ ...formData, user_id: user.id } as any);
    toast.success("Regra criada!");
    setShowForm(false);
    setFormData({ name: "", trigger_type: "lead_created", action: "whatsapp", message: "", delay: "Imediato" });
    fetchRules();
  };

  const deleteRule = async (id: string) => {
    await supabase.from("automation_rules").delete().eq("id", id);
    toast.success("Regra excluída");
    fetchRules();
  };

  const triggerLabels: Record<string, string> = {
    lead_created: "Lead criado",
    no_response_24h: "24h sem resposta",
    no_response_72h: "72h sem resposta",
    after_visit: "Após visita",
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div {...fadeUp}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Automação</h1>
            <p className="text-sm text-muted-foreground">Configure follow-ups automáticos via WhatsApp</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Nova Regra
          </button>
        </div>
      </motion.div>

      {/* New Rule Form */}
      {showForm && (
        <motion.div {...fadeUp} className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Nova Regra</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <div className="space-y-3">
            <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome da regra"
              className="w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <div className="grid grid-cols-2 gap-3">
              <select value={formData.trigger_type} onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
                className="px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none">
                <option value="lead_created">Lead criado</option>
                <option value="no_response_24h">24h sem resposta</option>
                <option value="no_response_72h">72h sem resposta</option>
                <option value="after_visit">Após visita</option>
              </select>
              <input value={formData.delay} onChange={(e) => setFormData({ ...formData, delay: e.target.value })}
                placeholder="Delay (ex: Imediato, 2 horas)"
                className="px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none" />
            </div>
            <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Mensagem (use {nome}, {interesse})"
              rows={3}
              className="w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground resize-none focus:outline-none" />
            <button onClick={createRule} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Criar Regra</button>
          </div>
        </motion.div>
      )}

      {rules.length === 0 && !showForm ? (
        <div className="text-center py-12">
          <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Nenhuma regra de automação</p>
          <button onClick={() => setShowForm(true)} className="text-primary text-sm mt-2">Criar primeira regra</button>
        </div>
      ) : (
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
                      <span className="text-[10px] text-muted-foreground">Gatilho: {triggerLabels[rule.trigger_type] || rule.trigger_type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => deleteRule(rule.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleRule(rule.id)}>
                    {rule.enabled ? <ToggleRight className="w-8 h-8 text-primary" /> : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
                  </button>
                </div>
              </div>
              <div className="bg-muted/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Mensagem</span>
                  <button onClick={() => setEditingId(editingId === rule.id ? null : rule.id)} className="text-[10px] text-primary flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Editar
                  </button>
                </div>
                {editingId === rule.id ? (
                  <textarea value={rule.message} onChange={(e) => updateMessage(rule.id, e.target.value)}
                    className="w-full bg-muted/40 border border-border/50 rounded-lg px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50" rows={3} />
                ) : (
                  <p className="text-xs text-foreground/80">{rule.message || "Sem mensagem configurada"}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
