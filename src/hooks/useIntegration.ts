import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ApiCredentials {
  id: string;
  user_id: string;
  label: string;
  api_token: string;
  webhook_secret: string;
  active: boolean;
  token_rotated_at: string;
  secret_rotated_at: string;
  last_used_at: string | null;
  created_at: string;
}

export interface IntegrationLog {
  id: string;
  request_type: string;
  source: string;
  status_code: number;
  success: boolean;
  message: string;
  lead_id: string | null;
  created_at: string;
}

export const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-leads`;

export function useIntegration() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const credentials = useQuery({
    queryKey: ["api-credentials", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ensure_api_credentials");
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as ApiCredentials;
    },
  });

  const logs = useQuery({
    queryKey: ["integration-logs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_logs")
        .select("id, request_type, source, status_code, success, message, lead_id, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []) as IntegrationLog[];
    },
  });

  const regenerateToken = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("regenerate_api_token");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-credentials"] });
      toast.success("Novo API Token gerado. O anterior foi invalidado.");
    },
    onError: () => toast.error("Não foi possível regenerar o token"),
  });

  const regenerateSecret = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("regenerate_webhook_secret");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-credentials"] });
      toast.success("Novo Webhook Secret gerado. O anterior foi invalidado.");
    },
    onError: () => toast.error("Não foi possível regenerar o secret"),
  });

  const testIntegration = useMutation({
    mutationFn: async () => {
      const token = credentials.data?.api_token;
      if (!token) throw new Error("Credenciais não carregadas");
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teste: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.message || `Falha (HTTP ${res.status})`);
      return body as { success: boolean; message: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration-logs"] });
    },
  });

  return { credentials, logs, regenerateToken, regenerateSecret, testIntegration };
}
