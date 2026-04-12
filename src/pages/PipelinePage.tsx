import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { MessageSquare } from "lucide-react";
import {
  MOCK_LEADS,
  Lead,
  LeadStage,
  STAGE_LABELS,
  SCORE_CONFIG,
  getAlertLevel,
  openWhatsApp,
} from "@/data/mockData";

const STAGES: LeadStage[] = ["novo", "atendimento", "envio_imoveis", "visita", "proposta", "fechamento"];

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const leadId = result.draggableId;
    const newStage = result.destination.droppableId as LeadStage;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l)));
  };

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
                const order = { hot: 0, warm: 1, cold: 2 };
                return order[a.score] - order[b.score];
              });

            return (
              <Droppable key={stage} droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-shrink-0 w-[260px] flex flex-col rounded-xl border transition-colors ${
                      snapshot.isDraggingOver ? "border-primary/40 bg-primary/5" : "border-border/30 bg-muted/10"
                    }`}
                  >
                    <div className="p-3 border-b border-border/20 flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-foreground">{STAGE_LABELS[stage]}</h3>
                      <span className="text-[10px] bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full">{stageLeads.length}</span>
                    </div>
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]">
                      {stageLeads.map((lead, index) => {
                        const alert = getAlertLevel(lead);
                        return (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 rounded-lg border transition-all ${
                                  snapshot.isDragging
                                    ? "shadow-xl border-primary/40 bg-card"
                                    : alert === "red"
                                    ? "alert-red bg-card/60"
                                    : alert === "yellow"
                                    ? "alert-yellow bg-card/60"
                                    : "border-border/30 bg-card/60 hover:border-border/50"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className="text-xs font-semibold text-foreground truncate flex-1">{lead.name}</p>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                      lead.score === "hot" ? "score-hot" : lead.score === "warm" ? "score-warm" : "score-cold"
                                    }`}
                                  >
                                    {SCORE_CONFIG[lead.score].emoji}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate mb-2">{lead.interest}</p>
                                <div className="flex items-center justify-between">
                                  {lead.tags.slice(0, 1).map((tag) => (
                                    <span key={tag} className="text-[9px] text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">{tag}</span>
                                  ))}
                                  {lead.tags.length === 0 && <span />}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openWhatsApp(lead.phone); }}
                                    className="whatsapp-btn p-1.5 rounded-md"
                                    title="WhatsApp"
                                  >
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
