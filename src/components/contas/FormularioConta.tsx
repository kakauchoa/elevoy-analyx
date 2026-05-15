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
  tipoFunil: TipoFunil | "";
  dataEntrada: string;
  tipoPagamento: "cartao" | "boleto";
  orcamentoMensal: string;
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
    accountIdMeta: conta?.accountIdMeta?.replace(/^act_/, "") ?? "",
    tipoFunil: conta?.tipoFunil ?? "",
    dataEntrada: conta?.dataEntrada ?? "",
    tipoPagamento: conta?.tipoPagamento ?? "cartao",
    orcamentoMensal: conta?.orcamentoMensal ? String(Number(conta.orcamentoMensal)) : "",
  });

  const [slugManual, setSlugManual] = useState(modoEdicao);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

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

    setCarregando(true);

    try {
      const payload: Record<string, unknown> = {
        nomeCliente: form.nomeCliente,
        slugCompartilhavel: form.slugCompartilhavel,
        accountIdMeta: `act_${form.accountIdMeta}`,
        tipoFunil: form.tipoFunil,
        dataEntrada: form.dataEntrada || null,
        tipoPagamento: form.tipoPagamento,
        orcamentoMensal: form.tipoPagamento === "boleto" && form.orcamentoMensal
          ? Number(form.orcamentoMensal)
          : null,
      };

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e5]">
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
              className="border border-[#e5e5e5] rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black transition-shadow"
            />
          </div>

          {/* Slug compartilhável */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Slug compartilhável</label>
            <div className="flex items-center border border-[#e5e5e5] rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black transition-shadow">
              <span className="px-3 py-2.5 bg-gray-50 text-gray-400 text-xs border-r border-[#e5e5e5] whitespace-nowrap select-none">
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
                className="flex-1 px-3 py-2.5 text-sm text-gray-900 outline-none bg-white"
              />
            </div>
          </div>

          {/* Account ID do Meta */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Account ID do Meta</label>
            <div className="flex items-center border border-[#e5e5e5] rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black transition-shadow">
              <span className="px-3 py-2.5 bg-gray-50 text-gray-400 text-xs border-r border-[#e5e5e5] whitespace-nowrap select-none font-mono">
                act_
              </span>
              <input
                type="text"
                value={form.accountIdMeta}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, accountIdMeta: e.target.value.replace(/\D/g, "") }))
                }
                placeholder="1128982335101932"
                required
                className="flex-1 px-3 py-2.5 text-sm text-gray-900 font-mono outline-none bg-white"
              />
            </div>
            <p className="text-xs text-gray-400">
              Meta Business Suite → Configurações → Contas de anúncios
            </p>
          </div>

          {/* Data de entrada do cliente */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Data de entrada do cliente
            </label>
            <input
              type="date"
              value={form.dataEntrada}
              onChange={(e) => setForm((prev) => ({ ...prev, dataEntrada: e.target.value }))}
              className="border border-[#e5e5e5] rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black transition-shadow"
            />
            <p className="text-xs text-gray-400">
              Data a partir da qual os dados serão importados do Gerenciador de Anúncios.
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
              className="border border-[#e5e5e5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white transition-shadow"
            >
              <option value="">Selecione o funil...</option>
              {OPCOES_FUNIL.map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de pagamento */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Tipo de pagamento</label>
            <div className="flex gap-3">
              {(["cartao", "boleto"] as const).map((tipo) => (
                <label
                  key={tipo}
                  className={`flex-1 flex items-center gap-2.5 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                    form.tipoPagamento === tipo
                      ? "border-black bg-black text-white"
                      : "border-[#e5e5e5] text-gray-700 hover:border-gray-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoPagamento"
                    value={tipo}
                    checked={form.tipoPagamento === tipo}
                    onChange={() => setForm((prev) => ({ ...prev, tipoPagamento: tipo }))}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">
                    {tipo === "cartao" ? "Cartão de crédito" : "Boleto pré-pago"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Orçamento mensal (só para boleto) */}
          {form.tipoPagamento === "boleto" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Orçamento mensal (R$)</label>
              <div className="flex items-center border border-[#e5e5e5] rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black transition-shadow">
                <span className="px-3 py-2.5 bg-gray-50 text-gray-400 text-xs border-r border-[#e5e5e5] whitespace-nowrap select-none">
                  R$
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.orcamentoMensal}
                  onChange={(e) => setForm((prev) => ({ ...prev, orcamentoMensal: e.target.value }))}
                  placeholder="1500.00"
                  className="flex-1 px-3 py-2.5 text-sm text-gray-900 outline-none bg-white"
                />
              </div>
              <p className="text-xs text-gray-400">
                Alerta enviado por WhatsApp quando o saldo cair abaixo de 30% deste valor.
              </p>
            </div>
          )}

          {/* Painel informativo do funil */}
          {configFunil && (
            <div className="bg-gray-50 border border-[#e5e5e5] rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Métricas configuradas automaticamente
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Resultado principal</p>
                  <p className="text-sm font-medium text-gray-900">
                    {configFunil.labelMetricaPrincipal}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Custo por resultado</p>
                  <p className="text-sm font-medium text-gray-900">
                    {configFunil.labelCustoPorResultado}
                  </p>
                </div>
              </div>

              {ehLandingPage && (
                <p className="mt-3 text-xs text-gray-500 border-t border-[#e5e5e5] pt-3">
                  A conversão rastreada será{" "}
                  <strong>{configFunil.labelMetricaPrincipal}</strong> via Pixel do Meta
                  ou API de Conversões.
                </p>
              )}
            </div>
          )}

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              {erro}
            </p>
          )}

          <div className="flex gap-3 pt-1 pb-1">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 border border-[#e5e5e5] text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando}
              className="flex-1 bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              {carregando ? "Salvando..." : modoEdicao ? "Salvar alterações" : "Adicionar conta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
