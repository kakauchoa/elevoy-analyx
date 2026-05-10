"use client";

interface LoadingSyncProps {
  onAtualizar?: () => void;
  verificando?: boolean;
}

export function LoadingSync({ onAtualizar, verificando = false }: LoadingSyncProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-blue-200" />
        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      </div>
      <div>
        <p className="text-lg font-semibold text-gray-800">Sincronizando dados</p>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">
          Estamos buscando os dados do Meta Ads. Aguarde alguns instantes.
        </p>
        <p className="mt-3 text-xs text-gray-400">
          Esta página verifica automaticamente a cada 10 segundos.
        </p>
      </div>
      {onAtualizar && (
        <button
          onClick={onAtualizar}
          disabled={verificando}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {verificando ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
              Verificando...
            </>
          ) : (
            "Atualizar agora"
          )}
        </button>
      )}
    </div>
  );
}
