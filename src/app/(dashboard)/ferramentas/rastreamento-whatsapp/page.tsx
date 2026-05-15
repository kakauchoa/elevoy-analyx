export default function RastreamentoWhatsAppPage() {
  return <PaginaEmConstrucao titulo="Rastreamento WhatsApp" descricao="Monitore e analise conversas do WhatsApp integradas às suas campanhas." />;
}

function PaginaEmConstrucao({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5]">
        <h1 className="text-xl font-bold text-gray-900">{titulo}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{descricao}</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold text-gray-700">Em construção</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs">
            Esta funcionalidade está sendo desenvolvida e estará disponível em breve.
          </p>
        </div>
      </div>
    </div>
  );
}
