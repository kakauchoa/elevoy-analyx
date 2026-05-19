"use client";

import { useState } from "react";
import Link from "next/link";

export default function ResetSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function solicitar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    await fetch("/api/cliente-crm/reset-senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setEnviado(true);
    setCarregando(false);
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Solicitação enviada</h1>
          <p className="text-sm text-gray-500 mt-3 leading-relaxed">
            O gestor será notificado. Quando ele aprovar, você receberá um link para criar a nova senha.
          </p>
          <Link
            href="/crm-cliente/login"
            className="mt-6 inline-block px-6 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Redefinir senha</h1>
          <p className="text-sm text-gray-500 mt-1">
            Informe seu email — o gestor precisará aprovar o reset
          </p>
        </div>

        <form onSubmit={solicitar} className="space-y-4 bg-white rounded-2xl border border-[#e5e5e5] p-8 shadow-sm">
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

          <button
            type="submit"
            disabled={carregando}
            className="w-full py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {carregando ? "Enviando…" : "Solicitar reset"}
          </button>

          <p className="text-center text-sm text-gray-500">
            <Link href="/crm-cliente/login" className="text-blue-600 hover:underline">
              ← Voltar ao login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
