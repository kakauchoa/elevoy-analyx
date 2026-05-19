"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ContaRastreamento {
  id: string;
  nomeCliente: string;
  slugCompartilhavel: string;
  pageIdMeta: string | null;
  webhookToken: string | null;
  pixelId: string | null;
  totalLeads: number;
  contagemStatus: {
    ENTROU: number;
    QUALIFICADO: number;
    PAGAMENTO: number;
    VENDA: number;
  };
  clienteVinculado: { id: string; nome: string; email: string } | null;
}

export default function RastreamentoWhatsAppPage() {
  const router = useRouter();
  const [contas, setContas] = useState<ContaRastreamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/rastreamento/contas")
      .then((r) => r.json())
      .then((d: ContaRastreamento[]) => setContas(d))
      .finally(() => setCarregando(false));
  }, []);

  function webhookUrl(token: string) {
    const base = window.location.origin;
    return `${base}/api/rastreamento/webhook/${token}`;
  }

  async function copiarWebhook(token: string, contaId: string) {
    await navigator.clipboard.writeText(webhookUrl(token));
    setCopiado(contaId);
    setTimeout(() => setCopiado(null), 2000);
  }

  if (carregando) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-8 py-5 border-b border-[#e5e5e5]">
          <h1 className="text-xl font-bold text-gray-900">Rastreamento WhatsApp</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">Carregando…</p>
        </div>
      </div>
    );
  }

  if (contas.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-8 py-5 border-b border-[#e5e5e5]">
          <h1 className="text-xl font-bold text-gray-900">Rastreamento WhatsApp</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie leads por conta via Meta CAPI</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-gray-400">Nenhuma conta de anúncio cadastrada.</p>
          <button
            onClick={() => router.push("/contas")}
            className="text-sm text-blue-600 hover:underline"
          >
            Ir para Contas de Anúncio →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5]">
        <h1 className="text-xl font-bold text-gray-900">Rastreamento WhatsApp</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie leads por conta e monitore eventos CAPI</p>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {contas.map((conta) => (
            <div
              key={conta.id}
              className="border border-[#e5e5e5] rounded-xl bg-white overflow-hidden hover:shadow-sm transition-shadow"
            >
              {/* Cabeçalho */}
              <div className="p-5 border-b border-[#f0f0f0]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{conta.nomeCliente}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {conta.pixelId ? `Pixel: ${conta.pixelId}` : "Pixel não configurado"}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/ferramentas/rastreamento-whatsapp/${conta.id}`)}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Ver CRM
                  </button>
                </div>
              </div>

              {/* Contagem de leads */}
              <div className="p-4 grid grid-cols-4 gap-2 border-b border-[#f0f0f0]">
                {(["ENTROU", "QUALIFICADO", "PAGAMENTO", "VENDA"] as const).map((s) => (
                  <div key={s} className="text-center">
                    <p className="text-lg font-bold text-gray-900">{conta.contagemStatus[s]}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{s}</p>
                  </div>
                ))}
              </div>

              {/* Webhook URL */}
              <div className="p-4 space-y-2">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                  URL do Webhook (Evolution API)
                </p>
                {conta.webhookToken ? (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[10px] text-gray-600 bg-gray-50 border border-[#e5e5e5] rounded px-2 py-1.5 truncate">
                      /api/rastreamento/webhook/{conta.webhookToken.slice(0, 16)}…
                    </code>
                    <button
                      onClick={() => copiarWebhook(conta.webhookToken!, conta.id)}
                      className="shrink-0 text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {copiado === conta.id ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Recarregue para gerar webhook</p>
                )}

                {/* Cliente vinculado */}
                <div className="pt-1">
                  {conta.clienteVinculado ? (
                    <p className="text-xs text-green-600">
                      Cliente: {conta.clienteVinculado.nome}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600">Nenhum cliente vinculado</p>
                  )}
                </div>

                {/* Alerta de configuração faltante */}
                {(!conta.pixelId || !conta.pageIdMeta) && (
                  <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-[11px] text-amber-700">
                      {!conta.pixelId && !conta.pageIdMeta
                        ? "Pixel e ID da Página não configurados — eventos CAPI desativados"
                        : !conta.pixelId
                        ? "Pixel não configurado"
                        : "ID da Página Meta não configurado"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Seção de aprovações pendentes */}
        <ClientesPendentes />
      </div>
    </div>
  );
}

function ClientesPendentes() {
  const router = useRouter();
  const [pendentes, setPendentes] = useState<
    { id: string; nome: string; email: string; criadoEm: string }[]
  >([]);

  useEffect(() => {
    fetch("/api/rastreamento/clientes")
      .then((r) => r.json())
      .then((lista: { id: string; nome: string; email: string; status: string; criadoEm: string }[]) =>
        setPendentes(lista.filter((c) => c.status === "pendente"))
      );
  }, []);

  if (pendentes.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          Clientes aguardando aprovação
          <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
            {pendentes.length}
          </span>
        </h2>
        <button
          onClick={() => router.push("/ferramentas/rastreamento-whatsapp/aprovar")}
          className="text-sm text-blue-600 hover:underline"
        >
          Gerenciar todos →
        </button>
      </div>
      <div className="space-y-2">
        {pendentes.slice(0, 3).map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between border border-[#e5e5e5] rounded-lg px-4 py-3 bg-white"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{c.nome}</p>
              <p className="text-xs text-gray-400">{c.email}</p>
            </div>
            <button
              onClick={() => router.push("/ferramentas/rastreamento-whatsapp/aprovar")}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Aprovar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
