import { useState, useEffect, useCallback } from "react";
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

export const PROPERTY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  PROPERTY_TYPE_OPTIONS.map((p) => [p.value, p.label])
);

export const PROPERTY_STATUS_OPTIONS = [
  { value: "disponivel", label: "Disponível", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  { value: "reservado", label: "Reservado", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { value: "vendido", label: "Vendido", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  { value: "alugado", label: "Alugado", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
];

export const PROPERTY_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  PROPERTY_STATUS_OPTIONS.map((p) => [p.value, p.label])
);

export function useProperties() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProperties = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar imóveis");
    } else {
      setProperties((data as Property[]) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("properties-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => {
        fetchProperties();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchProperties]);

  const createProperty = async (property: Partial<Property>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("properties")
      .insert({ ...property, user_id: user.id } as any)
      .select()
      .single();
    if (error) {
      console.error(error);
      toast.error("Erro ao cadastrar imóvel");
      return null;
    }
    toast.success("Imóvel cadastrado!");
    return data as Property;
  };

  const updateProperty = async (id: string, updates: Partial<Property>) => {
    const { error } = await supabase.from("properties").update(updates as any).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar imóvel");
      return false;
    }
    toast.success("Imóvel atualizado!");
    return true;
  };

  const deleteProperty = async (id: string) => {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir imóvel");
      return false;
    }
    toast.success("Imóvel excluído!");
    return true;
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("property-images").upload(path, file, { upsert: false });
    if (error) {
      console.error(error);
      toast.error("Erro ao enviar imagem");
      return null;
    }
    const { data } = supabase.storage.from("property-images").getPublicUrl(path);
    return data.publicUrl;
  };

  return { properties, loading, fetchProperties, createProperty, updateProperty, deleteProperty, uploadImage };
}

export function useLeadProperties(leadId: string | null) {
  const { user } = useAuth();
  const [items, setItems] = useState<(LeadProperty & { property: Property })[]>([]);

  const fetch = useCallback(async () => {
    if (!user || !leadId) { setItems([]); return; }
    const { data } = await supabase
      .from("lead_properties")
      .select("*, property:properties(*)")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    setItems((data as any) || []);
  }, [user, leadId]);

  useEffect(() => { fetch(); }, [fetch]);

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
    fetch();
  };

  const unlink = async (id: string) => {
    const { error } = await supabase.from("lead_properties").delete().eq("id", id);
    if (error) { toast.error("Erro ao desvincular"); return; }
    fetch();
  };

  return { items, link, unlink, fetch };
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
