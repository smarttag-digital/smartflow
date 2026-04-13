import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Phone, Save } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

export default function SettingsPage() {
  const { profile, loading, updateProfile } = useProfile();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || "");
      setPhone(profile.phone || "5515997546750");
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({ full_name: name, phone });
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6 max-w-xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Configurações do Perfil</h1>
        <p className="text-sm text-muted-foreground">Seus dados de corretor para integração com WhatsApp</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-5">
        <div>
          <label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
            <User className="w-3.5 h-3.5" /> Nome do Corretor
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-muted/40 border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            placeholder="Seu nome completo"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
            <Phone className="w-3.5 h-3.5" /> Telefone (WhatsApp)
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-muted/40 border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            placeholder="5511999999999"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Formato: código do país + DDD + número (ex: 5515997546750)</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </button>
      </motion.div>
    </div>
  );
}
