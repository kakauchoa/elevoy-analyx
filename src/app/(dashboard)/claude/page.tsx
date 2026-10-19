import Link from "next/link";
import { redirect } from "next/navigation";
import type { ClaudeRelatorio } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  SLUG_VISAO_GERAL,
  TENDENCIA_INFO,
  formatarData,
  sessaoAdmin,
} from "@/lib/claude-relatorios";
import { MarkdownSimples } from "@/components/claude/MarkdownSimples";
import { MetricasRelatorio } from "@/components/claude/MetricasRelatorio";

export const dynamic = "force-dynamic";

type Resumo = Pick<
  ClaudeRelatorio,
  "id" | "clienteSlug" | "clienteNome" | "tipo" | "dataReferencia" | "tendencia" | "resumo" | "conteudo" | "metricas" | "pedidosCliente"
>;

// Ordem dos cards: quem está caindo aparece primeiro
const ORDEM_TENDENCIA: Record<string, number> = { caindo: 0, sem_dados: 1, estavel: 2, melhorando: 3 };

function pedidos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((p): p is string => typeof p === "string") : [];
}

export default async function ClaudePage() {
  if (!(await sessaoAdmin())) redirect("/");

  const limite = new Date();
  limite.setUTCDate(limite.getUTCDate() - 15);

  let recentes: Resumo[] = [];
  let pendentesPorCliente: { clienteSlug: string; _count: { _all: number } }[] = [];
  let erro = false;

  try {
    [recentes, pendentesPorCliente] = await Promise.all([
      prisma.claudeRelatorio.findMany({
        where: { dataReferencia: { gte: limite } },
        orderBy: { dataReferencia: "desc" },
        select: {
          id: true,
          clienteSlug: true,
          clienteNome: true,
          tipo: true,
          dataReferencia: true,
          tendencia: true,
          resumo: true,
          conteudo: true,
          metricas: true,
          pedidosCliente: true,
        },
      }),
      prisma.claudeOtimizacao.groupBy({
        by: ["clienteSlug"],
        where: { status: "pendente" },
        _count: { _all: true },
      }),
    ]);
  } catch {
    erro = true;
  }

  // Último diário de cada cliente + última visão geral + último semanal (para pedidos ao cliente)
  const ultimoDiario = new Map<string, Resumo>();
  const ultimoSemanal = new Map<string, Resumo>();
  let visaoGeral: Resumo | null = null;

  for (const r of recentes) {
    if (r.clienteSlug === SLUG_VISAO_GERAL) {
      if (!visaoGeral) visaoGeral = r;
      continue;
    }
    const mapa = r.tipo === "diario" ? ultimoDiario : ultimoSemanal;
    if (!mapa.has(r.clienteSlug)) mapa.set(r.clienteSlug, r);
  }

  const pendentes = new Map(pendentesPorCliente.map((p) => [p.clienteSlug, p._count._all]));
  const cards = [...ultimoDiario.values()].sort(
    (a, b) => (ORDEM_TENDENCIA[a.tendencia] ?? 9) - (ORDEM_TENDENCIA[b.tendencia] ?? 9),
  );

  const totalPendentes = [...pendentes.entries()]
    .filter(([slug]) => slug !== SLUG_VISAO_GERAL)
    .reduce((soma, [, n]) => soma + n, 0);

  const kpis = [
    { label: "Clientes monitorados", valor: cards.length, cor: "text-gray-900" },
    { label: "Melhorando", valor: cards.filter((c) => c.tendencia === "melhorando").length, cor: "text-green-600" },
    { label: "Caindo", valor: cards.filter((c) => c.tendencia === "caindo").length, cor: "text-red-600" },
    { label: "Otimizações pendentes", valor: totalPendentes, cor: "text-[#e85a23]" },
  ];

  const pedidosAbertos = [...ultimoSemanal.values()]
    .map((r) => ({ cliente: r.clienteNome, slug: r.clienteSlug, itens: pedidos(r.pedidosCliente) }))
    .filter((p) => p.itens.length);

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Claude · Relatórios</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Análise diária às 8h e resumo semanal às segundas, gerados automaticamente
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {erro && (
          <div className="border border-red-200 bg-red-50 text-red-700 text-sm rounded-xl p-4">
            Não foi possível carregar os relatórios. Confira se a migration da aba Claude já rodou no banco.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white border border-[#e5e5e5] rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.cor}`}>{k.valor}</p>
            </div>
          ))}
        </div>

        {visaoGeral && (
          <section className="bg-white border border-[#e5e5e5] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Visão geral da carteira · {formatarData(visaoGeral.dataReferencia)}
              </p>
            </div>
            <MarkdownSimples conteudo={visaoGeral.conteudo} />
          </section>
        )}

        {pedidosAbertos.length > 0 && (
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-3">
              Precisamos do cliente
            </p>
            <div className="space-y-3">
              {pedidosAbertos.map((p) => (
                <div key={p.slug}>
                  <Link href={`/claude/${p.slug}`} className="text-sm font-semibold text-gray-900 hover:underline">
                    {p.cliente}
                  </Link>
                  <ul className="list-disc pl-5 text-sm text-gray-700 mt-1">
                    {p.itens.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {!erro && cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
            <p className="text-sm text-gray-500">Nenhum relatório recebido nos últimos 15 dias.</p>
            <p className="text-xs text-gray-400">
              Os relatórios aparecem aqui assim que a rotina das 8h rodar pela primeira vez.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((r) => {
              const info = TENDENCIA_INFO[r.tendencia];
              const nPendentes = pendentes.get(r.clienteSlug) ?? 0;
              return (
                <Link
                  key={r.id}
                  href={`/claude/${r.clienteSlug}`}
                  className="bg-white border border-[#e5e5e5] rounded-xl p-5 hover:border-[#e85a23] hover:shadow-sm transition-all flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{r.clienteNome}</p>
                      <p className="text-xs text-gray-400">Diário de {formatarData(r.dataReferencia)}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${info.classe}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${info.ponto}`} />
                      {info.label}
                    </span>
                  </div>

                  <MetricasRelatorio metricas={r.metricas} compacto />

                  <p className="text-sm text-gray-600 line-clamp-4">{r.resumo}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#e5e5e5] mt-auto">
                    <span className="text-xs text-gray-500">
                      {nPendentes > 0 ? `${nPendentes} otimizaç${nPendentes === 1 ? "ão" : "ões"} pendente${nPendentes === 1 ? "" : "s"}` : "Sem pendências"}
                    </span>
                    <span className="text-xs font-medium text-[#e85a23]">Abrir →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
