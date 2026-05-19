"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  mensagem: string | null;
  campanha: string | null;
  publico: string | null;
  anuncio: string | null;
  midia: string | null;
  status: "ENTROU" | "QUALIFICADO" | "PAGAMENTO" | "VENDA";
  valor: string | null;
  criadoEm: string;
}

type Status = Lead["status"];

const COLUNAS: { key: Status; label: string; cor: string; bg: string; evento: string | null }[] = [
  { key: "ENTROU",     label: "Entrou",     cor: "bg-blue-500",   bg: "bg-blue-50",   evento: null },
  { key: "QUALIFICADO", label: "Qualificado", cor: "bg-purple-500", bg: "bg-purple-50", evento: "QualifiedLead" },
  { key: "PAGAMENTO",  label: "Pagamento",  cor: "bg-orange-500", bg: "bg-orange-50", evento: "InitiateCheckout" },
  { key: "VENDA",      label: "Venda",      cor: "bg-green-500",  bg: "bg-green-50",  evento: "Purchase" },
];

export default function CrmClientePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [contaId, setContaId] = useState<string | null>(null);
  const [nomeCliente, setNomeCliente] = useState("");
  const [dragOver, setDragOver] = useState<Status | null>(null);
  const draggingId = useRef<string | null>(null);
  const [modalVenda, setModalVenda] = useState<{ leadId: string } | null>(null);
  const [valorVenda, setValorVenda] = useState("");
  const [leadDetalhes, setLeadDetalhes] = useState<Lead | null>(null);
  const [atualizando, setAtualizando] = useState<string | null>(null);

  useEffect(() => {
    // Busca dados do cliente logado e carrega os leads
    fetch("/api/cliente-crm/me")
      .then((r) => {
        if (r.status === 401) { router.push("/crm-cliente/login"); return null; }
        return r.json();
      })
      .then((me: { contaAnuncioId: string | null; conta?: { slugCompartilhavel: string; nomeCliente: string } } | null) => {
        if (!me) return;
        if (!me.contaAnuncioId || me.conta?.slugCompartilhavel !== slug) {
          router.push("/crm-cliente/login");
          return;
        }
        setContaId(me.contaAnuncioId);
        setNomeCliente(me.conta?.nomeCliente ?? "");
        return fetch(`/api/rastreamento/leads/${me.contaAnuncioId}`);
      })
      .then((r) => r?.json())
      .then((data: Lead[]) => { if (data) setLeads(data); })
      .finally(() => setCarregando(false));
  }, [slug, router]);

  function leadsColuna(status: Status) {
    return leads.filter((l) => l.status === status);
  }

  async function moverLead(leadId: string, novoStatus: Status, valor?: number) {
    setAtualizando(leadId);
    try {
      const res = await fetch(`/api/rastreamento/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus, ...(valor !== undefined ? { valor } : {}) }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? { ...l, status: novoStatus, valor: valor?.toFixed(2) ?? l.valor }
              : l
          )
        );
      }
    } finally {
      setAtualizando(null);
    }
  }

  function onDrop(novoStatus: Status) {
    const id = draggingId.current;
    draggingId.current = null;
    setDragOver(null);
    if (!id) return;

    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === novoStatus) return;

    if (novoStatus === "VENDA") {
      setModalVenda({ leadId: id });
      return;
    }

    moverLead(id, novoStatus);
  }

  async function confirmarVenda() {
    if (!modalVenda) return;
    const valor = parseFloat(valorVenda.replace(",", "."));
    await moverLead(modalVenda.leadId, "VENDA", isNaN(valor) ? undefined : valor);
    setModalVenda(null);
    setValorVenda("");
  }

  async function sair() {
    await fetch("/api/cliente-crm/auth", { method: "DELETE" });
    router.push("/crm-cliente/login");
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Carregando seus leads…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e5e5] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{nomeCliente || "Meus Leads"}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Arraste os cards para atualizar o status e disparar eventos de conversão
          </p>
        </div>
        <button
          onClick={sair}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Sair
        </button>
      </div>

      {/* Resumo */}
      <div className="px-6 py-3 bg-white border-b border-[#f0f0f0] flex gap-6">
        {COLUNAS.map((col) => (
          <div key={col.key} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${col.cor}`} />
            <span className="text-sm text-gray-600 font-medium">{leadsColuna(col.key).length}</span>
            <span className="text-xs text-gray-400">{col.label}</span>
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 min-w-max">
          {COLUNAS.map((col) => {
            const lista = leadsColuna(col.key);
            return (
              <div
                key={col.key}
                onDragOver={(e) => { e.preventDefault(); setDragOver(col.key); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => onDrop(col.key)}
                className={`flex flex-col w-64 rounded-xl border transition-all ${
                  dragOver === col.key
                    ? `border-gray-400 ${col.bg} shadow-inner`
                    : "border-[#e5e5e5] bg-white"
                }`}
              >
                {/* Cabeçalho */}
                <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#f0f0f0]">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.cor}`} />
                  <span className="text-sm font-semibold text-gray-800">{col.label}</span>
                  <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full font-medium">
                    {lista.length}
                  </span>
                </div>

                {/* Evento CAPI */}
                {col.evento && (
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-[#f0f0f0]">
                    <p className="text-[10px] text-gray-400">
                      Arraste aqui → dispara <span className="font-mono text-gray-600">{col.evento}</span>
                    </p>
                  </div>
                )}

                {/* Lista de leads */}
                <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-260px)]">
                  {lista.length === 0 ? (
                    <p className="text-[11px] text-gray-300 text-center py-8">
                      {dragOver === col.key ? "Soltar aqui" : "Nenhum lead"}
                    </p>
                  ) : (
                    lista.map((lead) => (
                      <CardLeadCliente
                        key={lead.id}
                        lead={lead}
                        atualizando={atualizando === lead.id}
                        onDragStart={(id) => { draggingId.current = id; }}
                        onClick={() => setLeadDetalhes(lead)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de valor para Venda */}
      {modalVenda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs mx-4">
            <h2 className="text-base font-bold text-gray-900 mb-1">Mover para Venda</h2>
            <p className="text-sm text-gray-500 mb-4">
              Informe o valor da venda para disparar o evento Purchase no Meta
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorVenda}
                onChange={(e) => setValorVenda(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="0,00"
                autoFocus
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setModalVenda(null); setValorVenda(""); }}
                className="flex-1 py-2.5 text-sm border border-[#e5e5e5] rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarVenda}
                className="flex-1 py-2.5 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Confirmar Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes do lead */}
      {leadDetalhes && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setLeadDetalhes(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">{leadDetalhes.nome}</h2>
              <button onClick={() => setLeadDetalhes(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
                ×
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <InfoRow label="Telefone" value={leadDetalhes.telefone} />
              {leadDetalhes.mensagem && <InfoRow label="Mensagem" value={leadDetalhes.mensagem} />}
              {leadDetalhes.campanha && <InfoRow label="Campanha" value={leadDetalhes.campanha} />}
              {leadDetalhes.publico && <InfoRow label="Público" value={leadDetalhes.publico} />}
              {leadDetalhes.anuncio && <InfoRow label="Anúncio" value={leadDetalhes.anuncio} />}
              {leadDetalhes.midia && <InfoRow label="Mídia" value={leadDetalhes.midia} />}
              {leadDetalhes.valor && (
                <InfoRow
                  label="Valor"
                  value={`R$ ${parseFloat(leadDetalhes.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                />
              )}
              <InfoRow label="Entrou em" value={new Date(leadDetalhes.criadoEm).toLocaleString("pt-BR")} />
            </div>

            {/* Mudar status manualmente */}
            <div className="mt-5 pt-4 border-t border-[#f0f0f0]">
              <p className="text-xs font-medium text-gray-500 mb-2">Mover para</p>
              <div className="flex flex-wrap gap-2">
                {COLUNAS.filter((c) => c.key !== leadDetalhes.status).map((col) => (
                  <button
                    key={col.key}
                    onClick={() => {
                      if (col.key === "VENDA") {
                        setLeadDetalhes(null);
                        setModalVenda({ leadId: leadDetalhes.id });
                      } else {
                        moverLead(leadDetalhes.id, col.key);
                        setLeadDetalhes(null);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-medium border border-[#e5e5e5] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CardLeadCliente({
  lead,
  atualizando,
  onDragStart,
  onClick,
}: {
  lead: Lead;
  atualizando: boolean;
  onDragStart: (id: string) => void;
  onClick: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(lead.id)}
      onClick={onClick}
      className={`bg-white border rounded-xl p-3.5 cursor-grab active:cursor-grabbing select-none transition-all ${
        atualizando
          ? "opacity-50 border-blue-300"
          : "border-[#e5e5e5] hover:shadow-md hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 leading-snug">{lead.nome}</p>
        {atualizando && (
          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
        )}
      </div>
      <p className="text-xs text-gray-400 mt-0.5">{lead.telefone}</p>

      {lead.campanha && (
        <p className="text-[10px] text-gray-400 mt-2 truncate" title={lead.campanha}>
          📢 {lead.campanha}
        </p>
      )}

      {lead.mensagem && (
        <p className="text-[11px] text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
          &ldquo;{lead.mensagem}&rdquo;
        </p>
      )}

      <div className="flex items-center justify-between mt-2">
        {lead.valor ? (
          <span className="text-xs font-semibold text-green-600">
            R$ {parseFloat(lead.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        ) : (
          <span />
        )}
        <span className="text-[10px] text-gray-300">
          {new Date(lead.criadoEm).toLocaleDateString("pt-BR")}
        </span>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-20 shrink-0">{label}:</span>
      <span className="text-gray-900 break-words">{value}</span>
    </div>
  );
}
