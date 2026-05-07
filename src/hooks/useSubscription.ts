import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionPlan = "free_trial" | "mensal" | "anual";
export type SubscriptionStatus = "trialing" | "active" | "expired" | "canceled" | "past_due";
export type AccessMode = "full" | "read_only" | "blocked";

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["subscription-access", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const [subRes, modeRes, adminRes] = await Promise.all([
        supabase.from("subscriptions").select("*").eq("user_id", user!.id).maybeSingle(),
        supabase.rpc("get_access_mode", { _user_id: user!.id }),
        supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" }),
      ]);
      if (subRes.error) throw subRes.error;
      return {
        subscription: subRes.data as Subscription | null,
        accessMode: ((modeRes.data as string) || "blocked") as AccessMode,
        isAdmin: !!adminRes.data,
      };
    },
  });

  const sub = query.data?.subscription ?? null;
  const accessMode: AccessMode = query.data?.accessMode ?? "blocked";
  const isAdmin = query.data?.isAdmin ?? false;
  const now = Date.now();

  const isTrialing =
    sub?.status === "trialing" &&
    !!sub.trial_ends_at &&
    new Date(sub.trial_ends_at).getTime() > now;

  const isActive =
    sub?.status === "active" &&
    (!sub.current_period_end || new Date(sub.current_period_end).getTime() > now);

  // Admin sempre tem acesso total — independe de subscription
  const hasAccess = isAdmin || accessMode === "full" || accessMode === "read_only";
  const canMutate = isAdmin || accessMode === "full";
  const isReadOnly = !isAdmin && accessMode === "read_only";

  const trialDaysLeft =
    sub?.trial_ends_at && isTrialing
      ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - now) / 86400000))
      : 0;

  return {
    subscription: sub,
    loading: query.isLoading,
    hasAccess,
    canMutate,
    isReadOnly,
    isAdmin,
    accessMode,
    isTrialing,
    isActive,
    trialDaysLeft,
    refetch: query.refetch,
  };
}
