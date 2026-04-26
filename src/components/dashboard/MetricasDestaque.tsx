"use client";

import { InsightNumericos } from "@/types/dashboard";
import { LABELS_METRICAS, formatarMetrica } from "@/lib/metricas";

interface MetricasDestaqueProps {
  metricas: string[];
  dados: InsightNumericos;
  labelMetricaPrincipal: string;
  labelCustoPorResultado: string;
}

export function MetricasDestaque({
  metricas,
  dados,
  labelMetricaPrincipal,
  labelCustoPorResultado,
}: MetricasDestaqueProps) {
  function labelDe(campo: string): string {
    if (campo === "resultadoPrincipal" || campo === "whatsappClicks" || campo === "leadCount" ||
        campo === "contactCount" || campo === "purchaseCount" || campo === "videoThruplay") {
      return labelMetricaPrincipal;
    }
    if (campo === "custoPorResultado" || campo === "whatsappCost" || campo === "costPerLead" ||
        campo === "costPerContact" || campo === "costPerPurchase" || campo === "costPerThruplay") {
      return labelCustoPorResultado;
    }
    return LABELS_METRICAS[campo] ?? campo;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {metricas.map((campo) => {
        const valor = (dados as unknown as Record<string, number>)[campo] ?? 0;
        return (
          <div
            key={campo}
            className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-1 shadow-sm"
          >
            <span className="text-xs text-gray-500 truncate">{labelDe(campo)}</span>
            <span className="text-xl font-bold text-gray-900 truncate">
              {formatarMetrica(campo, valor)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
