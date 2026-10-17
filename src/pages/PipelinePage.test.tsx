import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ drag: (_result: unknown) => {}, markLost: vi.fn(), update: vi.fn() }));
vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children, onDragEnd }: any) => { state.drag = onDragEnd; return children; },
  Droppable: ({ children }: any) => children({ innerRef: vi.fn(), droppableProps: {}, placeholder: null }, {}),
  Draggable: ({ children }: any) => children({ innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} }, {}),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "owner" } }) }));
vi.mock("@/hooks/useSubscription", () => ({ useSubscription: () => ({ canMutate: true }) }));
vi.mock("@/hooks/useLeads", async importOriginal => ({
  ...await importOriginal<any>(),
  useLeads: () => ({ leads: [{ id: "lead", user_id: "owner", name: "Test", stage: "novo", score: "cold" }], loading: false, updateLead: state.update, markLeadLost: state.markLost }),
}));
import PipelinePage from "./PipelinePage";

async function drag(stage: string) {
  await act(async () => { await state.drag({ draggableId: "lead", destination: { droppableId: stage } }); });
}
beforeEach(() => { vi.clearAllMocks(); state.markLost.mockResolvedValue(true); render(<PipelinePage />); });
afterEach(cleanup);
describe("Pipeline loss confirmation", () => {
  it("blocks confirmation without a valid reason", async () => {
    await drag("lead_perdido");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(state.markLost).not.toHaveBeenCalled();
  });
  it.each(["comprou_com_outro", "nao_quer", "nao_respondeu", "fora_do_perfil"])("persists loss with valid reason %s", async reason => {
    const labels: Record<string,string> = { comprou_com_outro: "Comprou com outro corretor", nao_quer: "Não tem interesse", nao_respondeu: "Não respondeu", fora_do_perfil: "Fora do perfil" };
    await drag("lead_perdido");
    fireEvent.click(screen.getByRole("button", { name: labels[reason] }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(state.markLost).toHaveBeenCalledWith("lead", reason));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
  it("keeps the reason and dialog available after failure, then retries", async () => {
    state.markLost.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await drag("lead_perdido");
    fireEvent.click(screen.getByRole("button", { name: "Não respondeu" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(state.markLost).toHaveBeenCalledTimes(2));
    expect(state.markLost).toHaveBeenLastCalledWith("lead", "nao_respondeu");
  });
  it("prevents repeated submission while saving", async () => {
    let resolve: (value: boolean) => void = () => {};
    state.markLost.mockReturnValue(new Promise<boolean>(r => { resolve = r; }));
    await drag("lead_perdido");
    fireEvent.click(screen.getByRole("button", { name: "Fora do perfil" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvando…" }));
    expect(state.markLost).toHaveBeenCalledTimes(1);
    await act(async () => resolve(true));
  });
  it.each(["atendimento", "envio_imoveis", "visita", "proposta", "cca", "fechamento"])("preserves ordinary stage %s", async stage => {
    await drag(stage);
    expect(state.update).toHaveBeenCalledWith("lead", { stage });
    expect(state.markLost).not.toHaveBeenCalled();
  });
});