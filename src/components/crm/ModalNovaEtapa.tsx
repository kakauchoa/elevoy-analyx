"use client";

import { useState } from "react";
import type { CrmEtapa } from "./types";

const CORES_ETAPA = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export function ModalNovaEtapa({ onClose, onCriada }: { onClose: () => void; onCriada: (etapa: CrmEtapa) => void }) {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(CORES_ETAPA[0]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    if (!nome.trim()) { setErro("Nome é obrigatório"); return; }
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/crm/etapas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), cor }),
      });
      const data = (await res.json()) as CrmEtapa & { erro?: string };
      if (!res.ok) { setErro(data.erro ?? "Erro"); return; }
      onCriada({ ...data, oportunidades: data.oportunidades ?? [] });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Nova etapa</h2>
        {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void salvar(); }}
            placeholder="Ex: Em contato, Proposta enviada..."
            className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Cor</label>
          <div className="flex gap-2 flex-wrap">
            {CORES_ETAPA.map((c) => (
              <button
                key={c}
                onClick={() => setCor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${cor === c ? "ring-2 ring-offset-2 ring-gray-800 scale-110" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-700 border border-[#e5e5e5] rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => void salvar()}
            disabled={salvando}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-900 disabled:opacity-50"
          >
            {salvando ? "Criando..." : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}
