"use client";

import { useState } from "react";
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
import { LABELS_METRICAS, formatarMetrica, isMetricaMonetaria } from "@/lib/metricas";

const CORES = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

interface GraficoMetricasProps {
  porDia: InsightDiarioSerializado[];
  metricasDisponiveis: string[];
}

export function GraficoMetricas({ porDia, metricasDisponiveis }: GraficoMetricasProps) {
  const [selecionadas, setSelecionadas] = useState<string[]>(
    metricasDisponiveis.slice(0, 2)
  );

  function toggleMetrica(campo: string) {
    setSelecionadas((prev) =>
      prev.includes(campo)
        ? prev.filter((m) => m !== campo)
        : [...prev, campo]
    );
  }

  const dadosGrafico = porDia.map((d) => ({
    data: d.data.slice(5), // exibe MM-DD
    ...Object.fromEntries(
      selecionadas.map((m) => [m, (d as unknown as Record<string, number>)[m] ?? 0])
    ),
  }));

  const monetarias = selecionadas.filter(isMetricaMonetaria);
  const contagens = selecionadas.filter((m) => !isMetricaMonetaria(m));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Gráfico por Dia
        </h3>
        <div className="flex flex-wrap gap-2">
          {metricasDisponiveis.map((campo, idx) => {
            const ativo = selecionadas.includes(campo);
            const cor = CORES[metricasDisponiveis.indexOf(campo) % CORES.length];
            return (
              <button
                key={campo}
                onClick={() => toggleMetrica(campo)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                  ativo
                    ? "text-white border-transparent"
                    : "bg-white text-gray-500 border-gray-300 hover:border-gray-400"
                }`}
                style={ativo ? { backgroundColor: cor, borderColor: cor } : undefined}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ativo ? "white" : cor }}
                />
                {LABELS_METRICAS[campo] ?? campo}
              </button>
            );
          })}
        </div>
      </div>

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
            {monetarias.length > 0 && (
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  v >= 1000
                    ? `R$${(v / 1000).toFixed(1)}k`
                    : `R$${v.toFixed(0)}`
                }
              />
            )}
            {contagens.length > 0 && (
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
                return [formatarMetrica(campo, Number(value ?? 0)), LABELS_METRICAS[campo] ?? campo];
              }}
              labelFormatter={(label) => `Data: ${label}`}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                fontSize: "12px",
              }}
            />
            <Legend
              formatter={(value) => LABELS_METRICAS[value] ?? value}
              wrapperStyle={{ fontSize: "12px" }}
            />
            {selecionadas.map((campo, idx) => (
              <Line
                key={campo}
                type="monotone"
                dataKey={campo}
                stroke={CORES[metricasDisponiveis.indexOf(campo) % CORES.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                yAxisId={isMetricaMonetaria(campo) ? "left" : "right"}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
