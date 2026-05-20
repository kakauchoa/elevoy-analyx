"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ContaRastreamento {
  id: string;
  nomeCliente: string;
  slugCompartilhavel: string;
  pageIdMeta: string | null;
  webhookToken: string | null;
  evolutionStatus: string | null;
  pixelId: string | null;
  totalLeads: number;
  contagemStatus: { ENTROU: number; QUALIFICADO: number; PAGAMENTO: number; VENDA: number };
  clienteVinculado: { id: string; nome: string; email: string; telefone?: string | null } | null;
}

interface ContaDisponivel {
  id: string;
  nomeCliente: string;
  rastreamentoAtivo: boolean;
}

export default function RastreamentoWhatsAppPage() {
  const router = useRouter();
  const [contas, setContas] = useState<ContaRastreamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalGerenciar, setModalGerenciar] = useState(false);
  const [contasDisponiveis, setContasDisponiveis] = useState<ContaDisponivel[]>([]);
  const [atualizando, setAtualizando] = useState<string | null>(null);
  const [novaContaNome, setNovaContaNome] = useState("");
  const [criandoConta, setCriandoConta] = useState(false);
  const [erroConta, setErroConta] = useState("");

  function carregar() {
    setCarregando(true);
    fetch("/api/rastreamento/contas")
      .then((r) => r.json())
      .then((d: ContaRastreamento[]) => setContas(d))
      .finally(() => setCarregando(false));
  }

  useEffect(() => { carregar(); }, []);

  async function abrirGerenciar() {
    const res = await fetch("/api/rastreamento/contas", { method: "POST" });
    const lista = (await res.json()) as ContaDisponivel[];
    setContasDisponiveis(lista);
    setNovaContaNome("");
    setErroConta("");
    setModalGerenciar(true);
  }

  async function criarContaWpp(e: React.FormEvent) {
    e.preventDefault();
    if (!novaContaNome.trim()) return;
    setCriandoConta(true);
    setErroConta("");
    try {
      const res = await fetch("/api/rastreamento/contas/nova", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomeCliente: novaContaNome.trim() }),
      });
      const dados = (await res.json()) as ContaDisponivel & { erro?: string };
      if (!res.ok) { setErroConta(dados.erro ?? "Erro ao criar conta"); return; }
      setContasDisponiveis((prev) => [{ ...dados, rastreamentoAtivo: true }, ...prev]);
      setNovaContaNome("");
      carregar();
    } finally {
      setCriandoConta(false);
    }
  }

  async function toggleRastreamento(id: string, ativo: boolean) {
    setAtualizando(id);
    await fetch(`/api/rastreamento/contas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rastreamentoAtivo: ativo }),
    });
    setContasDisponiveis((prev) =>
      prev.map((c) => (c.id === id ? { ...c, rastreamentoAtivo: ativo } : c))
    );
    setAtualizando(null);
    carregar();
  }

  if (carregando) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader onGerenciar={abrirGerenciar} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">Carregando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader onGerenciar={abrirGerenciar} />

      <div className="flex-1 overflow-auto p-8">
        {contas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-sm text-gray-400">Nenhuma conta ativa no rastreamento.</p>
            <button
              onClick={abrirGerenciar}
              className="text-sm text-blue-600 hover:underline"
            >
              Adicionar conta →
            </button>
          </div>
        ) : (
          <div className="border border-[#e5e5e5] rounded-xl overflow-hidden bg-white divide-y divide-[#f0f0f0]">
            {contas.map((conta) => (
              <ContaRow
                key={conta.id}
                conta={conta}
                onAtualizar={carregar}
                onConfigurar={() => router.push(`/ferramentas/rastreamento-whatsapp/configurar/${conta.id}`)}
                onVerCrm={() => router.push(`/ferramentas/rastreamento-whatsapp/${conta.id}`)}
                onRemover={() => toggleRastreamento(conta.id, false)}
              />
            ))}
          </div>
        )}

        <ClientesPendentes />
      </div>

      {/* Modal de gerenciamento de contas */}
      {modalGerenciar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e5]">
              <h2 className="font-semibold text-gray-900">Gerenciar contas no rastreamento</h2>
              <button
                onClick={() => setModalGerenciar(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              {/* Formulário de nova conta WPP-only */}
              <form onSubmit={(e) => void criarContaWpp(e)} className="border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 space-y-2">
                <p className="text-xs font-semibold text-gray-600">Nova conta só para WhatsApp</p>
                <p className="text-xs text-gray-400">Rastreamento sem precisar de conta Meta Ads</p>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={novaContaNome}
                    onChange={(e) => setNovaContaNome(e.target.value)}
                    placeholder="Nome do cliente"
                    className="flex-1 px-3 py-2 text-sm border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
                  />
                  <button
                    type="submit"
                    disabled={criandoConta || !novaContaNome.trim()}
                    className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors shrink-0"
                  >
                    {criandoConta ? "…" : "Criar"}
                  </button>
                </div>
                {erroConta && (
                  <p className="text-xs text-red-600">{erroConta}</p>
                )}
              </form>

              {/* Lista de contas existentes */}
              {contasDisponiveis.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma conta cadastrada.</p>
              ) : (
                contasDisponiveis.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between border border-[#f0f0f0] rounded-lg px-4 py-3"
                  >
                    <span className="text-sm font-medium text-gray-900">{c.nomeCliente}</span>
                    <button
                      disabled={atualizando === c.id}
                      onClick={() => toggleRastreamento(c.id, !c.rastreamentoAtivo)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                        c.rastreamentoAtivo
                          ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                          : "bg-gray-900 text-white hover:bg-gray-700"
                      }`}
                    >
                      {atualizando === c.id ? "…" : c.rastreamentoAtivo ? "Remover" : "Adicionar"}
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="px-6 pb-5">
              <button
                onClick={() => setModalGerenciar(false)}
                className="w-full py-2 text-sm font-medium border border-[#e5e5e5] rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cabeçalho da página ───────────────────────────────────────────────────────

function PageHeader({ onGerenciar }: { onGerenciar: () => void }) {
  return (
    <div className="px-8 py-5 border-b border-[#e5e5e5] flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Rastreamento WhatsApp</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie leads por conta e monitore eventos CAPI</p>
      </div>
      <button
        onClick={onGerenciar}
        className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        + Gerenciar contas
      </button>
    </div>
  );
}

// ── Linha expansível por conta ────────────────────────────────────────────────

function ContaRow({
  conta,
  onAtualizar,
  onConfigurar,
  onVerCrm,
  onRemover,
}: {
  conta: ContaRastreamento;
  onAtualizar: () => void;
  onConfigurar: () => void;
  onVerCrm: () => void;
  onRemover: () => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const waStatus = conta.evolutionStatus ?? "close";
  const statusCor =
    waStatus === "open"
      ? "bg-green-500"
      : waStatus === "connecting"
      ? "bg-amber-400"
      : "bg-gray-300";

  async function copiarWebhook() {
    if (!conta.webhookToken) return;
    const url = `${window.location.origin}/api/rastreamento/webhook/${conta.webhookToken}`;
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div>
      {/* Linha principal — clicável para expandir */}
      <button
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        {/* Status WhatsApp */}
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusCor}`} title={waStatus} />

        {/* Nome */}
        <span className="flex-1 font-medium text-sm text-gray-900">{conta.nomeCliente}</span>

        {/* Contagem de leads */}
        <div className="hidden sm:flex items-center gap-4 mr-2">
          {(["ENTROU", "QUALIFICADO", "PAGAMENTO", "VENDA"] as const).map((s) => (
            <div key={s} className="text-center min-w-[2.5rem]">
              <p className="text-sm font-bold text-gray-900">{conta.contagemStatus[s]}</p>
              <p className="text-[9px] text-gray-400 leading-tight">{s}</p>
            </div>
          ))}
        </div>

        {/* Cliente vinculado */}
        {conta.clienteVinculado ? (
          <span className="hidden md:inline-block text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
            {conta.clienteVinculado.nome}
          </span>
        ) : (
          <span className="hidden md:inline-block text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            Sem cliente
          </span>
        )}

        {/* Chevron */}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          className={`shrink-0 text-gray-400 transition-transform ${expandido ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Painel expandido */}
      {expandido && (
        <div className="border-t border-[#f5f5f5] bg-gray-50 px-5 py-4 space-y-4">
          {/* Contagens mobile */}
          <div className="sm:hidden grid grid-cols-4 gap-2">
            {(["ENTROU", "QUALIFICADO", "PAGAMENTO", "VENDA"] as const).map((s) => (
              <div key={s} className="text-center">
                <p className="text-base font-bold text-gray-900">{conta.contagemStatus[s]}</p>
                <p className="text-[9px] text-gray-400">{s}</p>
              </div>
            ))}
          </div>

          {/* Cliente */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Cliente CRM</p>
              {conta.clienteVinculado ? (
                <ClientePopup cliente={conta.clienteVinculado} onAtualizar={onAtualizar} />
              ) : (
                <p className="text-sm text-gray-400">
                  Nenhum cliente vinculado —{" "}
                  <button onClick={onConfigurar} className="text-blue-600 hover:underline">
                    configurar
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Webhook */}
          {conta.webhookToken && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Webhook URL</p>
              <div className="flex items-center gap-2 bg-white border border-[#e5e5e5] rounded-lg px-3 py-2">
                <code className="flex-1 text-[10px] text-gray-500 truncate">
                  /api/rastreamento/webhook/{conta.webhookToken.slice(0, 20)}…
                </code>
                <button
                  onClick={copiarWebhook}
                  className="text-xs text-blue-600 font-medium shrink-0"
                >
                  {copiado ? "Copiado!" : "Copiar"}
                </button>
              </div>
            </div>
          )}

          {/* Alertas */}
          {(!conta.pixelId || !conta.pageIdMeta) && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {!conta.pixelId && !conta.pageIdMeta
                ? "Pixel e ID da Página não configurados — eventos CAPI desativados"
                : !conta.pixelId
                ? "Pixel não configurado"
                : "ID da Página Meta não configurado"}
            </p>
          )}

          {/* Ações */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={onConfigurar}
              className="px-3 py-1.5 text-xs font-medium border border-[#e5e5e5] text-gray-700 rounded-lg hover:bg-white transition-colors"
            >
              Configurar
            </button>
            <button
              onClick={onVerCrm}
              className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Ver CRM
            </button>
            <button
              onClick={() => {
                if (confirm(`Remover "${conta.nomeCliente}" do rastreamento?`)) onRemover();
              }}
              className="ml-auto px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Remover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Popup de cliente ──────────────────────────────────────────────────────────

function ClientePopup({
  cliente,
  onAtualizar,
}: {
  cliente: { id: string; nome: string; email: string; telefone?: string | null };
  onAtualizar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    if (aberto) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [aberto]);

  async function desvincular() {
    if (!confirm("Desvincular este cliente?")) return;
    await fetch(`/api/rastreamento/clientes/${cliente.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "desvincular" }),
    });
    setAberto(false);
    onAtualizar();
  }

  async function apagar() {
    if (!confirm(`Apagar a conta de "${cliente.nome}" permanentemente?`)) return;
    await fetch(`/api/rastreamento/clientes/${cliente.id}`, { method: "DELETE" });
    setAberto(false);
    onAtualizar();
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
      >
        {cliente.nome}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {aberto && (
        <div className="absolute left-0 top-full mt-1.5 w-56 bg-white border border-[#e5e5e5] rounded-xl shadow-xl z-30 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f0f0f0]">
            <p className="text-sm font-semibold text-gray-900">{cliente.nome}</p>
            <p className="text-xs text-gray-400">{cliente.email}</p>
            {cliente.telefone && (
              <p className="text-xs text-gray-400">{cliente.telefone}</p>
            )}
          </div>
          <a
            href="/crm-cliente/login"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Portal do cliente →
          </a>
          <button
            onClick={desvincular}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors text-left"
          >
            Desvincular
          </button>
          <div className="border-t border-[#f0f0f0]" />
          <button
            onClick={apagar}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
          >
            Apagar conta
          </button>
        </div>
      )}
    </div>
  );
}

// ── Clientes pendentes ────────────────────────────────────────────────────────

function ClientesPendentes() {
  const router = useRouter();
  const [pendentes, setPendentes] = useState<
    { id: string; nome: string; email: string }[]
  >([]);

  useEffect(() => {
    fetch("/api/rastreamento/clientes")
      .then((r) => r.json())
      .then((lista: { id: string; nome: string; email: string; status: string }[]) =>
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
      <div className="border border-[#e5e5e5] rounded-xl bg-white overflow-hidden divide-y divide-[#f0f0f0]">
        {pendentes.slice(0, 3).map((c) => (
          <div key={c.id} className="flex items-center justify-between px-5 py-3">
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
