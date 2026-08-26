import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const headers = {
  ...corsHeaders,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-smartflow-signature, x-idempotency-key",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

// Aceita campos extras sem quebrar (passthrough) — expansão futura
const LeadSchema = z
  .object({
    nome: z.string().trim().min(1).max(150),
    email: z.string().trim().max(255).optional().default(""),
    telefone: z.string().trim().min(6).max(30),
    tipo_de_negocio: z.string().trim().max(30).optional().default("venda"),
    tipo_de_imovel: z.string().trim().max(60).optional().default(""),
    valor: z.union([z.number(), z.string()]).optional(),
    cidade: z.string().trim().max(80).optional().default(""),
    bairro: z.string().trim().max(80).optional().default(""),
    observacoes: z.string().trim().max(2000).optional().default(""),
    origem: z.string().trim().max(40).optional(),
    corretor: z.string().trim().max(120).optional().default(""),
    imobiliaria: z.string().trim().max(120).optional().default(""),
    external_id: z.string().trim().max(120).optional(),
    idempotency_key: z.string().trim().max(120).optional(),
    teste: z.boolean().optional(),
  })
  .passthrough();

const TestSchema = z.object({ teste: z.literal(true) }).passthrough();

function toNumber(v: unknown): number {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
    return isFinite(n) ? n : 0;
  }
  return 0;
}

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ success: false, message: "Método não permitido" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // 1) Autenticação por token
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token || !token.startsWith("sfk_")) {
    return json({ success: false, message: "Credencial de integração ausente ou inválida" }, 401);
  }

  const { data: cred } = await admin
    .from("api_credentials")
    .select("id, user_id, webhook_secret, active")
    .eq("api_token", token)
    .eq("active", true)
    .maybeSingle();

  if (!cred) return json({ success: false, message: "Credencial de integração inválida" }, 401);

  const userId = cred.user_id as string;
  const log = async (
    status: number,
    success: boolean,
    message: string,
    source: string,
    leadId?: string | null,
    type = "webhook_lead",
  ) => {
    await admin.from("integration_logs").insert({
      user_id: userId,
      request_type: type,
      source,
      status_code: status,
      success,
      message: message.slice(0, 300),
      lead_id: leadId ?? null,
    });
  };

  const raw = await req.text();

  // 2) Assinatura HMAC (obrigatória quando o header é enviado)
  const signature = req.headers.get("x-smartflow-signature");
  if (signature) {
    const expected = await hmacHex(cred.webhook_secret as string, raw);
    if (!timingSafeEqual(signature.replace(/^sha256=/, "").trim(), expected)) {
      await log(401, false, "Assinatura inválida", "");
      return json({ success: false, message: "Assinatura inválida" }, 401);
    }
  }

  // 3) Rate limiting simples (60 req/min por tenant)
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin
    .from("integration_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if ((count ?? 0) > 60) {
    return json({ success: false, message: "Muitas requisições. Tente novamente em instantes." }, 429);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw || "{}");
  } catch {
    await log(400, false, "JSON inválido", "");
    return json({ success: false, message: "Corpo da requisição inválido" }, 400);
  }

  // 4) Requisição de teste — não cria lead
  if (TestSchema.safeParse(payload).success) {
    await admin.from("api_credentials").update({ last_used_at: new Date().toISOString() }).eq("id", cred.id);
    await log(200, true, "Teste de integração bem-sucedido", "teste", null, "test");
    return json({ success: true, message: "Integração funcionando" }, 200);
  }

  const parsed = LeadSchema.safeParse(payload);
  if (!parsed.success) {
    const fields = Object.keys(parsed.error.flatten().fieldErrors).join(", ");
    await log(400, false, `Payload inválido: ${fields}`, "");
    return json({ success: false, message: `Dados inválidos nos campos: ${fields}` }, 400);
  }

  const d = parsed.data;
  const source = (d.origem || "site").toLowerCase().slice(0, 40);
  const idemKey = d.idempotency_key || req.headers.get("x-idempotency-key") || d.external_id || null;

  // 5) Idempotência
  if (idemKey) {
    const { data: existing } = await admin
      .from("leads")
      .select("id")
      .eq("user_id", userId)
      .eq("idempotency_key", idemKey)
      .maybeSingle();
    if (existing) {
      await log(200, true, "Lead duplicado ignorado (idempotência)", source, existing.id);
      return json({ success: true, lead_id: existing.id, message: "Lead já registrado" }, 200);
    }
  }

  const value = toNumber(d.valor);
  const businessType = ["venda", "locacao", "aluguel"].includes(String(d.tipo_de_negocio).toLowerCase())
    ? String(d.tipo_de_negocio).toLowerCase() === "aluguel" ? "locacao" : String(d.tipo_de_negocio).toLowerCase()
    : "venda";

  const interestParts = [d.tipo_de_imovel, d.bairro, d.cidade].filter(Boolean);
  const notes = [
    d.observacoes,
    d.imobiliaria ? `Imobiliária: ${d.imobiliaria}` : "",
    d.corretor ? `Corretor: ${d.corretor}` : "",
  ].filter(Boolean).join("\n");

  const { data: lead, error } = await admin
    .from("leads")
    .insert({
      user_id: userId,
      name: d.nome,
      phone: d.telefone.replace(/\s+/g, " ").trim(),
      email: d.email ?? "",
      interest: interestParts.join(" - ").slice(0, 200),
      source,
      stage: "novo",
      score: "warm",
      business_type: businessType,
      deal_value: businessType === "venda" ? value : 0,
      rent_value: businessType === "locacao" ? value : 0,
      notes,
      assigned_to: d.corretor ?? "",
      external_id: d.external_id ?? null,
      idempotency_key: idemKey,
      last_contact: null,
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = violação de unicidade (corrida de idempotência)
    if ((error as { code?: string }).code === "23505" && idemKey) {
      const { data: existing } = await admin
        .from("leads").select("id").eq("user_id", userId).eq("idempotency_key", idemKey).maybeSingle();
      if (existing) {
        await log(200, true, "Lead duplicado ignorado (idempotência)", source, existing.id);
        return json({ success: true, lead_id: existing.id, message: "Lead já registrado" }, 200);
      }
    }
    console.error("Falha ao criar lead via webhook");
    await log(500, false, "Falha ao criar lead", source);
    return json({ success: false, message: "Não foi possível registrar o lead" }, 500);
  }

  await admin.from("api_credentials").update({ last_used_at: new Date().toISOString() }).eq("id", cred.id);
  await log(201, true, "Lead criado com sucesso", source, lead.id);

  return json({ success: true, lead_id: lead.id, message: "Lead recebido com sucesso" }, 201);
});
