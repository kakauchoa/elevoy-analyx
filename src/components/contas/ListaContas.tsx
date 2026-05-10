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
  const [copiado, setCopiado] = useState<string | null>(null);
  const [erroGlobal, setErroGlobal] = useState("");

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
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                    <span className="font-mono">{conta.accountIdMeta}</span>
                    <span>·</span>
                    <span>Resultado: {conta.labelMetricaPrincipal}</span>
                    <span>·</span>
                    <span className="font-mono">/compartilhavel/{conta.slugCompartilhavel}</span>
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

              <div className="mt-3 pt-3 border-t border-[#e5e5e5] flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${
                    conta.compartilhamentoAtivo ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {conta.compartilhamentoAtivo ? "Link público ativo" : "Link público inativo"}
                </span>
                {conta.ultimaSincronizacao ? (
                  <span className="text-xs text-gray-400">
                    Última sinc.:{" "}
                    {new Date(conta.ultimaSincronizacao).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Nunca sincronizado</span>
                )}
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
    </>
  );
}
