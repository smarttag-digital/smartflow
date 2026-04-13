import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setProfile(data as Profile | null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: { full_name?: string; phone?: string }) => {
    if (!user || !profile) return false;
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Erro ao salvar perfil", description: error.message, variant: "destructive" });
      return false;
    }
    setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
    toast({ title: "Perfil atualizado! ✅" });
    return true;
  };

  return { profile, loading, updateProfile, fetchProfile };
}
