"use client";

export function LoadingSync() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-blue-200" />
        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      </div>
      <div>
        <p className="text-lg font-semibold text-gray-800">Sincronizando dados</p>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">
          Estamos buscando os dados do Meta Ads. Aguarde e volte em alguns minutos.
        </p>
        <p className="mt-3 text-xs text-gray-400">
          Esta página atualiza automaticamente a cada 30 segundos.
        </p>
      </div>
    </div>
  );
}
