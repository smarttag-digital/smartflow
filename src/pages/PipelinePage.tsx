import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { MessageSquare } from "lucide-react";
import { useLeads, Lead, STAGE_LABELS, SCORE_CONFIG, getAlertLevel, openWhatsApp, useProfile } from "@/hooks/useLeads";
import { useAuth } from "@/contexts/AuthContext";

const STAGES = ["novo", "atendimento", "envio_imoveis", "visita", "proposta", "fechamento"];

export default function PipelinePage() {
  const { leads, loading, updateLead } = useLeads();
  const { profile } = useProfile();
  const { user } = useAuth();

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const leadId = result.draggableId;
    const newStage = result.destination.droppableId;
    await updateLead(leadId, { stage: newStage });
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

            return (
              <Droppable key={stage} droppableId={stage}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                    className={`flex-shrink-0 w-[260px] flex flex-col rounded-xl border transition-colors ${
                      snapshot.isDraggingOver ? "border-primary/40 bg-primary/5" : "border-border/30 bg-muted/10"
                    }`}>
                    <div className="p-3 border-b border-border/20 flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-foreground">{STAGE_LABELS[stage] || stage}</h3>
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
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
                                    {lead.business_type === "locacao" ? "Locação" : "Venda"}
                                  </span>
                                  <button onClick={(e) => { e.stopPropagation(); openWhatsApp(lead.phone); }}
                                    className="whatsapp-btn p-1.5 rounded-md" title="WhatsApp">
                                    <MessageSquare className="w-3 h-3" />
                                  </button>
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
    </div>
  );
}
