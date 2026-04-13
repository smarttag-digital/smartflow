import { useState } from "react";
import { X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (lead: {
    name: string;
    phone: string;
    email: string;
    interest: string;
    source: string;
    score: string;
  }) => Promise<unknown>;
}

const SOURCES = [
  { value: "manual", label: "Manual" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "google", label: "Google" },
  { value: "zap_imoveis", label: "Zap Imóveis" },
  { value: "viva_real", label: "Viva Real" },
  { value: "olx", label: "OLX" },
  { value: "webhook", label: "Webhook" },
];

export default function CreateLeadDialog({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState("");
  const [source, setSource] = useState("manual");
  const [score, setScore] = useState("cold");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome é obrigatório";
    if (!phone.trim()) e.phone = "Telefone é obrigatório";
    else if (phone.replace(/\D/g, "").length < 10) e.phone = "Telefone inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    const result = await onCreate({ name: name.trim(), phone: phone.replace(/\D/g, ""), email, interest, source, score });
    setSaving(false);
    if (result) {
      setName(""); setPhone(""); setEmail(""); setInterest(""); setSource("manual"); setScore("cold");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card p-6 w-full max-w-md space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Novo Lead</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" className="w-full bg-muted/40 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                {errors.name && <p className="text-[10px] text-destructive mt-0.5">{errors.name}</p>}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Telefone *</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5511999999999" className="w-full bg-muted/40 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                {errors.phone && <p className="text-[10px] text-destructive mt-0.5">{errors.phone}</p>}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className="w-full bg-muted/40 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Interesse</label>
                <input value={interest} onChange={(e) => setInterest(e.target.value)} placeholder="Ex: Apartamento 3 quartos" className="w-full bg-muted/40 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Origem</label>
                  <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full bg-muted/40 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                    {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Score</label>
                  <select value={score} onChange={(e) => setScore(e.target.value)} className="w-full bg-muted/40 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                    <option value="hot">🔥 Quente</option>
                    <option value="warm">🌡️ Morno</option>
                    <option value="cold">❄️ Frio</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {saving ? "Salvando..." : "Criar Lead"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
