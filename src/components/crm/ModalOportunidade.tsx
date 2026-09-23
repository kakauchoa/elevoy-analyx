"use client";

import { useState } from "react";
import type {
  CrmOportunidade,
  CrmEtapa,
  CrmTag,
  CrmOportunidadeTag,
  CrmOrigem,
  CrmCampoPersonalizadoDefinicao,
  CrmCampoPersonalizadoValor,
} from "./types";
import { formatarData } from "./utils";
import { SeletorTags } from "./SeletorTags";

interface ModalOportunidadeProps {
  oportunidade: CrmOportunidade | null;
  etapaId: string | null;
  etapas: CrmEtapa[];
  todasTags: CrmTag[];
  origens: CrmOrigem[];
  camposDisponiveis: CrmCampoPersonalizadoDefinicao[];
  onClose: () => void;
  onSalvo: (oportunidade: CrmOportunidade) => void;
  onExcluido: (oportunidadeId: string) => void;
  onTagCriada: (tag: CrmTag) => void;
}

export function ModalOportunidade({
  oportunidade,
  etapaId,
  etapas,
  todasTags,
  origens,
  camposDisponiveis,
  onClose,
  onSalvo,
  onExcluido,
  onTagCriada,
}: ModalOportunidadeProps) {
  const isNovo = oportunidade === null;
  const [titulo, setTitulo] = useState(oportunidade?.titulo ?? "");
  const [telefone, setTelefone] = useState(oportunidade?.contato.telefone ?? "");
  const [empresa, setEmpresa] = useState(oportunidade?.negocio?.nome ?? "");
  const [email, setEmail] = useState(oportunidade?.contato.email ?? "");
  const [valor, setValor] = useState(oportunidade?.valor ?? "");
  const [notas, setNotas] = useState(oportunidade?.notas ?? "");
  const [dataContato, setDataContato] = useState(
    oportunidade?.dataContato ? new Date(oportunidade.dataContato).toISOString().slice(0, 16) : ""
  );
  const [dataMensagem, setDataMensagem] = useState(
    oportunidade?.dataMensagem ? new Date(oportunidade.dataMensagem).toISOString().slice(0, 16) : ""
  );
  const [dataReuniao, setDataReuniao] = useState(
    oportunidade?.dataReuniao ? new Date(oportunidade.dataReuniao).toISOString().slice(0, 16) : ""
  );
  const [etapaSelecionada, setEtapaSelecionada] = useState(etapaId ?? etapas[0]?.id ?? "");

  // Campos de atribuição (tipo UTM)
  const [origemId, setOrigemId] = useState(oportunidade?.origemId ?? "");
  const [meioCampanha, setMeioCampanha] = useState(oportunidade?.meioCampanha ?? "");
  const [campanha, setCampanha] = useState(oportunidade?.campanha ?? "");
  const [conteudo, setConteudo] = useState(oportunidade?.conteudo ?? "");
  const [termo, setTermo] = useState(oportunidade?.termo ?? "");

  const [tagsSelecionadas, setTagsSelecionadas] = useState<CrmOportunidadeTag[]>(oportunidade?.tags ?? []);
  const [camposValores, setCamposValores] = useState<CrmCampoPersonalizadoValor[]>(oportunidade?.campos ?? []);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    if (!titulo.trim()) { setErro("Nome é obrigatório"); return; }
    setSalvando(true);
    setErro("");
    try {
      const payload = {
        titulo,
        telefone: telefone || null,
        empresa: empresa || null,
        email: email || null,
        valor: valor ? Number(valor) : null,
        notas: notas || null,
        origemId: origemId || null,
        meioCampanha: meioCampanha || null,
        campanha: campanha || null,
        conteudo: conteudo || null,
        termo: termo || null,
        dataContato: dataContato || null,
        dataMensagem: dataMensagem || null,
        dataReuniao: dataReuniao || null,
      };

      if (isNovo) {
        const res = await fetch("/api/crm/oportunidades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, etapaId: etapaSelecionada }),
        });
        const data = (await res.json()) as CrmOportunidade & { erro?: string };
        if (!res.ok) { setErro(data.erro ?? "Erro ao salvar"); return; }

        for (const ct of tagsSelecionadas) {
          await fetch(`/api/crm/oportunidades/${data.id}/tags`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tagId: ct.tagId }),
          });
        }
        onSalvo({ ...data, tags: tagsSelecionadas });
      } else {
        const res = await fetch(`/api/crm/oportunidades/${oportunidade.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as CrmOportunidade & { erro?: string };
        if (!res.ok) { setErro(data.erro ?? "Erro ao salvar"); return; }
        onSalvo({ ...data, tags: tagsSelecionadas, campos: camposValores });
      }
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!oportunidade) return;
    setExcluindo(true);
    try {
      await fetch(`/api/crm/oportunidades/${oportunidade.id}`, { method: "DELETE" });
      onExcluido(oportunidade.id);
    } finally {
      setExcluindo(false);
    }
  }

  async function salvarCampoPersonalizado(definicaoId: string, valorCampo: string) {
    if (!oportunidade) return;
    const res = await fetch(`/api/crm/oportunidades/${oportunidade.id}/campos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ definicaoId, valor: valorCampo }),
    });
    const data = (await res.json()) as CrmCampoPersonalizadoValor;
    if (res.ok) {
      setCamposValores((prev) => [...prev.filter((c) => c.definicaoId !== definicaoId), data]);
    }
  }

  async function adicionarTag(tag: CrmTag) {
    if (!oportunidade) {
      setTagsSelecionadas((prev) => [...prev, { id: `temp-${tag.id}`, tagId: tag.id, tag }]);
      return;
    }
    const res = await fetch(`/api/crm/oportunidades/${oportunidade.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId: tag.id }),
    });
    const data = (await res.json()) as CrmOportunidadeTag;
    if (res.ok) setTagsSelecionadas((prev) => [...prev, { ...data, tag }]);
  }

  async function removerTag(tagId: string) {
    if (!oportunidade) {
      setTagsSelecionadas((prev) => prev.filter((t) => t.tagId !== tagId));
      return;
    }
    await fetch(`/api/crm/oportunidades/${oportunidade.id}/tags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    setTagsSelecionadas((prev) => prev.filter((t) => t.tagId !== tagId));
  }

  async function criarTag(nome: string, cor: string) {
    const res = await fetch("/api/crm/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, cor }),
    });
    const tag = (await res.json()) as CrmTag;
    if (res.ok) {
      onTagCriada(tag);
      await adicionarTag(tag);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-8 md:p-12"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-full bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e5] shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {isNovo ? "Nova oportunidade" : "Editar oportunidade"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void salvar()}
              disabled={salvando}
              className="px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
            >
              {salvando ? "Salvando..." : isNovo ? "Criar" : "Salvar"}
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Etapa info / seletor */}
        <div className="px-6 pt-4 shrink-0">
          {isNovo ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Etapa</label>
              <select
                value={etapaSelecionada}
                onChange={(e) => setEtapaSelecionada(e.target.value)}
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
              >
                {etapas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
          ) : (
            (() => {
              const etapa = etapas.find((e) => e.id === oportunidade?.etapaId);
              return etapa ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: etapa.cor }} />
                  <span className="text-xs text-gray-500">{etapa.nome}</span>
                </div>
              ) : null;
            })()
          )}
        </div>

        {/* Form (scrollável) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{erro}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Nome *", value: titulo, setter: setTitulo, placeholder: "João Silva", type: "text" },
              { label: "Telefone", value: telefone, setter: setTelefone, placeholder: "(11) 99999-9999", type: "tel" },
              { label: "Empresa", value: empresa, setter: setEmpresa, placeholder: "Empresa Ltda", type: "text" },
              { label: "Email", value: email, setter: setEmail, placeholder: "joao@empresa.com", type: "email" },
              { label: "Valor (R$)", value: valor, setter: setValor, placeholder: "0,00", type: "number" },
            ].map(({ label, value, setter, placeholder, type }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type={type}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            ))}
          </div>

          {!isNovo && oportunidade && (
            <div className="flex gap-3 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              <span>Entrada: <span className="text-gray-600">{formatarData(oportunidade.criadoEm)}</span></span>
              <span>·</span>
              <span>Atualizado: <span className="text-gray-600">{formatarData(oportunidade.atualizadoEm)}</span></span>
            </div>
          )}

          {/* Atribuição / origem da oportunidade */}
          <div className="border border-[#e5e5e5] rounded-xl p-4 space-y-3 bg-gray-50/50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Atribuição</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Origem</label>
                <select
                  value={origemId}
                  onChange={(e) => setOrigemId(e.target.value)}
                  className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Sem origem</option>
                  {origens.map((o) => (
                    <option key={o.id} value={o.id}>{o.nome}{!o.aprovado ? " (pendente)" : ""}</option>
                  ))}
                </select>
              </div>
              {[
                { label: "Meio de campanha", value: meioCampanha, setter: setMeioCampanha },
                { label: "Campanha", value: campanha, setter: setCampanha },
                { label: "Conteúdo", value: conteudo, setter: setConteudo },
                { label: "Termo", value: termo, setter: setTermo },
              ].map(({ label, value, setter }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data da última mensagem</label>
            <input
              type="datetime-local"
              value={dataMensagem}
              onChange={(e) => setDataMensagem(e.target.value)}
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
            />
            {dataMensagem && (
              <button onClick={() => setDataMensagem("")} className="mt-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                Limpar
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Data de reunião
              <span className="ml-1 text-[10px] text-blue-500 font-normal">sincroniza Google Calendar</span>
            </label>
            <input
              type="datetime-local"
              value={dataReuniao}
              onChange={(e) => setDataReuniao(e.target.value)}
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
            />
            {dataReuniao && (
              <button onClick={() => setDataReuniao("")} className="mt-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                Limpar
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Data de contato
              <span className="ml-1 text-[10px] text-orange-500 font-normal">aparece nas Pendências se vencer</span>
            </label>
            <input
              type="datetime-local"
              value={dataContato}
              onChange={(e) => setDataContato(e.target.value)}
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
            />
            {dataContato && (
              <button onClick={() => setDataContato("")} className="mt-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                Limpar
              </button>
            )}
          </div>

          <SeletorTags
            todasTags={todasTags}
            tagsSelecionadas={tagsSelecionadas}
            oportunidadeId={oportunidade?.id ?? null}
            onAdicionarTag={(tag) => void adicionarTag(tag)}
            onRemoverTag={(tagId) => void removerTag(tagId)}
            onCriarTag={(nome, cor) => criarTag(nome, cor)}
          />

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observações sobre a oportunidade..."
              rows={3}
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black resize-none"
            />
          </div>

          {/* Campos personalizados — catálogo definido em Configurações do CRM */}
          {!isNovo && camposDisponiveis.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Campos personalizados</p>
              <div className="space-y-3">
                {camposDisponiveis.map((def) => {
                  const atual = camposValores.find((c) => c.definicaoId === def.id)?.valor ?? "";
                  return (
                    <div key={def.id}>
                      <label className="block text-[11px] text-gray-500 mb-1">{def.nome}</label>
                      {def.tipo === "select" ? (
                        <select
                          defaultValue={atual}
                          onChange={(e) => void salvarCampoPersonalizado(def.id, e.target.value)}
                          className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                        >
                          <option value="">—</option>
                          {(def.opcoes ?? []).map((op) => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={def.tipo === "numero" ? "number" : def.tipo === "data" ? "date" : "text"}
                          defaultValue={atual}
                          onBlur={(e) => { if (e.target.value) void salvarCampoPersonalizado(def.id, e.target.value); }}
                          className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e5e5e5] flex items-center gap-3 shrink-0">
          {!isNovo && !confirmandoExclusao && (
            <button onClick={() => setConfirmandoExclusao(true)} className="text-sm text-red-500 hover:text-red-700 transition-colors">
              Excluir
            </button>
          )}
          {confirmandoExclusao && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => void excluir()}
                disabled={excluindo}
                className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {excluindo ? "Excluindo..." : "Confirmar"}
              </button>
              <button onClick={() => setConfirmandoExclusao(false)} className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
            </div>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => void salvar()}
            disabled={salvando}
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
          >
            {salvando ? "Salvando..." : isNovo ? "Criar" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
