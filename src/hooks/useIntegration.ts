import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ApiCredentials {
  id: string;
  user_id: string;
  label: string;
  token_masked: string;
  secret_masked: string;
  api_token?: string;
  webhook_secret?: string;
  active: boolean;
  token_rotated_at: string;
  secret_rotated_at: string;
  last_used_at: string | null;
  created_at: string;
  is_admin: boolean;
  tenants?: Array<{ user_id: string; full_name: string }>;
}

export interface IntegrationLog {
  id: string;
  request_type: string;
  source: string;
  status_code: number;
  success: boolean;
  message: string;
  lead_id: string | null;
  endpoint: string;
  duration_ms: number | null;
  created_at: string;
}

export const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-leads`;

type IntegrationAction = "metadata" | "reveal" | "regenerate_token" | "regenerate_secret" | "test_connection" | "create_test_lead";

async function invokeIntegration<T>(action: IntegrationAction, targetUserId?: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke("manage-integration", {
    body: { action, ...(targetUserId ? { target_user_id: targetUserId } : {}) },
  });
  if (error) throw new Error(error.message || "Falha ao acessar a integração");
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export function useIntegration(targetUserId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const credentials = useQuery({
    queryKey: ["api-credentials", user?.id, targetUserId],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      return invokeIntegration<ApiCredentials>("metadata", targetUserId);
    },
  });

  const logs = useQuery({
    queryKey: ["integration-logs", user?.id, targetUserId],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("integration_logs")
        .select("id, request_type, source, status_code, success, message, lead_id, endpoint, duration_ms, created_at")
        .eq("user_id", targetUserId ?? user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []) as IntegrationLog[];
    },
  });

  const revealCredentials = useMutation({
    mutationFn: () => invokeIntegration<ApiCredentials>("reveal", targetUserId),
  });

  const regenerateToken = useMutation({
    mutationFn: () => invokeIntegration<ApiCredentials>("regenerate_token", targetUserId),
    onSuccess: (data) => {
      qc.setQueryData(["api-credentials", user?.id, targetUserId], data);
      toast.success("Novo API Token gerado. O anterior foi invalidado.");
    },
    onError: () => toast.error("Não foi possível regenerar o token"),
  });

  const regenerateSecret = useMutation({
    mutationFn: () => invokeIntegration<ApiCredentials>("regenerate_secret", targetUserId),
    onSuccess: (data) => {
      qc.setQueryData(["api-credentials", user?.id, targetUserId], data);
      toast.success("Novo Webhook Secret gerado. O anterior foi invalidado.");
    },
    onError: () => toast.error("Não foi possível regenerar o secret"),
  });

  const testIntegration = useMutation({
    mutationFn: () => invokeIntegration<{ success: boolean; message: string }>("test_connection", targetUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration-logs"] });
      qc.invalidateQueries({ queryKey: ["api-credentials"] });
    },
  });

  const createTestLead = useMutation({
    mutationFn: () => invokeIntegration<{ success: boolean; message: string; lead_id: string }>("create_test_lead", targetUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration-logs"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["api-credentials"] });
    },
  });

  return { credentials, logs, revealCredentials, regenerateToken, regenerateSecret, testIntegration, createTestLead };
}
