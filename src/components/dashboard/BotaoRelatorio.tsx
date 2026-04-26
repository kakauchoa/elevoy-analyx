"use client";

interface BotaoRelatorioProps {
  contaId: string;
  inicio: string;
  fim: string;
}

export function BotaoRelatorio({ contaId, inicio, fim }: BotaoRelatorioProps) {
  return (
    <button
      disabled
      title="Em breve"
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium opacity-60 cursor-not-allowed"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Gerar Relatório
      <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">Em breve</span>
    </button>
  );
}
