"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginClientePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const res = await fetch("/api/cliente-crm/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = (await res.json()) as { ok?: boolean; status?: string; slug?: string; erro?: string };

      if (res.status === 202 && data.status === "pendente") {
        router.push("/crm-cliente/aguardando");
        return;
      }

      if (!res.ok) {
        setErro(data.erro ?? "Erro ao fazer login");
        return;
      }

      if (data.slug) {
        router.push(`/crm-cliente/${data.slug}`);
      } else {
        router.push("/crm-cliente/aguardando");
      }
    } catch {
      setErro("Erro de conexão");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Painel do Cliente</h1>
          <p className="text-sm text-gray-500 mt-1">Entre para gerenciar seus leads</p>
        </div>

        <form onSubmit={entrar} className="space-y-4 bg-white rounded-2xl border border-[#e5e5e5] p-8 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="••••••••"
            />
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {carregando ? "Entrando…" : "Entrar"}
          </button>

          <div className="flex items-center justify-between pt-1">
            <Link href="/crm-cliente/registro" className="text-sm text-blue-600 hover:underline">
              Criar conta
            </Link>
            <Link href="/crm-cliente/reset-senha" className="text-sm text-gray-400 hover:text-gray-600">
              Esqueci a senha
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
