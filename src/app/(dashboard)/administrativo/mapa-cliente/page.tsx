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

interface MetricasTotais {
  gestores: number;
  pagantes: number;
  mrr: number;
  contas: number;
}

interface Dados {
  totais: MetricasTotais;
  agencias: Agencia[];
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

export default function MapaClientePage() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(true);
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

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5]">
        <h1 className="text-xl font-bold text-gray-900">Mapa do Cliente</h1>
        <p className="text-sm text-gray-500 mt-0.5">Todas as agências cadastradas e seus dados</p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {carregando ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">Carregando...</div>
        ) : !dados ? (
          <div className="flex items-center justify-center h-40 text-sm text-red-500">Erro ao carregar dados.</div>
        ) : (
          <div className="max-w-5xl mx-auto flex flex-col gap-6">

            {/* KPIs */}
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

            {/* Filtros */}
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

            {/* Tabela */}
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
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-xs">Nenhuma agência encontrada.</td>
                    </tr>
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
                      <td className="px-4 py-3 text-gray-700">
                        {a.totalContas} / {a.contasMaximas}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(a.criadoEm).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
