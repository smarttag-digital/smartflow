export type LeadScore = "hot" | "warm" | "cold";
export type LeadStage = "novo" | "atendimento" | "envio_imoveis" | "visita" | "proposta" | "fechamento";
export type LeadSource = "meta_ads" | "google" | "zap_imoveis" | "viva_real" | "olx" | "webhook" | "manual";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  interest: string;
  source: LeadSource;
  score: LeadScore;
  stage: LeadStage;
  createdAt: Date;
  lastContact: Date | null;
  lastResponse: Date | null;
  assignedTo: string;
  tags: string[];
  notes: string;
  interactions: Interaction[];
}

export interface Interaction {
  id: string;
  type: "whatsapp" | "call" | "email" | "note" | "visit";
  message: string;
  date: Date;
  direction: "outbound" | "inbound";
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  message: string;
  enabled: boolean;
  delay: string;
}

export const SOURCE_LABELS: Record<LeadSource, string> = {
  meta_ads: "Meta Ads",
  google: "Google",
  zap_imoveis: "Zap Imóveis",
  viva_real: "Viva Real",
  olx: "OLX",
  webhook: "Webhook",
  manual: "Manual",
};

export const STAGE_LABELS: Record<LeadStage, string> = {
  novo: "Novo Lead",
  atendimento: "Atendimento",
  envio_imoveis: "Envio de Imóveis",
  visita: "Visita",
  proposta: "Proposta",
  fechamento: "Fechamento",
};

export const SCORE_CONFIG: Record<LeadScore, { label: string; emoji: string }> = {
  hot: { label: "Quente", emoji: "🔥" },
  warm: { label: "Morno", emoji: "🌡️" },
  cold: { label: "Frio", emoji: "❄️" },
};

const now = new Date();
const h = (hours: number) => new Date(now.getTime() - hours * 3600000);

export const MOCK_LEADS: Lead[] = [
  {
    id: "1", name: "Ana Silva", phone: "5511999887766", email: "ana@email.com",
    interest: "Apartamento 3 quartos - Zona Sul", source: "meta_ads", score: "hot",
    stage: "visita", createdAt: h(48), lastContact: h(2), lastResponse: h(4),
    assignedTo: "Carlos", tags: ["urgente", "alto-valor"], notes: "Procura imóvel até R$ 800k",
    interactions: [
      { id: "i1", type: "whatsapp", message: "Olá Ana! Vi seu interesse em apartamentos na Zona Sul.", date: h(46), direction: "outbound" },
      { id: "i2", type: "whatsapp", message: "Sim! Gostaria de agendar uma visita.", date: h(44), direction: "inbound" },
      { id: "i3", type: "visit", message: "Visita agendada - Apt 302, Ed. Aurora", date: h(4), direction: "outbound" },
    ],
  },
  {
    id: "2", name: "João Mendes", phone: "5511988776655", email: "joao@email.com",
    interest: "Casa em condomínio - Alphaville", source: "google", score: "hot",
    stage: "proposta", createdAt: h(120), lastContact: h(6), lastResponse: h(8),
    assignedTo: "Maria", tags: ["investidor"], notes: "Compra para investimento",
    interactions: [
      { id: "i4", type: "whatsapp", message: "João, tenho casas excelentes em Alphaville.", date: h(118), direction: "outbound" },
      { id: "i5", type: "call", message: "Ligação - 15min - discutiu valores", date: h(72), direction: "outbound" },
    ],
  },
  {
    id: "3", name: "Mariana Costa", phone: "5511977665544", email: "mariana@email.com",
    interest: "Studio - Centro", source: "zap_imoveis", score: "warm",
    stage: "envio_imoveis", createdAt: h(24), lastContact: h(12), lastResponse: null,
    assignedTo: "Carlos", tags: ["primeira-compra"], notes: "Recém-formada, busca primeiro imóvel",
    interactions: [
      { id: "i6", type: "whatsapp", message: "Oi Mariana! Vi que você se interessou por studios no centro.", date: h(22), direction: "outbound" },
    ],
  },
  {
    id: "4", name: "Roberto Almeida", phone: "5511966554433", email: "roberto@email.com",
    interest: "Terreno - Interior SP", source: "viva_real", score: "cold",
    stage: "novo", createdAt: h(72), lastContact: null, lastResponse: null,
    assignedTo: "Carlos", tags: [], notes: "",
    interactions: [],
  },
  {
    id: "5", name: "Fernanda Lima", phone: "5511955443322", email: "fernanda@email.com",
    interest: "Cobertura duplex - Jardins", source: "meta_ads", score: "hot",
    stage: "atendimento", createdAt: h(4), lastContact: h(1), lastResponse: h(2),
    assignedTo: "Maria", tags: ["alto-valor", "urgente"], notes: "Orçamento acima de R$ 2M",
    interactions: [
      { id: "i7", type: "whatsapp", message: "Fernanda, tenho coberturas incríveis nos Jardins!", date: h(3), direction: "outbound" },
      { id: "i8", type: "whatsapp", message: "Me manda as opções por favor!", date: h(2), direction: "inbound" },
    ],
  },
  {
    id: "6", name: "Pedro Santos", phone: "5511944332211", email: "pedro@email.com",
    interest: "Apartamento 2 quartos - Moema", source: "olx", score: "warm",
    stage: "atendimento", createdAt: h(36), lastContact: h(30), lastResponse: null,
    assignedTo: "Maria", tags: [], notes: "Busca imóvel para alugar",
    interactions: [
      { id: "i9", type: "whatsapp", message: "Pedro, tudo bem? Vi seu interesse em Moema.", date: h(34), direction: "outbound" },
    ],
  },
  {
    id: "7", name: "Camila Rodrigues", phone: "5511933221100", email: "camila@email.com",
    interest: "Sala comercial - Faria Lima", source: "webhook", score: "warm",
    stage: "novo", createdAt: h(6), lastContact: null, lastResponse: null,
    assignedTo: "Carlos", tags: ["comercial"], notes: "",
    interactions: [],
  },
  {
    id: "8", name: "Lucas Ferreira", phone: "5511922110099", email: "lucas@email.com",
    interest: "Apartamento Garden - Vila Mariana", source: "google", score: "cold",
    stage: "novo", createdAt: h(96), lastContact: h(90), lastResponse: null,
    assignedTo: "Carlos", tags: [], notes: "Não respondeu mensagens",
    interactions: [
      { id: "i10", type: "whatsapp", message: "Lucas, tenho ótimas opções na Vila Mariana!", date: h(90), direction: "outbound" },
    ],
  },
];

export const MOCK_AUTOMATIONS: AutomationRule[] = [
  { id: "a1", name: "Boas-vindas", trigger: "Lead criado", action: "Enviar WhatsApp", message: "Olá {nome}! Recebemos seu interesse em {interesse}. Um de nossos corretores entrará em contato em breve!", enabled: true, delay: "Imediato" },
  { id: "a2", name: "Follow-up 24h", trigger: "24h sem resposta", action: "Enviar WhatsApp", message: "Olá {nome}! Notei que ainda não conseguimos conversar. Posso ajudar com alguma dúvida sobre {interesse}?", enabled: true, delay: "24 horas" },
  { id: "a3", name: "Reativação 72h", trigger: "72h sem resposta", action: "Enviar WhatsApp", message: "{nome}, temos novidades! Novos imóveis que podem te interessar. Quer dar uma olhada?", enabled: true, delay: "72 horas" },
  { id: "a4", name: "Pós-visita", trigger: "Após visita", action: "Enviar WhatsApp", message: "Olá {nome}! Como foi sua impressão do imóvel? Ficou com alguma dúvida?", enabled: false, delay: "2 horas" },
];

export const WHATSAPP_TEMPLATES = [
  { id: "t1", name: "Primeiro Contato", message: "Olá {nome}! Sou {corretor} da Smart Tag Imóveis. Vi seu interesse em {interesse}. Posso te ajudar?" },
  { id: "t2", name: "Follow-up", message: "Oi {nome}! Passando para saber se teve tempo de pensar sobre {interesse}. Tenho novidades que podem te interessar!" },
  { id: "t3", name: "Reativação", message: "{nome}, tudo bem? Faz um tempo que conversamos. Temos novos imóveis incríveis! Posso te enviar as opções?" },
  { id: "t4", name: "Agendamento de Visita", message: "Oi {nome}! Que tal agendar uma visita para conhecer o imóvel pessoalmente? Tenho horários disponíveis essa semana." },
  { id: "t5", name: "Envio de Imóvel", message: "{nome}, encontrei um imóvel perfeito para você! Vou te enviar os detalhes agora." },
];

export function getHoursAgo(date: Date | null): number | null {
  if (!date) return null;
  return Math.round((Date.now() - date.getTime()) / 3600000);
}

export function getAlertLevel(lead: Lead): "red" | "yellow" | "none" {
  if (!lead.lastResponse && !lead.lastContact) {
    const h = getHoursAgo(lead.createdAt)!;
    if (h >= 48) return "red";
    if (h >= 24) return "yellow";
  }
  if (lead.lastContact && !lead.lastResponse) {
    const h = getHoursAgo(lead.lastContact)!;
    if (h >= 48) return "red";
    if (h >= 24) return "yellow";
  }
  return "none";
}

export function openWhatsApp(phone: string, message?: string) {
  const url = message
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${phone}`;
  window.open(url, "_blank");
}
