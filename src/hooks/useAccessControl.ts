import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserAccountStatus = "pending" | "approved" | "rejected" | "blocked";

interface UserStatusRow {
  user_id: string;
  status: UserAccountStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface PendingUser {
  user_id: string;
  status: UserAccountStatus;
  created_at: string;
  full_name: string;
  email: string;
}

export function useUserStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<UserAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from("user_status")
        .select("status")
        .eq("user_id", user.id)
        .single();
      setStatus((data as UserStatusRow | null)?.status ?? null);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return { status, loading };
}

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");
      setIsAdmin(Array.isArray(data) && data.length > 0);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return { isAdmin, loading };
}

export function useAdminUsers() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    // Get all user statuses (admin can see all via RLS)
    const { data: statuses } = await supabase
      .from("user_status")
      .select("user_id, status, created_at")
      .order("created_at", { ascending: false });

    if (!statuses || statuses.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    // Get profiles for these users
    const userIds = (statuses as UserStatusRow[]).map(s => s.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const merged: PendingUser[] = (statuses as UserStatusRow[]).map(s => ({
      user_id: s.user_id,
      status: s.status,
      created_at: s.created_at,
      full_name: profileMap.get(s.user_id)?.full_name || "Sem nome",
      email: "", // will be filled by admin context if needed
    }));

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const updateStatus = async (userId: string, newStatus: UserAccountStatus) => {
    await supabase
      .from("user_status")
      .update({ status: newStatus, reviewed_at: new Date().toISOString() })
      .eq("user_id", userId);
    await fetchUsers();
  };

  return { users, loading, updateStatus, refetch: fetchUsers };
}
