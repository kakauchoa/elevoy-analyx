"use client";

import { useEffect, useRef, useState } from "react";
import { getServerSession } from "next-auth";

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
  contasComAcesso: ContaSimples[];
}

interface ApiResponse {
  gestores: GestorItem[];
  contasAdmin: ContaSimples[];
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
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro("");
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      setErro("Todos os campos são obrigatórios.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), email: email.trim(), senha }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.erro ?? "Erro ao criar gestor."); return; }
      onCriado(data as GestorItem);
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {salvando ? "Criando..." : "Criar gestor"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de Edição de Acessos ─────────────────────────────────────────────

function ModalAcessos({
  gestor,
  todasContas,
  onClose,
  onSalvo,
}: {
  gestor: GestorItem;
  todasContas: ContaSimples[];
  onClose: () => void;
  onSalvo: (gestorId: string, contas: ContaSimples[]) => void;
}) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(
    new Set(gestor.contasComAcesso.map((c) => c.id))
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  function toggle(id: string) {
    setSelecionadas((prev) => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }

  async function salvar() {
    setErro("");
    setSalvando(true);
    try {
      const res = await fetch(`/api/usuarios/${gestor.id}/contas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contaIds: [...selecionadas] }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErro(data.erro ?? "Erro ao salvar acessos.");
        return;
      }
      const contasSelecionadas = todasContas.filter((c) => selecionadas.has(c.id));
      onSalvo(gestor.id, contasSelecionadas);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Acessos de {gestor.nome}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Selecione as contas que este gestor pode visualizar</p>
        </div>

        {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

        {todasContas.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Nenhuma conta disponível.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {todasContas.map((conta) => (
              <label
                key={conta.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selecionadas.has(conta.id)}
                  onChange={() => toggle(conta.id)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span className="text-sm text-gray-800">{conta.nomeCliente}</span>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar acessos"}
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

  function handleAcessosSalvos(gestorId: string, contas: ContaSimples[]) {
    setGestores((prev) =>
      prev.map((g) => (g.id === gestorId ? { ...g, contasComAcesso: contas } : g))
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
          className="text-sm font-medium text-white bg-blue-600 rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors"
        >
          + Adicionar gestor
        </button>
      </div>

      {carregando && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white border border-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!carregando && gestores.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-gray-500">Nenhum gestor cadastrado além de você.</p>
        </div>
      )}

      {!carregando && gestores.length > 0 && (
        <div className="space-y-3">
          {gestores.map((g) => (
            <div key={g.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{g.nome}</p>
                  {g.isAdmin && (
                    <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Admin
                    </span>
                  )}
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
                  className="shrink-0 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
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
    </div>
  );
}
