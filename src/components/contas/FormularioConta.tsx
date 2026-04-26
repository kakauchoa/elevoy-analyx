"use client";

import { useEffect, useState } from "react";
import { CONFIGURACOES_FUNIL, LABELS_FUNIL, TipoFunil } from "@/lib/metricas";
import { ContaAnuncio } from "@/types/dashboard";

interface FormularioContaProps {
  conta: ContaAnuncio | null;
  onSalvar: (conta: ContaAnuncio) => void;
  onFechar: () => void;
}

type CamposForm = {
  nomeCliente: string;
  slugCompartilhavel: string;
  accountIdMeta: string;
  tokenAcesso: string;
  tipoFunil: TipoFunil | "";
};

const OPCOES_FUNIL = Object.entries(LABELS_FUNIL) as [TipoFunil, string][];

function gerarSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function FormularioConta({ conta, onSalvar, onFechar }: FormularioContaProps) {
  const modoEdicao = !!conta;

  const [form, setForm] = useState<CamposForm>({
    nomeCliente: conta?.nomeCliente ?? "",
    slugCompartilhavel: conta?.slugCompartilhavel ?? "",
    accountIdMeta: conta?.accountIdMeta ?? "",
    tokenAcesso: "",
    tipoFunil: conta?.tipoFunil ?? "",
  });

  const [slugManual, setSlugManual] = useState(modoEdicao);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  // Auto-gera slug enquanto o usuário não editar o campo manualmente
  useEffect(() => {
    if (!slugManual && form.nomeCliente) {
      setForm((prev) => ({ ...prev, slugCompartilhavel: gerarSlug(form.nomeCliente) }));
    }
  }, [form.nomeCliente, slugManual]);

  const configFunil = form.tipoFunil ? CONFIGURACOES_FUNIL[form.tipoFunil] : null;
  const ehLandingPage =
    form.tipoFunil === "landing_page_lead" || form.tipoFunil === "landing_page_contato";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (!form.tipoFunil) {
      setErro("Selecione o tipo de funil");
      return;
    }

    if (!modoEdicao && !form.tokenAcesso) {
      setErro("O token de acesso é obrigatório");
      return;
    }

    setCarregando(true);

    try {
      const payload: Partial<CamposForm> = {
        nomeCliente: form.nomeCliente,
        slugCompartilhavel: form.slugCompartilhavel,
        accountIdMeta: form.accountIdMeta,
        tipoFunil: form.tipoFunil,
      };

      if (form.tokenAcesso) payload.tokenAcesso = form.tokenAcesso;

      const url = modoEdicao ? `/api/contas/${conta.id}` : "/api/contas";
      const method = modoEdicao ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const dados = (await res.json()) as ContaAnuncio & { erro?: string };

      if (!res.ok) {
        setErro(dados.erro ?? "Erro ao salvar conta");
        return;
      }

      onSalvar(dados);
    } catch {
      setErro("Erro ao salvar conta. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onFechar} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Cabeçalho fixo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {modoEdicao ? "Editar conta" : "Nova conta de anúncio"}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Corpo com scroll */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex flex-col gap-5 p-6">
          {/* Nome do cliente */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Nome do cliente</label>
            <input
              type="text"
              value={form.nomeCliente}
              onChange={(e) => setForm((prev) => ({ ...prev, nomeCliente: e.target.value }))}
              placeholder="Ex: Loja da Maria"
              required
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
          </div>

          {/* Slug compartilhável */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Slug compartilhável</label>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
              <span className="px-3 py-2.5 bg-gray-50 text-gray-400 text-xs border-r border-gray-200 whitespace-nowrap select-none">
                /compartilhavel/
              </span>
              <input
                type="text"
                value={form.slugCompartilhavel}
                onChange={(e) => {
                  setSlugManual(true);
                  setForm((prev) => ({
                    ...prev,
                    slugCompartilhavel: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  }));
                }}
                placeholder="loja-da-maria"
                required
                className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
              />
            </div>
          </div>

          {/* Account ID do Meta */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Account ID do Meta</label>
            <input
              type="text"
              value={form.accountIdMeta}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, accountIdMeta: e.target.value.trim() }))
              }
              placeholder="act_123456789"
              required
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
            <p className="text-xs text-gray-400">
              Meta Business Suite → Configurações → Contas de anúncios
            </p>
          </div>

          {/* Token de acesso */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Token de acesso
              {modoEdicao && (
                <span className="ml-1 font-normal text-gray-400">(deixe em branco para manter)</span>
              )}
            </label>
            <input
              type="password"
              value={form.tokenAcesso}
              onChange={(e) => setForm((prev) => ({ ...prev, tokenAcesso: e.target.value }))}
              placeholder={modoEdicao ? "••••••••" : "EAAxxxxxxxxxxxx"}
              required={!modoEdicao}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
            <p className="text-xs text-gray-400">
              Token de longa duração da Graph API. Criptografado antes de ser salvo.
            </p>
          </div>

          {/* Tipo de funil */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Tipo de funil</label>
            <select
              value={form.tipoFunil}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tipoFunil: e.target.value as TipoFunil }))
              }
              required
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-shadow"
            >
              <option value="">Selecione o funil...</option>
              {OPCOES_FUNIL.map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Painel informativo do funil selecionado */}
          {configFunil && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                Métricas configuradas automaticamente
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-blue-400">Resultado principal</p>
                  <p className="text-sm font-medium text-blue-900">
                    {configFunil.labelMetricaPrincipal}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-400">Custo por resultado</p>
                  <p className="text-sm font-medium text-blue-900">
                    {configFunil.labelCustoPorResultado}
                  </p>
                </div>
              </div>

              {/* Confirmação adicional para funnels de landing page conforme CLAUDE.md */}
              {ehLandingPage && (
                <p className="mt-3 text-xs text-blue-600 border-t border-blue-100 pt-3">
                  A conversão rastreada será{" "}
                  <strong>{configFunil.labelMetricaPrincipal}</strong> via Pixel do Meta
                  ou API de Conversões.
                </p>
              )}
            </div>
          )}

          {/* Erro */}
          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              {erro}
            </p>
          )}

          {/* Ações */}
          <div className="flex gap-3 pt-1 pb-1">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              {carregando ? "Salvando..." : modoEdicao ? "Salvar alterações" : "Adicionar conta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
