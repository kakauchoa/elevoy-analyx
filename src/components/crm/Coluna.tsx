"use client";

import type { CrmEtapa, CrmOportunidade } from "./types";
import { ordenarOportunidades } from "./utils";
import { CardOportunidade } from "./CardOportunidade";

interface ColunaProps {
  etapa: CrmEtapa;
  isDragOver: boolean;
  onDragOver: (etapaId: string) => void;
  onDragLeave: () => void;
  onDrop: (etapaId: string) => void;
  onDragStart: (oportunidadeId: string) => void;
  onClickOportunidade: (oportunidade: CrmOportunidade) => void;
  onAdicionarOportunidade: (etapaId: string) => void;
}

export function Coluna({
  etapa,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onClickOportunidade,
  onAdicionarOportunidade,
}: ColunaProps) {
  const oportunidadesOrdenadas = ordenarOportunidades(etapa.oportunidades);

  return (
    <div
      className={`flex flex-col w-72 shrink-0 rounded-xl transition-colors ${isDragOver ? "bg-gray-100" : "bg-gray-50"}`}
      onDragOver={(e) => { e.preventDefault(); onDragOver(etapa.id); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(etapa.id); }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: etapa.cor }} />
          <span className="text-sm font-semibold text-gray-800 truncate">{etapa.nome}</span>
          <span className="text-xs text-gray-400 font-normal">{etapa.oportunidades.length}</span>
        </div>
        <button
          onClick={() => onAdicionarOportunidade(etapa.id)}
          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          title="Adicionar oportunidade"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="flex-1 px-3 pb-3 space-y-2 overflow-y-auto max-h-[calc(100vh-14rem)]">
        {oportunidadesOrdenadas.map((oportunidade) => (
          <CardOportunidade
            key={oportunidade.id}
            oportunidade={oportunidade}
            onDragStart={onDragStart}
            onClick={onClickOportunidade}
          />
        ))}
        {isDragOver && (
          <div className="border-2 border-dashed border-gray-300 rounded-xl h-16 flex items-center justify-center">
            <span className="text-xs text-gray-400">Soltar aqui</span>
          </div>
        )}
      </div>
    </div>
  );
}
