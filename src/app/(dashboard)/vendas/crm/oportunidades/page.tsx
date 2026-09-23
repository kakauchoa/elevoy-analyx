"use client";

import { useCallback, useEffect, useState } from "react";
import type { CrmOportunidade, CrmEtapa, CrmTag, CrmOrigem, CrmCampoPersonalizadoDefinicao } from "@/components/crm/types";
import { formatarData } from "@/components/crm/utils";
import { ModalOportunidade } from "@/components/crm/ModalOportunidade";

export default function OportunidadesPage() {
  const [oportunidades, setOportunidades] = useState<CrmOportunidade[]>([]);
  const [etapas, setEtapas] = useState<CrmEtapa[]>([]);
  const [todasTags, setTodasTags] = useState<CrmTag[]>([]);
  const [origens, setOrigens] = useState<CrmOrigem[]>([]);
  const [camposDisponiveis, setCamposDisponiveis] = useState<CrmCampoPersonalizadoDefinicao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalOportunidade, setModalOportunidade] = useState<CrmOportunidade | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [resOportunidades, resEtapas, resTags, resOrigens, resCampos] = await Promise.all([
      fetch("/api/crm/oportunidades"),
      fetch("/api/crm/etapas"),
      fetch("/api/crm/tags"),
      fetch("/api/crm/origens"),
      fetch("/api/crm/campos-personalizados"),
    ]);
    if (resOportunidades.ok) setOportunidades((await resOportunidades.json()) as CrmOportunidade[]);
    if (resEtapas.ok) setEtapas((await resEtapas.json()) as CrmEtapa[]);
    if (resTags.ok) setTodasTags((await resTags.json()) as CrmTag[]);
    if (resOrigens.ok) setOrigens((await resOrigens.json()) as CrmOrigem[]);
    if (resCampos.ok) setCamposDisponiveis((await resCampos.json()) as CrmCampoPersonalizadoDefinicao[]);
    setCarregando(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  function handleSalva(oportunidade: CrmOportunidade) {
    setOportunidades((prev) => prev.map((o) => (o.id === oportunidade.id ? oportunidade : o)));
    setModalOportunidade(null);
  }

  function handleExcluida(id: string) {
    setOportunidades((prev) => prev.filter((o) => o.id !== id));
    setModalOportunidade(null);
  }

  function handleTagCriada(tag: CrmTag) {
    setTodasTags((prev) => [...prev, tag]);
  }

  const etapaPorId = new Map(etapas.map((e) => [e.id, e]));

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5]">
        <h1 className="text-xl font-bold text-gray-900">Oportunidades</h1>
        <p className="text-sm text-gray-500 mt-0.5">{oportunidades.length} oportunidade{oportunidades.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {carregando ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : oportunidades.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma oportunidade cadastrada ainda.</p>
        ) : (
          <div className="border border-[#e5e5e5] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Título</th>
                  <th className="text-left px-4 py-2.5 font-medium">Contato</th>
                  <th className="text-left px-4 py-2.5 font-medium">Empresa</th>
                  <th className="text-left px-4 py-2.5 font-medium">Etapa</th>
                  <th className="text-left px-4 py-2.5 font-medium">Origem</th>
                  <th className="text-left px-4 py-2.5 font-medium">Valor</th>
                  <th className="text-left px-4 py-2.5 font-medium">Atualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {oportunidades.map((o) => {
                  const etapa = etapaPorId.get(o.etapaId);
                  return (
                    <tr key={o.id} onClick={() => setModalOportunidade(o)} className="hover:bg-gray-50/50 cursor-pointer">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{o.titulo}</td>
                      <td className="px-4 py-2.5 text-gray-600">{o.contato.nome}</td>
                      <td className="px-4 py-2.5 text-gray-600">{o.negocio?.nome ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        {etapa && (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: etapa.cor }} />
                            <span className="text-gray-600">{etapa.nome}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{o.origem?.nome ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-600">{o.valor ? `R$ ${o.valor}` : "—"}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{formatarData(o.atualizadoEm)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOportunidade && (
        <ModalOportunidade
          oportunidade={modalOportunidade}
          etapaId={null}
          etapas={etapas}
          todasTags={todasTags}
          origens={origens}
          camposDisponiveis={camposDisponiveis}
          onClose={() => setModalOportunidade(null)}
          onSalvo={handleSalva}
          onExcluido={handleExcluida}
          onTagCriada={handleTagCriada}
        />
      )}
    </div>
  );
}
