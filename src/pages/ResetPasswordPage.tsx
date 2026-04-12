import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/smart_tag_logo.png";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Informe seu email"); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
    toast.success("Email de recuperação enviado!");
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres"); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Senha atualizada com sucesso!");
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, hsl(230 22% 7%), hsl(260 30% 12%), hsl(230 22% 7%))" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="Smart Tag" className="w-16 h-16 rounded-2xl object-cover mb-4" />
          <h1 className="text-2xl font-bold text-foreground">
            {isRecovery ? "Nova Senha" : "Recuperar Senha"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRecovery ? "Defina sua nova senha" : "Enviaremos um link de recuperação"}
          </p>
        </div>

        {isRecovery ? (
          <form onSubmit={handleUpdatePassword} className="glass-card p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nova senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-9 pr-3 py-2.5 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>
            <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-lg text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50">
              {submitting ? "Salvando..." : "Atualizar Senha"}
            </button>
          </form>
        ) : sent ? (
          <div className="glass-card p-6 text-center">
            <Send className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="text-sm text-foreground mb-1">Email enviado!</p>
            <p className="text-xs text-muted-foreground">Verifique sua caixa de entrada e clique no link de recuperação.</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="glass-card p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>
            <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-lg text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50">
              {submitting ? "Enviando..." : "Enviar Link de Recuperação"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/login" className="text-primary hover:text-primary/80 font-medium flex items-center justify-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Voltar ao login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
