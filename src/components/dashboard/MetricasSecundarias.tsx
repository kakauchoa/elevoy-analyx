"use client";

import { InsightNumericos } from "@/types/dashboard";
import { LABELS_METRICAS, formatarMetrica } from "@/lib/metricas";

interface MetricasSecundariasProps {
  metricas: string[];
  dados: InsightNumericos;
}

export function MetricasSecundarias({ metricas, dados }: MetricasSecundariasProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-4 pt-4 pb-1 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Métricas Secundárias
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-gray-100">
        {metricas.map((campo) => {
          const valor = (dados as unknown as Record<string, number>)[campo] ?? 0;
          return (
            <div key={campo} className="bg-white px-4 py-3">
              <p className="text-xs text-gray-500 truncate">{LABELS_METRICAS[campo] ?? campo}</p>
              <p className="text-base font-semibold text-gray-800 mt-0.5 truncate">
                {formatarMetrica(campo, valor)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
