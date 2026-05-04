import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Search, Home, MapPin, Bed, Bath, Car, Edit, Trash2, Image as ImageIcon, Upload } from "lucide-react";
import {
  useProperties, Property, PROPERTY_TYPE_OPTIONS, PROPERTY_TYPE_LABELS,
  PROPERTY_STATUS_OPTIONS, PROPERTY_STATUS_LABELS,
} from "@/hooks/useProperties";
import CurrencyInput, { formatBRL } from "@/components/CurrencyInput";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { GridSkeleton } from "@/components/SkeletonCard";
import EmptyState from "@/components/EmptyState";

const EMPTY: Partial<Property> = {
  title: "", property_type: "apartamento", business_type: "venda", status: "disponivel",
  deal_value: 0, rent_value: 0, city: "", neighborhood: "", address: "",
  bedrooms: 0, bathrooms: 0, parking_spots: 0, area_m2: 0, description: "", image_url: "",
  owner_name: "", owner_phone: "", owner_email: "", owner_notes: "",
};

export default function PropertiesPage() {
  const { properties, loading, createProperty, updateProperty, deleteProperty, uploadImage } = useProperties();
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterBusiness, setFilterBusiness] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [form, setForm] = useState<Partial<Property>>(EMPTY);
  const [uploading, setUploading] = useState(false);

  const cities = useMemo(() => Array.from(new Set(properties.map(p => p.city).filter(Boolean))).sort(), [properties]);

  const filtered = useMemo(() => properties.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.neighborhood.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCity && p.city !== filterCity) return false;
    if (filterType && p.property_type !== filterType) return false;
    if (filterBusiness && p.business_type !== filterBusiness) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  }), [properties, search, filterCity, filterType, filterBusiness, filterStatus]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (p: Property) => { setEditing(p); setForm(p); setShowForm(true); };

  const handleSave = async () => {
    if (!form.title?.trim()) return;
    if (editing) await updateProperty(editing.id, form);
    else await createProperty(form);
    setShowForm(false); setForm(EMPTY); setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este imóvel?")) return;
    await deleteProperty(id);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file);
    if (url) setForm({ ...form, image_url: url });
    setUploading(false);
  };


  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Imóveis</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} de {properties.length} imóveis</p>
        </div>
        <button onClick={openNew}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Imóvel
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mb-4">
        <div className="relative col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-card border border-border/50 text-sm" />
        </div>
        <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="px-3 py-2 rounded-lg bg-card border border-border/50 text-sm">
          <option value="">Cidade</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 rounded-lg bg-card border border-border/50 text-sm">
          <option value="">Tipo</option>
          {PROPERTY_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filterBusiness} onChange={e => setFilterBusiness(e.target.value)} className="px-3 py-2 rounded-lg bg-card border border-border/50 text-sm">
          <option value="">Negócio</option>
          <option value="venda">Venda</option>
          <option value="locacao">Locação</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg bg-card border border-border/50 text-sm">
          <option value="">Status</option>
          {PROPERTY_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Cards grid */}
      {loading ? (
        <GridSkeleton cards={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Home}
          title="Nenhum imóvel cadastrado"
          description={search || filterCity || filterType ? "Tente ajustar os filtros." : "Cadastre seu primeiro imóvel."}
          action={{ label: "Novo imóvel", onClick: openNew }}
        />
      ) : (
        <PropertiesInfiniteGrid
          filtered={filtered}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl border border-border/50 p-6 w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{editing ? "Editar Imóvel" : "Novo Imóvel"}</h3>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>

              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {/* Image upload */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Foto principal</label>
                  <div className="flex items-center gap-3">
                    {form.image_url ? (
                      <img src={form.image_url} alt="" className="w-20 h-20 rounded-lg object-cover border border-border/50" />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-muted/30 flex items-center justify-center border border-border/50">
                        <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 text-sm text-foreground">
                      <Upload className="w-4 h-4" />
                      {uploading ? "Enviando..." : (form.image_url ? "Trocar" : "Enviar imagem")}
                      <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                    </label>
                    {form.image_url && (
                      <button onClick={() => setForm({ ...form, image_url: "" })} className="text-xs text-destructive">Remover</button>
                    )}
                  </div>
                </div>

                <input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Título do imóvel *" className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />

                <div className="grid grid-cols-2 gap-2">
                  <select value={form.property_type} onChange={e => setForm({ ...form, property_type: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-background border border-border/50 text-sm">
                    {PROPERTY_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select value={form.business_type} onChange={e => setForm({ ...form, business_type: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-background border border-border/50 text-sm">
                    <option value="venda">Venda</option>
                    <option value="locacao">Locação</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {form.business_type === "venda" ? (
                    <div>
                      <label className="text-xs text-muted-foreground">Valor de venda</label>
                      <CurrencyInput value={form.deal_value || 0} onChange={v => setForm({ ...form, deal_value: v })}
                        className="w-full py-2 rounded-lg bg-background border border-border/50 text-sm" />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-muted-foreground">Valor do aluguel</label>
                      <CurrencyInput value={form.rent_value || 0} onChange={v => setForm({ ...form, rent_value: v })}
                        className="w-full py-2 rounded-lg bg-background border border-border/50 text-sm" />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-muted-foreground">Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm">
                      {PROPERTY_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input value={form.city || ""} onChange={e => setForm({ ...form, city: e.target.value })}
                    placeholder="Cidade" className="px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                  <input value={form.neighborhood || ""} onChange={e => setForm({ ...form, neighborhood: e.target.value })}
                    placeholder="Bairro" className="px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                </div>
                <input value={form.address || ""} onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Endereço" className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Quartos</label>
                    <input type="number" min={0} value={form.bedrooms || 0} onChange={e => setForm({ ...form, bedrooms: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Banheiros</label>
                    <input type="number" min={0} value={form.bathrooms || 0} onChange={e => setForm({ ...form, bathrooms: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Vagas</label>
                    <input type="number" min={0} value={form.parking_spots || 0} onChange={e => setForm({ ...form, parking_spots: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Área m²</label>
                    <input type="number" min={0} value={form.area_m2 || 0} onChange={e => setForm({ ...form, area_m2: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                  </div>
                </div>

                <textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Descrição" rows={2} className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />

                <div className="pt-3 border-t border-border/30">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Proprietário</p>
                  <div className="space-y-2">
                    <input value={form.owner_name || ""} onChange={e => setForm({ ...form, owner_name: e.target.value })}
                      placeholder="Nome" className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={form.owner_phone || ""} onChange={e => setForm({ ...form, owner_phone: e.target.value })}
                        placeholder="Telefone" className="px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                      <input value={form.owner_email || ""} onChange={e => setForm({ ...form, owner_email: e.target.value })}
                        placeholder="Email" className="px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                    </div>
                    <textarea value={form.owner_notes || ""} onChange={e => setForm({ ...form, owner_notes: e.target.value })}
                      placeholder="Observações sobre o proprietário" rows={2} className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 mt-4 border-t border-border/30">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-border/50 text-sm">Cancelar</button>
                <button onClick={handleSave} disabled={!form.title?.trim()}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50">
                  {editing ? "Salvar" : "Cadastrar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
