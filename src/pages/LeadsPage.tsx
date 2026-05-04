import { useState } from "react";
import CurrencyInput, { formatBRL } from "@/components/CurrencyInput";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MessageSquare, Phone, Mail, ChevronRight, Plus, X, Clock, Tag, Trash2,
  Edit3, StickyNote, CalendarClock, AlertCircle, CheckCircle2,
} from "lucide-react";
import {
  useLeads, useInteractions, useProfile, Lead,
  SCORE_CONFIG, SOURCE_LABELS, STAGE_LABELS, SOURCE_OPTIONS, STAGE_OPTIONS,
  NEXT_ACTION_OPTIONS, LOST_REASON_OPTIONS,
  getAlertLevel, openWhatsApp, isActionOverdue, isActionToday,
} from "@/hooks/useLeads";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { ListSkeleton } from "@/components/SkeletonCard";
import EmptyState from "@/components/EmptyState";
import { Users } from "lucide-react";

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
  stage: "novo", tags: [] as string[], notes: "", assigned_to: "", business_type: "venda",
  next_action: "", next_action_date: "" as string,
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
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Lead>>({});
  const [noteText, setNoteText] = useState("");
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [lostReason, setLostReason] = useState("");
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
    const payload: any = {
      ...formData,
      assigned_to: profile?.full_name || user?.user_metadata?.full_name || "",
    };
    if (!payload.next_action_date) delete payload.next_action_date;
    const result = await createLead(payload);
    if (result) {
      setShowForm(false);
      setFormData(EMPTY_LEAD);
      await addInteractionForLead(result.id, "Lead criado no CRM");
    }
  };

  const addInteractionForLead = async (leadId: string, message: string) => {
    if (!user) return;
    await supabaseInsertInteraction(leadId, user.id, message);
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
    setEditMode(false);
    setNoteText("");
  };

  const startEdit = () => {
    if (!selectedLead) return;
    setEditData({
      name: selectedLead.name,
      phone: selectedLead.phone,
      email: selectedLead.email,
      interest: selectedLead.interest,
      source: selectedLead.source,
      score: selectedLead.score,
      stage: selectedLead.stage,
      business_type: selectedLead.business_type,
      next_action: selectedLead.next_action || "",
      next_action_date: selectedLead.next_action_date ? selectedLead.next_action_date.slice(0, 16) : "",
      deal_value: selectedLead.deal_value,
      commission_percent: selectedLead.commission_percent,
      commission_value: selectedLead.commission_value,
      rent_value: selectedLead.rent_value,
      contract_duration: selectedLead.contract_duration,
    });
    setEditMode(true);
  };

  const saveEdit = async () => {
    if (!selectedLead) return;
    const updates: any = { ...editData };
    if (updates.next_action_date === "") updates.next_action_date = null;

    // Check if moving to lost
    if (updates.stage === "lead_perdido" && selectedLead.stage !== "lead_perdido") {
      setShowLostDialog(true);
      return;
    }

    const ok = await updateLead(selectedLead.id, updates);
    if (ok) {
      // Log stage change
      if (updates.stage && updates.stage !== selectedLead.stage) {
        await addInteraction({
          type: "stage_change",
          message: `Etapa alterada: ${STAGE_LABELS[selectedLead.stage]} → ${STAGE_LABELS[updates.stage]}`,
          direction: "system",
        });
      }
      toast.success("Lead atualizado!");
      setEditMode(false);
      setSelectedLead({ ...selectedLead, ...updates });
    }
  };

  const confirmLost = async () => {
    if (!selectedLead || !lostReason) {
      toast.error("Selecione o motivo");
      return;
    }
    const updates: any = { ...editData, stage: "lead_perdido", lost_reason: lostReason };
    if (updates.next_action_date === "") updates.next_action_date = null;
    const ok = await updateLead(selectedLead.id, updates);
    if (ok) {
      await addInteraction({
        type: "stage_change",
        message: `Lead perdido. Motivo: ${LOST_REASON_OPTIONS.find(o => o.value === lostReason)?.label || lostReason}`,
        direction: "system",
      });
      toast.success("Lead marcado como perdido");
      setShowLostDialog(false);
      setLostReason("");
      setEditMode(false);
      setSelectedLead({ ...selectedLead, ...updates, stage: "lead_perdido", lost_reason: lostReason });
    }
  };

  const addNote = async () => {
    if (!noteText.trim() || !selectedLead) return;
    await addInteraction({
      type: "note",
      message: noteText.trim(),
      direction: "system",
    });
    setNoteText("");
    toast.success("Nota adicionada");
  };

  const inputCls = "w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

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
          <ListSkeleton rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum lead encontrado"
            description={search || filterScore !== "all" ? "Tente ajustar os filtros." : "Comece adicionando seu primeiro lead."}
            action={{ label: "Adicionar lead", onClick: () => setShowForm(true) }}
          />
        ) : (
          <LeadsInfiniteList
            filtered={filtered}
            selectedLead={selectedLead}
            onSelect={selectLead}
            onWhatsApp={(lead) => handleWhatsApp(lead, buildWhatsAppMessage(lead))}
            buildWhatsAppMessage={buildWhatsAppMessage}
          />
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
                  <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Telefone *</label>
                  <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="5511999999999" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                  <input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Interesse</label>
                  <input value={formData.interest} onChange={(e) => setFormData({ ...formData, interest: e.target.value })} placeholder="Apartamento 3 quartos" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Tipo de Negócio *</label>
                    <select value={formData.business_type} onChange={(e) => setFormData({ ...formData, business_type: e.target.value })} className={inputCls}>
                      <option value="venda">Venda</option>
                      <option value="locacao">Locação</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Origem</label>
                    <select value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} className={inputCls}>
                      {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Score</label>
                    <select value={formData.score} onChange={(e) => setFormData({ ...formData, score: e.target.value })} className={inputCls}>
                      <option value="cold">❄️ Frio</option>
                      <option value="warm">🌡️ Morno</option>
                      <option value="hot">🔥 Quente</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Próxima Ação</label>
                    <select value={formData.next_action} onChange={(e) => setFormData({ ...formData, next_action: e.target.value })} className={inputCls}>
                      {NEXT_ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                {formData.next_action && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Data da Ação</label>
                    <input type="datetime-local" value={formData.next_action_date}
                      onChange={(e) => setFormData({ ...formData, next_action_date: e.target.value })} className={inputCls} />
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Notas</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className={inputCls + " resize-none"} />
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

      {/* Lost Reason Dialog */}
      <AnimatePresence>
        {showLostDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowLostDialog(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-foreground mb-4">Motivo da Perda</h3>
              <div className="space-y-2 mb-4">
                {LOST_REASON_OPTIONS.map((o) => (
                  <button key={o.value} onClick={() => setLostReason(o.value)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm border transition-colors ${lostReason === o.value ? "bg-primary/15 text-primary border-primary/30" : "border-border/50 text-foreground hover:bg-muted/50"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowLostDialog(false); setLostReason(""); }}
                  className="flex-1 py-2 rounded-lg text-sm border border-border/50 text-muted-foreground hover:text-foreground">Cancelar</button>
                <button onClick={confirmLost}
                  className="flex-1 py-2 rounded-lg text-sm bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90">Confirmar</button>
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
                <button onClick={startEdit} className="text-primary hover:text-primary/80" title="Editar">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={async () => { await deleteLead(selectedLead.id); setSelectedLead(null); }}
                  className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button>
                <button onClick={() => setSelectedLead(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Edit Mode */}
            {editMode ? (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                  <input value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
                  <input value={editData.phone || ""} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                  <input value={editData.email || ""} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Interesse</label>
                  <input value={editData.interest || ""} onChange={(e) => setEditData({ ...editData, interest: e.target.value })} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                    <select value={editData.business_type || "venda"} onChange={(e) => setEditData({ ...editData, business_type: e.target.value })} className={inputCls}>
                      <option value="venda">Venda</option>
                      <option value="locacao">Locação</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Origem</label>
                    <select value={editData.source || "manual"} onChange={(e) => setEditData({ ...editData, source: e.target.value })} className={inputCls}>
                      {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Score</label>
                    <select value={editData.score || "cold"} onChange={(e) => setEditData({ ...editData, score: e.target.value })} className={inputCls}>
                      <option value="cold">❄️ Frio</option>
                      <option value="warm">🌡️ Morno</option>
                      <option value="hot">🔥 Quente</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Etapa</label>
                    <select value={editData.stage || "novo"} onChange={(e) => setEditData({ ...editData, stage: e.target.value })} className={inputCls}>
                      {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Próxima Ação</label>
                    <select value={editData.next_action || ""} onChange={(e) => setEditData({ ...editData, next_action: e.target.value })} className={inputCls}>
                      {NEXT_ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Data</label>
                    <input type="datetime-local" value={(editData.next_action_date as string) || ""}
                      onChange={(e) => setEditData({ ...editData, next_action_date: e.target.value })} className={inputCls} />
                  </div>
                </div>
                {/* Financial fields */}
                {editData.business_type === "venda" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Valor Imóvel (VGV)</label>
                      <CurrencyInput value={editData.deal_value || 0} onChange={(v) => setEditData({ ...editData, deal_value: v })} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Comissão (VGC)</label>
                      <CurrencyInput value={editData.commission_value || 0} onChange={(v) => setEditData({ ...editData, commission_value: v })} className={inputCls} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Valor Aluguel</label>
                      <CurrencyInput value={editData.rent_value || 0} onChange={(v) => setEditData({ ...editData, rent_value: v })} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Duração Contrato</label>
                      <input value={editData.contract_duration || ""} onChange={(e) => setEditData({ ...editData, contract_duration: e.target.value })} placeholder="30 meses" className={inputCls} />
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setEditMode(false)} className="flex-1 py-2 rounded-lg text-sm border border-border/50 text-muted-foreground hover:text-foreground">Cancelar</button>
                  <button onClick={saveEdit} className="flex-1 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:bg-primary/90">Salvar</button>
                </div>
              </div>
            ) : (
              <>
                {/* WhatsApp message editor */}
                <div className="mb-4 p-3 rounded-lg bg-success/5 border border-success/20">
                  <label className="text-xs font-medium text-foreground mb-2 block flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3 text-success" /> Mensagem WhatsApp
                  </label>
                  <textarea value={whatsappMsg} onChange={(e) => setWhatsappMsg(e.target.value)} rows={3}
                    className="w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-success/50 mb-2" />
                  <button onClick={() => handleWhatsApp(selectedLead, whatsappMsg)}
                    className="whatsapp-btn w-full py-2 rounded-lg text-sm flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Enviar no WhatsApp
                  </button>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  <button onClick={() => handleWhatsApp(selectedLead, whatsappMsg)}
                    className="flex-1 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 whatsapp-btn min-w-[80px]">
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                  <button onClick={startEdit}
                    className="flex-1 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 bg-muted/50 text-foreground hover:bg-muted/70 border border-border/50 min-w-[80px]">
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button onClick={() => document.getElementById("note-input")?.focus()}
                    className="flex-1 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 bg-muted/50 text-foreground hover:bg-muted/70 border border-border/50 min-w-[80px]">
                    <StickyNote className="w-3.5 h-3.5" /> Nota
                  </button>
                </div>

                {/* Next Action Badge */}
                {selectedLead.next_action && (
                  <div className={`mb-4 p-3 rounded-lg border ${isActionOverdue(selectedLead) ? "bg-destructive/10 border-destructive/30" : "bg-accent/10 border-accent/30"}`}>
                    <div className="flex items-center gap-2 text-xs">
                      <CalendarClock className={`w-4 h-4 ${isActionOverdue(selectedLead) ? "text-destructive" : "text-accent"}`} />
                      <span className="font-medium text-foreground">
                        {NEXT_ACTION_OPTIONS.find(o => o.value === selectedLead.next_action)?.label}
                      </span>
                      {selectedLead.next_action_date && (
                        <span className="text-muted-foreground ml-auto">
                          {new Date(selectedLead.next_action_date).toLocaleDateString("pt-BR")} {new Date(selectedLead.next_action_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                )}

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
                </div>

                {/* Add Note */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input id="note-input" value={noteText} onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Adicionar nota..."
                      onKeyDown={(e) => e.key === "Enter" && addNote()}
                      className="flex-1 px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    <button onClick={addNote} disabled={!noteText.trim()}
                      className="px-3 py-2 rounded-lg text-xs bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Timeline */}
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-primary" /> Histórico
              </h4>
              {interactions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma interação registrada</p>
              ) : (
                <div className="space-y-3 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border/50">
                  {[...interactions].reverse().map((interaction) => (
                    <div key={interaction.id} className="flex gap-3 pl-5 relative">
                      <div className={`absolute left-0.5 top-1 w-3 h-3 rounded-full border-2 ${
                        interaction.type === "note" ? "bg-accent border-accent/50"
                        : interaction.type === "stage_change" ? "bg-warning border-warning/50"
                        : interaction.direction === "inbound" ? "bg-success border-success/50"
                        : "bg-primary border-primary/50"
                      }`} />
                      <div className="flex-1">
                        <p className="text-xs text-foreground">{interaction.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(interaction.created_at).toLocaleDateString("pt-BR")}{" "}
                          {new Date(interaction.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          {" · "}{interaction.type === "whatsapp" ? "WhatsApp" : interaction.type === "call" ? "Ligação" : interaction.type === "note" ? "Nota" : interaction.type === "stage_change" ? "Pipeline" : interaction.type}
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

function LeadsInfiniteList({
  filtered, selectedLead, onSelect, onWhatsApp, buildWhatsAppMessage,
}: {
  filtered: Lead[];
  selectedLead: Lead | null;
  onSelect: (l: Lead) => void;
  onWhatsApp: (l: Lead) => void;
  buildWhatsAppMessage: (l: Lead) => string;
}) {
  const { visible, hasMore, sentinelRef, total, loaded } = useInfiniteScroll(filtered, 25);
  return (
    <div className="flex-1 overflow-y-auto space-y-2">
      {visible.map((lead) => (
        <motion.div key={lead.id} layout onClick={() => onSelect(lead)}
          className={`glass-card-hover p-4 cursor-pointer ${selectedLead?.id === lead.id ? "border-primary/40" : ""}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground truncate">{lead.name}</h3>
                <ScoreBadge score={lead.score} />
                <AlertIndicator lead={lead} />
                {isActionOverdue(lead) && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-destructive/15 text-destructive">⏰ Ação atrasada</span>
                )}
                {isActionToday(lead) && !isActionOverdue(lead) && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary/15 text-primary">📋 Ação hoje</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{lead.interest}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{SOURCE_LABELS[lead.source] || lead.source}</span>
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{STAGE_LABELS[lead.stage] || lead.stage}</span>
                <span className="text-[10px] text-primary/80 bg-primary/10 px-2 py-0.5 rounded">{lead.business_type === "locacao" ? "Locação" : "Venda"}</span>
                {lead.next_action && (
                  <span className="text-[10px] text-foreground bg-accent/20 px-2 py-0.5 rounded">
                    {NEXT_ACTION_OPTIONS.find(o => o.value === lead.next_action)?.label || lead.next_action}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={(e) => { e.stopPropagation(); onWhatsApp(lead); }}
                className="whatsapp-btn p-2 rounded-lg" title="Abrir WhatsApp">
                <MessageSquare className="w-4 h-4" />
              </button>
              <ChevronRight className="w-4 h-4 text-muted-foreground hidden lg:block" />
            </div>
          </div>
        </motion.div>
      ))}
      {hasMore && (
        <div ref={sentinelRef} className="py-4 text-center text-xs text-muted-foreground">
          Carregando mais... ({loaded}/{total})
        </div>
      )}
    </div>
  );
}

// Helper to insert interaction without the hook (for newly created leads)
import { supabase } from "@/integrations/supabase/client";
async function supabaseInsertInteraction(leadId: string, userId: string, message: string) {
  await supabase.from("interactions").insert({
    lead_id: leadId,
    user_id: userId,
    type: "system",
    message,
    direction: "system",
  } as any);
}
