import { motion } from "framer-motion";
import { Clock, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/smart_tag_logo.png";

export default function PendingApprovalPage() {
  const { signOut, user } = useAuth();

  const statusMessages: Record<string, { title: string; desc: string; icon: string }> = {
    pending: {
      title: "Conta em análise",
      desc: "Seu cadastro foi recebido e está sendo analisado. Você receberá acesso assim que for aprovado.",
      icon: "⏳",
    },
    rejected: {
      title: "Acesso não autorizado",
      desc: "Seu cadastro foi analisado e não foi aprovado no momento. Entre em contato com o suporte se acredita que houve um erro.",
      icon: "❌",
    },
    blocked: {
      title: "Conta bloqueada",
      desc: "Sua conta foi temporariamente suspensa. Entre em contato com o administrador para mais informações.",
      icon: "🔒",
    },
  };

  // Default to pending message
  const msg = statusMessages.pending;

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, hsl(230 22% 7%), hsl(260 30% 12%), hsl(230 22% 7%))" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
        <img src={logo} alt="Smart Tag" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-6" />
        <div className="glass-card p-8 space-y-4">
          <span className="text-4xl">{msg.icon}</span>
          <h1 className="text-xl font-bold text-foreground">{msg.title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{msg.desc}</p>
          <p className="text-xs text-muted-foreground">
            Logado como: <span className="text-foreground">{user?.email}</span>
          </p>
        </div>
        <button onClick={signOut}
          className="mt-6 flex items-center gap-2 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors">
          <LogOut className="w-4 h-4" /> Sair e usar outra conta
        </button>
      </motion.div>
    </div>
  );
}
