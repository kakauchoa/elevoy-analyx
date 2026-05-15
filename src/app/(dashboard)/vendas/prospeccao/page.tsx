"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ProspeccaoGmn {
  id: string;
  placeId: string;
  cidade: string;
  nicho: string;
  nome: string;
  telefone: string | null;
  site: string | null;
  endereco: string | null;
  avaliacao: number | null;
  qtdAvaliacoes: number | null;
  extraidoEm: string;
  enviadoCrm: boolean;
}

interface CrmEtapa {
  id: string;
  nome: string;
  cor: string;
  fixo: boolean;
}

// ── Modal de configuração da API Key ──────────────────────────────────────

function ModalApiKey({ onClose, onSalvo }: { onClose: () => void; onSalvo: () => void }) {
  const [key, setKey] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    if (!key.trim()) { setErro("Cole a API Key do Google Places"); return; }
    setSalvando(true);
    try {
      const res = await fetch("/api/prospeccao/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key.trim() }),
      });
      if (res.ok) { onSalvo(); onClose(); }
      else setErro("Erro ao salvar a chave.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Configurar Google Places API</h2>
        <p className="text-sm text-gray-500">
          Acesse{" "}
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Google Cloud Console
          </a>
          , crie uma chave de API com acesso à <strong>Places API (New)</strong> e cole abaixo.
          Uma chave serve para toda a plataforma.
        </p>
        {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="AIzaSy..."
          className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-700 border border-[#e5e5e5] rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => void salvar()}
            disabled={salvando}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-900 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal enviar para CRM ─────────────────────────────────────────────────

function ModalEnviarCrm({
  prospeccao,
  etapas,
  onClose,
  onEnviado,
}: {
  prospeccao: ProspeccaoGmn;
  etapas: CrmEtapa[];
  onClose: () => void;
  onEnviado: (id: string) => void;
}) {
  const etapaLeads = etapas.find((e) => e.fixo) ?? etapas[0];
  const [etapaId, setEtapaId] = useState(etapaLeads?.id ?? "");
  const [nome, setNome] = useState(prospeccao.nome);
  const [telefone, setTelefone] = useState(prospeccao.telefone ?? "");
  const [empresa, setEmpresa] = useState(prospeccao.nome);
  const [email, setEmail] = useState("");
  const [notas, setNotas] = useState(prospeccao.endereco ? `Endereço: ${prospeccao.endereco}` : "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    if (!nome.trim()) { setErro("Nome é obrigatório"); return; }
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/crm/contatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          etapaId,
          nome: nome.trim(),
          telefone: telefone || null,
          empresa: empresa || null,
          email: email || null,
          notas: notas || null,
        }),
      });
      const data = (await res.json()) as { id?: string; erro?: string };
      if (!res.ok) { setErro(data.erro ?? "Erro ao salvar"); return; }

      // Marcar como enviado ao CRM
      await fetch(`/api/prospeccao/${prospeccao.id}/enviar-crm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crmContatoId: data.id }),
      });

      onEnviado(prospeccao.id);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-base font-semibold text-gray-900">Enviar para CRM</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 px-6 py-4 space-y-4">
          {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Etapa</label>
            <select
              value={etapaId}
              onChange={(e) => setEtapaId(e.target.value)}
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
            >
              {etapas.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}{e.fixo ? " ★" : ""}</option>
              ))}
            </select>
          </div>
          {[
            { label: "Nome *", value: nome, setter: setNome, placeholder: prospeccao.nome },
            { label: "Empresa", value: empresa, setter: setEmpresa, placeholder: "" },
            { label: "Telefone", value: telefone, setter: setTelefone, placeholder: "" },
            { label: "Email", value: email, setter: setEmail, placeholder: "" },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black resize-none"
            />
          </div>
          {prospeccao.site && (
            <div className="text-xs text-gray-400">
              Site: <span className="text-gray-700">{prospeccao.site}</span>
            </div>
          )}
          {prospeccao.avaliacao && (
            <div className="text-xs text-gray-400">
              Avaliação Google: <span className="text-gray-700">★ {prospeccao.avaliacao} ({prospeccao.qtdAvaliacoes} avaliações)</span>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-[#e5e5e5] flex gap-3">
          <button onClick={onClose} className="flex-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => void salvar()}
            disabled={salvando}
            className="flex-1 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
          >
            {salvando ? "Salvando..." : "Adicionar ao CRM"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Input com histórico (autocomplete) ───────────────────────────────────

function InputHistorico({
  value,
  onChange,
  historico,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  historico: string[];
  placeholder: string;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtrados = historico.filter((h) => h.toLowerCase().includes(value.toLowerCase()) && h !== value);

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        placeholder={placeholder}
        className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
      />
      {aberto && filtrados.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-30 w-full bg-white border border-[#e5e5e5] rounded-xl shadow-lg py-1 max-h-48 overflow-y-auto">
          {filtrados.map((h) => (
            <button
              key={h}
              onClick={() => { onChange(h); setAberto(false); }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {h}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────

export default function ProspeccaoPage() {
  const [resultados, setResultados] = useState<ProspeccaoGmn[]>([]);
  const [etapas, setEtapas] = useState<CrmEtapa[]>([]);
  const [apiConfigurada, setApiConfigurada] = useState<boolean | null>(null);
  const [historicoCidades, setHistoricoCidades] = useState<string[]>([]);
  const [historicoNichos, setHistoricoNichos] = useState<string[]>([]);

  const [cidade, setCidade] = useState("");
  const [nicho, setNicho] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [msgBusca, setMsgBusca] = useState("");

  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroNicho, setFiltroNicho] = useState("");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroDe, setFiltroDe] = useState("");
  const [filtroAte, setFiltroAte] = useState("");

  const [modalApiKey, setModalApiKey] = useState(false);
  const [prospeccaoParaCrm, setProspeccaoParaCrm] = useState<ProspeccaoGmn | null>(null);

  const carregarDados = useCallback(async () => {
    const params = new URLSearchParams();
    if (filtroCidade) params.set("cidade", filtroCidade);
    if (filtroNicho) params.set("nicho", filtroNicho);
    if (filtroBusca) params.set("busca", filtroBusca);
    if (filtroDe) params.set("de", filtroDe);
    if (filtroAte) params.set("ate", filtroAte);

    const [resRes, configRes, histRes, etapasRes] = await Promise.all([
      fetch(`/api/prospeccao/resultados?${params.toString()}`),
      fetch("/api/prospeccao/config"),
      fetch("/api/prospeccao/historico"),
      fetch("/api/crm/etapas"),
    ]);

    if (resRes.ok) setResultados((await resRes.json()) as ProspeccaoGmn[]);
    if (configRes.ok) setApiConfigurada(((await configRes.json()) as { configurado: boolean }).configurado);
    if (histRes.ok) {
      const h = (await histRes.json()) as { cidades: string[]; nichos: string[] };
      setHistoricoCidades(h.cidades);
      setHistoricoNichos(h.nichos);
    }
    if (etapasRes.ok) setEtapas((await etapasRes.json()) as CrmEtapa[]);
  }, [filtroCidade, filtroNicho, filtroBusca, filtroDe, filtroAte]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  async function buscar() {
    if (!cidade.trim() || !nicho.trim()) { setMsgBusca("Preencha cidade e nicho."); return; }
    setBuscando(true);
    setMsgBusca("");
    try {
      const res = await fetch("/api/prospeccao/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cidade: cidade.trim(), nicho: nicho.trim() }),
      });
      const data = (await res.json()) as { total?: number; novos?: number; erro?: string };
      if (!res.ok) {
        if (res.status === 503) { setModalApiKey(true); return; }
        setMsgBusca(data.erro ?? "Erro ao buscar.");
        return;
      }
      setMsgBusca(`${data.novos} novos de ${data.total} encontrados.`);
      void carregarDados();
    } finally {
      setBuscando(false);
    }
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-[#e5e5e5]">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Prospecção GMN</h1>
          <p className="text-sm text-gray-500 mt-0.5">{resultados.length} fichas extraídas</p>
        </div>
        <button
          onClick={() => setModalApiKey(true)}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
            apiConfigurada ? "border-green-200 text-green-700 bg-green-50 hover:bg-green-100" : "border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100"
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${apiConfigurada ? "bg-green-500" : "bg-orange-400"}`} />
          {apiConfigurada ? "API conectada" : "Configurar API Key"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5 space-y-5">
          {/* Barra de busca */}
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nova busca no Google Meu Negócio</p>
            <div className="flex gap-3 flex-wrap">
              <InputHistorico
                value={cidade}
                onChange={setCidade}
                historico={historicoCidades}
                placeholder="Cidade (ex: Ribeirão Preto)"
              />
              <InputHistorico
                value={nicho}
                onChange={setNicho}
                historico={historicoNichos}
                placeholder="Nicho (ex: banho e tosa)"
              />
              <button
                onClick={() => void buscar()}
                disabled={buscando}
                className="px-5 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {buscando ? "Buscando..." : "Buscar"}
              </button>
            </div>
            {msgBusca && (
              <p className="text-sm text-gray-600">{msgBusca}</p>
            )}
          </div>

          {/* Filtros */}
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">De</label>
              <input
                type="date"
                value={filtroDe}
                onChange={(e) => setFiltroDe(e.target.value)}
                className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Até</label>
              <input
                type="date"
                value={filtroAte}
                onChange={(e) => setFiltroAte(e.target.value)}
                className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-32">
              <label className="text-xs font-medium text-gray-500">Cidade</label>
              <select
                value={filtroCidade}
                onChange={(e) => setFiltroCidade(e.target.value)}
                className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">Todas</option>
                {historicoCidades.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-32">
              <label className="text-xs font-medium text-gray-500">Nicho</label>
              <select
                value={filtroNicho}
                onChange={(e) => setFiltroNicho(e.target.value)}
                className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">Todos</option>
                {historicoNichos.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-48">
              <label className="text-xs font-medium text-gray-500">Buscar</label>
              <input
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                placeholder="Nome, telefone ou site..."
                className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            {(filtroCidade || filtroNicho || filtroBusca || filtroDe || filtroAte) && (
              <button
                onClick={() => { setFiltroCidade(""); setFiltroNicho(""); setFiltroBusca(""); setFiltroDe(""); setFiltroAte(""); }}
                className="self-end px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-[#e5e5e5] rounded-lg hover:bg-gray-50 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Tabela */}
          <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
            {resultados.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-gray-400 text-sm">Nenhuma ficha encontrada. Use a busca acima para extrair dados do Google Meu Negócio.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e5e5] bg-gray-50">
                      {["Data", "Nome", "Telefone", "Site", "Av.", "Cidade", "Nicho", ""].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((r) => (
                      <tr key={r.id} className={`border-b border-[#f0f0f0] hover:bg-gray-50 transition-colors ${r.enviadoCrm ? "opacity-60" : ""}`}>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatarData(r.extraidoEm)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-52 truncate">{r.nome}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {r.telefone ? (
                            <a
                              href={`https://wa.me/${r.telefone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:underline"
                            >
                              {r.telefone}
                            </a>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-36 truncate">
                          {r.site ? (
                            <a href={r.site} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {r.site.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                            </a>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {r.avaliacao ? `★ ${r.avaliacao}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.cidade}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.nicho}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {r.enviadoCrm ? (
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">No CRM</span>
                          ) : (
                            <button
                              onClick={() => setProspeccaoParaCrm(r)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-black rounded-lg hover:bg-gray-900 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              CRM
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalApiKey && (
        <ModalApiKey
          onClose={() => setModalApiKey(false)}
          onSalvo={() => { setApiConfigurada(true); void carregarDados(); }}
        />
      )}

      {prospeccaoParaCrm && (
        <ModalEnviarCrm
          prospeccao={prospeccaoParaCrm}
          etapas={etapas}
          onClose={() => setProspeccaoParaCrm(null)}
          onEnviado={(id) => {
            setResultados((prev) => prev.map((r) => r.id === id ? { ...r, enviadoCrm: true } : r));
            setProspeccaoParaCrm(null);
          }}
        />
      )}
    </div>
  );
}
