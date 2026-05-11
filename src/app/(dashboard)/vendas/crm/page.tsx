"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface CampoCustomizado {
  id: string;
  chave: string;
  valor: string;
}

interface CrmContato {
  id: string;
  etapaId: string;
  nome: string;
  telefone: string | null;
  empresa: string | null;
  email: string | null;
  notas: string | null;
  campos: CampoCustomizado[];
}

interface CrmEtapa {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  contatos: CrmContato[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function telefoneSemFormatacao(tel: string): string {
  return tel.replace(/\D/g, "");
}

// ── Modal de contato (slide-in lateral) ────────────────────────────────────

interface ModalContatoProps {
  contato: CrmContato | null;
  etapaId: string | null;
  etapas: CrmEtapa[];
  onClose: () => void;
  onSalvo: (contato: CrmContato) => void;
  onExcluido: (contatoId: string) => void;
}

function ModalContato({ contato, etapaId, etapas, onClose, onSalvo, onExcluido }: ModalContatoProps) {
  const isNovo = contato === null;
  const [nome, setNome] = useState(contato?.nome ?? "");
  const [telefone, setTelefone] = useState(contato?.telefone ?? "");
  const [empresa, setEmpresa] = useState(contato?.empresa ?? "");
  const [email, setEmail] = useState(contato?.email ?? "");
  const [notas, setNotas] = useState(contato?.notas ?? "");
  const [campos, setCampos] = useState<CampoCustomizado[]>(contato?.campos ?? []);
  const [novaCampoChave, setNovaCampoChave] = useState("");
  const [novaCampoValor, setNovaCampoValor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    if (!nome.trim()) { setErro("Nome é obrigatório"); return; }
    setSalvando(true);
    setErro("");
    try {
      if (isNovo) {
        const res = await fetch("/api/crm/contatos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ etapaId, nome, telefone: telefone || null, empresa: empresa || null, email: email || null, notas: notas || null }),
        });
        const data = (await res.json()) as CrmContato;
        if (!res.ok) { setErro((data as unknown as { erro?: string }).erro ?? "Erro ao salvar"); return; }
        onSalvo(data);
      } else {
        const res = await fetch(`/api/crm/contatos/${contato.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, telefone: telefone || null, empresa: empresa || null, email: email || null, notas: notas || null }),
        });
        const data = (await res.json()) as CrmContato;
        if (!res.ok) { setErro((data as unknown as { erro?: string }).erro ?? "Erro ao salvar"); return; }
        onSalvo({ ...data, campos });
      }
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!contato) return;
    setExcluindo(true);
    try {
      await fetch(`/api/crm/contatos/${contato.id}`, { method: "DELETE" });
      onExcluido(contato.id);
    } finally {
      setExcluindo(false);
    }
  }

  async function adicionarCampo() {
    if (!novaCampoChave.trim() || !novaCampoValor.trim() || !contato) return;
    const res = await fetch(`/api/crm/contatos/${contato.id}/campos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chave: novaCampoChave, valor: novaCampoValor }),
    });
    const data = (await res.json()) as CampoCustomizado;
    if (res.ok) {
      setCampos((prev) => [...prev, data]);
      setNovaCampoChave("");
      setNovaCampoValor("");
    }
  }

  async function removerCampo(campoId: string) {
    if (!contato) return;
    await fetch(`/api/crm/contatos/${contato.id}/campos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campoId }),
    });
    setCampos((prev) => prev.filter((c) => c.id !== campoId));
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-base font-semibold text-gray-900">
            {isNovo ? "Novo contato" : "Editar contato"}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Etapa info (somente edição) */}
        {!isNovo && (
          <div className="px-6 pt-4">
            {(() => {
              const etapa = etapas.find((e) => e.id === contato?.etapaId);
              return etapa ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: etapa.cor }} />
                  <span className="text-xs text-gray-500">{etapa.nome}</span>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* Form */}
        <div className="flex-1 px-6 py-4 space-y-4">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{erro}</div>
          )}

          {[
            { label: "Nome *", value: nome, setter: setNome, placeholder: "João Silva", type: "text" },
            { label: "Telefone", value: telefone, setter: setTelefone, placeholder: "(11) 99999-9999", type: "tel" },
            { label: "Empresa", value: empresa, setter: setEmpresa, placeholder: "Empresa Ltda", type: "text" },
            { label: "Email", value: email, setter: setEmail, placeholder: "joao@empresa.com", type: "email" },
          ].map(({ label, value, setter, placeholder, type }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input
                type={type}
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observações sobre o contato..."
              rows={3}
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
            />
          </div>

          {/* Campos extras — somente em modo edição */}
          {!isNovo && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Campos extras</p>
              {campos.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {campos.map((c) => (
                    <div key={c.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{c.chave}</p>
                        <p className="text-sm text-gray-800 mt-0.5 break-words">{c.valor}</p>
                      </div>
                      <button
                        onClick={() => void removerCampo(c.id)}
                        className="shrink-0 p-1 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={novaCampoChave}
                  onChange={(e) => setNovaCampoChave(e.target.value)}
                  placeholder="Chave"
                  className="flex-1 border border-[#e5e5e5] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
                <input
                  value={novaCampoValor}
                  onChange={(e) => setNovaCampoValor(e.target.value)}
                  placeholder="Valor"
                  className="flex-1 border border-[#e5e5e5] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
                <button
                  onClick={() => void adicionarCampo()}
                  className="px-3 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-gray-900 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e5e5e5] flex items-center gap-3">
          {!isNovo && !confirmandoExclusao && (
            <button
              onClick={() => setConfirmandoExclusao(true)}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
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
              <button
                onClick={() => setConfirmandoExclusao(false)}
                className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
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
            {salvando ? "Salvando..." : isNovo ? "Criar contato" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de nova etapa ────────────────────────────────────────────────────

const CORES_ETAPA = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

function ModalNovaEtapa({
  onClose,
  onCriada,
}: {
  onClose: () => void;
  onCriada: (etapa: CrmEtapa) => void;
}) {
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
      const data = (await res.json()) as CrmEtapa;
      if (!res.ok) { setErro((data as unknown as { erro?: string }).erro ?? "Erro"); return; }
      onCriada(data);
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
            className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
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

// ── Card de contato ────────────────────────────────────────────────────────

interface CardContatoProps {
  contato: CrmContato;
  onDragStart: (id: string) => void;
  onClick: (contato: CrmContato) => void;
}

function CardContato({ contato, onDragStart, onClick }: CardContatoProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(contato.id)}
      onClick={() => onClick(contato)}
      className="bg-white border border-[#e5e5e5] rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:border-gray-300 hover:shadow-sm transition-all select-none"
    >
      <p className="text-sm font-medium text-gray-900 truncate">{contato.nome}</p>
      {contato.empresa && (
        <p className="text-xs text-gray-500 mt-0.5 truncate">{contato.empresa}</p>
      )}
      {contato.telefone && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-gray-400 truncate">{contato.telefone}</p>
          <a
            href={`https://wa.me/55${telefoneSemFormatacao(contato.telefone)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Abrir no WhatsApp"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}

// ── Coluna kanban ──────────────────────────────────────────────────────────

interface ColunaProps {
  etapa: CrmEtapa;
  isDragOver: boolean;
  onDragOver: (etapaId: string) => void;
  onDragLeave: () => void;
  onDrop: (etapaId: string) => void;
  onDragStart: (contatoId: string) => void;
  onClickContato: (contato: CrmContato) => void;
  onAdicionarContato: (etapaId: string) => void;
}

function Coluna({
  etapa,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onClickContato,
  onAdicionarContato,
}: ColunaProps) {
  return (
    <div
      className={`flex flex-col w-72 shrink-0 rounded-xl transition-colors ${
        isDragOver ? "bg-gray-100" : "bg-gray-50"
      }`}
      onDragOver={(e) => { e.preventDefault(); onDragOver(etapa.id); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(etapa.id); }}
    >
      {/* Header da coluna */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: etapa.cor }} />
          <span className="text-sm font-semibold text-gray-800 truncate">{etapa.nome}</span>
          <span className="text-xs text-gray-400 font-normal">{etapa.contatos.length}</span>
        </div>
        <button
          onClick={() => onAdicionarContato(etapa.id)}
          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          title="Adicionar contato"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 px-3 pb-3 space-y-2 overflow-y-auto max-h-[calc(100vh-14rem)]">
        {etapa.contatos.map((contato) => (
          <CardContato
            key={contato.id}
            contato={contato}
            onDragStart={onDragStart}
            onClick={onClickContato}
          />
        ))}
        {isDragOver && (
          <div className="border-2 border-dashed border-gray-300 rounded-xl h-16 flex items-center justify-center">
            <span className="text-xs text-gray-400">Soltar aqui</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────

export default function CrmPage() {
  const [etapas, setEtapas] = useState<CrmEtapa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalNovaEtapa, setModalNovaEtapa] = useState(false);
  const [contatoModal, setContatoModal] = useState<CrmContato | null | "novo">(null);
  const [etapaNovoContato, setEtapaNovoContato] = useState<string | null>(null);

  const draggingContatoId = useRef<string | null>(null);
  const [dragOverEtapaId, setDragOverEtapaId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const res = await fetch("/api/crm/etapas");
    if (res.ok) {
      const data = (await res.json()) as CrmEtapa[];
      setEtapas(data);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function handleDragStart(contatoId: string) {
    draggingContatoId.current = contatoId;
  }

  function handleDrop(etapaDestId: string) {
    const contatoId = draggingContatoId.current;
    draggingContatoId.current = null;
    setDragOverEtapaId(null);

    if (!contatoId) return;

    const etapaOrigem = etapas.find((e) => e.contatos.some((c) => c.id === contatoId));
    if (!etapaOrigem || etapaOrigem.id === etapaDestId) return;

    const contato = etapaOrigem.contatos.find((c) => c.id === contatoId)!;

    // Atualiza estado otimisticamente
    setEtapas((prev) =>
      prev.map((e) => {
        if (e.id === etapaOrigem.id) return { ...e, contatos: e.contatos.filter((c) => c.id !== contatoId) };
        if (e.id === etapaDestId) return { ...e, contatos: [...e.contatos, { ...contato, etapaId: etapaDestId }] };
        return e;
      })
    );

    // Persiste
    void fetch(`/api/crm/contatos/${contatoId}/mover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapaId: etapaDestId }),
    });
  }

  function handleEtapaCriada(etapa: CrmEtapa) {
    setEtapas((prev) => [...prev, etapa]);
    setModalNovaEtapa(false);
  }

  function abrirModalNovoContato(etapaId: string) {
    setEtapaNovoContato(etapaId);
    setContatoModal("novo");
  }

  function handleContatoSalvo(contato: CrmContato) {
    setEtapas((prev) =>
      prev.map((e) => {
        const existe = e.contatos.some((c) => c.id === contato.id);
        if (contato.etapaId === e.id && !existe) {
          return { ...e, contatos: [...e.contatos, contato] };
        }
        if (existe) {
          return { ...e, contatos: e.contatos.map((c) => (c.id === contato.id ? contato : c)) };
        }
        return e;
      })
    );
    setContatoModal(null);
    setEtapaNovoContato(null);
  }

  function handleContatoExcluido(contatoId: string) {
    setEtapas((prev) =>
      prev.map((e) => ({ ...e, contatos: e.contatos.filter((c) => c.id !== contatoId) }))
    );
    setContatoModal(null);
  }

  if (carregando) {
    return (
      <div className="p-8 flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-72 h-96 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-[#e5e5e5]">
        <div>
          <h1 className="text-xl font-bold text-gray-900">CRM</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {etapas.length} etapa{etapas.length !== 1 ? "s" : ""} ·{" "}
            {etapas.reduce((acc, e) => acc + e.contatos.length, 0)} contato{etapas.reduce((acc, e) => acc + e.contatos.length, 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setModalNovaEtapa(true)}
          className="bg-black hover:bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nova etapa
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 p-6 h-full">
          {etapas.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Nenhuma etapa criada ainda.</p>
                <button
                  onClick={() => setModalNovaEtapa(true)}
                  className="mt-3 text-gray-900 hover:underline text-sm"
                >
                  Criar primeira etapa
                </button>
              </div>
            </div>
          ) : (
            etapas.map((etapa) => (
              <Coluna
                key={etapa.id}
                etapa={etapa}
                isDragOver={dragOverEtapaId === etapa.id}
                onDragOver={(id) => setDragOverEtapaId(id)}
                onDragLeave={() => setDragOverEtapaId(null)}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                onClickContato={(c) => setContatoModal(c)}
                onAdicionarContato={abrirModalNovoContato}
              />
            ))
          )}
        </div>
      </div>

      {/* Modais */}
      {modalNovaEtapa && (
        <ModalNovaEtapa
          onClose={() => setModalNovaEtapa(false)}
          onCriada={handleEtapaCriada}
        />
      )}

      {contatoModal !== null && (
        <ModalContato
          contato={contatoModal === "novo" ? null : contatoModal}
          etapaId={etapaNovoContato}
          etapas={etapas}
          onClose={() => { setContatoModal(null); setEtapaNovoContato(null); }}
          onSalvo={handleContatoSalvo}
          onExcluido={handleContatoExcluido}
        />
      )}
    </div>
  );
}
