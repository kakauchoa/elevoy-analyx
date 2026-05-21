"use client";

import { useEffect, useState } from "react";

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
}

interface Dados {
  totais: MetricasTotais;
  crescimento: MesCrescimento[];
  distPlano: DistPlano;
}

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
        <div
          className={`w-full ${cor} rounded-t-md transition-all`}
          style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
        />
      </div>
    </div>
  );
}

export default function MapaEvolucaoPage() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    void fetch("/api/admin/metricas")
      .then((r) => r.json())
      .then((d) => setDados(d as Dados))
      .finally(() => setCarregando(false));
  }, []);

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
        <h1 className="text-xl font-bold text-gray-900">Mapa de Evolução</h1>
        <p className="text-sm text-gray-500 mt-0.5">Crescimento, receita e distribuição de planos</p>
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
                { label: "Total de agências", valor: String(dados.totais.gestores), sub: "cadastradas" },
                { label: "Pagantes ativos", valor: String(dados.totais.pagantes), sub: "assinaturas ativas" },
                {
                  label: "MRR estimado",
                  valor: `R$ ${dados.totais.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                  sub: "receita mensal recorrente",
                },
                { label: "Taxa de conversão", valor: `${taxaConversao}%`, sub: "free → pago" },
              ].map((k) => (
                <div key={k.label} className="bg-white border border-[#e5e5e5] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{k.valor}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Gráfico de novos cadastros por mês */}
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
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#e5e5e5]">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Novos cadastros
                </span>
              </div>
            </div>

            {/* Gráfico de total acumulado */}
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">Total acumulado de agências</h2>
              <div className="flex items-end justify-between gap-2 overflow-x-auto pb-2">
                {dados.crescimento.map((m) => (
                  <div key={m.mes} className="flex flex-col items-center gap-1 min-w-[40px]">
                    <BarraGrafico valor={m.total} max={maxTotal} cor="bg-gray-800" />
                    <span className="text-[10px] text-gray-400 text-center">{m.mes}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Distribuição por plano */}
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">Distribuição por plano</h2>
              <div className="flex flex-col gap-3">
                {planosOrdenados.map(([plano, qtd]) => {
                  const pct = dados.totais.gestores > 0 ? (qtd / dados.totais.gestores) * 100 : 0;
                  const receita = qtd * (PRECO_PLANO[plano] ?? 0);
                  const labelPlano =
                    plano === "basico" ? "Básico"
                    : plano === "intermediario" ? "Intermediário"
                    : plano === "personalizado" ? "Personalizado"
                    : "Gratuito";
                  const corBarra =
                    plano === "free" ? "bg-gray-400"
                    : plano === "basico" ? "bg-blue-500"
                    : plano === "intermediario" ? "bg-purple-500"
                    : "bg-amber-500";
                  return (
                    <div key={plano} className="flex items-center gap-3">
                      <span className="w-24 text-xs text-gray-600 shrink-0">{labelPlano}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${corBarra}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{qtd}</span>
                      {receita > 0 && (
                        <span className="text-xs text-green-700 font-medium w-20 text-right">
                          R$ {receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 mt-4">
                * Receita calculada apenas sobre assinantes ativos confirmados via Stripe.
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
