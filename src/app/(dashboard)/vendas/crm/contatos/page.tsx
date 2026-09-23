"use client";

import { useCallback, useEffect, useState } from "react";

interface ContatoLista {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  criadoEm: string;
  oportunidades: { id: string; titulo: string }[];
}

export default function ContatosPage() {
  const [contatos, setContatos] = useState<ContatoLista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const res = await fetch("/api/crm/contatos");
    if (res.ok) setContatos((await res.json()) as ContatoLista[]);
    setCarregando(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function criar() {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      const res = await fetch("/api/crm/contatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, telefone: telefone || null, email: email || null }),
      });
      if (res.ok) {
        setNome(""); setTelefone(""); setEmail("");
        setModalAberto(false);
        void carregar();
      }
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    await fetch(`/api/crm/contatos/${id}`, { method: "DELETE" });
    setContatos((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-5 border-b border-[#e5e5e5]">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Contatos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{contatos.length} contato{contatos.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-black hover:bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Novo contato
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {carregando ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : contatos.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum contato cadastrado ainda.</p>
        ) : (
          <div className="border border-[#e5e5e5] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Nome</th>
                  <th className="text-left px-4 py-2.5 font-medium">Telefone</th>
                  <th className="text-left px-4 py-2.5 font-medium">Email</th>
                  <th className="text-left px-4 py-2.5 font-medium">Oportunidades</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {contatos.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{c.nome}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.telefone ?? "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.email ?? "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.oportunidades.length}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => void excluir(c.id)} className="text-xs text-red-500 hover:text-red-700">
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModalAberto(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Novo contato</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
              <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAberto(false)} className="flex-1 px-4 py-2 text-sm text-gray-700 border border-[#e5e5e5] rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => void criar()} disabled={salvando || !nome.trim()} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-900 disabled:opacity-50">
                {salvando ? "Criando..." : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
