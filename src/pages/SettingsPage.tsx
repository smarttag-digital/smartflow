import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Phone, MessageSquare, Save, Building2, Crown, Shield, Check, Calendar, KeyRound, LogOut, AlertTriangle, Palette, Sun, Moon, Monitor } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile } from "@/hooks/useLeads";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useTheme, type ThemeMode } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
const inputCls = "w-full px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (tab !== searchParams.get("tab")) {
      setSearchParams({ tab }, { replace: true });
    }
  }, [tab]); // eslint-disable-line

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div {...fadeUp}>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie sua conta, empresa, mensagens e assinatura</p>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-6 w-full bg-muted/30 h-auto p-1">
          <TabsTrigger value="profile" className="text-xs sm:text-sm gap-1.5"><User className="w-3.5 h-3.5" /><span className="hidden sm:inline">Perfil</span></TabsTrigger>
          <TabsTrigger value="company" className="text-xs sm:text-sm gap-1.5"><Building2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">Empresa</span></TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs sm:text-sm gap-1.5"><Palette className="w-3.5 h-3.5" /><span className="hidden sm:inline">Aparência</span></TabsTrigger>
          <TabsTrigger value="whatsapp" className="text-xs sm:text-sm gap-1.5"><MessageSquare className="w-3.5 h-3.5" /><span className="hidden sm:inline">WhatsApp</span></TabsTrigger>
          <TabsTrigger value="subscription" className="text-xs sm:text-sm gap-1.5"><Crown className="w-3.5 h-3.5" /><span className="hidden sm:inline">Assinatura</span></TabsTrigger>
          <TabsTrigger value="security" className="text-xs sm:text-sm gap-1.5"><Shield className="w-3.5 h-3.5" /><span className="hidden sm:inline">Segurança</span></TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6"><ProfileTab /></TabsContent>
        <TabsContent value="company" className="mt-6"><CompanyTab /></TabsContent>
        <TabsContent value="appearance" className="mt-6"><AppearanceTab /></TabsContent>
        <TabsContent value="whatsapp" className="mt-6"><WhatsAppTab /></TabsContent>
        <TabsContent value="subscription" className="mt-6"><SubscriptionTab /></TabsContent>
        <TabsContent value="security" className="mt-6"><SecurityTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab() {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  const save = async () => {
    setSaving(true);
    await updateProfile({ full_name: fullName, phone });
    setSaving(false);
  };

  return (
    <motion.div {...fadeUp} className="glass-card p-5 space-y-4">
      <h2 className="text-sm font-semibold flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Dados pessoais</h2>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Nome completo</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Email</label>
        <input value={user?.email || ""} disabled className="w-full px-3 py-2 bg-muted/20 border border-border/30 rounded-lg text-sm text-muted-foreground cursor-not-allowed" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone (WhatsApp)</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5515997546750" className={inputCls} />
      </div>
      <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
        <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
      </button>
    </motion.div>
  );
}

function CompanyTab() {
  const { profile, updateProfile } = useProfile();
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (profile) setCompanyName(profile.company_name || ""); }, [profile]);

  const save = async () => {
    setSaving(true);
    await updateProfile({ company_name: companyName });
    setSaving(false);
  };

  return (
    <motion.div {...fadeUp} className="glass-card p-5 space-y-4">
      <h2 className="text-sm font-semibold flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Empresa</h2>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Nome da empresa</label>
        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex: Sua Imobiliária" className={inputCls} />
        <p className="text-[10px] text-muted-foreground mt-1">Exibido no topo do sistema</p>
      </div>
      <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
        <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
      </button>
    </motion.div>
  );
}

function WhatsAppTab() {
  const { profile, updateProfile } = useProfile();
  const [template, setTemplate] = useState("");
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setTemplate(profile.whatsapp_template || "Olá, sou {{nome_do_usuario}} 👋\nVi seu interesse em {{tipo_de_negocio}} de {{tipo_de_imovel}}.\nPosso te enviar opções?");
    }
  }, [profile]);

  const save = async () => {
    setSaving(true);
    await updateProfile({ whatsapp_template: template });
    setSaving(false);
  };

  return (
    <motion.div {...fadeUp} className="glass-card p-5 space-y-4">
      <h2 className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-success" /> Mensagem padrão</h2>
      <p className="text-xs text-muted-foreground">
        Variáveis: <code className="text-primary">{"{{nome_do_usuario}}"}</code>, <code className="text-primary">{"{{tipo_de_negocio}}"}</code>, <code className="text-primary">{"{{tipo_de_imovel}}"}</code>
      </p>
      <textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={5} className={inputCls + " resize-none"} />
      <div className="bg-muted/20 rounded-lg p-3">
        <p className="text-[10px] text-muted-foreground mb-1">Pré-visualização:</p>
        <p className="text-xs whitespace-pre-wrap">
          {template
            .replace("{{nome_do_usuario}}", fullName || "Seu nome")
            .replace("{{tipo_de_negocio}}", "Venda")
            .replace("{{tipo_de_imovel}}", "apartamento 3 quartos")}
        </p>
      </div>
      <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
        <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
      </button>
    </motion.div>
  );
}

function SubscriptionTab() {
  const { subscription, isTrialing, isActive, trialDaysLeft, hasAccess } = useSubscription();

  const handleSubscribe = (plan: "mensal" | "anual") => {
    toast.info("Pagamentos em breve! 🚀", {
      description: `Plano ${plan === "mensal" ? "Mensal" : "Anual"} será ativado quando o Stripe for habilitado.`,
    });
  };

  const planLabel = subscription?.plan === "anual" ? "Anual" : subscription?.plan === "mensal" ? "Mensal" : "Trial";
  const statusLabel: Record<string, string> = {
    trialing: "Período de teste",
    active: "Ativa",
    expired: "Expirada",
    canceled: "Cancelada",
    past_due: "Pagamento pendente",
  };

  return (
    <div className="space-y-5">
      {/* Status atual */}
      <motion.div {...fadeUp} className="glass-card p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2"><Crown className="w-4 h-4 text-primary" /> Plano atual</h2>
            <p className="text-2xl font-bold mt-2">{planLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Status: <span className={hasAccess ? "text-success" : "text-destructive"}>{statusLabel[subscription?.status || "trialing"]}</span>
            </p>
          </div>
          {isTrialing && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Trial termina em</p>
              <p className="text-2xl font-bold text-primary">{trialDaysLeft}d</p>
            </div>
          )}
          {isActive && subscription?.current_period_end && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><Calendar className="w-3 h-3" /> Renova em</p>
              <p className="text-sm font-semibold">{new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}</p>
            </div>
          )}
        </div>

        {!hasAccess && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">Seu acesso está bloqueado. Assine um plano abaixo para continuar.</p>
          </div>
        )}
      </motion.div>

      {/* Planos */}
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div {...fadeUp} className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Corretor Autônomo</h3>
            <span className="text-[10px] bg-muted/40 px-2 py-0.5 rounded-full">MENSAL</span>
          </div>
          <div>
            <p className="text-3xl font-bold">R$ 59,90<span className="text-xs font-normal text-muted-foreground">/mês</span></p>
            <p className="text-[11px] text-muted-foreground">Cancele quando quiser</p>
          </div>
          <ul className="text-xs space-y-1.5 text-muted-foreground">
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success flex-shrink-0" /> Leads ilimitados</li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success flex-shrink-0" /> Imóveis ilimitados</li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success flex-shrink-0" /> Pipeline + Financeiro completo</li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success flex-shrink-0" /> Automações WhatsApp</li>
          </ul>
          <button
            onClick={() => handleSubscribe("mensal")}
            disabled={subscription?.plan === "mensal" && isActive}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            {subscription?.plan === "mensal" && isActive ? "Plano atual" : "Assinar Mensal"}
          </button>
        </motion.div>

        <motion.div {...fadeUp} className="glass-card p-5 space-y-3 border-primary/40 relative" style={{ borderWidth: 1 }}>
          <span className="absolute -top-2 right-4 text-[10px] bg-gradient-to-r from-primary to-purple-500 text-primary-foreground px-2 py-0.5 rounded-full font-bold">ECONOMIZE 17%</span>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Anual</h3>
            <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full">MELHOR OFERTA</span>
          </div>
          <div>
            <p className="text-3xl font-bold">R$ 599<span className="text-xs font-normal text-muted-foreground">/ano</span></p>
            <p className="text-[11px] text-muted-foreground">Equivale a R$ 49,92/mês • 6x sem juros de R$ 99,83</p>
          </div>
          <ul className="text-xs space-y-1.5 text-muted-foreground">
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success flex-shrink-0" /> Tudo do mensal</li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success flex-shrink-0" /> 2 meses grátis</li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success flex-shrink-0" /> Suporte prioritário</li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success flex-shrink-0" /> 6x sem juros no cartão</li>
          </ul>
          <button
            onClick={() => handleSubscribe("anual")}
            disabled={subscription?.plan === "anual" && isActive}
            className="w-full bg-gradient-to-r from-primary to-purple-500 text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {subscription?.plan === "anual" && isActive ? "Plano atual" : "Assinar Anual"}
          </button>
        </motion.div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Pagamento seguro processado pela Stripe. Você pode cancelar a qualquer momento.
      </p>
    </div>
  );
}

function SecurityTab() {
  const { user, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const changePassword = async () => {
    if (password.length < 8) { toast.error("Senha deve ter pelo menos 8 caracteres"); return; }
    if (password !== confirm) { toast.error("As senhas não coincidem"); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Senha atualizada com sucesso"); setPassword(""); setConfirm(""); }
  };

  return (
    <div className="space-y-5">
      <motion.div {...fadeUp} className="glass-card p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4 text-primary" /> Alterar senha</h2>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nova senha</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Mínimo 8 caracteres" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Confirmar nova senha</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
        </div>
        <button onClick={changePassword} disabled={saving || !password} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "Atualizando..." : "Atualizar senha"}
        </button>
      </motion.div>

      <motion.div {...fadeUp} className="glass-card p-5 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Sessão</h2>
        <p className="text-xs text-muted-foreground">Conectado como <span className="text-foreground font-medium">{user?.email}</span></p>
        <button onClick={signOut} className="flex items-center gap-2 border border-destructive/40 text-destructive px-5 py-2 rounded-lg text-sm font-medium hover:bg-destructive/10">
          <LogOut className="w-4 h-4" /> Sair de todos os dispositivos
        </button>
      </motion.div>
    </div>
  );
}

function AppearanceTab() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const options: { value: ThemeMode; label: string; description: string; icon: any }[] = [
    { value: "light", label: "Claro", description: "Visual limpo e profissional", icon: Sun },
    { value: "dark", label: "Escuro", description: "Visual moderno e premium", icon: Moon },
    { value: "auto", label: "Automático", description: "Segue o tema do sistema operacional", icon: Monitor },
  ];

  return (
    <motion.div {...fadeUp} className="glass-card p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2"><Palette className="w-4 h-4 text-primary" /> Aparência do sistema</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Escolha o tema visual. Atualmente exibindo: <span className="text-foreground font-medium">{resolvedTheme === "dark" ? "Escuro" : "Claro"}</span>
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {options.map((opt) => {
          const active = theme === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all ${
                active
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                  : "border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border"
              }`}
            >
              <div className="flex items-center gap-2 w-full">
                <Icon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-semibold flex-1">{opt.label}</span>
                {active && <Check className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-[11px] text-muted-foreground">{opt.description}</p>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Sua preferência é salva automaticamente neste dispositivo.
      </p>
    </motion.div>
  );
}
