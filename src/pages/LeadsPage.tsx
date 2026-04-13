import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MessageSquare,
  Phone,
  Mail,
  ChevronRight,
  Plus,
  X,
  Clock,
  Tag,
} from "lucide-react";
import { useLeads, useInteractions, DbLead } from "@/hooks/useLeads";
import { useProfile } from "@/hooks/useProfile";
import { SOURCE_LABELS, SCORE_CONFIG, STAGE_LABELS, WHATSAPP_TEMPLATES } from "@/data/mockData";
import type { LeadScore, LeadSource, LeadStage } from "@/data/mockData";
import CreateLeadDialog from "@/components/CreateLeadDialog";

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

function getHoursAgo(date: string | null): number | null {
  if (!date) return null;
  return Math.round((Date.now() - new Date(date).getTime()) / 3600000);
}

function openWhatsApp(phone: string, message?: string) {
  const url = message
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${phone}`;
  window.open(url, "_blank");
}

function ScoreBadge({ score }: { score: string }) {
  const s = score as LeadScore;
  const cls = s === "hot" ? "score-hot" : s === "warm" ? "score-warm" : "score-cold";
  const cfg = SCORE_CONFIG[s] || SCORE_CONFIG.cold;
  return (
    <span className={`${cls} text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

function AlertIndicator({ lead }: { lead: DbLead }) {
  const level = getAlertLevel(lead);
  if (level === "none") return null;
  const h = getHoursAgo(lead.last_contact || lead.created_at);
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${level === "red" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
      ⚠ {h}h sem resposta
    </span>
  );
}

export default function LeadsPage() {
  const { leads, loading, createLead } = useLeads();
  const { profile } = useProfile();
  const [search, setSearch] = useState("");
  const [filterScore, setFilterScore] = useState<LeadScore | "all">("all");
  const [selectedLead, setSelectedLead] = useState<DbLead | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const { interactions, addInteraction } = useInteractions(selectedLead?.id ?? null);

  const sorted = [...leads].sort((a, b) => {
    const order: Record<string, number> = { hot: 0, warm: 1, cold: 2 };
    return (order[a.score] ?? 2) - (order[b.score] ?? 2);
  });

  const filtered = sorted.filter((l) => {
    if (filterScore !== "all" && l.score !== filterScore) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.interest.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleWhatsApp = async (lead: DbLead, message?: string) => {
    const corretorName = profile?.full_name || "Corretor";
    const finalMessage = message
      ? message
          .replace("{nome}", lead.name.split(" ")[0])
          .replace("{{nome_do_usuario}}", corretorName)
          .replace("{corretor}", corretorName)
          .replace("{interesse}", lead.interest)
          .replace("{{tipo_de_imovel}}", lead.interest)
      : `Olá, sou ${corretorName} da imobiliária Smart Tag 👋\nVi seu interesse em ${lead.interest}.\nPosso te enviar algumas opções?`;

    openWhatsApp(lead.phone, finalMessage);

    await addInteraction({
      lead_id: lead.id,
      type: "whatsapp",
      message: "Contato iniciado via WhatsApp",
      direction: "outbound",
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando leads...</div>;
  }

  return (
    <div className="flex h-full gap-4 max-w-7xl">
      <CreateLeadDialog open={showCreate} onClose={() => setShowCreate(false)} onCreate={createLead} />

      {/* List */}
      <div className={`flex-1 flex flex-col min-w-0 ${selectedLead ? "hidden lg:flex" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leads</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} leads encontrados</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Novo Lead
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar leads..."
              className="w-full pl-9 pr-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          {(["all", "hot", "warm", "cold"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterScore(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                filterScore === s ? "bg-primary/15 text-primary border-primary/30" : "border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "Todos" : SCORE_CONFIG[s].emoji + " " + SCORE_CONFIG[s].label}
            </button>
          ))}
        </div>

        {/* Lead list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Nenhum lead encontrado</p>
              <button onClick={() => setShowCreate(true)} className="text-primary text-sm mt-2 hover:underline">Criar primeiro lead</button>
            </div>
          ) : filtered.map((lead) => (
            <motion.div
              key={lead.id}
              layout
              onClick={() => setSelectedLead(lead)}
              className={`glass-card-hover p-4 cursor-pointer ${selectedLead?.id === lead.id ? "border-primary/40" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground truncate">{lead.name}</h3>
                    <ScoreBadge score={lead.score} />
                    <AlertIndicator lead={lead} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{lead.interest || "Sem interesse definido"}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{SOURCE_LABELS[lead.source as LeadSource] || lead.source}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{STAGE_LABELS[lead.stage as LeadStage] || lead.stage}</span>
                    {lead.tags?.map((tag) => (
                      <span key={tag} className="text-[10px] text-primary/80 bg-primary/10 px-2 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleWhatsApp(lead); }}
                    className="whatsapp-btn p-2 rounded-lg"
                    title="Abrir WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground hidden lg:block" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedLead && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="w-full lg:w-[420px] flex-shrink-0 glass-card p-5 overflow-y-auto flex flex-col"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">{selectedLead.name}</h2>
                <p className="text-xs text-muted-foreground">{selectedLead.interest}</p>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={() => handleWhatsApp(selectedLead)} className="whatsapp-btn flex-1 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2">
                <MessageSquare className="w-4 h-4" /> WhatsApp
              </button>
              <a href={`tel:${selectedLead.phone}`} className="flex-1 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 bg-muted/50 text-foreground hover:bg-muted/70 transition-colors border border-border/50">
                <Phone className="w-4 h-4" /> Ligar
              </a>
              <a href={`mailto:${selectedLead.email}`} className="flex-1 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 bg-muted/50 text-foreground hover:bg-muted/70 transition-colors border border-border/50">
                <Mail className="w-4 h-4" /> Email
              </a>
            </div>

            {/* Templates */}
            <div className="mb-4">
              <button onClick={() => setShowTemplates(!showTemplates)} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 mb-2">
                <MessageSquare className="w-3 h-3" />
                {showTemplates ? "Ocultar templates" : "Mensagens rápidas"}
              </button>
              <AnimatePresence>
                {showTemplates && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden space-y-1.5">
                    {WHATSAPP_TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleWhatsApp(selectedLead, t.message)}
                        className="w-full text-left p-2.5 rounded-lg bg-muted/30 hover:bg-success/10 border border-transparent hover:border-success/20 transition-colors"
                      >
                        <p className="text-xs font-medium text-foreground">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{t.message}</p>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Info */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <ScoreBadge score={selectedLead.score} />
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{STAGE_LABELS[selectedLead.stage as LeadStage] || selectedLead.stage}</span>
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{SOURCE_LABELS[selectedLead.source as LeadSource] || selectedLead.source}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5">Telefone</p>
                  <p className="text-foreground font-medium">{selectedLead.phone}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5">Email</p>
                  <p className="text-foreground font-medium truncate">{selectedLead.email || "-"}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5">Responsável</p>
                  <p className="text-foreground font-medium">{selectedLead.assigned_to || "-"}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5">Criado em</p>
                  <p className="text-foreground font-medium">{new Date(selectedLead.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              {selectedLead.tags?.length > 0 && (
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
                          {" · "}
                          {interaction.type === "whatsapp" ? "WhatsApp" : interaction.type === "call" ? "Ligação" : interaction.type === "visit" ? "Visita" : interaction.type}
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
