"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CardPesquisa {
  cidade: string;
  nicho: string;
  ultimaBusca: string;
  totalResultados: number;
}

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

// ── Modal de configuração da API Key ─────────────────────────────────────────

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
          Acesse o{" "}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
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
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-gray-700 border border-[#e5e5e5] rounded-lg hover:bg-gray-50"
          >
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

// ── Modal enviar para CRM ─────────────────────────────────────────────────────

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
  const [notas, setNotas] = useState(
    prospeccao.endereco ? `Endereço: ${prospeccao.endereco}` : ""
  );
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
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 px-6 py-4 space-y-4">
          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Etapa</label>
            <select
              value={etapaId}
              onChange={(e) => setEtapaId(e.target.value)}
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
            >
              {etapas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}{e.fixo ? " ★" : ""}
                </option>
              ))}
            </select>
          </div>
          {(
            [
              { label: "Nome *", value: nome, setter: setNome },
              { label: "Empresa", value: empresa, setter: setEmpresa },
              { label: "Telefone", value: telefone, setter: setTelefone },
              { label: "Email", value: email, setter: setEmail },
            ] as { label: string; value: string; setter: (v: string) => void }[]
          ).map(({ label, value, setter }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input
                value={value}
                onChange={(e) => setter(e.target.value)}
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
          {prospeccao.avaliacao && (
            <p className="text-xs text-gray-400">
              Avaliação Google: ★ {prospeccao.avaliacao}
              {prospeccao.qtdAvaliacoes ? ` (${prospeccao.qtdAvaliacoes.toLocaleString("pt-BR")} avaliações)` : ""}
            </p>
          )}
        </div>
        <div className="px-6 py-4 border-t border-[#e5e5e5] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
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

// ── Input com autocomplete do histórico ───────────────────────────────────────

function InputHistorico({
  value,
  onChange,
  historico,
  placeholder,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  historico: string[];
  placeholder: string;
  onEnter?: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtrados = historico.filter(
    (h) => h.toLowerCase().includes(value.toLowerCase()) && h !== value
  );

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
        onKeyDown={(e) => { if (e.key === "Enter") { setAberto(false); onEnter?.(); } }}
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

// ── Card de pesquisa (expansível) ─────────────────────────────────────────────

type SortField = "nome" | "avaliacao" | "qtdAvaliacoes" | "telefone";
type SortDir = "asc" | "desc";

function IconSort({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) {
    return (
      <svg className="w-3 h-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  return dir === "asc" ? (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CardPesquisaView({
  card,
  etapas,
}: {
  card: CardPesquisa;
  etapas: CrmEtapa[];
}) {
  const [aberto, setAberto] = useState(false);
  const [resultados, setResultados] = useState<ProspeccaoGmn[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [buscaLocal, setBuscaLocal] = useState("");
  const [prospCrm, setProspCrm] = useState<ProspeccaoGmn | null>(null);
  const [sortField, setSortField] = useState<SortField>("nome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  async function abrir() {
    setAberto(true);
    if (resultados !== null) return;
    setCarregando(true);
    try {
      const res = await fetch(
        `/api/prospeccao/resultados?cidade=${encodeURIComponent(card.cidade)}&nicho=${encodeURIComponent(card.nicho)}`
      );
      if (res.ok) setResultados((await res.json()) as ProspeccaoGmn[]);
    } finally {
      setCarregando(false);
    }
  }

  function toggle() {
    if (aberto) setAberto(false);
    else void abrir();
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const filtrados = [...(resultados ?? [])]
    .filter(
      (r) =>
        !buscaLocal ||
        r.nome.toLowerCase().includes(buscaLocal.toLowerCase()) ||
        (r.telefone ?? "").includes(buscaLocal) ||
        (r.site ?? "").toLowerCase().includes(buscaLocal.toLowerCase())
    )
    .sort((a, b) => {
      let va: string | number | null = null;
      let vb: string | number | null = null;
      if (sortField === "nome") { va = a.nome.toLowerCase(); vb = b.nome.toLowerCase(); }
      else if (sortField === "avaliacao") { va = a.avaliacao != null ? Number(a.avaliacao) : null; vb = b.avaliacao != null ? Number(b.avaliacao) : null; }
      else if (sortField === "qtdAvaliacoes") { va = a.qtdAvaliacoes ?? null; vb = b.qtdAvaliacoes ?? null; }
      else if (sortField === "telefone") { va = a.telefone ? 1 : 0; vb = b.telefone ? 1 : 0; }
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const enviados = (resultados ?? []).filter((r) => r.enviadoCrm).length;

  return (
    <>
      <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
        {/* Header do card */}
        <button
          onClick={toggle}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900">{card.cidade}</span>
                <span className="text-gray-300">·</span>
                <span className="text-sm text-gray-600 capitalize">{card.nicho}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                <span>{card.totalResultados} fichas</span>
                {enviados > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-green-600">{enviados} no CRM</span>
                  </>
                )}
                <span>·</span>
                <span>extraído em {formatarData(card.ultimaBusca)}</span>
              </div>
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ml-4 ${aberto ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Conteúdo expandido */}
        {aberto && (
          <div className="border-t border-[#e5e5e5]">
            {carregando ? (
              <div className="py-10 text-center text-sm text-gray-400">Carregando fichas...</div>
            ) : (
              <>
                {(resultados ?? []).length > 5 && (
                  <div className="px-5 py-3 border-b border-[#f0f0f0]">
                    <input
                      value={buscaLocal}
                      onChange={(e) => setBuscaLocal(e.target.value)}
                      placeholder="Buscar por nome, telefone ou site..."
                      className="w-full max-w-sm border border-[#e5e5e5] rounded-lg px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e5e5e5] bg-gray-50">
                        {(
                          [
                            { label: "Nome", field: "nome" as SortField },
                            { label: "Telefone", field: "telefone" as SortField },
                            { label: "Site", field: null },
                            { label: "★", field: "avaliacao" as SortField },
                            { label: "Avaliações", field: "qtdAvaliacoes" as SortField },
                            { label: "", field: null },
                          ] as { label: string; field: SortField | null }[]
                        ).map(({ label, field }, i) =>
                          field ? (
                            <th key={i} className="text-left px-4 py-3 whitespace-nowrap">
                              <button
                                onClick={() => toggleSort(field)}
                                className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-800 transition-colors"
                              >
                                {label}
                                <IconSort field={field} current={sortField} dir={sortDir} />
                              </button>
                            </th>
                          ) : (
                            <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                              {label}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                            {buscaLocal ? `Nenhum resultado para "${buscaLocal}".` : "Sem fichas nesta busca."}
                          </td>
                        </tr>
                      ) : (
                        filtrados.map((r) => (
                          <tr
                            key={r.id}
                            className={`border-b border-[#f0f0f0] hover:bg-gray-50 transition-colors ${r.enviadoCrm ? "opacity-55" : ""}`}
                          >
                            <td className="px-4 py-3 font-medium text-gray-900 max-w-52 truncate">
                              {r.nome}
                            </td>
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
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-600 max-w-40 truncate">
                              {r.site ? (
                                <a
                                  href={r.site}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {r.site.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                              {r.avaliacao ? Number(r.avaliacao).toFixed(1) : "—"}
                            </td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                              {r.qtdAvaliacoes
                                ? r.qtdAvaliacoes.toLocaleString("pt-BR")
                                : "—"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {r.enviadoCrm ? (
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                  No CRM
                                </span>
                              ) : (
                                <button
                                  onClick={() => setProspCrm(r)}
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {prospCrm && (
        <ModalEnviarCrm
          prospeccao={prospCrm}
          etapas={etapas}
          onClose={() => setProspCrm(null)}
          onEnviado={(id) => {
            setResultados((prev) =>
              prev?.map((r) => (r.id === id ? { ...r, enviadoCrm: true } : r)) ?? null
            );
            setProspCrm(null);
          }}
        />
      )}
    </>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ProspeccaoPage() {
  const [cards, setCards] = useState<CardPesquisa[]>([]);
  const [etapas, setEtapas] = useState<CrmEtapa[]>([]);
  const [apiConfigurada, setApiConfigurada] = useState<boolean | null>(null);

  const [cidade, setCidade] = useState("");
  const [nicho, setNicho] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [msgBusca, setMsgBusca] = useState("");
  const [filtroCards, setFiltroCards] = useState("");

  const [modalApiKey, setModalApiKey] = useState(false);

  const carregarDados = useCallback(async () => {
    const [cardsRes, configRes, etapasRes] = await Promise.all([
      fetch("/api/prospeccao/historico"),
      fetch("/api/prospeccao/config"),
      fetch("/api/crm/etapas"),
    ]);
    if (cardsRes.ok) setCards((await cardsRes.json()) as CardPesquisa[]);
    if (configRes.ok)
      setApiConfigurada(((await configRes.json()) as { configurado: boolean }).configurado);
    if (etapasRes.ok) setEtapas((await etapasRes.json()) as CrmEtapa[]);
  }, []);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  async function buscar() {
    if (!cidade.trim() || !nicho.trim()) {
      setMsgBusca("Preencha cidade e nicho antes de buscar.");
      return;
    }
    setBuscando(true);
    setMsgBusca("Buscando e paginando resultados, aguarde...");
    try {
      const res = await fetch("/api/prospeccao/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cidade: cidade.trim(), nicho: nicho.trim() }),
      });
      const data = (await res.json()) as { total?: number; novos?: number; erro?: string };
      if (!res.ok) {
        if (res.status === 503) { setModalApiKey(true); setMsgBusca(""); return; }
        setMsgBusca(data.erro ?? "Erro ao buscar.");
        return;
      }
      setMsgBusca(`${data.total} encontrados · ${data.novos} novos adicionados.`);
      void carregarDados();
    } finally {
      setBuscando(false);
    }
  }

  const historicoCidades = [...new Set(cards.map((c) => c.cidade))];
  const historicoNichos = [...new Set(cards.map((c) => c.nicho))];

  const cardsFiltrados = cards.filter(
    (c) =>
      !filtroCards ||
      c.cidade.toLowerCase().includes(filtroCards.toLowerCase()) ||
      c.nicho.toLowerCase().includes(filtroCards.toLowerCase())
  );

  const totalFichas = cards.reduce((acc, c) => acc + c.totalResultados, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-[#e5e5e5]">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Prospecção GMN</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalFichas.toLocaleString("pt-BR")} fichas · {cards.length}{" "}
            {cards.length === 1 ? "busca" : "buscas"}
          </p>
        </div>
        <button
          onClick={() => setModalApiKey(true)}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
            apiConfigurada
              ? "border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
              : "border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${apiConfigurada ? "bg-green-500" : "bg-orange-400"}`}
          />
          {apiConfigurada ? "API conectada" : "Configurar API Key"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5 space-y-4">
          {/* Barra de busca */}
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Nova busca no Google Meu Negócio
            </p>
            <div className="flex gap-3 flex-wrap">
              <InputHistorico
                value={cidade}
                onChange={setCidade}
                historico={historicoCidades}
                placeholder="Cidade (ex: Ribeirão Preto)"
                onEnter={() => void buscar()}
              />
              <InputHistorico
                value={nicho}
                onChange={setNicho}
                historico={historicoNichos}
                placeholder="Nicho (ex: banho e tosa)"
                onEnter={() => void buscar()}
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
              <p className={`text-sm ${buscando ? "text-gray-400" : "text-gray-600"}`}>
                {msgBusca}
              </p>
            )}
          </div>

          {/* Filtro de cards */}
          {cards.length > 2 && (
            <div className="flex items-center gap-3">
              <input
                value={filtroCards}
                onChange={(e) => setFiltroCards(e.target.value)}
                placeholder="Filtrar por cidade ou nicho..."
                className="flex-1 max-w-xs border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
              />
              {filtroCards && (
                <button
                  onClick={() => setFiltroCards("")}
                  className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
          )}

          {/* Lista de cards */}
          {cards.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-400 text-sm">
                Nenhuma busca realizada ainda. Use o formulário acima para extrair dados do Google
                Meu Negócio.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cardsFiltrados.map((card) => (
                <CardPesquisaView
                  key={`${card.cidade}||${card.nicho}`}
                  card={card}
                  etapas={etapas}
                />
              ))}
              {cardsFiltrados.length === 0 && filtroCards && (
                <div className="py-8 text-center text-sm text-gray-400">
                  Nenhuma busca encontrada para &quot;{filtroCards}&quot;.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {modalApiKey && (
        <ModalApiKey
          onClose={() => setModalApiKey(false)}
          onSalvo={() => setApiConfigurada(true)}
        />
      )}
    </div>
  );
}
