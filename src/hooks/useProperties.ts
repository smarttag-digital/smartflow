import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Property {
  id: string;
  user_id: string;
  title: string;
  property_type: string;
  business_type: string;
  status: string;
  deal_value: number;
  rent_value: number;
  city: string;
  neighborhood: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  parking_spots: number;
  area_m2: number;
  description: string;
  image_url: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  owner_notes: string;
  created_at: string;
  updated_at: string;
}

export interface LeadProperty {
  id: string;
  user_id: string;
  lead_id: string;
  property_id: string;
  notes: string;
  created_at: string;
}

export const PROPERTY_TYPE_OPTIONS = [
  { value: "casa", label: "Casa" },
  { value: "apartamento", label: "Apartamento" },
  { value: "comercial", label: "Comercial" },
  { value: "terreno", label: "Terreno" },
];
export const PROPERTY_TYPE_LABELS: Record<string, string> = Object.fromEntries(PROPERTY_TYPE_OPTIONS.map((p) => [p.value, p.label]));

export const PROPERTY_STATUS_OPTIONS = [
  { value: "disponivel", label: "Disponível", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  { value: "reservado", label: "Reservado", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { value: "vendido", label: "Vendido", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  { value: "alugado", label: "Alugado", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
];
export const PROPERTY_STATUS_LABELS: Record<string, string> = Object.fromEntries(PROPERTY_STATUS_OPTIONS.map((p) => [p.value, p.label]));

const PROPERTIES_KEY = ["properties"] as const;

export function useProperties() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: PROPERTIES_KEY,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Property[]) || [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("properties-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => {
        qc.invalidateQueries({ queryKey: PROPERTIES_KEY });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const createMut = useMutation({
    mutationFn: async (p: Partial<Property>) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase.from("properties").insert({ ...p, user_id: user.id } as any).select().single();
      if (error) throw error;
      return data as Property;
    },
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: PROPERTIES_KEY });
      const previous = qc.getQueryData<Property[]>(PROPERTIES_KEY) || [];
      const optimistic = {
        id: `tmp-${crypto.randomUUID()}`,
        user_id: user?.id || "",
        title: "", property_type: "apartamento", business_type: "venda", status: "disponivel",
        deal_value: 0, rent_value: 0, city: "", neighborhood: "", address: "",
        bedrooms: 0, bathrooms: 0, parking_spots: 0, area_m2: 0,
        description: "", image_url: "", owner_name: "", owner_phone: "", owner_email: "", owner_notes: "",
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        ...(p as any),
      } as Property;
      qc.setQueryData<Property[]>(PROPERTIES_KEY, [optimistic, ...previous]);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(PROPERTIES_KEY, ctx.previous);
      toast.error("Erro ao cadastrar imóvel");
    },
    onSuccess: () => toast.success("Imóvel cadastrado!"),
    onSettled: () => qc.invalidateQueries({ queryKey: PROPERTIES_KEY }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Property> }) => {
      const { error } = await supabase.from("properties").update(updates as any).eq("id", id);
      if (error) throw error;
      return { id, updates };
    },
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: PROPERTIES_KEY });
      const previous = qc.getQueryData<Property[]>(PROPERTIES_KEY) || [];
      qc.setQueryData<Property[]>(PROPERTIES_KEY, previous.map(p => p.id === id ? { ...p, ...updates } : p));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(PROPERTIES_KEY, ctx.previous);
      toast.error("Erro ao atualizar imóvel");
    },
    onSuccess: () => toast.success("Imóvel atualizado!"),
    onSettled: () => qc.invalidateQueries({ queryKey: PROPERTIES_KEY }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: PROPERTIES_KEY });
      const previous = qc.getQueryData<Property[]>(PROPERTIES_KEY) || [];
      qc.setQueryData<Property[]>(PROPERTIES_KEY, previous.filter(p => p.id !== id));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(PROPERTIES_KEY, ctx.previous);
      toast.error("Erro ao excluir imóvel");
    },
    onSuccess: () => toast.success("Imóvel excluído!"),
    onSettled: () => qc.invalidateQueries({ queryKey: PROPERTIES_KEY }),
  });

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("property-images").upload(path, file, { upsert: false });
    if (error) { toast.error("Erro ao enviar imagem"); return null; }
    const { data } = supabase.storage.from("property-images").getPublicUrl(path);
    return data.publicUrl;
  };

  return {
    properties: query.data || [],
    loading: query.isLoading,
    isFetching: query.isFetching,
    fetchProperties: () => qc.invalidateQueries({ queryKey: PROPERTIES_KEY }),
    createProperty: async (p: Partial<Property>) => { try { return await createMut.mutateAsync(p); } catch { return null; } },
    updateProperty: async (id: string, updates: Partial<Property>) => { try { await updateMut.mutateAsync({ id, updates }); return true; } catch { return false; } },
    deleteProperty: async (id: string) => { try { await deleteMut.mutateAsync(id); return true; } catch { return false; } },
    uploadImage,
  };
}

export function useLeadProperties(leadId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["lead_properties", leadId],
    enabled: !!user && !!leadId,
    queryFn: async () => {
      const { data } = await supabase
        .from("lead_properties")
        .select("*, property:properties(*)")
        .eq("lead_id", leadId!)
        .order("created_at", { ascending: false });
      return (data as any) || [];
    },
  });

  const link = async (propertyId: string, notes = "") => {
    if (!user || !leadId) return;
    const { error } = await supabase.from("lead_properties").insert({
      user_id: user.id, lead_id: leadId, property_id: propertyId, notes,
    } as any);
    if (error) {
      if (error.code === "23505") toast.error("Imóvel já vinculado");
      else toast.error("Erro ao vincular imóvel");
      return;
    }
    toast.success("Imóvel vinculado ao lead!");
    qc.invalidateQueries({ queryKey: ["lead_properties", leadId] });
  };

  const unlink = async (id: string) => {
    const { error } = await supabase.from("lead_properties").delete().eq("id", id);
    if (error) { toast.error("Erro ao desvincular"); return; }
    qc.invalidateQueries({ queryKey: ["lead_properties", leadId] });
  };

  return {
    items: (query.data || []) as (LeadProperty & { property: Property })[],
    link,
    unlink,
    fetch: () => qc.invalidateQueries({ queryKey: ["lead_properties", leadId] }),
  };
}

export function suggestProperties(properties: Property[], lead: { interest?: string; business_type?: string; deal_value?: number; rent_value?: number }): Property[] {
  if (!lead) return [];
  return properties
    .filter((p) => p.status === "disponivel")
    .filter((p) => !lead.business_type || p.business_type === lead.business_type)
    .map((p) => {
      let score = 0;
      const interest = (lead.interest || "").toLowerCase();
      if (interest && (p.title.toLowerCase().includes(interest) || p.neighborhood.toLowerCase().includes(interest) || p.city.toLowerCase().includes(interest))) score += 3;
      if (interest && interest.includes(p.property_type)) score += 2;
      const target = lead.business_type === "locacao" ? lead.rent_value : lead.deal_value;
      const propVal = lead.business_type === "locacao" ? p.rent_value : p.deal_value;
      if (target && propVal) {
        const diff = Math.abs(target - propVal) / target;
        if (diff < 0.15) score += 3;
        else if (diff < 0.3) score += 1;
      }
      return { ...p, _score: score } as Property & { _score: number };
    })
    .sort((a, b) => (b as any)._score - (a as any)._score)
    .slice(0, 6);
}
