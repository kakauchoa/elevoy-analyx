"use client";

import { useEffect, useState } from "react";

type Plano = "free" | "basico" | "intermediario" | "personalizado";

interface Agencia {
  id: string;
  nome: string;
  email: string;
  plano: Plano;
  assinaturaAtiva: boolean;
  contasMaximas: number;
  totalContas: number;
  criadoEm: string;
}

interface MesCrescimento {
  mes: string;
  novos: number;
  pagantes: number;
  total: number;
}

interface DistPlano {
  free: number;
  basico: number;
  intermediario: number;
  personalizado: number;
}

interface MetricasTotais {
  gestores: number;
  pagantes: number;
  mrr: number;
  contas: number;
}

interface Dados {
  totais: MetricasTotais;
  agencias: Agencia[];
  crescimento: MesCrescimento[];
  distPlano: DistPlano;
}

const LABEL_PLANO: Record<Plano, string> = {
  free: "Gratuito",
  basico: "Básico",
  intermediario: "Intermediário",
  personalizado: "Personalizado",
};

const COR_PLANO: Record<Plano, string> = {
  free: "bg-gray-100 text-gray-600 border-gray-200",
  basico: "bg-blue-50 text-blue-700 border-blue-200",
  intermediario: "bg-purple-50 text-purple-700 border-purple-200",
  personalizado: "bg-amber-50 text-amber-700 border-amber-200",
};

const PRECO_PLANO: Record<string, number> = {
  free: 0,
  basico: 49.9,
  intermediario: 149.9,
  personalizado: 49.9,
};

function BarraGrafico({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  const pct = max > 0 ? (valor / max) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-gray-600 font-medium">{valor}</span>
      <div className="w-8 bg-gray-100 rounded-t-md overflow-hidden" style={{ height: 80 }}>
        <div className={`w-full ${cor} rounded-t-md transition-all`} style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
      </div>
    </div>
  );
}

type Aba = "agencias" | "evolucao";

export default function AgenciasSaasPage() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<Aba>("agencias");
  const [busca, setBusca] = useState("");
  const [filtroPlano, setFiltroPlano] = useState<Plano | "todos">("todos");

  useEffect(() => {
    void fetch("/api/admin/metricas")
      .then((r) => r.json())
      .then((d) => setDados(d as Dados))
      .finally(() => setCarregando(false));
  }, []);

  const agenciasFiltradas = (dados?.agencias ?? []).filter((a) => {
    const buscaOk = !busca || a.nome.toLowerCase().includes(busca.toLowerCase()) || a.email.toLowerCase().includes(busca.toLowerCase());
    const planoOk = filtroPlano === "todos" || a.plano === filtroPlano;
    return buscaOk && planoOk;
  });

  const maxNovos = dados ? Math.max(...dados.crescimento.map((m) => m.novos), 1) : 1;
  const maxTotal = dados ? Math.max(...dados.crescimento.map((m) => m.total), 1) : 1;
  const taxaConversao =
    dados && dados.totais.gestores > 0
      ? ((dados.totais.pagantes / dados.totais.gestores) * 100).toFixed(1)
      : "0.0";
  const planosOrdenados: [string, number][] = dados
    ? (Object.entries(dados.distPlano) as [string, number][]).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5]">
        <h1 className="text-xl font-bold text-gray-900">Agências SaaS</h1>
        <p className="text-sm text-gray-500 mt-0.5">Visão geral das agências cadastradas na plataforma</p>
        <div className="flex gap-4 mt-4">
          {(["agencias", "evolucao"] as Aba[]).map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                aba === a ? "border-[#e85a23] text-[#e85a23]" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {a === "agencias" ? "Agências" : "Evolução"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {carregando ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">Carregando...</div>
        ) : !dados ? (
          <div className="flex items-center justify-center h-40 text-sm text-red-500">Erro ao carregar dados.</div>
        ) : aba === "agencias" ? (
          <div className="max-w-5xl mx-auto flex flex-col gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total de agências", valor: dados.totais.gestores, cor: "text-gray-900" },
                { label: "Com assinatura ativa", valor: dados.totais.pagantes, cor: "text-green-700" },
                { label: "MRR estimado", valor: `R$ ${dados.totais.mrr.toFixed(2).replace(".", ",")}`, cor: "text-blue-700" },
                { label: "Total de contas", valor: dados.totais.contas, cor: "text-gray-900" },
              ].map((k) => (
                <div key={k.label} className="bg-white border border-[#e5e5e5] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                  <p className={`text-2xl font-bold ${k.cor}`}>{k.valor}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3 flex-wrap">
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="flex-1 min-w-48 border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              <select
                value={filtroPlano}
                onChange={(e) => setFiltroPlano(e.target.value as Plano | "todos")}
                className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="todos">Todos os planos</option>
                {(Object.entries(LABEL_PLANO) as [Plano, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-[#e5e5e5]">
                  <tr>
                    {["Agência", "Plano", "Status", "Contas", "Cadastro"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]">
                  {agenciasFiltradas.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-xs">Nenhuma agência encontrada.</td></tr>
                  ) : agenciasFiltradas.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{a.nome}</p>
                        <p className="text-xs text-gray-400">{a.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${COR_PLANO[a.plano]}`}>
                          {LABEL_PLANO[a.plano]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${a.assinaturaAtiva ? "text-green-700" : "text-gray-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${a.assinaturaAtiva ? "bg-green-500" : "bg-gray-300"}`} />
                          {a.assinaturaAtiva ? "Ativa" : "Inativa"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{a.totalContas} / {a.contasMaximas}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(a.criadoEm).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto flex flex-col gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total de agências", valor: String(dados.totais.gestores), sub: "cadastradas" },
                { label: "Pagantes ativos", valor: String(dados.totais.pagantes), sub: "assinaturas ativas" },
                { label: "MRR estimado", valor: `R$ ${dados.totais.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, sub: "receita mensal recorrente" },
                { label: "Taxa de conversão", valor: `${taxaConversao}%`, sub: "free → pago" },
              ].map((k) => (
                <div key={k.label} className="bg-white border border-[#e5e5e5] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{k.valor}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">Novos cadastros por mês</h2>
              <div className="flex items-end justify-between gap-2 overflow-x-auto pb-2">
                {dados.crescimento.map((m) => (
                  <div key={m.mes} className="flex flex-col items-center gap-1 min-w-[40px]">
                    <BarraGrafico valor={m.novos} max={maxNovos} cor="bg-blue-500" />
                    <span className="text-[10px] text-gray-400 text-center">{m.mes}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">Total acumulado</h2>
              <div className="flex items-end justify-between gap-2 overflow-x-auto pb-2">
                {dados.crescimento.map((m) => (
                  <div key={m.mes} className="flex flex-col items-center gap-1 min-w-[40px]">
                    <BarraGrafico valor={m.total} max={maxTotal} cor="bg-gray-800" />
                    <span className="text-[10px] text-gray-400 text-center">{m.mes}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">Distribuição por plano</h2>
              <div className="flex flex-col gap-3">
                {planosOrdenados.map(([plano, qtd]) => {
                  const pct = dados.totais.gestores > 0 ? (qtd / dados.totais.gestores) * 100 : 0;
                  const receita = qtd * (PRECO_PLANO[plano] ?? 0);
                  const labelPlano = plano === "basico" ? "Básico" : plano === "intermediario" ? "Intermediário" : plano === "personalizado" ? "Personalizado" : "Gratuito";
                  const corBarra = plano === "free" ? "bg-gray-400" : plano === "basico" ? "bg-blue-500" : plano === "intermediario" ? "bg-purple-500" : "bg-amber-500";
                  return (
                    <div key={plano} className="flex items-center gap-3">
                      <span className="w-24 text-xs text-gray-600 shrink-0">{labelPlano}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${corBarra}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{qtd}</span>
                      {receita > 0 && <span className="text-xs text-green-700 font-medium w-20 text-right">R$ {receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
