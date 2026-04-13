import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MessageSquare, Phone, Mail, ChevronRight, Plus, X, Clock, Tag, Trash2,
} from "lucide-react";
import {
  useLeads, useInteractions, useProfile, Lead,
  SCORE_CONFIG, SOURCE_LABELS, STAGE_LABELS, SOURCE_OPTIONS,
  getAlertLevel, openWhatsApp,
} from "@/hooks/useLeads";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function ScoreBadge({ score }: { score: string }) {
  const cfg = SCORE_CONFIG[score];
  if (!cfg) return null;
  const cls = score === "hot" ? "score-hot" : score === "warm" ? "score-warm" : "score-cold";
  return <span className={`${cls} text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap`}>{cfg.emoji} {cfg.label}</span>;
}

function AlertIndicator({ lead }: { lead: Lead }) {
  const level = getAlertLevel(lead);
  if (level === "none") return null;
  const h = lead.last_contact ? Math.round((Date.now() - new Date(lead.last_contact).getTime()) / 3600000) : Math.round((Date.now() - new Date(lead.created_at).getTime()) / 3600000);
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${level === "red" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
      ⚠ {h}h sem resposta
    </span>
  );
}

const EMPTY_LEAD = {
  name: "", phone: "", email: "", interest: "", source: "manual", score: "cold" as string,
  stage: "novo", tags: [], notes: "", assigned_to: "", business_type: "venda",
};

export default function LeadsPage() {
  const { user } = useAuth();
  const { leads, loading, createLead, updateLead, deleteLead } = useLeads();
  const [search, setSearch] = useState("");
  const [filterScore, setFilterScore] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_LEAD);
  const [whatsappMsg, setWhatsappMsg] = useState("");
  const { profile } = useProfile();
  const { interactions, addInteraction } = useInteractions(selectedLead?.id ?? null);

  const sorted = [...leads].sort((a, b) => {
    const order: Record<string, number> = { hot: 0, warm: 1, cold: 2 };
    return (order[a.score] ?? 3) - (order[b.score] ?? 3);
  });

  const filtered = sorted.filter((l) => {
    if (filterScore !== "all" && l.score !== filterScore) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !(l.interest || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }
    const result = await createLead({
      ...formData,
      assigned_to: profile?.full_name || user?.user_metadata?.full_name || "",
    });
    if (result) {
      setShowForm(false);
      setFormData(EMPTY_LEAD);
    }
  };

  const buildWhatsAppMessage = (lead: Lead) => {
    const template = profile?.whatsapp_template || "Olá, sou {{nome_do_usuario}} da imobiliária Smart Tag 👋\nVi seu interesse em {{tipo_de_negocio}} de {{tipo_de_imovel}}.\nPosso te enviar algumas opções?";
    return template
      .replace("{{nome_do_usuario}}", profile?.full_name || user?.user_metadata?.full_name || "")
      .replace("{{tipo_de_negocio}}", lead.business_type === "locacao" ? "Locação" : "Venda")
      .replace("{{tipo_de_imovel}}", lead.interest || "imóveis");
  };

  const handleWhatsApp = async (lead: Lead, message: string) => {
    openWhatsApp(lead.phone, message);
    await addInteraction({
      type: "whatsapp",
      message: "Contato iniciado via WhatsApp",
      direction: "outbound",
    });
    await updateLead(lead.id, { last_contact: new Date().toISOString() });
  };

  const selectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setWhatsappMsg(buildWhatsAppMessage(lead));
  };

  return (
    <div className="flex h-full gap-4 max-w-7xl">
      {/* List */}
      <div className={`flex-1 flex flex-col min-w-0 ${selectedLead ? "hidden lg:flex" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leads</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} leads encontrados</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Novo Lead
          </button>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar leads..."
              className="w-full pl-9 pr-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
          {(["all", "hot", "warm", "cold"] as const).map((s) => (
            <button key={s} onClick={() => setFilterScore(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${filterScore === s ? "bg-primary/15 text-primary border-primary/30" : "border-border/50 text-muted-foreground hover:text-foreground"}`}>
              {s === "all" ? "Todos" : SCORE_CONFIG[s].emoji + " " + SCORE_CONFIG[s].label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum lead encontrado</p>
            <button onClick={() => setShowForm(true)} className="text-primary text-sm mt-2">Adicionar primeiro lead</button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2">
            {filtered.map((lead) => (
              <motion.div key={lead.id} layout onClick={() => selectLead(lead)}
                className={`glass-card-hover p-4 cursor-pointer ${selectedLead?.id === lead.id ? "border-primary/40" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground truncate">{lead.name}</h3>
                      <ScoreBadge score={lead.score} />
                      <AlertIndicator lead={lead} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{lead.interest}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{SOURCE_LABELS[lead.source] || lead.source}</span>
                      <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{STAGE_LABELS[lead.stage] || lead.stage}</span>
                      <span className="text-[10px] text-primary/80 bg-primary/10 px-2 py-0.5 rounded">{lead.business_type === "locacao" ? "Locação" : "Venda"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); handleWhatsApp(lead, buildWhatsAppMessage(lead)); }}
                      className="whatsapp-btn p-2 rounded-lg" title="Abrir WhatsApp">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground hidden lg:block" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* New Lead Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Novo Lead</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
                  <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Telefone *</label>
                  <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="5511999999999"
                    className="w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                  <input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Interesse</label>
                  <input value={formData.interest} onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                    placeholder="Apartamento 3 quartos - Zona Sul"
                    className="w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Tipo de Negócio *</label>
                    <select value={formData.business_type} onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                      className="w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                      <option value="venda">Venda</option>
                      <option value="locacao">Locação</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Origem</label>
                    <select value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                      {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Score</label>
                    <select value={formData.score} onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                      className="w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                      <option value="cold">❄️ Frio</option>
                      <option value="warm">🌡️ Morno</option>
                      <option value="hot">🔥 Quente</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Etapa</label>
                    <select value={formData.stage} onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                      className="w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                      <option value="novo">Novo Lead</option>
                      <option value="atendimento">Atendimento</option>
                      <option value="envio_imoveis">Envio de Imóveis</option>
                      <option value="visita">Visita</option>
                      <option value="proposta">Proposta</option>
                      <option value="fechamento">Fechamento</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Notas</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <button onClick={handleCreate}
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
                  Criar Lead
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedLead && (
          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
            className="w-full lg:w-[420px] flex-shrink-0 glass-card p-5 overflow-y-auto flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">{selectedLead.name}</h2>
                <p className="text-xs text-muted-foreground">{selectedLead.interest}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={async () => { await deleteLead(selectedLead.id); setSelectedLead(null); }}
                  className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button>
                <button onClick={() => setSelectedLead(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* WhatsApp message editor */}
            <div className="mb-4 p-3 rounded-lg bg-success/5 border border-success/20">
              <label className="text-xs font-medium text-foreground mb-2 block flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 text-success" /> Mensagem WhatsApp
              </label>
              <textarea value={whatsappMsg} onChange={(e) => setWhatsappMsg(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-success/50 mb-2" />
              <button onClick={() => handleWhatsApp(selectedLead, whatsappMsg)}
                className="whatsapp-btn w-full py-2 rounded-lg text-sm flex items-center justify-center gap-2">
                <MessageSquare className="w-4 h-4" /> Enviar no WhatsApp
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mb-4">
              <button className="flex-1 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 bg-muted/50 text-foreground hover:bg-muted/70 transition-colors border border-border/50">
                <Phone className="w-4 h-4" /> Ligar
              </button>
              <button className="flex-1 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 bg-muted/50 text-foreground hover:bg-muted/70 transition-colors border border-border/50">
                <Mail className="w-4 h-4" /> Email
              </button>
            </div>

            {/* Info */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <ScoreBadge score={selectedLead.score} />
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{STAGE_LABELS[selectedLead.stage]}</span>
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{SOURCE_LABELS[selectedLead.source] || selectedLead.source}</span>
                <span className="text-[10px] text-primary/80 bg-primary/10 px-2 py-0.5 rounded">{selectedLead.business_type === "locacao" ? "Locação" : "Venda"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5">Telefone</p>
                  <p className="text-foreground font-medium">{selectedLead.phone}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5">Email</p>
                  <p className="text-foreground font-medium truncate">{selectedLead.email}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5">Corretor</p>
                  <p className="text-foreground font-medium">{selectedLead.assigned_to}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5">Criado em</p>
                  <p className="text-foreground font-medium">{new Date(selectedLead.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              {selectedLead.tags && selectedLead.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  {selectedLead.tags.map((tag) => (
                    <span key={tag} className="text-[10px] text-primary/80 bg-primary/10 px-2 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              )}
              {selectedLead.notes && (
                <div className="bg-muted/30 rounded-lg p-2.5 text-xs text-muted-foreground">{selectedLead.notes}</div>
              )}
            </div>

            {/* Timeline */}
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-primary" /> Histórico
              </h4>
              {interactions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma interação registrada</p>
              ) : (
                <div className="space-y-3 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border/50">
                  {interactions.map((interaction) => (
                    <div key={interaction.id} className="flex gap-3 pl-5 relative">
                      <div className={`absolute left-0.5 top-1 w-3 h-3 rounded-full border-2 ${
                        interaction.direction === "inbound" ? "bg-success border-success/50" : "bg-primary border-primary/50"
                      }`} />
                      <div className="flex-1">
                        <p className="text-xs text-foreground">{interaction.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(interaction.created_at).toLocaleDateString("pt-BR")}{" "}
                          {new Date(interaction.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          {" · "}{interaction.type === "whatsapp" ? "WhatsApp" : interaction.type === "call" ? "Ligação" : interaction.type === "visit" ? "Visita" : interaction.type}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
