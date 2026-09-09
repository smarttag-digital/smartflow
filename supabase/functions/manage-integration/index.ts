import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import {
  decryptCredential,
  encryptCredential,
  hmacHex,
  randomHex,
  sha256Hex,
} from "../_shared/integrationCrypto.ts";

const responseHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: responseHeaders });

const RequestSchema = z.object({
  action: z.enum(["metadata", "reveal", "regenerate_token", "regenerate_secret", "test_connection", "create_test_lead"]),
  target_user_id: z.string().uuid().optional(),
});

type CredentialRow = {
  id: string;
  user_id: string;
  label: string;
  api_token: string;
  webhook_secret: string;
  active: boolean;
  token_rotated_at: string;
  secret_rotated_at: string;
  last_used_at: string | null;
  created_at: string;
};

function mask(value: string, prefix = "") {
  return `${prefix}${"•".repeat(20)}${value.slice(-4)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const encryptionSecret = Deno.env.get("SMARTFLOW_CREDENTIALS_ENCRYPTION_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey || !encryptionSecret) {
    console.error("manage-integration: configuração interna ausente");
    return json({ error: "Integração temporariamente indisponível" }, 503);
  }

  const authorization = req.headers.get("authorization") ?? "";
  const sessionClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await sessionClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Sessão inválida" }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corpo inválido" }, 400);
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Ação inválida" }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const callerId = userData.user.id;
  const { data: role } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", callerId)
    .eq("role", "admin")
    .maybeSingle();
  const isAdmin = Boolean(role);
  const targetUserId = parsed.data.target_user_id ?? callerId;
  if (targetUserId !== callerId && !isAdmin) return json({ error: "Acesso negado" }, 403);

  let { data: credential, error: credentialError } = await admin
    .from("api_credentials")
    .select("id, user_id, label, api_token, webhook_secret, active, token_rotated_at, secret_rotated_at, last_used_at, created_at")
    .eq("user_id", targetUserId)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!credential && !credentialError) {
    const apiToken = `sfk_${randomHex(32)}`;
    const webhookSecret = randomHex(32);
    const { data: inserted, error: insertError } = await admin
      .from("api_credentials")
      .upsert({
        user_id: targetUserId,
        api_token: await encryptCredential(apiToken, encryptionSecret),
        webhook_secret: await encryptCredential(webhookSecret, encryptionSecret),
        token_hash: await sha256Hex(apiToken),
        active: true,
      }, { onConflict: "user_id", ignoreDuplicates: true })
      .select("id, user_id, label, api_token, webhook_secret, active, token_rotated_at, secret_rotated_at, last_used_at, created_at")
      .maybeSingle();
    if (inserted) {
      credential = inserted;
      credentialError = insertError;
    } else {
      const retry = await admin
        .from("api_credentials")
        .select("id, user_id, label, api_token, webhook_secret, active, token_rotated_at, secret_rotated_at, last_used_at, created_at")
        .eq("user_id", targetUserId)
        .eq("active", true)
        .single();
      credential = retry.data;
      credentialError = retry.error;
    }
  }
  if (credentialError || !credential) {
    console.error("manage-integration: falha ao carregar credencial", credentialError?.code);
    return json({ error: "Não foi possível carregar as credenciais" }, 500);
  }

  const row = credential as CredentialRow;
  let apiToken = await decryptCredential(row.api_token, encryptionSecret);
  let webhookSecret = await decryptCredential(row.webhook_secret, encryptionSecret);

  if (!row.api_token.startsWith("v1:") || !row.webhook_secret.startsWith("v1:")) {
    await admin.from("api_credentials").update({
      api_token: await encryptCredential(apiToken, encryptionSecret),
      webhook_secret: await encryptCredential(webhookSecret, encryptionSecret),
      token_hash: await sha256Hex(apiToken),
    }).eq("id", row.id);
  }

  if (parsed.data.action === "regenerate_token") {
    apiToken = `sfk_${randomHex(32)}`;
    const now = new Date().toISOString();
    const { error } = await admin.from("api_credentials").update({
      api_token: await encryptCredential(apiToken, encryptionSecret),
      token_hash: await sha256Hex(apiToken),
      token_rotated_at: now,
    }).eq("id", row.id);
    if (error) return json({ error: "Não foi possível regenerar o token" }, 500);
    row.token_rotated_at = now;
  }

  if (parsed.data.action === "regenerate_secret") {
    webhookSecret = randomHex(32);
    const now = new Date().toISOString();
    const { error } = await admin.from("api_credentials").update({
      webhook_secret: await encryptCredential(webhookSecret, encryptionSecret),
      secret_rotated_at: now,
    }).eq("id", row.id);
    if (error) return json({ error: "Não foi possível regenerar o secret" }, 500);
    row.secret_rotated_at = now;
  }

  if (parsed.data.action === "test_connection" || parsed.data.action === "create_test_lead") {
    const webhookUrl = `${supabaseUrl}/functions/v1/webhook-leads`;
    const payload = parsed.data.action === "test_connection"
      ? { teste: true }
      : {
          nome: "Lead Teste SmartFlow",
          telefone: "5511999999999",
          email: "teste@smartflow.app",
          tipo_negocio: "venda",
          tipo_de_imovel: "apartamento",
          valor: 450000,
          cidade: "Sorocaba",
          bairro: "Campolim",
          origem: "teste_integracao",
          idempotency_key: `smartflow-test-${crypto.randomUUID()}`,
          user_id: crypto.randomUUID(),
          tenant_id: crypto.randomUUID(),
        };
    const raw = JSON.stringify(payload);
    const result = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
        "x-smartflow-signature": await hmacHex(webhookSecret, raw),
      },
      body: raw,
    });
    const resultBody = await result.json().catch(() => ({}));
    if (!result.ok) return json({ error: resultBody.message ?? "Falha no teste", status: result.status }, 502);
    return json({ success: true, ...resultBody });
  }

  const base = {
    id: row.id,
    user_id: row.user_id,
    label: row.label,
    active: row.active,
    token_masked: mask(apiToken, "sfk_"),
    secret_masked: mask(webhookSecret),
    token_rotated_at: row.token_rotated_at,
    secret_rotated_at: row.secret_rotated_at,
    last_used_at: row.last_used_at,
    created_at: row.created_at,
    is_admin: isAdmin,
  };
  if (parsed.data.action === "reveal" || parsed.data.action.startsWith("regenerate_")) {
    return json({ ...base, api_token: apiToken, webhook_secret: webhookSecret });
  }
  return json(base);
});