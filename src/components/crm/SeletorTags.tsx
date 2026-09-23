"use client";

import { useEffect, useRef, useState } from "react";
import type { CrmTag, CrmOportunidadeTag } from "./types";

interface SeletorTagsProps {
  todasTags: CrmTag[];
  tagsSelecionadas: CrmOportunidadeTag[];
  oportunidadeId: string | null;
  onAdicionarTag: (tag: CrmTag) => void;
  onRemoverTag: (tagId: string) => void;
  onCriarTag: (nome: string, cor: string) => Promise<void>;
}

export const CORES_TAG = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16"];

export function SeletorTags({ todasTags, tagsSelecionadas, oportunidadeId, onAdicionarTag, onRemoverTag, onCriarTag }: SeletorTagsProps) {
  const [aberto, setAberto] = useState(false);
  const [novaTagNome, setNovaTagNome] = useState("");
  const [novaTagCor, setNovaTagCor] = useState(CORES_TAG[0]);
  const [criando, setCriando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  const tagsSelecionadasIds = new Set(tagsSelecionadas.map((t) => t.tagId));

  async function criarTag() {
    if (!novaTagNome.trim()) return;
    setCriando(true);
    try {
      await onCriarTag(novaTagNome.trim(), novaTagCor);
      setNovaTagNome("");
    } finally {
      setCriando(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <p className="text-xs font-medium text-gray-600 mb-2">Tags</p>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {tagsSelecionadas.map((ct) => (
          <span
            key={ct.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: ct.tag.cor }}
          >
            {ct.tag.nome}
            {oportunidadeId && (
              <button onClick={() => onRemoverTag(ct.tagId)} className="hover:opacity-70 transition-opacity">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        ))}
        <button
          onClick={() => setAberto(!aberto)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-gray-600 border border-dashed border-gray-300 hover:border-gray-400 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar tag
        </button>
      </div>

      {aberto && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-white border border-[#e5e5e5] rounded-xl shadow-lg p-3 space-y-3">
          {todasTags.length > 0 && (
            <div className="space-y-1">
              {todasTags.map((tag) => {
                const selecionada = tagsSelecionadasIds.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => (selecionada ? onRemoverTag(tag.id) : onAdicionarTag(tag))}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.cor }} />
                    <span className="flex-1 text-sm text-gray-900">{tag.nome}</span>
                    {selecionada && (
                      <svg className="w-3.5 h-3.5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="border-t border-[#e5e5e5] pt-2 space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nova tag</p>
            <input
              value={novaTagNome}
              onChange={(e) => setNovaTagNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void criarTag(); }}
              placeholder="Nome da tag"
              className="w-full border border-[#e5e5e5] rounded-lg px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
            />
            <div className="flex flex-wrap gap-1.5">
              {CORES_TAG.map((c) => (
                <button
                  key={c}
                  onClick={() => setNovaTagCor(c)}
                  className={`w-5 h-5 rounded-full transition-transform ${novaTagCor === c ? "ring-2 ring-offset-1 ring-gray-700 scale-110" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              onClick={() => void criarTag()}
              disabled={criando || !novaTagNome.trim()}
              className="w-full px-3 py-1.5 text-xs font-medium text-white bg-black rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
            >
              {criando ? "Criando..." : "Criar tag"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
