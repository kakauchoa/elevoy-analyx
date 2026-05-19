"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function FormNovaSenha() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha !== confirmar) { setErro("Senhas não coincidem"); return; }
    setCarregando(true);
    try {
      const res = await fetch("/api/cliente-crm/nova-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, senha }),
      });
      const data = (await res.json()) as { ok?: boolean; erro?: string };
      if (!res.ok) { setErro(data.erro ?? "Erro"); return; }
      router.push("/crm-cliente/login");
    } finally {
      setCarregando(false);
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-red-600 text-center">
        Link inválido. Solicite um novo reset.
      </p>
    );
  }

  return (
    <form onSubmit={salvar} className="space-y-4 bg-white rounded-2xl border border-[#e5e5e5] p-8 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
        <input
          type="password"
          required
          minLength={8}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full px-4 py-2.5 text-sm border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="Mínimo 8 caracteres"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
        <input
          type="password"
          required
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          className="w-full px-4 py-2.5 text-sm border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="••••••••"
        />
      </div>
      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
      )}
      <button
        type="submit"
        disabled={carregando}
        className="w-full py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {carregando ? "Salvando…" : "Salvar nova senha"}
      </button>
    </form>
  );
}

export default function NovaSenhaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Nova senha</h1>
          <p className="text-sm text-gray-500 mt-1">Defina sua nova senha de acesso</p>
        </div>
        <Suspense fallback={<div className="text-center text-sm text-gray-400">Carregando…</div>}>
          <FormNovaSenha />
        </Suspense>
      </div>
    </div>
  );
}
