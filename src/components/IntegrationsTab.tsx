import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  FlaskConical,
  Loader2,
  Plug,
  RefreshCw,
  ScrollText,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useIntegration, WEBHOOK_URL } from "@/hooks/useIntegration";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function CredentialRow({
  label,
  maskedValue,
  revealedValue,
  onReveal,
  isRevealing,
  hint,
  publicValue = false,
}: {
  label: string;
  maskedValue: string;
  revealedValue?: string;
  onReveal?: () => Promise<void>;
  isRevealing?: boolean;
  hint?: string;
  publicValue?: boolean;
}) {
  const [shown, setShown] = useState(publicValue);

  const reveal = async () => {
    if (shown) {
      setShown(false);
      return;
    }
    if (!revealedValue && onReveal) await onReveal();
    setShown(true);
  };

  const copy = async () => {
    try {
      let value = revealedValue;
      if (publicValue) value = maskedValue;
      if (!value && onReveal) {
        await onReveal();
        toast.info("Credencial revelada. Clique novamente para copiar.");
        return;
      }
      if (!value) throw new Error("Valor indisponível");
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border border-border/50 bg-muted/40 px-3 py-2 text-xs font-mono">
          {shown ? revealedValue || maskedValue : maskedValue}
        </code>
        {!publicValue && (
          <Button type="button" variant="outline" size="icon" onClick={reveal} aria-label={shown ? `Ocultar ${label}` : `Mostrar ${label}`}>
            {isRevealing ? <Loader2 className="animate-spin" /> : shown ? <EyeOff /> : <Eye />}
          </Button>
        )}
        <Button type="button" variant="outline" size="icon" onClick={copy} aria-label={`Copiar ${label}`}>
          <Copy />
        </Button>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function IntegrationsTab() {
  const [targetUserId, setTargetUserId] = useState<string>();
  const integration = useIntegration(targetUserId);
  const { credentials, logs, revealCredentials, regenerateToken, regenerateSecret, testIntegration, createTestLead } = integration;
  const [revealed, setRevealed] = useState<{ api_token?: string; webhook_secret?: string }>({});
  const [confirm, setConfirm] = useState<null | "token" | "secret">(null);
  const [testResult, setTestResult] = useState<null | { ok: boolean; message: string }>(null);
  const cred = credentials.data;

  useEffect(() => {
    setRevealed({});
    setTestResult(null);
  }, [targetUserId]);

  const reveal = async () => {
    const data = await revealCredentials.mutateAsync();
    setRevealed({ api_token: data.api_token, webhook_secret: data.webhook_secret });
  };

  const runTest = async (createLead: boolean) => {
    setTestResult(null);
    try {
      const result = createLead
        ? await createTestLead.mutateAsync()
        : await testIntegration.mutateAsync();
      const suffix = "lead_id" in result ? ` ID: ${result.lead_id}` : "";
      setTestResult({ ok: true, message: `${result.message || "Integração funcionando"}${suffix}` });
    } catch (error) {
      setTestResult({ ok: false, message: error instanceof Error ? error.message : "Falha na integração" });
    }
  };

  const regenerate = async () => {
    const data = confirm === "token"
      ? await regenerateToken.mutateAsync()
      : await regenerateSecret.mutateAsync();
    setRevealed({ api_token: data.api_token, webhook_secret: data.webhook_secret });
    setConfirm(null);
  };

  const exampleBody = `{
  "nome": "Maria Souza",
  "email": "maria@email.com",
  "telefone": "5515999998888",
  "tipo_negocio": "venda",
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
      <motion.div {...fadeUp} className="glass-card space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Plug className="text-primary" /> API e Webhooks</h2>
            <p className="mt-1 text-xs text-muted-foreground">Use estas credenciais somente no servidor do seu site.</p>
          </div>
          {cred && <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">Ativa</span>}
        </div>

        {cred?.is_admin && cred.tenants && cred.tenants.length > 0 && (
          <label className="block space-y-1.5 text-xs text-muted-foreground">
            Integração gerenciada
            <select
              value={targetUserId ?? cred.user_id}
              onChange={(event) => setTargetUserId(event.target.value)}
              className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              {cred.tenants.map((tenant) => <option key={tenant.user_id} value={tenant.user_id}>{tenant.full_name}</option>)}
            </select>
          </label>
        )}

        {credentials.isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="animate-spin" /> Carregando credenciais...</div>
        ) : credentials.isError ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <span>{credentials.error instanceof Error ? credentials.error.message : "Não foi possível carregar as credenciais."}</span>
            <Button variant="outline" size="sm" onClick={() => credentials.refetch()}><RefreshCw /> Tentar novamente</Button>
          </div>
        ) : cred ? (
          <div className="space-y-4">
            <CredentialRow label="SmartFlow Webhook URL" maskedValue={WEBHOOK_URL} publicValue />
            <CredentialRow
              label="SmartFlow API Token"
              maskedValue={cred.token_masked}
              revealedValue={revealed.api_token}
              onReveal={reveal}
              isRevealing={revealCredentials.isPending}
              hint={`Gerado em ${new Date(cred.token_rotated_at).toLocaleString("pt-BR")}`}
            />
            <CredentialRow
              label="SmartFlow Webhook Secret"
              maskedValue={cred.secret_masked}
              revealedValue={revealed.webhook_secret}
              onReveal={reveal}
              isRevealing={revealCredentials.isPending}
              hint="Assina o corpo da requisição com HMAC SHA-256 no header x-smartflow-signature"
            />
            <div className="grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2">
              <span>Último uso: {cred.last_used_at ? new Date(cred.last_used_at).toLocaleString("pt-BR") : "Ainda não utilizado"}</span>
              <span>Secret gerado: {new Date(cred.secret_rotated_at).toLocaleString("pt-BR")}</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setConfirm("token")}><RefreshCw /> Regenerar token</Button>
              <Button variant="outline" size="sm" onClick={() => setConfirm("secret")}><RefreshCw /> Regenerar secret</Button>
              <Button size="sm" onClick={() => runTest(false)} disabled={testIntegration.isPending}><Plug /> Testar conexão</Button>
              <Button variant="secondary" size="sm" onClick={() => runTest(true)} disabled={createTestLead.isPending}><FlaskConical /> Criar lead de teste</Button>
            </div>
            {testResult && (
              <div className={`flex items-start gap-2 rounded-md border p-3 text-xs ${testResult.ok ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10"}`}>
                {testResult.ok ? <CheckCircle2 className="text-success" /> : <XCircle className="text-destructive" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        ) : null}
      </motion.div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm space-y-4 p-5">
            <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 text-destructive" /><p className="text-sm">A credencial atual será invalidada imediatamente. Deseja continuar?</p></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirm(null)}>Cancelar</Button>
              <Button variant="destructive" size="sm" onClick={regenerate} disabled={regenerateToken.isPending || regenerateSecret.isPending}>Sim, regenerar</Button>
            </div>
          </div>
        </div>
      )}

      <motion.div {...fadeUp} className="glass-card space-y-3 p-5">
        <h2 className="text-sm font-semibold">Como o seu site deve enviar leads</h2>
        <p className="text-xs text-muted-foreground"><strong>POST</strong> para a URL acima com <code className="text-primary">Authorization: Bearer &lt;API Token&gt;</code> e <code className="text-primary">x-smartflow-signature: &lt;HMAC SHA-256 do corpo&gt;</code>. A assinatura é obrigatória.</p>
        <pre className="overflow-x-auto rounded-md bg-muted/30 p-3 text-[11px] font-mono">{exampleBody}</pre>
        <p className="text-[10px] text-muted-foreground">Campos extras são ignorados. O tenant é sempre identificado pelo token; envie uma chave de idempotência para evitar duplicatas.</p>
      </motion.div>

      <motion.div {...fadeUp} className="glass-card space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><ScrollText className="text-primary" /> Histórico de integrações</h2>
          <Button variant="ghost" size="icon" onClick={() => logs.refetch()} aria-label="Atualizar histórico"><RefreshCw /></Button>
        </div>
        {logs.isLoading ? <p className="text-xs text-muted-foreground">Carregando...</p> : logs.isError ? (
          <p className="text-xs text-destructive">Não foi possível carregar o histórico.</p>
        ) : (logs.data?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma requisição registrada ainda.</p>
        ) : (
          <div className="max-h-80 space-y-1.5 overflow-y-auto">
            {logs.data?.map((log) => (
              <div key={log.id} className="grid grid-cols-[8px_1fr_auto] items-center gap-3 border-b border-border/30 py-2 text-[11px] last:border-0">
                <span className={`h-2 w-2 rounded-full ${log.success ? "bg-success" : "bg-destructive"}`} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{log.message}</p>
                  <p className="truncate text-muted-foreground">{new Date(log.created_at).toLocaleString("pt-BR")} · {log.endpoint} · {log.source || "sem origem"}{log.lead_id ? ` · Lead ${log.lead_id}` : ""}</p>
                </div>
                <span className="text-right font-mono text-muted-foreground">HTTP {log.status_code}<br />{log.duration_ms ?? 0} ms</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}