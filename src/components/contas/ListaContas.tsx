"use client";

import { useState } from "react";
import { ContaAnuncio } from "@/types/dashboard";
import { LABELS_FUNIL, TipoFunil } from "@/lib/metricas";
import { FormularioConta } from "./FormularioConta";

interface ListaContasProps {
  contasIniciais: ContaAnuncio[];
}

export function ListaContas({ contasIniciais }: ListaContasProps) {
  const [contas, setContas] = useState(contasIniciais);
  const [modalAberto, setModalAberto] = useState(false);
  const [contaEmEdicao, setContaEmEdicao] = useState<ContaAnuncio | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const [confirmandoReprocessar, setConfirmandoReprocessar] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [reprocessando, setReprocessando] = useState<string | null>(null);
  const [erroGlobal, setErroGlobal] = useState("");
  const [modalSincPeriodo, setModalSincPeriodo] = useState<string | null>(null);
  const [sincronizandoPeriodo, setSincronizandoPeriodo] = useState<string | null>(null);

  const abrirModal = (conta: ContaAnuncio | null = null) => {
    setContaEmEdicao(conta);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setContaEmEdicao(null);
  };

  const handleContaSalva = (conta: ContaAnuncio) => {
    setContas((prev) =>
      contaEmEdicao
        ? prev.map((c) => (c.id === conta.id ? conta : c))
        : [conta, ...prev]
    );
    fecharModal();
  };

  const handleToggle = async (id: string, novoValor: boolean) => {
    setContas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, compartilhamentoAtivo: novoValor } : c))
    );

    try {
      const res = await fetch(`/api/contas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compartilhamentoAtivo: novoValor }),
      });

      if (!res.ok) {
        setContas((prev) =>
          prev.map((c) => (c.id === id ? { ...c, compartilhamentoAtivo: !novoValor } : c))
        );
        setErroGlobal("Erro ao atualizar compartilhamento");
      }
    } catch {
      setContas((prev) =>
        prev.map((c) => (c.id === id ? { ...c, compartilhamentoAtivo: !novoValor } : c))
      );
      setErroGlobal("Erro ao atualizar compartilhamento");
    }
  };

  const handleCopiarLink = async (slug: string) => {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    await navigator.clipboard.writeText(`${base}/compartilhavel/${slug}`);
    setCopiado(slug);
    setTimeout(() => setCopiado(null), 2000);
  };

  const handleReprocessar = async (id: string) => {
    setConfirmandoReprocessar(null);
    setReprocessando(id);
    setErroGlobal("");

    try {
      const res = await fetch(`/api/contas/${id}/reprocessar`, { method: "POST" });
      const data = (await res.json()) as { iniciado?: boolean; erro?: string; dataInicio?: string; dataFim?: string };

      if (res.ok && data.iniciado) {
        // Atualiza a conta localmente — dados serão reprocessados em background
        setContas((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ultimaSincronizacao: null } : c))
        );
      } else {
        setErroGlobal(data.erro ?? "Erro ao iniciar reprocessamento");
      }
    } catch {
      setErroGlobal("Erro ao iniciar reprocessamento");
    } finally {
      setReprocessando(null);
    }
  };

  const handleSincronizarPeriodo = async (id: string, dataInicio: string, dataFim: string) => {
    setSincronizandoPeriodo(id);
    setModalSincPeriodo(null);
    setErroGlobal("");
    try {
      const res = await fetch("/api/meta/sincronizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contaAnuncioId: id, dataInicio, dataFim }),
      });
      const data = (await res.json()) as { sincronizados?: number; erros?: string[]; erro?: string };
      if (res.ok) {
        setContas((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, ultimaSincronizacao: new Date().toISOString() } : c
          )
        );
      } else {
        setErroGlobal(data.erro ?? "Erro ao sincronizar período");
      }
    } catch {
      setErroGlobal("Erro ao sincronizar período");
    } finally {
      setSincronizandoPeriodo(null);
    }
  };

  const handleExcluir = async (id: string) => {
    try {
      const res = await fetch(`/api/contas/${id}`, { method: "DELETE" });
      if (res.ok) {
        setContas((prev) => prev.filter((c) => c.id !== id));
        setConfirmandoExclusao(null);
      } else {
        setErroGlobal("Erro ao excluir conta");
      }
    } catch {
      setErroGlobal("Erro ao excluir conta");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas de Anúncio</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {contas.length} conta{contas.length !== 1 ? "s" : ""} cadastrada{contas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="bg-black hover:bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nova conta
        </button>
      </div>

      {erroGlobal && (
        <div className="mb-4 flex items-center justify-between p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {erroGlobal}
          <button
            onClick={() => setErroGlobal("")}
            className="text-red-400 hover:text-red-600 ml-4 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {contas.length === 0 ? (
        <div className="bg-white border border-[#e5e5e5] rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhuma conta cadastrada ainda.</p>
          <button
            onClick={() => abrirModal()}
            className="mt-3 text-gray-900 hover:underline text-sm"
          >
            Adicionar primeira conta
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {contas.map((conta) => (
            <div
              key={conta.id}
              className="bg-white border border-[#e5e5e5] rounded-xl p-5 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{conta.nomeCliente}</h3>
                    <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">
                      {LABELS_FUNIL[conta.tipoFunil as TipoFunil]}
                    </span>
                    {reprocessando === conta.id && (
                      <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                        Reprocessando dados...
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                    <span className="font-mono">{conta.accountIdMeta}</span>
                    <span>·</span>
                    <span>Resultado: {conta.labelMetricaPrincipal}</span>
                    <span>·</span>
                    <span className="font-mono">/compartilhavel/{conta.slugCompartilhavel}</span>
                    {conta.dataEntrada && (
                      <>
                        <span>·</span>
                        <span>
                          Desde:{" "}
                          {new Date(conta.dataEntrada).toLocaleDateString("pt-BR", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Toggle compartilhamento */}
                  <button
                    onClick={() => handleToggle(conta.id, !conta.compartilhamentoAtivo)}
                    title={conta.compartilhamentoAtivo ? "Desativar link público" : "Ativar link público"}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                      conta.compartilhamentoAtivo ? "bg-black" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        conta.compartilhamentoAtivo ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>

                  {/* Copiar link */}
                  <button
                    onClick={() => handleCopiarLink(conta.slugCompartilhavel)}
                    title="Copiar link compartilhável"
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {copiado === conta.slugCompartilhavel ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>

                  {/* Sincronizar período */}
                  <button
                    onClick={() => setModalSincPeriodo(conta.id)}
                    disabled={sincronizandoPeriodo === conta.id}
                    title="Sincronizar período específico"
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
                  >
                    {sincronizandoPeriodo === conta.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>

                  {/* Reprocessar dados */}
                  {confirmandoReprocessar === conta.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleReprocessar(conta.id)}
                        className="text-xs px-2 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setConfirmandoReprocessar(null)}
                        className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmandoReprocessar(conta.id)}
                      disabled={reprocessando === conta.id}
                      title="Reprocessar todos os dados desde a data de entrada"
                      className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-40"
                    >
                      {reprocessando === conta.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* Editar */}
                  <button
                    onClick={() => abrirModal(conta)}
                    title="Editar conta"
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  {/* Excluir */}
                  {confirmandoExclusao === conta.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleExcluir(conta.id)}
                        className="text-xs px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setConfirmandoExclusao(null)}
                        className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmandoExclusao(conta.id)}
                      title="Excluir conta"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[#e5e5e5] flex items-center justify-between gap-4 flex-wrap">
                <span
                  className={`text-xs font-medium ${
                    conta.compartilhamentoAtivo ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {conta.compartilhamentoAtivo ? "Link público ativo" : "Link público inativo"}
                </span>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  {conta.saldoAtual && (
                    <span className="font-medium text-gray-600">
                      Saldo: R${" "}
                      {Number(conta.saldoAtual).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  )}
                  {conta.ultimaSincronizacao ? (
                    <span>
                      Sinc.:{" "}
                      {new Date(conta.ultimaSincronizacao).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : (
                    <span>{reprocessando === conta.id ? "Reprocessando..." : "Nunca sincronizado"}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <FormularioConta
          conta={contaEmEdicao}
          onSalvar={handleContaSalva}
          onFechar={fecharModal}
        />
      )}

      {modalSincPeriodo && (
        <ModalSincronizarPeriodo
          contaId={modalSincPeriodo}
          onSincronizar={handleSincronizarPeriodo}
          onFechar={() => setModalSincPeriodo(null)}
        />
      )}
    </>
  );
}

// ── Modal de sincronizar período ───────────────────────────────────────────

function ontem(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function ModalSincronizarPeriodo({
  contaId,
  onSincronizar,
  onFechar,
}: {
  contaId: string;
  onSincronizar: (id: string, inicio: string, fim: string) => void;
  onFechar: () => void;
}) {
  const [inicio, setInicio] = useState(diasAtras(30));
  const [fim, setFim] = useState(ontem());
  const [erro, setErro] = useState("");

  const hoje = new Date().toISOString().slice(0, 10);

  function confirmar() {
    if (!inicio || !fim) { setErro("Selecione as datas."); return; }
    if (inicio > fim) { setErro("A data inicial deve ser anterior à final."); return; }
    onSincronizar(contaId, inicio, fim);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Sincronizar período</h2>
        <p className="text-sm text-gray-500">
          Escolha o intervalo de datas para buscar e salvar os dados no banco.
        </p>

        {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data inicial</label>
            <input
              type="date"
              value={inicio}
              max={hoje}
              onChange={(e) => { setErro(""); setInicio(e.target.value); }}
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data final</label>
            <input
              type="date"
              value={fim}
              max={hoje}
              onChange={(e) => { setErro(""); setFim(e.target.value); }}
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          {[
            { label: "Hoje", inicio: hoje, fim: hoje },
            { label: "7 dias", inicio: diasAtras(7), fim: ontem() },
            { label: "30 dias", inicio: diasAtras(30), fim: ontem() },
          ].map((p) => (
            <button
              key={p.label}
              onClick={() => { setErro(""); setInicio(p.inicio); setFim(p.fim); }}
              className="flex-1 px-2 py-1.5 text-xs border border-[#e5e5e5] rounded-lg hover:bg-gray-50 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onFechar} className="flex-1 px-4 py-2 text-sm text-gray-700 border border-[#e5e5e5] rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-900"
          >
            Sincronizar
          </button>
        </div>
      </div>
    </div>
  );
}
