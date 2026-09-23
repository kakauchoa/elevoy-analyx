export default function IntegracoesCrmPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5]">
        <h1 className="text-xl font-bold text-gray-900">Integrações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Conexões externas que alimentam o CRM automaticamente.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 max-w-2xl space-y-4">
        <div className="border border-[#e5e5e5] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Meta Lead Ads (Formulários Instantâneos)</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md">
                Recebe automaticamente leads de formulários instantâneos do Meta Ads e cria um card na
                aba Leads com campanha, conjunto e anúncio já preenchidos.
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-semibold px-2 py-1 bg-gray-100 text-gray-500 rounded-full uppercase tracking-wide">
              Em breve
            </span>
          </div>
        </div>

        <div className="border border-[#e5e5e5] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Observador de WhatsApp</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md">
                Conecta um número de WhatsApp apenas para leitura, capturando a origem (clique em anúncio)
                de quem inicia conversa e criando o Lead automaticamente. Não envia nem responde mensagens.
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-semibold px-2 py-1 bg-gray-100 text-gray-500 rounded-full uppercase tracking-wide">
              Próximo passo
            </span>
          </div>
        </div>

        <div className="border border-[#e5e5e5] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Eventos para o Pixel / Conversions API</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md">
                Dispara automaticamente eventos (LeadSubmitted, Schedule, QualifiedLead, Purchase) para o Meta
                quando uma oportunidade muda de etapa no pipeline.
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-semibold px-2 py-1 bg-gray-100 text-gray-500 rounded-full uppercase tracking-wide">
              Em breve
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
