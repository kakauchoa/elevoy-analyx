"use client";

import { useEffect, useState } from "react";

type Plano = "free" | "basico" | "intermediario" | "personalizado";

interface ContaSimples {
  id: string;
  nomeCliente: string;
}

interface GestorAdmin {
  id: string;
  nome: string;
  email: string;
  plano: Plano;
  contasMaximas: number;
  assinaturaAtiva: boolean;
  assinaturaVenceEm: string | null;
  stripeSubscriptionId: string | null;
  criadoEm: string;
  totalContas: number;
  permissoes: string[];
}

const LABEL_PLANO: Record<Plano, string> = {
  free: "Gratuito",
  basico: "Básico",
  intermediario: "Intermediário",
  personalizado: "Personalizado",
};

const CORES_PLANO: Record<Plano, string> = {
  free: "bg-gray-100 text-gray-600 border-gray-200",
  basico: "bg-blue-50 text-blue-700 border-blue-200",
  intermediario: "bg-purple-50 text-purple-700 border-purple-200",
  personalizado: "bg-amber-50 text-amber-700 border-amber-200",
};

const LIMITES_PADRAO: Record<Plano, number> = {
  free: 3,
  basico: 10,
  intermediario: 30,
  personalizado: 10,
};

// ── Modal de edição de plano ─────────────────────────────────────────────────

function ModalPlano({
  gestor,
  onClose,
  onSalvo,
}: {
  gestor: GestorAdmin;
  onClose: () => void;
  onSalvo: (g: Pick<GestorAdmin, "id" | "plano" | "contasMaximas" | "assinaturaAtiva">) => void;
}) {
  const [plano, setPlano] = useState<Plano>(gestor.plano);
  const [contasMaximas, setContasMaximas] = useState(String(gestor.contasMaximas));
  const [assinaturaAtiva, setAssinaturaAtiva] = useState(gestor.assinaturaAtiva);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const res = await fetch(`/api/usuarios/${gestor.id}/plano`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plano,
          contasMaximas: Number(contasMaximas),
          assinaturaAtiva,
        }),
      });
      const data = (await res.json()) as {
        id: string;
        plano: Plano;
        contasMaximas: number;
        assinaturaAtiva: boolean;
        erro?: string;
      };
      if (!res.ok) { setErro(data.erro ?? "Erro ao salvar"); return; }
      onSalvo(data);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Editar plano</h2>
            <p className="text-xs text-gray-400 mt-0.5">{gestor.nome} · {gestor.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <form onSubmit={(e) => void salvar(e)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Plano</label>
            <select
              value={plano}
              onChange={(e) => {
                const p = e.target.value as Plano;
                setPlano(p);
                setContasMaximas(String(LIMITES_PADRAO[p]));
              }}
              className="border border-[#e5e5e5] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
            >
              {(Object.entries(LABEL_PLANO) as [Plano, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Limite de contas</label>
            <input
              type="number"
              min={1}
              value={contasMaximas}
              onChange={(e) => setContasMaximas(e.target.value)}
              className="border border-[#e5e5e5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <p className="text-xs text-gray-400">
              Atualmente usando {gestor.totalContas} de {gestor.contasMaximas} contas
            </p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setAssinaturaAtiva((v) => !v)}
              className={`relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors ${
                assinaturaAtiva ? "bg-black" : "bg-gray-200"
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition ${assinaturaAtiva ? "translate-x-4" : "translate-x-0"}`} />
            </button>
            <span className="text-sm text-gray-700">Assinatura ativa</span>
          </label>

          {gestor.stripeSubscriptionId && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              Stripe: <span className="font-mono">{gestor.stripeSubscriptionId}</span>
            </p>
          )}

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[#e5e5e5] text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-900 disabled:opacity-50"
            >
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal de liberação de contas ─────────────────────────────────────────────

function ModalContas({
  gestor,
  onClose,
  onSalvo,
}: {
  gestor: GestorAdmin;
  onClose: () => void;
  onSalvo: (permissoes: string[]) => void;
}) {
  const [minhasContas, setMinhasContas] = useState<ContaSimples[]>([]);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      const [contasRes, vinculosRes] = await Promise.all([
        fetch("/api/contas"),
        fetch(`/api/usuarios/${gestor.id}/contas`),
      ]);
      if (contasRes.ok) {
        const contas = (await contasRes.json()) as ContaSimples[];
        setMinhasContas(contas);
      }
      if (vinculosRes.ok) {
        const ids = (await vinculosRes.json()) as string[];
        setSelecionadas(new Set(ids));
      }
      setCarregando(false);
    }
    void carregar();
  }, [gestor.id]);

  function toggle(id: string) {
    setSelecionadas((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function salvar() {
    setSalvando(true);
    setErro("");
    try {
      const contaIds = [...selecionadas];

      const [contasRes, permRes] = await Promise.all([
        fetch(`/api/usuarios/${gestor.id}/contas`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contaIds }),
        }),
        // Garante permissão "Clientes" se tiver contas, remove se não tiver
        fetch(`/api/usuarios/${gestor.id}/permissoes`).then(async (r) => {
          if (!r.ok) return null;
          const atual = (await r.json()) as string[];
          const temClientes = contaIds.length > 0;
          const novas = temClientes
            ? [...new Set([...atual, "Clientes"])]
            : atual.filter((s) => s !== "Clientes");
          return fetch(`/api/usuarios/${gestor.id}/permissoes`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ secoes: novas }),
          });
        }),
      ]);

      if (!contasRes.ok) { setErro("Erro ao salvar vínculos"); return; }

      // Recalcula permissões para atualizar UI
      const permissoesRes = await fetch(`/api/usuarios/${gestor.id}/permissoes`);
      const novasPermissoes = permissoesRes.ok ? (await permissoesRes.json() as string[]) : gestor.permissoes;
      void permRes;
      onSalvo(novasPermissoes);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Liberar contas de anúncio</h2>
            <p className="text-xs text-gray-400 mt-0.5">{gestor.nome}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        {carregando ? (
          <div className="py-6 text-center text-sm text-gray-400">Carregando contas…</div>
        ) : minhasContas.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nenhuma conta disponível para vincular.</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {minhasContas.map((c) => (
              <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[#e5e5e5] cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={selecionadas.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="w-4 h-4 accent-black"
                />
                <span className="text-sm text-gray-900">{c.nomeCliente}</span>
              </label>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400">
          {selecionadas.size === 0
            ? "Nenhuma conta selecionada — permissão de Clientes será removida"
            : `${selecionadas.size} conta(s) selecionada(s) — permissão de Clientes será concedida automaticamente`}
        </p>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-[#e5e5e5] text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => void salvar()}
            disabled={salvando || carregando}
            className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-900 disabled:opacity-50"
          >
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function AdminPlanosPage() {
  const [gestores, setGestores] = useState<GestorAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [acessoNegado, setAcessoNegado] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroPlano, setFiltroPlano] = useState<Plano | "">("");
  const [gestorEditando, setGestorEditando] = useState<GestorAdmin | null>(null);
  const [gestorContas, setGestorContas] = useState<GestorAdmin | null>(null);
  const [togglingSessionId, setTogglingSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/gestores")
      .then(async (r) => {
        if (r.status === 403) { setAcessoNegado(true); return; }
        setGestores(await r.json() as GestorAdmin[]);
      })
      .finally(() => setCarregando(false));
  }, []);

  function handleSalvoPlano(data: Pick<GestorAdmin, "id" | "plano" | "contasMaximas" | "assinaturaAtiva">) {
    setGestores((prev) => prev.map((g) => (g.id === data.id ? { ...g, ...data } : g)));
    setGestorEditando(null);
  }

  function handleSalvoContas(id: string, permissoes: string[]) {
    setGestores((prev) => prev.map((g) => (g.id === id ? { ...g, permissoes } : g)));
    setGestorContas(null);
  }

  async function toggleSessoes(gestor: GestorAdmin) {
    setTogglingSessionId(gestor.id);
    try {
      const temSessoes = gestor.permissoes.includes("Sessoes");
      const novas = temSessoes
        ? gestor.permissoes.filter((s) => s !== "Sessoes")
        : [...gestor.permissoes, "Sessoes"];

      const res = await fetch(`/api/usuarios/${gestor.id}/permissoes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secoes: novas }),
      });
      if (res.ok) {
        setGestores((prev) =>
          prev.map((g) => (g.id === gestor.id ? { ...g, permissoes: novas } : g))
        );
      }
    } finally {
      setTogglingSessionId(null);
    }
  }

  const filtrados = gestores.filter((g) => {
    const matchBusca =
      !busca ||
      g.nome.toLowerCase().includes(busca.toLowerCase()) ||
      g.email.toLowerCase().includes(busca.toLowerCase());
    const matchPlano = !filtroPlano || g.plano === filtroPlano;
    return matchBusca && matchPlano;
  });

  const stats = {
    total: gestores.length,
    ativos: gestores.filter((g) => g.assinaturaAtiva).length,
    free: gestores.filter((g) => g.plano === "free").length,
    basico: gestores.filter((g) => g.plano === "basico").length,
    intermediario: gestores.filter((g) => g.plano === "intermediario").length,
    personalizado: gestores.filter((g) => g.plano === "personalizado").length,
    mrr:
      gestores.filter((g) => g.assinaturaAtiva && g.plano === "basico").length * 49.9 +
      gestores.filter((g) => g.assinaturaAtiva && g.plano === "intermediario").length * 149.9 +
      gestores.filter((g) => g.assinaturaAtiva && g.plano === "personalizado").length * 30,
  };

  if (acessoNegado) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3">
        <p className="text-base font-semibold text-gray-700">Acesso restrito</p>
        <p className="text-sm text-gray-400">Esta página é exclusiva para o administrador da plataforma.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5]">
        <h1 className="text-xl font-bold text-gray-900">Controle de Planos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie as assinaturas e acessos de todos os gestores da plataforma</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* KPIs */}
        {!carregando && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard titulo="Total de gestores" valor={stats.total} />
            <KpiCard titulo="Assinaturas ativas" valor={stats.ativos} cor="text-green-600" />
            <KpiCard titulo="MRR estimado" valor={`R$ ${stats.mrr.toFixed(2).replace(".", ",")}`} cor="text-blue-600" />
            <KpiCard titulo="Plano gratuito" valor={stats.free} cor="text-gray-400" />
          </div>
        )}

        {/* Distribuição por plano */}
        {!carregando && gestores.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(["free", "basico", "intermediario", "personalizado"] as Plano[]).map((p) => (
              <button
                key={p}
                onClick={() => setFiltroPlano(filtroPlano === p ? "" : p)}
                className={`border rounded-xl px-4 py-3 text-left transition-colors ${
                  filtroPlano === p ? "border-black bg-gray-50" : "border-[#e5e5e5] hover:border-gray-300"
                }`}
              >
                <p className="text-xs text-gray-500">{LABEL_PLANO[p]}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats[p]}</p>
              </button>
            ))}
          </div>
        )}

        {/* Busca */}
        <div className="flex gap-3">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail…"
            className="flex-1 border border-[#e5e5e5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          {(busca || filtroPlano) && (
            <button
              onClick={() => { setBusca(""); setFiltroPlano(""); }}
              className="text-sm text-gray-500 hover:text-gray-900 border border-[#e5e5e5] rounded-lg px-4 py-2"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Lista */}
        {carregando ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white border border-[#e5e5e5] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-10 text-center">
            <p className="text-gray-400 text-sm">Nenhum gestor encontrado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtrados.map((g) => {
              const temSessoes = g.permissoes.includes("Sessoes");
              const toggling = togglingSessionId === g.id;
              return (
                <div
                  key={g.id}
                  className="bg-white border border-[#e5e5e5] rounded-xl px-5 py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">{g.nome}</p>
                      <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${CORES_PLANO[g.plano]}`}>
                        {LABEL_PLANO[g.plano]}
                      </span>
                      {g.assinaturaAtiva ? (
                        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                          Ativo
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                          Inativo
                        </span>
                      )}
                      {g.permissoes.includes("Clientes") && (
                        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Contas
                        </span>
                      )}
                      {temSessoes && (
                        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Sessões WPP
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{g.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {g.totalContas}/{g.contasMaximas} contas usadas
                      {g.assinaturaVenceEm && (
                        <> · Renova {new Date(g.assinaturaVenceEm).toLocaleDateString("pt-BR")}</>
                      )}
                      <> · Desde {new Date(g.criadoEm).toLocaleDateString("pt-BR")}</>
                    </p>
                  </div>

                  {/* Ações */}
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => setGestorContas(g)}
                      className="text-xs font-medium text-gray-700 border border-[#e5e5e5] rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
                      title="Liberar acesso a contas de anúncio"
                    >
                      Contas
                    </button>
                    <button
                      onClick={() => void toggleSessoes(g)}
                      disabled={toggling}
                      className={`text-xs font-medium border rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 ${
                        temSessoes
                          ? "text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                          : "text-gray-700 border-[#e5e5e5] hover:bg-gray-50"
                      }`}
                      title={temSessoes ? "Revogar acesso a sessões WhatsApp" : "Liberar acesso a sessões WhatsApp"}
                    >
                      {toggling ? "…" : temSessoes ? "Sessões ✓" : "Sessões"}
                    </button>
                    <button
                      onClick={() => setGestorEditando(g)}
                      className="text-xs font-medium text-gray-700 border border-[#e5e5e5] rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
                    >
                      Plano
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {gestorEditando && (
        <ModalPlano
          gestor={gestorEditando}
          onClose={() => setGestorEditando(null)}
          onSalvo={handleSalvoPlano}
        />
      )}

      {gestorContas && (
        <ModalContas
          gestor={gestorContas}
          onClose={() => setGestorContas(null)}
          onSalvo={(perms) => handleSalvoContas(gestorContas.id, perms)}
        />
      )}
    </div>
  );
}

function KpiCard({
  titulo,
  valor,
  cor = "text-gray-900",
}: {
  titulo: string;
  valor: string | number;
  cor?: string;
}) {
  return (
    <div className="bg-white border border-[#e5e5e5] rounded-xl px-5 py-4">
      <p className="text-xs text-gray-500">{titulo}</p>
      <p className={`text-2xl font-bold mt-1 ${cor}`}>{valor}</p>
    </div>
  );
}
