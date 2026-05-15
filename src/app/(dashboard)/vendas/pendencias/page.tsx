"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface CrmEtapaSimples {
  id: string;
  nome: string;
  cor: string;
}

interface CrmTag {
  id: string;
  nome: string;
  cor: string;
}

interface CrmContatoTag {
  id: string;
  tagId: string;
  tag: CrmTag;
}

interface ContatoPendente {
  id: string;
  nome: string;
  telefone: string | null;
  empresa: string | null;
  dataContato: string;
  etapa: CrmEtapaSimples;
  tags: CrmContatoTag[];
}

function diasAtraso(dataContato: string): number {
  const diff = Date.now() - new Date(dataContato).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function telefoneSemFormatacao(tel: string): string {
  return tel.replace(/\D/g, "");
}

export default function PendenciasPage() {
  const router = useRouter();
  const [contatos, setContatos] = useState<ContatoPendente[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/crm/pendencias");
      if (res.ok) setContatos((await res.json()) as ContatoPendente[]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function abrirNoCrm(contatoId: string) {
    router.push(`/vendas/crm?abrir=${contatoId}`);
  }

  if (carregando) {
    return (
      <div className="p-8 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-[#e5e5e5]">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pendências</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {contatos.length === 0
              ? "Nenhum lead com follow-up atrasado"
              : `${contatos.length} lead${contatos.length !== 1 ? "s" : ""} com data de contato vencida`}
          </p>
        </div>
        {contatos.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {contatos.length} atrasado{contatos.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {contatos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-gray-800 font-semibold">Tudo em dia!</p>
              <p className="text-sm text-gray-400 mt-0.5">Nenhum lead com follow-up atrasado.</p>
            </div>
          </div>
        ) : (
          <div className="px-8 py-5 space-y-2">
            {contatos.map((c) => {
              const dias = diasAtraso(c.dataContato);
              return (
                <div
                  key={c.id}
                  className="bg-white border border-red-200 rounded-xl px-5 py-4 hover:border-red-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Nome + etapa */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 truncate">{c.nome}</span>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.etapa.cor }} />
                          <span className="text-xs text-gray-500">{c.etapa.nome}</span>
                        </div>
                      </div>

                      {c.empresa && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{c.empresa}</p>
                      )}

                      {/* Data e atraso */}
                      <div className="mt-2 flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {dias === 0 ? "Venceu hoje" : `${dias} dia${dias !== 1 ? "s" : ""} atrasado`}
                        </span>
                        <span className="text-xs text-gray-400">
                          Previsto: {formatarDataHora(c.dataContato)}
                        </span>
                      </div>

                      {/* Tags */}
                      {c.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {c.tags.map((ct) => (
                            <span
                              key={ct.id}
                              className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white"
                              style={{ backgroundColor: ct.tag.cor }}
                            >
                              {ct.tag.nome}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 shrink-0">
                      {c.telefone && (
                        <a
                          href={`https://wa.me/55${telefoneSemFormatacao(c.telefone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Abrir no WhatsApp"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </a>
                      )}
                      <button
                        onClick={() => abrirNoCrm(c.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-900 transition-colors"
                      >
                        Abrir no CRM
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
