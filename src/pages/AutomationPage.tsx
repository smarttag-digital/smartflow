import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, MessageSquare, Clock, ToggleLeft, ToggleRight, Pencil } from "lucide-react";
import { MOCK_AUTOMATIONS, AutomationRule } from "@/data/mockData";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>(MOCK_AUTOMATIONS);
  const [editingId, setEditingId] = useState<string | null>(null);

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const updateMessage = (id: string, message: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, message } : r)));
  };

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
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {rule.delay}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Gatilho: {rule.trigger}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => toggleRule(rule.id)} className="flex-shrink-0">
                {rule.enabled ? (
                  <ToggleRight className="w-8 h-8 text-primary" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                )}
              </button>
            </div>

            <div className="bg-muted/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Mensagem
                </span>
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
