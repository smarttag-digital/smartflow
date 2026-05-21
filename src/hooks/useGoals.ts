import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface Goals {
  salesGoal: number;      // VGV mensal alvo
  commissionGoal: number; // VGC mensal alvo
}

const DEFAULTS: Goals = { salesGoal: 2_000_000, commissionGoal: 30_000 };

function storageKey(userId?: string) {
  return `smartflow:goals:${userId || "anon"}`;
}

export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoalsState] = useState<Goals>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(user?.id));
      if (raw) setGoalsState({ ...DEFAULTS, ...JSON.parse(raw) });
      else setGoalsState(DEFAULTS);
    } catch {
      setGoalsState(DEFAULTS);
    }
  }, [user?.id]);

  const setGoals = useCallback(
    (next: Partial<Goals>) => {
      setGoalsState((prev) => {
        const merged = { ...prev, ...next };
        try {
          localStorage.setItem(storageKey(user?.id), JSON.stringify(merged));
        } catch {}
        return merged;
      });
    },
    [user?.id]
  );

  return { goals, setGoals };
}
