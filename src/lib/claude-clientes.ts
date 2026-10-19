import type { ClaudeCliente, ClaudeEstadoCliente, ClaudeStatusCliente, Prisma } from "@prisma/client";

// ── Catálogos (editar aqui para mudar a ficha) ──────────────────────────────

/** Serviços do mapa "batalha naval": o que a agência oferece x quem faz hoje para o cliente. */
export const SERVICOS_MAPA = [
  "Criação de Site",
  "Gestão de Mídia Paga",
  "Manutenção de Site / SEO",
  "Criação de LPs",
  "Conteúdo de Blog",
  "Web Analytics",
  "Implantação de CRM",
  "Treinamento de Vendas",
  "Social Media",
  "Edição de Vídeos",
  "Manutenção de E-commerce",
  "Consultoria",
] as const;

export const OPCOES_MAPA = [
  { valor: "nao_identificado", label: "Não identificado", classe: "bg-gray-100 text-gray-500 border-gray-200" },
  { valor: "minha_agencia", label: "Minha agência", classe: "bg-green-50 text-green-700 border-green-200" },
  { valor: "sem_fornecedor", label: "Sem fornecedor", classe: "bg-red-50 text-red-700 border-red-300" },
  { valor: "outra_agencia", label: "Outra agência", classe: "bg-amber-50 text-amber-700 border-amber-200" },
  { valor: "terceirizado", label: "Terceirizado", classe: "bg-purple-50 text-purple-700 border-purple-200" },
  { valor: "interno", label: "Interno", classe: "bg-blue-50 text-blue-700 border-blue-200" },
] as const;

export type ValorMapa = (typeof OPCOES_MAPA)[number]["valor"];

/** Campos de link que sempre aparecem na ficha. Dá para adicionar outros livremente. */
export const LINKS_PADRAO = ["Site", "Instagram", "Facebook", "TikTok", "YouTube", "Google Meu Negócio", "WhatsApp", "LinkedIn"];

export const RESULTADOS = [
  { valor: "conversa_whatsapp", label: "Conversa no WhatsApp" },
  { valor: "lead", label: "Lead (formulário)" },
  { valor: "ligacao", label: "Ligação" },
  { valor: "compra", label: "Compra (e-commerce)" },
  { valor: "agendamento", label: "Agendamento" },
  { valor: "matricula", label: "Matrícula" },
  { valor: "outro", label: "Outro" },
];

export const STATUS_CLIENTE: Record<ClaudeStatusCliente, { label: string; classe: string }> = {
  ativo: { label: "Ativo", classe: "bg-green-50 text-green-700 border-green-200" },
  pausado: { label: "Pausado", classe: "bg-amber-50 text-amber-700 border-amber-200" },
  encerrado: { label: "Encerrado", classe: "bg-gray-100 text-gray-500 border-gray-200" },
};

export const ESTADO_CLIENTE: Record<ClaudeEstadoCliente, { label: string; classe: string; ponto: string }> = {
  saudavel: { label: "Saudável", classe: "bg-green-50 text-green-700 border-green-200", ponto: "bg-green-500" },
  atencao: { label: "Atenção", classe: "bg-amber-50 text-amber-700 border-amber-200", ponto: "bg-amber-400" },
  risco: { label: "Risco", classe: "bg-red-50 text-red-700 border-red-200", ponto: "bg-red-500" },
};

// ── Formato usado pela tela e pela API ──────────────────────────────────────

export interface LinkCliente {
  rotulo: string;
  url: string;
}

export interface PastaDrive {
  titulo: string;
  url: string;
}

export interface FichaCliente {
  id?: string;
  slug: string;
  nome: string;
  segmento: string;
  cidade: string;
  status: ClaudeStatusCliente;
  estado: ClaudeEstadoCliente;
  ticketMensal: number | null;
  dataEntrada: string | null;
  ultimaVisita: string | null;
  metaAdAccountIds: string[];
  googleAdsCustomerId: string;
  ga4PropertyId: string;
  kommoConta: string;
  resultadoPrincipal: string;
  metaCustoPorResultado: number | null;
  orcamentoMidia: number | null;
  briefing: string;
  contexto: string;
  links: LinkCliente[];
  pastasDrive: PastaDrive[];
  mapaServicos: Record<string, ValorMapa>;
}

export const FICHA_VAZIA: FichaCliente = {
  slug: "",
  nome: "",
  segmento: "",
  cidade: "",
  status: "ativo",
  estado: "saudavel",
  ticketMensal: null,
  dataEntrada: null,
  ultimaVisita: null,
  metaAdAccountIds: [],
  googleAdsCustomerId: "",
  ga4PropertyId: "",
  kommoConta: "",
  resultadoPrincipal: "",
  metaCustoPorResultado: null,
  orcamentoMidia: null,
  briefing: "",
  contexto: "",
  links: [],
  pastasDrive: [],
  mapaServicos: {},
};

// ── Conversões ──────────────────────────────────────────────────────────────

function dataParaTexto(data: Date | null): string | null {
  return data ? data.toISOString().slice(0, 10) : null;
}

function listaDeObjetos<T extends object>(valor: Prisma.JsonValue | null, chaves: (keyof T)[]): T[] {
  if (!Array.isArray(valor)) return [];
  const saida: T[] = [];
  for (const item of valor) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const obj = item as Record<string, unknown>;
    if (chaves.every((k) => typeof obj[k as string] === "string")) saida.push(obj as T);
  }
  return saida;
}

/** Linha do banco → formato da tela/API (Decimal vira número, Date vira AAAA-MM-DD). */
export function serializarCliente(c: ClaudeCliente): FichaCliente & { id: string } {
  const mapa: Record<string, ValorMapa> = {};
  if (c.mapaServicos && typeof c.mapaServicos === "object" && !Array.isArray(c.mapaServicos)) {
    const validos = new Set<string>(OPCOES_MAPA.map((o) => o.valor));
    for (const [servico, valor] of Object.entries(c.mapaServicos)) {
      if (typeof valor === "string" && validos.has(valor)) mapa[servico] = valor as ValorMapa;
    }
  }

  return {
    id: c.id,
    slug: c.slug,
    nome: c.nome,
    segmento: c.segmento ?? "",
    cidade: c.cidade ?? "",
    status: c.status,
    estado: c.estado,
    ticketMensal: c.ticketMensal === null ? null : Number(c.ticketMensal),
    dataEntrada: dataParaTexto(c.dataEntrada),
    ultimaVisita: dataParaTexto(c.ultimaVisita),
    metaAdAccountIds: Array.isArray(c.metaAdAccountIds)
      ? c.metaAdAccountIds.filter((v): v is string => typeof v === "string")
      : [],
    googleAdsCustomerId: c.googleAdsCustomerId ?? "",
    ga4PropertyId: c.ga4PropertyId ?? "",
    kommoConta: c.kommoConta ?? "",
    resultadoPrincipal: c.resultadoPrincipal ?? "",
    metaCustoPorResultado: c.metaCustoPorResultado === null ? null : Number(c.metaCustoPorResultado),
    orcamentoMidia: c.orcamentoMidia === null ? null : Number(c.orcamentoMidia),
    briefing: c.briefing ?? "",
    contexto: c.contexto ?? "",
    links: listaDeObjetos<LinkCliente>(c.links, ["rotulo", "url"]),
    pastasDrive: listaDeObjetos<PastaDrive>(c.pastasDrive, ["titulo", "url"]),
    mapaServicos: mapa,
  };
}

export function gerarSlug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

// ── Validação da entrada (POST/PATCH) ───────────────────────────────────────

type Resultado<T> = { ok: true; dados: T } | { ok: false; erro: string };

function texto(valor: unknown, max: number): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  return limpo ? limpo.slice(0, max) : null;
}

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const bruto = String(valor).trim();
  // "1.500,50" (pt-BR) vira 1500.50; "1500.50" fica como está
  const normalizado = bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto;
  const n = typeof valor === "number" ? valor : Number(normalizado);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

function data(valor: unknown): Date | null {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const d = new Date(`${valor}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function url(valor: unknown): string | null {
  const t = texto(valor, 1000);
  if (!t) return null;
  const comProtocolo = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(comProtocolo);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export type DadosCliente = Omit<Prisma.ClaudeClienteCreateInput, "slug"> & { slug: string };

/**
 * Valida o corpo vindo da tela. IDs de conta são normalizados: Meta sem "act_",
 * Google sem traços e com 10 dígitos.
 */
export function validarCliente(corpo: unknown): Resultado<DadosCliente> {
  if (!corpo || typeof corpo !== "object") return { ok: false, erro: "Corpo inválido" };
  const c = corpo as Record<string, unknown>;

  const nome = texto(c.nome, 255);
  if (!nome) return { ok: false, erro: "Nome do cliente é obrigatório" };

  const slug = gerarSlug(texto(c.slug, 100) ?? nome);
  if (!slug) return { ok: false, erro: "Não foi possível gerar o identificador do cliente" };

  const status = (["ativo", "pausado", "encerrado"] as const).find((s) => s === c.status) ?? "ativo";
  const estado = (["saudavel", "atencao", "risco"] as const).find((s) => s === c.estado) ?? "saudavel";

  const metaIds = Array.isArray(c.metaAdAccountIds)
    ? [...new Set(c.metaAdAccountIds.map((v) => String(v).replace(/\D/g, "")).filter((v) => v.length >= 6))].slice(0, 10)
    : [];

  const googleBruto = texto(c.googleAdsCustomerId, 20)?.replace(/\D/g, "") ?? "";
  if (googleBruto && googleBruto.length !== 10) {
    return { ok: false, erro: "O ID do Google Ads precisa ter 10 dígitos (formato 123-456-7890)" };
  }

  const ga4 = texto(c.ga4PropertyId, 30)?.replace(/\D/g, "") ?? "";

  const links: LinkCliente[] = [];
  if (Array.isArray(c.links)) {
    for (const item of c.links.slice(0, 40)) {
      if (!item || typeof item !== "object") continue;
      const l = item as Record<string, unknown>;
      const rotulo = texto(l.rotulo, 60);
      const endereco = url(l.url);
      if (rotulo && endereco) links.push({ rotulo, url: endereco });
    }
  }

  const pastasDrive: PastaDrive[] = [];
  if (Array.isArray(c.pastasDrive)) {
    for (const item of c.pastasDrive.slice(0, 40)) {
      if (!item || typeof item !== "object") continue;
      const p = item as Record<string, unknown>;
      const endereco = url(p.url);
      if (endereco) pastasDrive.push({ titulo: texto(p.titulo, 120) ?? "Pasta", url: endereco });
    }
  }

  const mapaServicos: Record<string, ValorMapa> = {};
  if (c.mapaServicos && typeof c.mapaServicos === "object" && !Array.isArray(c.mapaServicos)) {
    const validos = new Set<string>(OPCOES_MAPA.map((o) => o.valor));
    for (const [servico, valor] of Object.entries(c.mapaServicos as Record<string, unknown>)) {
      const chave = servico.trim().slice(0, 80);
      if (chave && typeof valor === "string" && validos.has(valor) && valor !== "nao_identificado") {
        mapaServicos[chave] = valor as ValorMapa;
      }
    }
  }

  return {
    ok: true,
    dados: {
      slug,
      nome,
      segmento: texto(c.segmento, 120),
      cidade: texto(c.cidade, 120),
      status,
      estado,
      ticketMensal: numero(c.ticketMensal),
      dataEntrada: data(c.dataEntrada),
      ultimaVisita: data(c.ultimaVisita),
      metaAdAccountIds: metaIds,
      googleAdsCustomerId: googleBruto || null,
      ga4PropertyId: ga4 || null,
      kommoConta: texto(c.kommoConta, 120),
      resultadoPrincipal: texto(c.resultadoPrincipal, 60),
      metaCustoPorResultado: numero(c.metaCustoPorResultado),
      orcamentoMidia: numero(c.orcamentoMidia),
      briefing: texto(c.briefing, 200_000),
      contexto: texto(c.contexto, 20_000),
      links: links as unknown as Prisma.InputJsonValue,
      pastasDrive: pastasDrive as unknown as Prisma.InputJsonValue,
      mapaServicos,
    },
  };
}

// ── Formatação ──────────────────────────────────────────────────────────────

export function formatarMoeda(valor: number | null): string {
  if (valor === null) return "-";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarDataCurta(valor: string | Date | null): string {
  if (!valor) return "-";
  const d = typeof valor === "string" ? new Date(`${valor}T00:00:00.000Z`) : valor;
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatarGoogleId(id: string): string {
  return id.length === 10 ? `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6)}` : id;
}
