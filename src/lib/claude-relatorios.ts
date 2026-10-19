import { timingSafeEqual } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type {
  ClaudePrioridade,
  ClaudeTendencia,
  ClaudeTipoRelatorio,
} from "@prisma/client";

// ── Autenticação ────────────────────────────────────────────────────────────

/**
 * Valida o token enviado pelas rotinas do Claude no header Authorization: Bearer <token>.
 * Sem CLAUDE_RELATORIOS_TOKEN configurado no ambiente, nenhuma requisição passa.
 */
export function tokenClaudeValido(req: Request): boolean {
  const esperado = process.env.CLAUDE_RELATORIOS_TOKEN;
  if (!esperado || esperado.length < 32) return false;

  const header = req.headers.get("authorization") ?? "";
  const recebido = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!recebido) return false;

  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** A aba Claude é só do admin da plataforma (relatórios da agência, não dos assinantes). */
export async function sessaoAdmin(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return false;
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { perfil: true },
    });
    return usuario?.perfil === "admin";
  } catch {
    return false;
  }
}

// ── Validação do payload ────────────────────────────────────────────────────

const TIPOS: ClaudeTipoRelatorio[] = ["diario", "semanal"];
const TENDENCIAS: ClaudeTendencia[] = ["melhorando", "estavel", "caindo", "sem_dados"];
const PRIORIDADES: ClaudePrioridade[] = ["alta", "media", "baixa"];
const SLUG_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

export interface OtimizacaoEntrada {
  titulo: string;
  descricao: string;
  plataforma: string;
  prioridade: ClaudePrioridade;
}

export interface RelatorioEntrada {
  clienteSlug: string;
  clienteNome: string;
  tipo: ClaudeTipoRelatorio;
  dataReferencia: Date;
  tendencia: ClaudeTendencia;
  resumo: string;
  conteudo: string;
  metricas: object | null;
  pedidosCliente: string[];
  otimizacoes: OtimizacaoEntrada[];
}

type Resultado<T> = { ok: true; dados: T } | { ok: false; erro: string };

function texto(valor: unknown, max: number): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  if (!limpo || limpo.length > max) return null;
  return limpo;
}

export function validarRelatorio(corpo: unknown): Resultado<RelatorioEntrada> {
  if (!corpo || typeof corpo !== "object") return { ok: false, erro: "Corpo inválido" };
  const c = corpo as Record<string, unknown>;

  const clienteSlug = texto(c.clienteSlug, 100);
  if (!clienteSlug || !SLUG_VALIDO.test(clienteSlug)) return { ok: false, erro: "clienteSlug inválido" };

  const clienteNome = texto(c.clienteNome, 255);
  if (!clienteNome) return { ok: false, erro: "clienteNome obrigatório" };

  if (!TIPOS.includes(c.tipo as ClaudeTipoRelatorio)) return { ok: false, erro: "tipo deve ser diario ou semanal" };
  const tipo = c.tipo as ClaudeTipoRelatorio;

  if (typeof c.dataReferencia !== "string" || !DATA_VALIDA.test(c.dataReferencia)) {
    return { ok: false, erro: "dataReferencia deve ser AAAA-MM-DD" };
  }
  const dataReferencia = new Date(`${c.dataReferencia}T00:00:00.000Z`);
  if (Number.isNaN(dataReferencia.getTime())) return { ok: false, erro: "dataReferencia inválida" };

  const tendencia = TENDENCIAS.includes(c.tendencia as ClaudeTendencia)
    ? (c.tendencia as ClaudeTendencia)
    : "sem_dados";

  const resumo = texto(c.resumo, 2000);
  if (!resumo) return { ok: false, erro: "resumo obrigatório (até 2000 caracteres)" };

  const conteudo = texto(c.conteudo, 200_000);
  if (!conteudo) return { ok: false, erro: "conteudo obrigatório" };

  const metricas = c.metricas && typeof c.metricas === "object" ? (c.metricas as object) : null;

  const pedidosCliente = Array.isArray(c.pedidosCliente)
    ? c.pedidosCliente.map((p) => texto(p, 500)).filter((p): p is string => p !== null).slice(0, 20)
    : [];

  const otimizacoes: OtimizacaoEntrada[] = [];
  if (Array.isArray(c.otimizacoes)) {
    for (const item of c.otimizacoes.slice(0, 30)) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const titulo = texto(o.titulo, 255);
      const descricao = texto(o.descricao, 5000);
      if (!titulo || !descricao) continue;
      otimizacoes.push({
        titulo,
        descricao,
        plataforma: texto(o.plataforma, 30)?.toLowerCase() ?? "meta",
        prioridade: PRIORIDADES.includes(o.prioridade as ClaudePrioridade)
          ? (o.prioridade as ClaudePrioridade)
          : "media",
      });
    }
  }

  return {
    ok: true,
    dados: {
      clienteSlug,
      clienteNome,
      tipo,
      dataReferencia,
      tendencia,
      resumo,
      conteudo,
      metricas,
      pedidosCliente,
      otimizacoes,
    },
  };
}

// ── Exibição ────────────────────────────────────────────────────────────────

export const SLUG_VISAO_GERAL = "geral";

export const TENDENCIA_INFO: Record<ClaudeTendencia, { label: string; classe: string; ponto: string }> = {
  melhorando: { label: "Melhorando", classe: "bg-green-50 text-green-700 border-green-200", ponto: "bg-green-500" },
  estavel: { label: "Estável", classe: "bg-gray-50 text-gray-600 border-gray-200", ponto: "bg-gray-400" },
  caindo: { label: "Caindo", classe: "bg-red-50 text-red-700 border-red-200", ponto: "bg-red-500" },
  sem_dados: { label: "Sem dados", classe: "bg-amber-50 text-amber-700 border-amber-200", ponto: "bg-amber-400" },
};

export const PRIORIDADE_INFO: Record<ClaudePrioridade, { label: string; classe: string }> = {
  alta: { label: "Alta", classe: "bg-red-50 text-red-700" },
  media: { label: "Média", classe: "bg-amber-50 text-amber-700" },
  baixa: { label: "Baixa", classe: "bg-gray-100 text-gray-600" },
};

/** Data de referência vem como DATE (meia-noite UTC); formata sem deslocar o dia. */
export function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
