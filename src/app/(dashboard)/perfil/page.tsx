"use client";

import { useState } from "react";

export default function PerfilPage() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  async function salvar() {
    setErro("");
    setSucesso(false);

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setErro("Todos os campos são obrigatórios.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("A nova senha e a confirmação não coincidem.");
      return;
    }
    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/usuarios/senha", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual, novaSenha, confirmarSenha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Erro ao alterar a senha.");
        return;
      }
      setSucesso(true);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Perfil</h1>
        <p className="text-sm text-gray-500 mt-0.5">Altere sua senha de acesso</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Alterar senha</h2>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {erro}
          </p>
        )}
        {sucesso && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            Senha alterada com sucesso.
          </p>
        )}

        <div className="space-y-3">
          {[
            { label: "Senha atual", value: senhaAtual, setter: setSenhaAtual, placeholder: "" },
            { label: "Nova senha", value: novaSenha, setter: setNovaSenha, placeholder: "Mínimo 6 caracteres" },
            { label: "Confirmar nova senha", value: confirmarSenha, setter: setConfirmarSenha, placeholder: "" },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="password"
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        <button
          onClick={salvar}
          disabled={salvando}
          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {salvando ? "Salvando..." : "Alterar senha"}
        </button>
      </div>
    </div>
  );
}
