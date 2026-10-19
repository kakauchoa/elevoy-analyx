import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  PRIORIDADE_INFO,
  TENDENCIA_INFO,
  formatarData,
  sessaoAdmin,
} from "@/lib/claude-relatorios";
import { MarkdownSimples } from "@/components/claude/MarkdownSimples";
import { MetricasRelatorio } from "@/components/claude/MetricasRelatorio";
import { OtimizacaoItem } from "@/components/claude/OtimizacaoItem";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ r?: string; aba?: string }>;
}

export default async function ClaudeClientePage({ params, searchParams }: Props) {
  if (!(await sessaoAdmin())) redirect("/");

  const { slug } = await params;
  const { r: relatorioSelecionado, aba } = await searchParams;
  const abaOtimizacoes = aba === "otimizacoes";

  const [historico, otimizacoes] = await Promise.all([
    prisma.claudeRelatorio.findMany({
      where: { clienteSlug: slug },
      orderBy: [{ dataReferencia: "desc" }, { tipo: "asc" }],
      take: 90,
      select: { id: true, clienteNome: true, tipo: true, dataReferencia: true, tendencia: true },
    }),
    prisma.claudeOtimizacao.findMany({
      where: { clienteSlug: slug },
      orderBy: [{ status: "asc" }, { criadoEm: "desc" }],
      take: 100,
    }),
  ]);

  if (!historico.length) notFound();

  const idAtual = historico.some((h) => h.id === relatorioSelecionado) ? relatorioSelecionado! : historico[0].id;
  const atual = await prisma.claudeRelatorio.findUnique({ where: { id: idAtual } });
  if (!atual) notFound();

  const info = TENDENCIA_INFO[atual.tendencia];
  const pendentes = otimizacoes.filter((o) => o.status === "pendente");
  const resolvidas = otimizacoes.filter((o) => o.status !== "pendente");
  const pedidos = Array.isArray(atual.pedidosCliente)
    ? atual.pedidosCliente.filter((p): p is string => typeof p === "string")
    : [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5] flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Link href="/claude" className="text-xs text-gray-500 hover:text-[#e85a23]">← Todos os clientes</Link>
          <h1 className="text-xl font-bold text-gray-900 truncate">{historico[0].clienteNome}</h1>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
          <Link
            href={`/claude/${slug}`}
            className={`px-3 py-1.5 text-sm rounded-md ${!abaOtimizacoes ? "bg-white shadow-sm font-medium text-gray-900" : "text-gray-500"}`}
          >
            Relatórios
          </Link>
          <Link
            href={`/claude/${slug}?aba=otimizacoes`}
            className={`px-3 py-1.5 text-sm rounded-md ${abaOtimizacoes ? "bg-white shadow-sm font-medium text-gray-900" : "text-gray-500"}`}
          >
            Otimizações {pendentes.length > 0 && <span className="ml-1 text-[#e85a23]">({pendentes.length})</span>}
          </Link>
        </div>
      </div>

      {abaOtimizacoes ? (
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 max-w-4xl">
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Pendentes ({pendentes.length})
            </p>
            {pendentes.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma otimização pendente.</p>
            ) : (
              <div className="space-y-3">
                {pendentes.map((o) => (
                  <OtimizacaoItem
                    key={o.id}
                    id={o.id}
                    titulo={o.titulo}
                    descricao={o.descricao}
                    plataforma={o.plataforma}
                    prioridadeLabel={PRIORIDADE_INFO[o.prioridade].label}
                    prioridadeClasse={PRIORIDADE_INFO[o.prioridade].classe}
                    status={o.status}
                    data={o.criadoEm.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  />
                ))}
              </div>
            )}
          </section>

          {resolvidas.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Feitas e descartadas ({resolvidas.length})
              </p>
              <div className="space-y-3">
                {resolvidas.map((o) => (
                  <OtimizacaoItem
                    key={o.id}
                    id={o.id}
                    titulo={o.titulo}
                    descricao={o.descricao}
                    plataforma={o.plataforma}
                    prioridadeLabel={PRIORIDADE_INFO[o.prioridade].label}
                    prioridadeClasse={PRIORIDADE_INFO[o.prioridade].classe}
                    status={o.status}
                    data={(o.feitaEm ?? o.criadoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          <aside className="w-56 shrink-0 border-r border-[#e5e5e5] overflow-y-auto py-3 hidden md:block">
            {historico.map((h) => {
              const ativo = h.id === atual.id;
              return (
                <Link
                  key={h.id}
                  href={`/claude/${slug}?r=${h.id}`}
                  className={`flex items-center gap-2 px-4 py-2 text-sm ${ativo ? "bg-orange-50 text-[#e85a23] font-medium" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TENDENCIA_INFO[h.tendencia].ponto}`} />
                  <span>{formatarData(h.dataReferencia)}</span>
                  <span className="text-[11px] text-gray-400 ml-auto">{h.tipo === "semanal" ? "Semanal" : "Diário"}</span>
                </Link>
              );
            })}
          </aside>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {atual.tipo === "semanal" ? "Relatório semanal" : "Relatório diário"} · {formatarData(atual.dataReferencia)}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${info.classe}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${info.ponto}`} />
                {info.label}
              </span>
            </div>

            <MetricasRelatorio metricas={atual.metricas} />

            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-sm text-gray-800">
              {atual.resumo}
            </div>

            {pedidos.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Precisamos do cliente</p>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {pedidos.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}

            <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
              <MarkdownSimples conteudo={atual.conteudo} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
