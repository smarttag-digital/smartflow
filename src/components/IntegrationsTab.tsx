import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plug, Copy, Eye, EyeOff, RefreshCw, CheckCircle2, XCircle, Loader2, AlertTriangle, ScrollText,
} from "lucide-react";
import { toast } from "sonner";
import { useIntegration, WEBHOOK_URL } from "@/hooks/useIntegration";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function CredentialRow({
  label, value, secret = false, hint,
}: { label: string; value: string; secret?: boolean; hint?: string }) {
  const [shown, setShown] = useState(!secret);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const masked = value ? "•".repeat(Math.min(48, Math.max(24, value.length))) : "";

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 bg-muted/40 border border-border/50 rounded-lg text-xs font-mono truncate">
          {shown ? value || "—" : masked}
        </code>
        {secret && (
          <button
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? `Ocultar ${label}` : `Mostrar ${label}`}
            className="p-2 rounded-lg border border-border/50 hover:bg-muted/40"
          >
            {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        <button
          onClick={copy}
          aria-label={`Copiar ${label}`}
          className="p-2 rounded-lg border border-border/50 hover:bg-muted/40"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function IntegrationsTab() {
  const { credentials, logs, regenerateToken, regenerateSecret, testIntegration } = useIntegration();
  const [confirm, setConfirm] = useState<null | "token" | "secret">(null);
  const [testResult, setTestResult] = useState<null | { ok: boolean; message: string }>(null);

  const cred = credentials.data;

  const runTest = async () => {
    setTestResult(null);
    try {
      const res = await testIntegration.mutateAsync();
      setTestResult({ ok: true, message: res.message || "Integração funcionando" });
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : "Falha na integração" });
    }
  };

  const doRegenerate = async () => {
    if (confirm === "token") await regenerateToken.mutateAsync();
    if (confirm === "secret") await regenerateSecret.mutateAsync();
    setConfirm(null);
  };

  const exampleBody = `{
  "nome": "Maria Souza",
  "email": "maria@email.com",
  "telefone": "5515999998888",
  "tipo_de_negocio": "venda",
  "tipo_de_imovel": "apartamento",
  "valor": 450000,
  "cidade": "Sorocaba",
  "bairro": "Campolim",
  "observacoes": "Quer visitar no fim de semana",
  "origem": "site",
  "idempotency_key": "form-2026-08-26-001"
}`;

  return (
    <div className="space-y-5">
      <motion.div {...fadeUp} className="glass-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Plug className="w-4 h-4 text-primary" /> API e Webhooks
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Use estas credenciais no <strong>backend do seu site</strong>. Nunca publique o token ou o secret em
            código JavaScript acessível ao visitante.
          </p>
        </div>

        {credentials.isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando credenciais...
          </div>
        ) : credentials.isError ? (
          <p className="text-xs text-destructive">Não foi possível carregar as credenciais.</p>
        ) : (
          <div className="space-y-4">
            <CredentialRow label="SmartFlow Webhook URL" value={WEBHOOK_URL} />
            <CredentialRow
              label="SmartFlow API Token"
              value={cred?.api_token || ""}
              secret
              hint={cred ? `Gerado em ${new Date(cred.token_rotated_at).toLocaleString("pt-BR")}` : undefined}
            />
            <CredentialRow
              label="SmartFlow Webhook Secret"
              value={cred?.webhook_secret || ""}
              secret
              hint="Usado para assinar o corpo da requisição (HMAC SHA-256) no header x-smartflow-signature"
            />

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => setConfirm("token")}
                className="flex items-center gap-2 border border-border/60 px-4 py-2 rounded-lg text-xs font-medium hover:bg-muted/40"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerar API Token
              </button>
              <button
                onClick={() => setConfirm("secret")}
                className="flex items-center gap-2 border border-border/60 px-4 py-2 rounded-lg text-xs font-medium hover:bg-muted/40"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerar Webhook Secret
              </button>
              <button
                onClick={runTest}
                disabled={testIntegration.isPending}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {testIntegration.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />}
                Testar integração
              </button>
            </div>

            {testResult && (
              <div
                className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${
                  testResult.ok
                    ? "bg-success/10 border-success/30 text-foreground"
                    : "bg-destructive/10 border-destructive/30 text-foreground"
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                )}
                <span>{testResult.ok ? "🟢 Integração funcionando" : `🔴 Falha na integração — ${testResult.message}`}</span>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Confirmação de regeneração */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4">
          <div className="glass-card p-5 max-w-sm w-full space-y-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Essa ação invalidará a credencial atual e poderá interromper integrações existentes. Deseja continuar?
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirm(null)} className="px-4 py-2 rounded-lg text-xs border border-border/60 hover:bg-muted/40">
                Cancelar
              </button>
              <button
                onClick={doRegenerate}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-destructive text-destructive-foreground hover:opacity-90"
              >
                Sim, regenerar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Como integrar */}
      <motion.div {...fadeUp} className="glass-card p-5 space-y-3">
        <h2 className="text-sm font-semibold">Como o seu site deve enviar leads</h2>
        <p className="text-xs text-muted-foreground">
          <strong>POST</strong> para a Webhook URL acima, com o header{" "}
          <code className="text-primary">Authorization: Bearer &lt;API Token&gt;</code> e, opcionalmente,{" "}
          <code className="text-primary">x-smartflow-signature: &lt;HMAC SHA-256 do corpo&gt;</code>.
        </p>
        <pre className="bg-muted/30 rounded-lg p-3 text-[11px] overflow-x-auto font-mono">{exampleBody}</pre>
        <p className="text-[10px] text-muted-foreground">
          Campos extras são aceitos sem quebrar a integração. A origem padrão é "site". Envie{" "}
          <code>idempotency_key</code> para evitar leads duplicados em reenvios.
        </p>
      </motion.div>

      {/* Logs */}
      <motion.div {...fadeUp} className="glass-card p-5 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary" /> Histórico de integrações
        </h2>
        {logs.isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : (logs.data?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma requisição registrada ainda.</p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {logs.data!.map((l) => (
              <div key={l.id} className="flex items-center gap-3 text-[11px] py-2 border-b border-border/30 last:border-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${l.success ? "bg-success" : "bg-destructive"}`} />
                <span className="text-muted-foreground w-32 flex-shrink-0">
                  {new Date(l.created_at).toLocaleString("pt-BR")}
                </span>
                <span className="w-24 flex-shrink-0 truncate">{l.request_type}</span>
                <span className="w-20 flex-shrink-0 truncate text-muted-foreground">{l.source || "—"}</span>
                <span className="flex-1 truncate">{l.message}</span>
                <span className="font-mono text-muted-foreground">{l.status_code}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
