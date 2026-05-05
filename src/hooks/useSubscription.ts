import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionPlan = "free_trial" | "mensal" | "anual";
export type SubscriptionStatus = "trialing" | "active" | "expired" | "canceled" | "past_due";

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
    queryKey: ["subscription", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Subscription | null;
    },
  });

  const sub = query.data;
  const now = Date.now();

  const isTrialing =
    sub?.status === "trialing" &&
    !!sub.trial_ends_at &&
    new Date(sub.trial_ends_at).getTime() > now;

  const isActive =
    sub?.status === "active" &&
    (!sub.current_period_end || new Date(sub.current_period_end).getTime() > now);

  const hasAccess = isTrialing || isActive;

  const trialDaysLeft =
    sub?.trial_ends_at && isTrialing
      ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - now) / 86400000))
      : 0;

  return {
    subscription: sub,
    loading: query.isLoading,
    hasAccess,
    isTrialing,
    isActive,
    trialDaysLeft,
    refetch: query.refetch,
  };
}
