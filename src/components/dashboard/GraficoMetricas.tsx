"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { InsightDiarioSerializado } from "@/types/dashboard";
import {
  LABELS_METRICAS,
  METRICAS_POR_CATEGORIA,
  formatarMetrica,
  isMetricaMonetaria,
  isMetricaPercentual,
} from "@/lib/metricas";
import {
  MetricaPersonalizadaClient,
  avaliarFormula,
  FormatoMetrica,
} from "@/lib/formula";
import { ModalMetricaPersonalizada } from "./ModalMetricaPersonalizada";

const CORES = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
  "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16",
  "#f97316", "#64748b",
];

interface GraficoMetricasProps {
  porDia: InsightDiarioSerializado[];
  metricasDisponiveis: string[];
  // Apenas quando isGestor = true
  metricasPersonalizadas?: MetricaPersonalizadaClient[];
  contaAnuncioId?: string;
  isGestor?: boolean;
  onMetricaCriada?: (m: MetricaPersonalizadaClient) => void;
  onMetricaRemovida?: (id: string) => void;
}

function idCustom(id: string) {
  return `custom_${id}`;
}

function formatarValorCustom(formato: FormatoMetrica, valor: number): string {
  if (formato === "moeda") {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  if (formato === "percentual") {
    return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  }
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function isCustomMonetaria(id: string, customMap: Map<string, MetricaPersonalizadaClient>) {
  const chave = id.startsWith("custom_") ? id.slice(7) : id;
  return customMap.get(chave)?.formato === "moeda";
}

export function GraficoMetricas({
  porDia,
  metricasDisponiveis,
  metricasPersonalizadas = [],
  contaAnuncioId,
  isGestor = false,
  onMetricaCriada,
  onMetricaRemovida,
}: GraficoMetricasProps) {
  const [selecionadas, setSelecionadas] = useState<string[]>(
    metricasDisponiveis.slice(0, 2)
  );
  const [painelAberto, setPainelAberto] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [categoriaPainel, setCategoriaPainel] = useState(
    Object.keys(METRICAS_POR_CATEGORIA)[0]
  );

  const customMap = useMemo(
    () => new Map(metricasPersonalizadas.map((m) => [m.id, m])),
    [metricasPersonalizadas]
  );

  // Campos que existem em cada dia (para preview do modal)
  const exemploDia = useMemo<Record<string, number>>(
    () => (porDia.length > 0 ? (porDia[porDia.length - 1] as unknown as Record<string, number>) : {}),
    [porDia]
  );

  // Compute daily data including custom metrics
  const dadosGrafico = useMemo(() => {
    return porDia.map((d) => {
      const base: Record<string, unknown> = { data: d.data.slice(5) };
      const dadosNum = d as unknown as Record<string, number>;

      for (const m of selecionadas) {
        if (m.startsWith("custom_")) {
          const id = m.slice(7);
          const mc = customMap.get(id);
          base[m] = mc ? avaliarFormula(mc.formula, dadosNum) : 0;
        } else {
          base[m] = dadosNum[m] ?? 0;
        }
      }
      return base;
    });
  }, [porDia, selecionadas, customMap]);

  function toggleMetrica(campo: string) {
    setSelecionadas((prev) =>
      prev.includes(campo)
        ? prev.filter((m) => m !== campo)
        : [...prev, campo]
    );
  }

  function removerSelecionada(campo: string) {
    setSelecionadas((prev) => prev.filter((m) => m !== campo));
  }

  // All available metrics (standard)
  const todasMetricas = Object.values(METRICAS_POR_CATEGORIA).flat();

  // Resolve label and format for any metric (standard or custom)
  function labelDe(campo: string): string {
    if (campo.startsWith("custom_")) {
      const id = campo.slice(7);
      return customMap.get(id)?.nome ?? campo;
    }
    return LABELS_METRICAS[campo] ?? campo;
  }

  function formatarTooltip(campo: string, valor: number): string {
    if (campo.startsWith("custom_")) {
      const id = campo.slice(7);
      const mc = customMap.get(id);
      if (mc) return formatarValorCustom(mc.formato, valor);
    }
    return formatarMetrica(campo, valor);
  }

  function isMonetariaOuPercentual(campo: string): "left" | "right" {
    if (campo.startsWith("custom_")) {
      const id = campo.slice(7);
      const mc = customMap.get(id);
      if (mc?.formato === "moeda") return "left";
      return "right";
    }
    return isMetricaMonetaria(campo) ? "left" : "right";
  }

  const comEixoEsq = selecionadas.some((m) => isMonetariaOuPercentual(m) === "left");
  const comEixoDir = selecionadas.some((m) => isMonetariaOuPercentual(m) === "right");

  // Cor por índice global de selecionadas
  function corDe(campo: string) {
    const idx = selecionadas.indexOf(campo);
    return CORES[idx % CORES.length];
  }

  async function excluirCustom(id: string) {
    await fetch(`/api/metricas-personalizadas/${id}`, { method: "DELETE" });
    setSelecionadas((prev) => prev.filter((m) => m !== `custom_${id}`));
    onMetricaRemovida?.(id);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Gráfico por Dia
        </h3>
        <button
          onClick={() => setPainelAberto((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Adicionar métrica
        </button>
      </div>

      {/* Painel de seleção de métricas */}
      {painelAberto && (
        <div className="mb-4 border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-3">
          {/* Categorias padrão */}
          <div>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {Object.keys(METRICAS_POR_CATEGORIA).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoriaPainel(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    categoriaPainel === cat
                      ? "bg-black text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {METRICAS_POR_CATEGORIA[categoriaPainel].map((campo) => {
                const ativo = selecionadas.includes(campo);
                return (
                  <button
                    key={campo}
                    onClick={() => toggleMetrica(campo)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                      ativo
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {LABELS_METRICAS[campo] ?? campo}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Métricas personalizadas (só gestor) */}
          {isGestor && (
            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Métricas personalizadas
                </span>
                <button
                  onClick={() => { setPainelAberto(false); setModalAberto(true); }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  + Nova fórmula
                </button>
              </div>
              {metricasPersonalizadas.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhuma criada ainda.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {metricasPersonalizadas.map((mc) => {
                    const chave = idCustom(mc.id);
                    const ativo = selecionadas.includes(chave);
                    return (
                      <div key={mc.id} className="flex items-center gap-1">
                        <button
                          onClick={() => toggleMetrica(chave)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                            ativo
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-blue-700 border-blue-200 hover:border-blue-400"
                          }`}
                        >
                          {mc.nome}
                        </button>
                        <button
                          onClick={() => excluirCustom(mc.id)}
                          className="text-gray-300 hover:text-red-400 text-xs leading-none"
                          title="Excluir métrica"
                        >
                          &times;
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chips das métricas selecionadas */}
      {selecionadas.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selecionadas.map((campo) => {
            const cor = corDe(campo);
            const isCustom = campo.startsWith("custom_");
            return (
              <button
                key={campo}
                onClick={() => removerSelecionada(campo)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white transition-all"
                style={{ backgroundColor: cor }}
                title="Clique para remover"
              >
                <span className="w-2 h-2 rounded-full bg-white/50" />
                {labelDe(campo)}
                {isCustom && <span className="text-white/60 text-[10px]">✦</span>}
                <span className="ml-0.5 text-white/70">&times;</span>
              </button>
            );
          })}
        </div>
      )}

      {selecionadas.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-sm text-gray-400">
          Selecione ao menos uma métrica para exibir o gráfico.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={dadosGrafico} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="data"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            {comEixoEsq && (
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v.toFixed(0)}`
                }
              />
            )}
            {comEixoDir && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                }
              />
            )}
            <Tooltip
              formatter={(value, name) => {
                const campo = String(name ?? "");
                return [formatarTooltip(campo, Number(value ?? 0)), labelDe(campo)];
              }}
              labelFormatter={(label) => `Data: ${label}`}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
            />
            <Legend
              formatter={(value) => labelDe(value)}
              wrapperStyle={{ fontSize: "12px" }}
            />
            {selecionadas.map((campo) => (
              <Line
                key={campo}
                type="monotone"
                dataKey={campo}
                stroke={corDe(campo)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                yAxisId={isMonetariaOuPercentual(campo)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Modal de criação de métrica personalizada */}
      {modalAberto && contaAnuncioId && (
        <ModalMetricaPersonalizada
          contaAnuncioId={contaAnuncioId}
          exemploDia={exemploDia}
          onCriada={(m) => {
            onMetricaCriada?.(m);
            setSelecionadas((prev) => [...prev, idCustom(m.id)]);
          }}
          onFechar={() => setModalAberto(false)}
        />
      )}
    </div>
  );
}
