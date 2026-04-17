import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { MessageSquare, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useLeads, useInteractions, Lead, STAGE_LABELS, SCORE_CONFIG, LOST_REASON_OPTIONS,
  getAlertLevel, openWhatsApp,
} from "@/hooks/useLeads";

const STAGES = ["novo", "atendimento", "envio_imoveis", "visita", "proposta", "cca", "fechamento", "lead_perdido"];

export default function PipelinePage() {
  const { leads, loading, updateLead } = useLeads();
  const [lostDialog, setLostDialog] = useState<{ leadId: string; fromStage: string } | null>(null);
  const [lostReason, setLostReason] = useState("");

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const leadId = result.draggableId;
    const newStage = result.destination.droppableId;
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage === newStage) return;

    if (newStage === "lead_perdido") {
      setLostDialog({ leadId, fromStage: lead.stage });
      return;
    }

    await updateLead(leadId, { stage: newStage });
  };

  const confirmLost = async () => {
    if (!lostDialog || !lostReason) return;
    await updateLead(lostDialog.leadId, { stage: "lead_perdido", lost_reason: lostReason });
    setLostDialog(null);
    setLostReason("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
        <p className="text-sm text-muted-foreground">Arraste os leads entre as etapas</p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageLeads = leads
              .filter((l) => l.stage === stage)
              .sort((a, b) => {
                const order: Record<string, number> = { hot: 0, warm: 1, cold: 2 };
                return (order[a.score] ?? 3) - (order[b.score] ?? 3);
              });

            const isLost = stage === "lead_perdido";
            const isCCA = stage === "cca";

            return (
              <Droppable key={stage} droppableId={stage}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                    className={`flex-shrink-0 w-[240px] flex flex-col rounded-xl border transition-colors ${
                      snapshot.isDraggingOver ? "border-primary/40 bg-primary/5"
                      : isLost ? "border-destructive/20 bg-destructive/5"
                      : isCCA ? "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20"
                      : "border-border/30 bg-muted/10"
                    }`}>
                    <div className="p-3 border-b border-border/20 flex items-center justify-between">
                      <h3 className={`text-xs font-semibold ${isLost ? "text-destructive" : isCCA ? "text-amber-400" : "text-foreground"}`}>
                        {isCCA ? "🏦 CCA - Avaliação" : (STAGE_LABELS[stage] || stage)}
                      </h3>
                      <span className="text-[10px] bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full">{stageLeads.length}</span>
                    </div>
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]">
                      {stageLeads.map((lead, index) => {
                        const alert = getAlertLevel(lead);
                        return (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                className={`p-3 rounded-lg border transition-all ${
                                  snapshot.isDragging ? "shadow-xl border-primary/40 bg-card"
                                  : isLost ? "border-destructive/20 bg-card/40 opacity-70"
                                  : isCCA ? "border-amber-500/40 bg-amber-500/5"
                                  : alert === "red" ? "alert-red bg-card/60"
                                  : alert === "yellow" ? "alert-yellow bg-card/60"
                                  : "border-border/30 bg-card/60 hover:border-border/50"
                                }`}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className="text-xs font-semibold text-foreground truncate flex-1">{lead.name}</p>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                    lead.score === "hot" ? "score-hot" : lead.score === "warm" ? "score-warm" : "score-cold"
                                  }`}>
                                    {SCORE_CONFIG[lead.score]?.emoji}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate mb-2">{lead.interest}</p>
                                {isLost && lead.lost_reason && (
                                  <p className="text-[9px] text-destructive mb-2">
                                    {LOST_REASON_OPTIONS.find(o => o.value === lead.lost_reason)?.label || lead.lost_reason}
                                  </p>
                                )}
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
                                    {lead.business_type === "locacao" ? "Locação" : "Venda"}
                                  </span>
                                  {!isLost && (
                                    <button onClick={(e) => { e.stopPropagation(); openWhatsApp(lead.phone); }}
                                      className="whatsapp-btn p-1.5 rounded-md" title="WhatsApp">
                                      <MessageSquare className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {/* Lost reason dialog */}
      <AnimatePresence>
        {lostDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setLostDialog(null); setLostReason(""); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Motivo da Perda</h3>
                <button onClick={() => { setLostDialog(null); setLostReason(""); }}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-2 mb-4">
                {LOST_REASON_OPTIONS.map((o) => (
                  <button key={o.value} onClick={() => setLostReason(o.value)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm border transition-colors ${lostReason === o.value ? "bg-primary/15 text-primary border-primary/30" : "border-border/50 text-foreground hover:bg-muted/50"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setLostDialog(null); setLostReason(""); }}
                  className="flex-1 py-2 rounded-lg text-sm border border-border/50 text-muted-foreground">Cancelar</button>
                <button onClick={confirmLost} disabled={!lostReason}
                  className="flex-1 py-2 rounded-lg text-sm bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 disabled:opacity-50">Confirmar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
