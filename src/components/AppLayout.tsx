import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Kanban, BarChart3, Download, Zap, Settings,
  Menu, X, ChevronLeft, LogOut, ShieldCheck, Home, DollarSign, Handshake,
  Eye, EyeOff,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useLeads";
import { useIsAdmin } from "@/hooks/useAccessControl";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { useSubscription } from "@/hooks/useSubscription";
import BottomNav from "@/components/BottomNav";
import { Link } from "react-router-dom";
import logo from "@/assets/smartflow_logo.png";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/leads", icon: Users, label: "Leads" },
  { to: "/pipeline", icon: Kanban, label: "Pipeline" },
  { to: "/properties", icon: Home, label: "Imóveis" },
  { to: "/partners", icon: Handshake, label: "Parcerias" },
  { to: "/finance", icon: DollarSign, label: "Financeiro" },
  { to: "/capture", icon: Download, label: "Entrada de Leads" },
  { to: "/reports", icon: BarChart3, label: "Relatórios" },
  { to: "/automation", icon: Zap, label: "Automação" },
  { to: "/settings", icon: Settings, label: "Configurações" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const { presentationMode, togglePresentationMode } = usePrivacy();
  const { isTrialing, trialDaysLeft, isReadOnly } = useSubscription();
  const userDisplayName = user?.user_metadata?.full_name || profile?.full_name || user?.email || "";
  const companyName = profile?.company_name?.trim() || userDisplayName;

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "??";

  const allNavItems = isAdmin
    ? [...NAV_ITEMS, { to: "/admin", icon: ShieldCheck, label: "Admin" }]
    : NAV_ITEMS;

  return (
    <div className="flex h-screen overflow-hidden">
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>

      <aside
        className={`fixed lg:relative z-50 h-full flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className={`flex items-center gap-3 p-4 border-b border-sidebar-border ${collapsed ? "justify-center" : ""}`}>
          <img src={logo} alt="SmartFlow" className="w-9 h-9 rounded-lg object-contain bg-primary/10 p-1" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-sidebar-foreground truncate">SmartFlow</h1>
              <p className="text-[10px] text-muted-foreground truncate">CRM Imobiliário</p>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md hover:bg-sidebar-accent text-muted-foreground">
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {allNavItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                } ${collapsed ? "justify-center px-2" : ""}`}>
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border/30">
          <button onClick={signOut}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full ${collapsed ? "justify-center px-2" : ""}`}>
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center gap-3 px-4 lg:px-6 border-b border-border/30 bg-background/50 backdrop-blur-md flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-muted-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="SmartFlow" className="w-7 h-7 object-contain" />
            <span className="text-sm font-bold text-foreground tracking-tight">SmartFlow</span>
          </div>
          <div className="flex-1" />

          <button
            onClick={togglePresentationMode}
            title={presentationMode ? "Mostrar valores financeiros" : "Modo apresentação (ocultar valores)"}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              presentationMode
                ? "bg-primary/15 text-primary border-primary/30"
                : "border-border/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {presentationMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{presentationMode ? "Privado" : "Mostrar"}</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end leading-tight max-w-[220px]">
              <span className="text-xs font-semibold text-foreground truncate w-full text-right">
                {companyName}
              </span>
              {profile?.company_name && userDisplayName && profile.company_name.trim() !== userDisplayName && (
                <span className="text-[10px] text-muted-foreground truncate w-full text-right">{userDisplayName}</span>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {initials}
            </div>
          </div>
        </header>
        {isTrialing && trialDaysLeft <= 7 && (
          <Link
            to="/settings?tab=subscription"
            className="block bg-gradient-to-r from-primary/15 to-purple-500/15 border-b border-primary/20 px-4 py-2 text-xs text-center hover:from-primary/25 hover:to-purple-500/25 transition-colors"
          >
            <span className="text-foreground font-medium">
              {trialDaysLeft === 0 ? "Seu trial termina hoje!" : `${trialDaysLeft} ${trialDaysLeft === 1 ? "dia restante" : "dias restantes"} no seu trial`}
            </span>
            <span className="text-primary ml-2 font-semibold">Assinar agora →</span>
          </Link>
        )}
        {isReadOnly && (
          <Link
            to="/settings?tab=subscription"
            className="block bg-destructive/15 border-b border-destructive/30 px-4 py-2 text-xs text-center hover:bg-destructive/25 transition-colors"
          >
            <span className="text-foreground font-medium">
              Modo somente leitura — sua assinatura está inativa.
            </span>
            <span className="text-destructive ml-2 font-semibold">Reativar agora →</span>
          </Link>
        )}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">{children}</div>
      </main>

      <BottomNav />
    </div>
  );
}
