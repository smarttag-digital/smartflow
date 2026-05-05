import { Link } from "react-router-dom";
import { Lock, Crown, Check } from "lucide-react";
import { motion } from "framer-motion";
import logo from "@/assets/smartflow_logo.png";
import { useAuth } from "@/contexts/AuthContext";

export default function TrialExpiredPage() {
  const { signOut } = useAuth();
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, hsl(230 22% 7%), hsl(260 30% 12%), hsl(230 22% 7%))" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg glass-card p-8 text-center space-y-6"
      >
        <div className="flex justify-center">
          <img src={logo} alt="SmartFlow" className="w-16 h-16 object-contain" />
        </div>
        <div className="w-14 h-14 mx-auto rounded-full bg-primary/15 flex items-center justify-center">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Seu período de teste terminou</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Para continuar usando o SmartFlow CRM, escolha um plano abaixo.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-left">
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Mensal</span>
            </div>
            <p className="text-2xl font-bold text-foreground">R$ 59,90<span className="text-xs font-normal text-muted-foreground">/mês</span></p>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1">
              <li className="flex gap-1.5"><Check className="w-3 h-3 text-success" /> Tudo ilimitado</li>
              <li className="flex gap-1.5"><Check className="w-3 h-3 text-success" /> Cancele quando quiser</li>
            </ul>
          </div>
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 relative">
            <span className="absolute -top-2 right-3 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">ECONOMIZE 17%</span>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Anual</span>
            </div>
            <p className="text-2xl font-bold text-foreground">R$ 599<span className="text-xs font-normal text-muted-foreground">/ano</span></p>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1">
              <li className="flex gap-1.5"><Check className="w-3 h-3 text-success" /> 6x sem juros</li>
              <li className="flex gap-1.5"><Check className="w-3 h-3 text-success" /> 2 meses grátis</li>
            </ul>
          </div>
        </div>

        <Link
          to="/settings?tab=subscription"
          className="block w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Ver planos e assinar
        </Link>
        <button
          onClick={signOut}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Sair da conta
        </button>
      </motion.div>
    </div>
  );
}
