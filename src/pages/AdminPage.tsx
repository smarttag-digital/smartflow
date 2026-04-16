import { motion } from "framer-motion";
import { Shield, CheckCircle2, XCircle, Clock, Ban } from "lucide-react";
import { useAdminUsers, UserAccountStatus } from "@/hooks/useAccessControl";

const STATUS_CONFIG: Record<UserAccountStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pendente", color: "text-yellow-400 bg-yellow-400/10", icon: Clock },
  approved: { label: "Aprovado", color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle2 },
  rejected: { label: "Rejeitado", color: "text-red-400 bg-red-400/10", icon: XCircle },
  blocked: { label: "Bloqueado", color: "text-red-500 bg-red-500/10", icon: Ban },
};

export default function AdminPage() {
  const { users, loading, updateStatus } = useAdminUsers();

  const pending = users.filter(u => u.status === "pending");
  const others = users.filter(u => u.status !== "pending");

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" /> Painel Administrativo
        </h1>
        <p className="text-sm text-muted-foreground">Gerencie o acesso dos usuários ao sistema</p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Pending section */}
          {pending.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="glass-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Aguardando Aprovação ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map(u => (
                  <div key={u.user_id} className="flex items-center justify-between bg-muted/20 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Cadastro: {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(u.user_id, "approved")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                      </button>
                      <button
                        onClick={() => updateStatus(u.user_id, "rejected")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Rejeitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* All users */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Todos os Usuários ({users.length})</h2>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado</p>
            ) : (
              <div className="space-y-2">
                {users.map(u => {
                  const cfg = STATUS_CONFIG[u.status];
                  const Icon = cfg.icon;
                  return (
                    <div key={u.user_id} className="flex items-center justify-between bg-muted/10 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${cfg.color}`}>
                          <Icon className="w-3 h-3" /> {cfg.label}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{u.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {u.status !== "approved" && (
                          <button onClick={() => updateStatus(u.user_id, "approved")}
                            className="p-1.5 rounded-md hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-400 transition-colors"
                            title="Aprovar">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {u.status !== "blocked" && u.status !== "rejected" && (
                          <button onClick={() => updateStatus(u.user_id, "blocked")}
                            className="p-1.5 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Bloquear">
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
