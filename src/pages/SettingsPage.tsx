import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Phone, MessageSquare, Save } from "lucide-react";
import { useProfile } from "@/hooks/useLeads";
import { useAuth } from "@/contexts/AuthContext";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function SettingsPage() {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [template, setTemplate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "5515997546750");
      setTemplate(profile.whatsapp_template || "Olá, sou {{nome_do_usuario}} da imobiliária Smart Tag 👋\nVi seu interesse em {{tipo_de_negocio}} de {{tipo_de_imovel}}.\nPosso te enviar algumas opções?");
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({ full_name: fullName, phone, whatsapp_template: template });
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div {...fadeUp}>
        <h1 className="text-2xl font-bold text-foreground">Configurações do Perfil</h1>
        <p className="text-sm text-muted-foreground">Personalize seu perfil e mensagem de WhatsApp</p>
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="glass-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> Dados do Corretor
        </h2>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Email</label>
          <input value={user?.email || ""} disabled
            className="w-full px-3 py-2 bg-muted/20 border border-border/30 rounded-lg text-sm text-muted-foreground cursor-not-allowed" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
            <Phone className="w-3 h-3" /> Telefone (WhatsApp)
          </label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="5515997546750"
            className="w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="glass-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-success" /> Mensagem Padrão do WhatsApp
        </h2>
        <p className="text-xs text-muted-foreground">
          Variáveis disponíveis: <code className="text-primary">{"{{nome_do_usuario}}"}</code>, <code className="text-primary">{"{{tipo_de_negocio}}"}</code>, <code className="text-primary">{"{{tipo_de_imovel}}"}</code>
        </p>
        <textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={5}
          className="w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50" />
        <div className="bg-muted/20 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Pré-visualização:</p>
          <p className="text-xs text-foreground whitespace-pre-wrap">
            {template
              .replace("{{nome_do_usuario}}", fullName || "Seu nome")
              .replace("{{tipo_de_negocio}}", "Venda")
              .replace("{{tipo_de_imovel}}", "apartamento 3 quartos")}
          </p>
        </div>
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </button>
      </motion.div>
    </div>
  );
}
