"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CrmEtapa, CrmOportunidade, CrmTag, CrmOrigem, CrmCampoPersonalizadoDefinicao } from "@/components/crm/types";
import { estaAtrasado } from "@/components/crm/utils";
import { Coluna } from "@/components/crm/Coluna";
import { ModalOportunidade } from "@/components/crm/ModalOportunidade";
import { ModalNovaEtapa } from "@/components/crm/ModalNovaEtapa";

function CrmPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const abrirOportunidadeId = searchParams.get("abrir");

  const [etapas, setEtapas] = useState<CrmEtapa[]>([]);
  const [todasTags, setTodasTags] = useState<CrmTag[]>([]);
  const [origens, setOrigens] = useState<CrmOrigem[]>([]);
  const [camposDisponiveis, setCamposDisponiveis] = useState<CrmCampoPersonalizadoDefinicao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalNovaEtapa, setModalNovaEtapa] = useState(false);
  const [oportunidadeModal, setOportunidadeModal] = useState<CrmOportunidade | null | "novo">(null);
  const [etapaNovaOportunidade, setEtapaNovaOportunidade] = useState<string | null>(null);

  const draggingOportunidadeId = useRef<string | null>(null);
  const [dragOverEtapaId, setDragOverEtapaId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const [resEtapas, resTags, resOrigens, resCampos] = await Promise.all([
      fetch("/api/crm/etapas"),
      fetch("/api/crm/tags"),
      fetch("/api/crm/origens"),
      fetch("/api/crm/campos-personalizados"),
    ]);
    if (resEtapas.ok) setEtapas((await resEtapas.json()) as CrmEtapa[]);
    if (resTags.ok) setTodasTags((await resTags.json()) as CrmTag[]);
    if (resOrigens.ok) setOrigens((await resOrigens.json()) as CrmOrigem[]);
    if (resCampos.ok) setCamposDisponiveis((await resCampos.json()) as CrmCampoPersonalizadoDefinicao[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Abre o modal da oportunidade quando vindo da página de Pendências (?abrir=ID)
  useEffect(() => {
    if (!abrirOportunidadeId || carregando) return;
    const oportunidade = etapas.flatMap((e) => e.oportunidades).find((o) => o.id === abrirOportunidadeId);
    if (oportunidade) {
      setOportunidadeModal(oportunidade);
      router.replace("/vendas/crm");
    }
  }, [abrirOportunidadeId, carregando, etapas, router]);

  function handleDragStart(oportunidadeId: string) {
    draggingOportunidadeId.current = oportunidadeId;
  }

  function handleDrop(etapaDestId: string) {
    const oportunidadeId = draggingOportunidadeId.current;
    draggingOportunidadeId.current = null;
    setDragOverEtapaId(null);

    if (!oportunidadeId) return;

    const etapaOrigem = etapas.find((e) => e.oportunidades.some((o) => o.id === oportunidadeId));
    if (!etapaOrigem || etapaOrigem.id === etapaDestId) return;

    const oportunidade = etapaOrigem.oportunidades.find((o) => o.id === oportunidadeId)!;

    setEtapas((prev) =>
      prev.map((e) => {
        if (e.id === etapaOrigem.id) return { ...e, oportunidades: e.oportunidades.filter((o) => o.id !== oportunidadeId) };
        if (e.id === etapaDestId) return { ...e, oportunidades: [...e.oportunidades, { ...oportunidade, etapaId: etapaDestId }] };
        return e;
      })
    );

    void fetch(`/api/crm/oportunidades/${oportunidadeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapaId: etapaDestId }),
    });
  }

  function handleEtapaCriada(etapa: CrmEtapa) {
    setEtapas((prev) => [...prev, etapa]);
    setModalNovaEtapa(false);
  }

  function abrirModalNovaOportunidade(etapaId: string | null) {
    setEtapaNovaOportunidade(etapaId);
    setOportunidadeModal("novo");
  }

  function handleOportunidadeSalva(oportunidade: CrmOportunidade) {
    setEtapas((prev) =>
      prev.map((e) => {
        const existe = e.oportunidades.some((o) => o.id === oportunidade.id);
        if (oportunidade.etapaId === e.id && !existe) {
          return { ...e, oportunidades: [...e.oportunidades, oportunidade] };
        }
        if (existe) {
          return { ...e, oportunidades: e.oportunidades.map((o) => (o.id === oportunidade.id ? oportunidade : o)) };
        }
        return e;
      })
    );
    setOportunidadeModal(null);
    setEtapaNovaOportunidade(null);
  }

  function handleOportunidadeExcluida(oportunidadeId: string) {
    setEtapas((prev) => prev.map((e) => ({ ...e, oportunidades: e.oportunidades.filter((o) => o.id !== oportunidadeId) })));
    setOportunidadeModal(null);
  }

  function handleTagCriada(tag: CrmTag) {
    setTodasTags((prev) => [...prev, tag]);
  }

  const totalAtrasados = etapas.flatMap((e) => e.oportunidades.filter((o) => estaAtrasado(o.dataContato))).length;
  const totalOportunidades = etapas.reduce((acc, e) => acc + e.oportunidades.length, 0);

  if (carregando) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-[#e5e5e5]">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pipeline</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {etapas.length} etapa{etapas.length !== 1 ? "s" : ""} · {totalOportunidades} oportunidade{totalOportunidades !== 1 ? "s" : ""}
            </p>
          </div>
          {totalAtrasados > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              {totalAtrasados} atrasado{totalAtrasados !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button
          onClick={() => abrirModalNovaOportunidade(null)}
          className="bg-black hover:bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Adicionar oportunidade
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 p-6 h-full">
          {etapas.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Nenhuma etapa criada ainda.</p>
                <button onClick={() => setModalNovaEtapa(true)} className="mt-3 text-gray-900 hover:underline text-sm">
                  Criar primeira etapa
                </button>
              </div>
            </div>
          ) : (
            <>
              {etapas.map((etapa) => (
                <Coluna
                  key={etapa.id}
                  etapa={etapa}
                  isDragOver={dragOverEtapaId === etapa.id}
                  onDragOver={(id) => setDragOverEtapaId(id)}
                  onDragLeave={() => setDragOverEtapaId(null)}
                  onDrop={handleDrop}
                  onDragStart={handleDragStart}
                  onClickOportunidade={(o) => setOportunidadeModal(o)}
                  onAdicionarOportunidade={abrirModalNovaOportunidade}
                />
              ))}
              <div className="shrink-0 w-64 flex items-start pt-2">
                <button
                  onClick={() => setModalNovaEtapa(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-gray-500 border-2 border-dashed border-gray-200 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nova etapa
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {modalNovaEtapa && <ModalNovaEtapa onClose={() => setModalNovaEtapa(false)} onCriada={handleEtapaCriada} />}

      {oportunidadeModal !== null && (
        <ModalOportunidade
          oportunidade={oportunidadeModal === "novo" ? null : oportunidadeModal}
          etapaId={etapaNovaOportunidade}
          etapas={etapas}
          todasTags={todasTags}
          origens={origens}
          camposDisponiveis={camposDisponiveis}
          onClose={() => { setOportunidadeModal(null); setEtapaNovaOportunidade(null); }}
          onSalvo={handleOportunidadeSalva}
          onExcluido={handleOportunidadeExcluida}
          onTagCriada={handleTagCriada}
        />
      )}
    </div>
  );
}

export default function CrmPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-72 h-96 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    }>
      <CrmPageContent />
    </Suspense>
  );
}
