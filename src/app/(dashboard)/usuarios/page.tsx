"use client";

import { useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface ContaSimples {
  id: string;
  nomeCliente: string;
}

interface GestorItem {
  id: string;
  nome: string;
  email: string;
  criadoEm: string;
  isAdmin: boolean;
  plano: string;
  contasMaximas: number;
  assinaturaAtiva: boolean;
  contasComAcesso: ContaSimples[];
  permissoes?: string[];
}

interface ApiResponse {
  gestores: GestorItem[];
  contasAdmin: ContaSimples[];
}

const SECOES_DISPONIVEIS = ["Clientes", "Vendas"];

const LABEL_PLANO: Record<string, string> = {
  free: "Gratuito",
  basico: "Básico",
  intermediario: "Intermediário",
  personalizado: "Personalizado",
};

// ── Modal de edição de plano ────────────────────────────────────────────────

function ModalPlano({
  gestor,
  onClose,
  onSalvo,
}: {
  gestor: GestorItem;
  onClose: () => void;
  onSalvo: (g: Pick<GestorItem, "id" | "plano" | "contasMaximas" | "assinaturaAtiva">) => void;
}) {
  const [plano, setPlano] = useState(gestor.plano);
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
        id: string; plano: string; contasMaximas: number; assinaturaAtiva: boolean; erro?: string;
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
          <h2 className="font-semibold text-gray-900">Editar plano — {gestor.nome}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <form onSubmit={(e) => void salvar(e)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Plano</label>
            <select
              value={plano}
              onChange={(e) => {
                setPlano(e.target.value);
                const defaults: Record<string, number> = { free: 3, basico: 10, intermediario: 30, personalizado: 10 };
                setContasMaximas(String(defaults[e.target.value] ?? 3));
              }}
              className="border border-[#e5e5e5] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
            >
              {Object.entries(LABEL_PLANO).map(([k, v]) => (
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

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-[#e5e5e5] text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={salvando} className="flex-1 bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-900 disabled:opacity-50">
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal de Novo Gestor ───────────────────────────────────────────────────

function ModalNovoGestor({
  onClose,
  onCriado,
}: {
  onClose: () => void;
  onCriado: (g: GestorItem) => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [secoes, setSecoes] = useState<Set<string>>(new Set(["Clientes"]));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  function toggleSecao(s: string) {
    setSecoes((prev) => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  }

  async function salvar() {
    setErro("");
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      setErro("Todos os campos são obrigatórios.");
      return;
    }
    if (senha.length < 6) { setErro("A senha deve ter pelo menos 6 caracteres."); return; }
    setSalvando(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), email: email.trim(), senha }),
      });
      const data = await res.json();
      if (!res.ok) { setErro((data as { erro?: string }).erro ?? "Erro ao criar gestor."); return; }

      const gestor = data as GestorItem;

      // Salva permissões de seção
      if (secoes.size > 0) {
        await fetch(`/api/usuarios/${gestor.id}/permissoes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secoes: [...secoes] }),
        });
      }

      onCriado({ ...gestor, permissoes: [...secoes] });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Adicionar gestor</h2>

        {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

        <div className="space-y-3">
          {[
            { label: "Nome", value: nome, setter: setNome, type: "text", placeholder: "João Silva" },
            { label: "Email", value: email, setter: setEmail, type: "email", placeholder: "joao@exemplo.com" },
            { label: "Senha temporária", value: senha, setter: setSenha, type: "password", placeholder: "Mínimo 6 caracteres" },
          ].map(({ label, value, setter, type, placeholder }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type}
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Seções visíveis</label>
          <div className="flex flex-col gap-2">
            {SECOES_DISPONIVEIS.map((s) => (
              <label key={s} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={secoes.has(s)}
                  onChange={() => toggleSecao(s)}
                  className="w-4 h-4 rounded accent-black"
                />
                <span className="text-sm text-gray-800">{s}</span>
              </label>
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
            {salvando ? "Criando..." : "Criar gestor"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de Edição de Acessos e Permissões ────────────────────────────────

function ModalAcessos({
  gestor,
  todasContas,
  onClose,
  onSalvo,
}: {
  gestor: GestorItem;
  todasContas: ContaSimples[];
  onClose: () => void;
  onSalvo: (gestorId: string, contas: ContaSimples[], permissoes: string[]) => void;
}) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(
    new Set(gestor.contasComAcesso.map((c) => c.id))
  );
  const [secoes, setSecoes] = useState<Set<string>>(
    new Set(gestor.permissoes ?? [])
  );
  const [carregandoPermissoes, setCarregandoPermissoes] = useState(!gestor.permissoes);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (gestor.permissoes) return;
    fetch(`/api/usuarios/${gestor.id}/permissoes`)
      .then((r) => r.json())
      .then((data: string[]) => setSecoes(new Set(data)))
      .finally(() => setCarregandoPermissoes(false));
  }, [gestor.id, gestor.permissoes]);

  function toggleConta(id: string) {
    setSelecionadas((prev) => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }

  function toggleSecao(s: string) {
    setSecoes((prev) => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  }

  async function salvar() {
    setErro("");
    setSalvando(true);
    try {
      const [resContas, resPermissoes] = await Promise.all([
        fetch(`/api/usuarios/${gestor.id}/contas`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contaIds: [...selecionadas] }),
        }),
        fetch(`/api/usuarios/${gestor.id}/permissoes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secoes: [...secoes] }),
        }),
      ]);

      if (!resContas.ok) {
        const data = await resContas.json();
        setErro((data as { erro?: string }).erro ?? "Erro ao salvar acessos.");
        return;
      }
      if (!resPermissoes.ok) {
        setErro("Erro ao salvar permissões.");
        return;
      }

      const contasSelecionadas = todasContas.filter((c) => selecionadas.has(c.id));
      onSalvo(gestor.id, contasSelecionadas, [...secoes]);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Editar gestor: {gestor.nome}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Contas e seções visíveis</p>
        </div>

        {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

        {/* Contas */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Contas de anúncio</p>
          {todasContas.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">Nenhuma conta disponível.</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {todasContas.map((conta) => (
                <label key={conta.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selecionadas.has(conta.id)}
                    onChange={() => toggleConta(conta.id)}
                    className="w-4 h-4 rounded accent-black"
                  />
                  <span className="text-sm text-gray-800">{conta.nomeCliente}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Seções */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Seções visíveis</p>
          {carregandoPermissoes ? (
            <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <div className="space-y-1">
              {SECOES_DISPONIVEIS.map((s) => (
                <label key={s} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={secoes.has(s)}
                    onChange={() => toggleSecao(s)}
                    className="w-4 h-4 rounded accent-black"
                  />
                  <span className="text-sm text-gray-800">{s}</span>
                </label>
              ))}
            </div>
          )}
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
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const [gestores, setGestores] = useState<GestorItem[]>([]);
  const [contasAdmin, setContasAdmin] = useState<ContaSimples[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [acessoNegado, setAcessoNegado] = useState(false);
  const [modalNovo, setModalNovo] = useState(false);
  const [gestorEditando, setGestorEditando] = useState<GestorItem | null>(null);
  const [gestorPlano, setGestorPlano] = useState<GestorItem | null>(null);

  useEffect(() => {
    fetch("/api/usuarios")
      .then(async (r) => {
        if (r.status === 403) { setAcessoNegado(true); return; }
        const data: ApiResponse = await r.json();
        setGestores(data.gestores);
        setContasAdmin(data.contasAdmin);
      })
      .catch(() => setAcessoNegado(true))
      .finally(() => setCarregando(false));
  }, []);

  function handleGestorCriado(g: GestorItem) {
    setGestores((prev) => [...prev, g]);
    setModalNovo(false);
  }

  function handlePlanoSalvo(data: Pick<GestorItem, "id" | "plano" | "contasMaximas" | "assinaturaAtiva">) {
    setGestores((prev) =>
      prev.map((g) => (g.id === data.id ? { ...g, ...data } : g))
    );
    setGestorPlano(null);
  }

  function handleAcessosSalvos(gestorId: string, contas: ContaSimples[], permissoes: string[]) {
    setGestores((prev) =>
      prev.map((g) => (g.id === gestorId ? { ...g, contasComAcesso: contas, permissoes } : g))
    );
    setGestorEditando(null);
  }

  if (acessoNegado) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <p className="text-gray-500">Acesso restrito ao administrador.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestores com acesso à plataforma</p>
        </div>
        <button
          onClick={() => setModalNovo(true)}
          className="text-sm font-medium text-white bg-black rounded-lg px-4 py-2 hover:bg-gray-900 transition-colors"
        >
          + Adicionar gestor
        </button>
      </div>

      {carregando && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white border border-[#e5e5e5] rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!carregando && gestores.length === 0 && (
        <div className="bg-white border border-[#e5e5e5] rounded-xl p-10 text-center">
          <p className="text-gray-500">Nenhum gestor cadastrado além de você.</p>
        </div>
      )}

      {!carregando && gestores.length > 0 && (
        <div className="space-y-3">
          {gestores.map((g) => (
            <div
              key={g.id}
              className="bg-white border border-[#e5e5e5] rounded-xl px-5 py-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900 truncate">{g.nome}</p>
                  {g.isAdmin && (
                    <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-black text-white">
                      Admin
                    </span>
                  )}
                  {!g.isAdmin && g.permissoes && g.permissoes.length > 0 && g.permissoes.map((s) => (
                    <span key={s} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {s}
                    </span>
                  ))}
                  <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                    g.assinaturaAtiva
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-50 text-gray-500 border-gray-200"
                  }`}>
                    {LABEL_PLANO[g.plano] ?? g.plano} · {g.contasMaximas} contas
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{g.email}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {g.isAdmin
                    ? `${g.contasComAcesso.length} conta${g.contasComAcesso.length !== 1 ? "s" : ""} (todas)`
                    : g.contasComAcesso.length === 0
                    ? "Sem acesso a nenhuma conta"
                    : g.contasComAcesso.map((c) => c.nomeCliente).join(", ")}
                </p>
              </div>
              {!g.isAdmin && (
                <button
                  onClick={() => setGestorEditando(g)}
                  className="shrink-0 text-xs font-medium text-gray-700 border border-[#e5e5e5] rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
                >
                  Editar acessos
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {modalNovo && (
        <ModalNovoGestor
          onClose={() => setModalNovo(false)}
          onCriado={handleGestorCriado}
        />
      )}

      {gestorEditando && (
        <ModalAcessos
          gestor={gestorEditando}
          todasContas={contasAdmin}
          onClose={() => setGestorEditando(null)}
          onSalvo={handleAcessosSalvos}
        />
      )}

      {gestorPlano && (
        <ModalPlano
          gestor={gestorPlano}
          onClose={() => setGestorPlano(null)}
          onSalvo={handlePlanoSalvo}
        />
      )}
    </div>
  );
}
