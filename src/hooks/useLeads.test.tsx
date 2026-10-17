import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ single: vi.fn(), error: vi.fn(), rpc: vi.fn(), update: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: vi.fn() } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "owner" } }) }));
vi.mock("@/hooks/useAccessControl", () => ({ useIsAdmin: () => ({ isAdmin: false }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => ({ select: () => ({ order: async () => ({ data: [{ id: "lead", user_id: "owner", stage: "novo" }] }) }), update: mocks.update }),
  rpc: mocks.rpc,
  channel: () => ({ on: () => ({ subscribe: () => ({}) }) }), removeChannel: vi.fn(),
} }));
import { useLeads } from "./useLeads";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const chain: any = { eq: () => chain, select: () => chain, single: mocks.single };
  mocks.update.mockReturnValue(chain); mocks.rpc.mockReturnValue(chain);
  const hook = renderHook(() => useLeads(), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
  return hook;
}
describe("verified lead updates", () => {
  it("rejects HTTP success with zero changed rows and rolls back", async () => {
    mocks.single.mockResolvedValue({ data: null, error: null });
    const { result } = setup();
    await waitFor(() => expect(result.current.leads.length).toBe(1));
    let ok = true;
    await act(async () => { ok = await result.current.updateLead("lead", { stage: "lead_perdido", lost_reason: "nao_respondeu" }); });
    expect(ok).toBe(false);
    expect(result.current.leads[0].stage).toBe("novo");
    expect(mocks.error).toHaveBeenCalled();
  });
  it("uses the atomic RPC for status, reason and history", async () => {
    mocks.single.mockResolvedValue({ data: { id: "lead", stage: "lead_perdido", lost_reason: "nao_respondeu" }, error: null });
    const { result } = setup();
    await waitFor(() => expect(result.current.leads.length).toBe(1));
    let ok = false;
    await act(async () => { ok = await result.current.markLeadLost("lead", "nao_respondeu"); });
    expect(ok).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("mark_lead_lost", { _lead_id: "lead", _reason: "nao_respondeu" });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects invalid loss reasons before the database call", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.leads.length).toBe(1));
    let ok = true;
    await act(async () => { ok = await result.current.markLeadLost("lead", "invalid"); });
    expect(ok).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});