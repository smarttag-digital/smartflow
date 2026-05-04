import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Edit, Trash2, MessageSquare, Mail, MapPin, Briefcase, TrendingUp, Search } from "lucide-react";
import { usePartners, Partner, PARTNER_TYPE_OPTIONS, PARTNER_TYPE_LABELS } from "@/hooks/usePartners";
import { useCommissions } from "@/hooks/useCommissions";
import { useLeads, openWhatsApp } from "@/hooks/useLeads";
import { formatBRL } from "@/components/CurrencyInput";

const EMPTY: Partial<Partner> = {
  name: "", partner_type: "corretor", phone: "", email: "", company: "", region: "", specialty: "", notes: "",
};

export default function PartnersPage() {
  const { partners, loading, create, update, remove } = usePartners();
  const { commissions } = useCommissions();
  const { leads } = useLeads();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState<Partial<Partner>>(EMPTY);

  // Ranking: VGV closed + total commissions earned by partner
  const ranking = useMemo(() => {
    return partners.map(p => {
      const partnerCommissions = commissions.filter(c => c.partner_id === p.id);
      const sales = partnerCommissions.length;
      const partnerVGV = partnerCommissions.reduce((s, c) => s + c.deal_value, 0);
      const partnerEarnings = partnerCommissions.reduce((s, c) => s + (c.partner_value || 0), 0);
      const referrals = leads.filter((l: any) => l.assigned_to === p.id).length;
      return { partner: p, sales, partnerVGV, partnerEarnings, referrals };
    }).sort((a, b) => b.partnerVGV - a.partnerVGV);
  }, [partners, commissions, leads]);

  const filtered = useMemo(() => partners.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.company.toLowerCase().includes(search.toLowerCase()) ||
    p.region.toLowerCase().includes(search.toLowerCase())
  ), [partners, search]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (p: Partner) => { setEditing(p); setForm(p); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    if (editing) await update(editing.id, form);
    else await create(form);
    setShowForm(false); setForm(EMPTY); setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este parceiro?")) return;
    await remove(id);
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parcerias</h1>
          <p className="text-sm text-muted-foreground">{partners.length} parceiros cadastrados</p>
        </div>
        <button onClick={openNew}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Novo Parceiro
        </button>
      </div>

      {/* Ranking */}
      {ranking.some(r => r.sales > 0) && (
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Ranking por VGV</h3>
          </div>
          <div className="space-y-2">
            {ranking.filter(r => r.sales > 0).slice(0, 5).map((r, i) => (
              <div key={r.partner.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-slate-400/20 text-slate-300" : i === 2 ? "bg-orange-700/20 text-orange-400" : "bg-muted text-muted-foreground"}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.partner.name}</p>
                  <p className="text-[11px] text-muted-foreground">{r.sales} vendas · pagou {formatBRL(r.partnerEarnings)}</p>
                </div>
                <p className="text-sm font-bold text-primary">{formatBRL(r.partnerVGV)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar parceiro..."
          className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border/50 text-sm" />
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum parceiro cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/40 bg-card p-4 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                  <p className="text-[11px] text-muted-foreground">{PARTNER_TYPE_LABELS[p.partner_type]}{p.company && ` · ${p.company}`}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {p.partner_type === "imobiliaria" ? "🏢" : "👤"}
                </span>
              </div>
              {p.region && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <MapPin className="w-3 h-3" /> {p.region}
                </p>
              )}
              {p.specialty && <p className="text-xs text-muted-foreground mb-2">🎯 {p.specialty}</p>}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                {p.phone && (
                  <button onClick={() => openWhatsApp(p.phone)} title="WhatsApp"
                    className="flex-1 text-xs py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center gap-1">
                    <MessageSquare className="w-3 h-3" /> WhatsApp
                  </button>
                )}
                {p.email && (
                  <a href={`mailto:${p.email}`} title="Email"
                    className="px-2 py-1.5 rounded-md bg-muted/40 hover:bg-muted text-muted-foreground">
                    <Mail className="w-3 h-3" />
                  </a>
                )}
                <button onClick={() => openEdit(p)} className="px-2 py-1.5 rounded-md bg-muted/40 hover:bg-muted text-foreground">
                  <Edit className="w-3 h-3" />
                </button>
                <button onClick={() => handleDelete(p.id)} className="px-2 py-1.5 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl border border-border/50 p-6 w-full max-w-md my-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{editing ? "Editar" : "Novo"} Parceiro</h3>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-3">
                <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome *" className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                <select value={form.partner_type} onChange={(e) => setForm({ ...form, partner_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm">
                  {PARTNER_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Telefone" className="px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                  <input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Email" className="px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                </div>
                <input value={form.company || ""} onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Empresa" className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={form.region || ""} onChange={(e) => setForm({ ...form, region: e.target.value })}
                    placeholder="Região" className="px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                  <input value={form.specialty || ""} onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                    placeholder="Especialidade" className="px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
                </div>
                <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Observações" rows={2} className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm" />
              </div>
              <div className="flex gap-2 pt-4 mt-4 border-t border-border/30">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-border/50 text-sm">Cancelar</button>
                <button onClick={handleSave} disabled={!form.name?.trim()}
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
