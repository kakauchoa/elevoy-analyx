"use client";

import { useCallback, useEffect, useState } from "react";
import type { CrmTag, CrmOrigem, CrmCampoPersonalizadoDefinicao } from "@/components/crm/types";
import { CORES_TAG } from "@/components/crm/SeletorTags";

type Aba = "campos" | "tags" | "origens";

const TIPOS_CAMPO = [
  { valor: "texto", label: "Texto" },
  { valor: "numero", label: "Número" },
  { valor: "data", label: "Data" },
  { valor: "select", label: "Seleção (opções fixas)" },
];

// ── Aba Campos Personalizados ───────────────────────────────────────────────

function AbaCampos() {
  const [campos, setCampos] = useState<CrmCampoPersonalizadoDefinicao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("texto");
  const [opcoesTexto, setOpcoesTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    const res = await fetch("/api/crm/campos-personalizados");
    if (res.ok) setCampos((await res.json()) as CrmCampoPersonalizadoDefinicao[]);
    setCarregando(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function criar() {
    if (!nome.trim()) return;
    setErro("");
    setSalvando(true);
    try {
      const opcoes = tipo === "select" ? opcoesTexto.split(",").map((o) => o.trim()).filter(Boolean) : undefined;
      const res = await fetch("/api/crm/campos-personalizados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, tipo, opcoes }),
      });
      const data = (await res.json()) as { erro?: string };
      if (!res.ok) { setErro(data.erro ?? "Erro ao criar campo"); return; }
      setNome(""); setOpcoesTexto(""); setTipo("texto");
      void carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    await fetch(`/api/crm/campos-personalizados/${id}`, { method: "DELETE" });
    setCampos((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="border border-[#e5e5e5] rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-gray-900">Novo campo personalizado</p>
        {erro && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Segmento" className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
              {TIPOS_CAMPO.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
            </select>
          </div>
          {tipo === "select" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Opções (separadas por vírgula)</label>
              <input value={opcoesTexto} onChange={(e) => setOpcoesTexto(e.target.value)} placeholder="Ex: Baixo, Médio, Alto" className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
          )}
        </div>
        <button onClick={() => void criar()} disabled={salvando || !nome.trim()} className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-900 disabled:opacity-50">
          {salvando ? "Criando..." : "Adicionar campo"}
        </button>
      </div>

      {carregando ? (
        <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
      ) : campos.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum campo personalizado criado ainda.</p>
      ) : (
        <div className="space-y-2">
          {campos.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3 border border-[#e5e5e5] rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                <p className="text-xs text-gray-500">{TIPOS_CAMPO.find((t) => t.valor === c.tipo)?.label}{c.opcoes ? ` · ${c.opcoes.join(", ")}` : ""}</p>
              </div>
              <button onClick={() => void excluir(c.id)} className="text-xs text-red-500 hover:text-red-700">Excluir</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Aba Tags ─────────────────────────────────────────────────────────────────

function AbaTags() {
  const [tags, setTags] = useState<CrmTag[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(CORES_TAG[0]);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const res = await fetch("/api/crm/tags");
    if (res.ok) setTags((await res.json()) as CrmTag[]);
    setCarregando(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function criar() {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      const res = await fetch("/api/crm/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, cor }),
      });
      if (res.ok) { setNome(""); void carregar(); }
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    await fetch(`/api/crm/tags/${id}`, { method: "DELETE" });
    setTags((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="border border-[#e5e5e5] rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-gray-900">Nova tag</p>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div className="flex gap-1.5">
            {CORES_TAG.map((c) => (
              <button key={c} onClick={() => setCor(c)} className={`w-6 h-6 rounded-full transition-transform ${cor === c ? "ring-2 ring-offset-1 ring-gray-700 scale-110" : ""}`} style={{ backgroundColor: c }} />
            ))}
          </div>
          <button onClick={() => void criar()} disabled={salvando || !nome.trim()} className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-900 disabled:opacity-50">
            {salvando ? "Criando..." : "Criar"}
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
      ) : tags.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma tag criada ainda.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: t.cor }}>
              {t.nome}
              <button onClick={() => void excluir(t.id)} className="hover:opacity-70">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Aba Origens ──────────────────────────────────────────────────────────────

function AbaOrigens() {
  const [origens, setOrigens] = useState<CrmOrigem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [vinculando, setVinculando] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    setCarregando(true);
    const res = await fetch("/api/crm/origens");
    if (res.ok) setOrigens((await res.json()) as CrmOrigem[]);
    setCarregando(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function criar() {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      const res = await fetch("/api/crm/origens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      if (res.ok) { setNome(""); void carregar(); }
    } finally {
      setSalvando(false);
    }
  }

  async function aprovar(id: string) {
    await fetch(`/api/crm/origens/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aprovado: true }),
    });
    void carregar();
  }

  async function vincular(id: string) {
    const destinoId = vinculando[id];
    if (!destinoId) return;
    await fetch(`/api/crm/origens/${id}/vincular`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destinoId }),
    });
    void carregar();
  }

  async function excluir(id: string) {
    await fetch(`/api/crm/origens/${id}`, { method: "DELETE" });
    setOrigens((prev) => prev.filter((o) => o.id !== id));
  }

  const aprovadas = origens.filter((o) => o.aprovado);
  const pendentes = origens.filter((o) => !o.aprovado);

  return (
    <div className="space-y-6">
      <div className="border border-[#e5e5e5] rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-gray-900">Nova origem</p>
        <div className="flex gap-3">
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Indicação" className="flex-1 border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          <button onClick={() => void criar()} disabled={salvando || !nome.trim()} className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-900 disabled:opacity-50">
            {salvando ? "Criando..." : "Criar"}
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
      ) : (
        <>
          {pendentes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Pendentes de avaliação</p>
              {pendentes.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 border border-amber-200 bg-amber-50/50 rounded-xl">
                  <p className="text-sm font-medium text-gray-900">{o.nome}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={vinculando[o.id] ?? ""}
                      onChange={(e) => setVinculando((prev) => ({ ...prev, [o.id]: e.target.value }))}
                      className="border border-[#e5e5e5] rounded-lg px-2 py-1.5 text-xs bg-white"
                    >
                      <option value="">Vincular a...</option>
                      {aprovadas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                    <button
                      onClick={() => void vincular(o.id)}
                      disabled={!vinculando[o.id]}
                      className="text-xs px-2.5 py-1.5 border border-[#e5e5e5] rounded-lg hover:bg-gray-50 disabled:opacity-40"
                    >
                      Vincular
                    </button>
                    <button onClick={() => void aprovar(o.id)} className="text-xs px-2.5 py-1.5 bg-black text-white rounded-lg hover:bg-gray-900">
                      Aprovar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Origens</p>
            {aprovadas.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma origem aprovada ainda.</p>
            ) : (
              aprovadas.map((o) => (
                <div key={o.id} className="flex items-center justify-between px-4 py-3 border border-[#e5e5e5] rounded-xl">
                  <p className="text-sm font-medium text-gray-900">{o.nome}</p>
                  <button onClick={() => void excluir(o.id)} className="text-xs text-red-500 hover:text-red-700">Excluir</button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────

export default function ConfiguracoesCrmPage() {
  const [aba, setAba] = useState<Aba>("campos");

  const abas: { id: Aba; label: string }[] = [
    { id: "campos", label: "Campos personalizados" },
    { id: "tags", label: "Tags" },
    { id: "origens", label: "Origens" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5]">
        <h1 className="text-xl font-bold text-gray-900">Configurações do CRM</h1>
        <p className="text-sm text-gray-500 mt-0.5">Campos personalizados, tags e origens usados em todas as oportunidades.</p>
      </div>

      <div className="px-8 pt-4 border-b border-[#e5e5e5] flex gap-1">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              aba === a.id ? "border-black text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 max-w-3xl">
        {aba === "campos" && <AbaCampos />}
        {aba === "tags" && <AbaTags />}
        {aba === "origens" && <AbaOrigens />}
      </div>
    </div>
  );
}
