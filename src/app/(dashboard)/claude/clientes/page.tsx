import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sessaoAdmin } from "@/lib/claude-relatorios";
import {
  ESTADO_CLIENTE,
  STATUS_CLIENTE,
  formatarDataCurta,
  formatarGoogleId,
  formatarMoeda,
  serializarCliente,
} from "@/lib/claude-clientes";

export const dynamic = "force-dynamic";

const ORDEM_STATUS: Record<string, number> = { ativo: 0, pausado: 1, encerrado: 2 };

function Chip({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] rounded-full whitespace-nowrap">
      <span className="font-semibold text-gray-700">{rotulo}</span>
      {valor}
    </span>
  );
}

export default async function ClaudeClientesPage() {
  if (!(await sessaoAdmin())) redirect("/");

  let erro = false;
  let linhas: (ReturnType<typeof serializarCliente> & { ultimoRelatorio: Date | null })[] = [];

  try {
    const [clientes, ultimos] = await Promise.all([
      prisma.claudeCliente.findMany({ orderBy: { nome: "asc" } }),
      prisma.claudeRelatorio.groupBy({ by: ["clienteSlug"], _max: { dataReferencia: true } }),
    ]);
    const ultimoPorSlug = new Map(ultimos.map((u) => [u.clienteSlug, u._max.dataReferencia]));
    linhas = clientes
      .map((c) => ({ ...serializarCliente(c), ultimoRelatorio: ultimoPorSlug.get(c.slug) ?? null }))
      .sort((a, b) => (ORDEM_STATUS[a.status] ?? 9) - (ORDEM_STATUS[b.status] ?? 9));
  } catch {
    erro = true;
  }

  const ativos = linhas.filter((l) => l.status === "ativo");
  const receita = ativos.reduce((soma, l) => soma + (l.ticketMensal ?? 0), 0);
  const emRisco = ativos.filter((l) => l.estado !== "saudavel").length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Claude · Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quem entra nos relatórios e tudo que o Claude sabe sobre cada um</p>
        </div>
        <Link
          href="/claude/clientes/novo"
          className="flex items-center gap-2 px-4 py-2 bg-[#e85a23] text-white text-sm font-medium rounded-lg hover:bg-[#d14d1e] transition-colors"
        >
          + Novo cliente
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {erro && (
          <div className="border border-red-200 bg-red-50 text-red-700 text-sm rounded-xl p-4">
            Não foi possível carregar os clientes. Confira se as migrations da aba Claude já rodaram no banco.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl">
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Clientes ativos</p>
            <p className="text-2xl font-bold text-gray-900">{ativos.length}</p>
          </div>
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Receita mensal (ativos)</p>
            <p className="text-2xl font-bold text-gray-900">{formatarMoeda(receita)}</p>
          </div>
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Em atenção ou risco</p>
            <p className={`text-2xl font-bold ${emRisco ? "text-red-600" : "text-gray-900"}`}>{emRisco}</p>
          </div>
        </div>

        {!erro && linhas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <p className="text-sm text-gray-500">Nenhum cliente cadastrado ainda.</p>
            <Link href="/claude/clientes/novo" className="text-sm font-medium text-[#e85a23] hover:underline">
              Cadastrar o primeiro cliente
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-[#e5e5e5]">
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Contas</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Ticket mensal</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Última visita</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Último envio</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const status = STATUS_CLIENTE[l.status];
                  const estado = ESTADO_CLIENTE[l.estado];
                  return (
                    <tr key={l.id} className="border-b border-[#f0f0f0] last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/claude/clientes/${l.id}`} className="font-semibold text-gray-900 hover:text-[#e85a23]">
                          {l.nome}
                        </Link>
                        {l.segmento && <p className="text-xs text-gray-400">{l.segmento}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {l.metaAdAccountIds.map((id) => <Chip key={id} rotulo="Meta" valor={id} />)}
                          {l.googleAdsCustomerId && <Chip rotulo="Google" valor={formatarGoogleId(l.googleAdsCustomerId)} />}
                          {l.ga4PropertyId && <Chip rotulo="GA4" valor={l.ga4PropertyId} />}
                          {l.kommoConta && <Chip rotulo="Kommo" valor={l.kommoConta} />}
                          {!l.metaAdAccountIds.length && !l.googleAdsCustomerId && !l.ga4PropertyId && !l.kommoConta && (
                            <span className="text-xs text-gray-400">Nenhuma conta</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-900">{formatarMoeda(l.ticketMensal)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${status.classe}`}>{status.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${estado.classe}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${estado.ponto}`} />
                          {estado.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatarDataCurta(l.ultimaVisita)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {l.ultimoRelatorio ? (
                          <Link href={`/claude/${l.slug}`} className="text-gray-600 hover:text-[#e85a23]">
                            {formatarDataCurta(l.ultimoRelatorio)}
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
