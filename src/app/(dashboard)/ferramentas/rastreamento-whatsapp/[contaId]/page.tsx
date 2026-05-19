"use client";

import { useEffect, useRef, useState, use } from "react";

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  mensagem: string | null;
  ctwa: string | null;
  campanha: string | null;
  publico: string | null;
  anuncio: string | null;
  origem: string | null;
  midia: string | null;
  status: "ENTROU" | "QUALIFICADO" | "PAGAMENTO" | "VENDA";
  valor: string | null;
  observacoes: string | null;
  criadoEm: string;
}

const COLUNAS: { key: Lead["status"]; label: string; cor: string }[] = [
  { key: "ENTROU", label: "Entrou", cor: "bg-blue-500" },
  { key: "QUALIFICADO", label: "Qualificado", cor: "bg-purple-500" },
  { key: "PAGAMENTO", label: "Pagamento", cor: "bg-orange-500" },
  { key: "VENDA", label: "Venda", cor: "bg-green-500" },
];

export default function CrmContaPage({ params }: { params: Promise<{ contaId: string }> }) {
  const { contaId } = use(params);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [leadSelecionado, setLeadSelecionado] = useState<Lead | null>(null);
  const draggingId = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState<Lead["status"] | null>(null);

  useEffect(() => {
    fetch(`/api/rastreamento/leads/${contaId}`)
      .then((r) => r.json())
      .then((d: Lead[]) => setLeads(d))
      .finally(() => setCarregando(false));
  }, [contaId]);

  function leadsColuna(status: Lead["status"]) {
    return leads.filter((l) => l.status === status);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5] flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Voltar
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">CRM de Leads — Visão do Gestor</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Somente leitura. O cliente é quem move os cards e dispara os eventos.
          </p>
        </div>
      </div>

      {carregando ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">Carregando leads…</p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex gap-4 p-6">
          {COLUNAS.map((col) => {
            const lista = leadsColuna(col.key);
            return (
              <div
                key={col.key}
                onDragOver={(e) => { e.preventDefault(); setDragOver(col.key); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => setDragOver(null)}
                className={`flex flex-col w-64 shrink-0 rounded-xl border transition-colors ${
                  dragOver === col.key ? "border-gray-400 bg-gray-50" : "border-[#e5e5e5] bg-[#fafafa]"
                }`}
              >
                {/* Cabeçalho da coluna */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e5e5]">
                  <div className={`w-2 h-2 rounded-full ${col.cor}`} />
                  <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                  <span className="ml-auto text-xs text-gray-400 font-medium">{lista.length}</span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {lista.length === 0 ? (
                    <p className="text-[11px] text-gray-300 text-center py-6">Nenhum lead</p>
                  ) : (
                    lista.map((lead) => (
                      <CardLead
                        key={lead.id}
                        lead={lead}
                        somenteLeitura
                        onDragStart={(id) => { draggingId.current = id; }}
                        onClick={() => setLeadSelecionado(lead)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {leadSelecionado && (
        <ModalDetalheLead lead={leadSelecionado} onClose={() => setLeadSelecionado(null)} />
      )}
    </div>
  );
}

function CardLead({
  lead,
  somenteLeitura,
  onDragStart,
  onClick,
}: {
  lead: Lead;
  somenteLeitura: boolean;
  onDragStart: (id: string) => void;
  onClick: () => void;
}) {
  return (
    <div
      draggable={!somenteLeitura}
      onDragStart={() => !somenteLeitura && onDragStart(lead.id)}
      onClick={onClick}
      className="bg-white border border-[#e5e5e5] rounded-lg p-3 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all select-none"
    >
      <p className="text-sm font-medium text-gray-900 truncate">{lead.nome}</p>
      <p className="text-xs text-gray-400 mt-0.5">{lead.telefone}</p>
      {lead.campanha && (
        <p className="text-[10px] text-gray-400 mt-1.5 truncate" title={lead.campanha}>
          📢 {lead.campanha}
        </p>
      )}
      {lead.valor && (
        <p className="text-xs text-green-600 font-medium mt-1">
          R$ {parseFloat(lead.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      )}
      <p className="text-[10px] text-gray-300 mt-1.5">
        {new Date(lead.criadoEm).toLocaleDateString("pt-BR")}
      </p>
    </div>
  );
}

function ModalDetalheLead({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">{lead.nome}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            ×
          </button>
        </div>
        <div className="space-y-2.5 text-sm text-gray-700">
          <Row label="Telefone" value={lead.telefone} />
          <Row label="Status" value={lead.status} />
          {lead.mensagem && <Row label="Mensagem" value={lead.mensagem} />}
          {lead.campanha && <Row label="Campanha" value={lead.campanha} />}
          {lead.publico && <Row label="Público" value={lead.publico} />}
          {lead.anuncio && <Row label="Anúncio" value={lead.anuncio} />}
          {lead.midia && <Row label="Mídia" value={lead.midia} />}
          {lead.valor && (
            <Row
              label="Valor"
              value={`R$ ${parseFloat(lead.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            />
          )}
          <Row
            label="Entrou em"
            value={new Date(lead.criadoEm).toLocaleString("pt-BR")}
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-24 shrink-0">{label}:</span>
      <span className="text-gray-900 break-words">{value}</span>
    </div>
  );
}
