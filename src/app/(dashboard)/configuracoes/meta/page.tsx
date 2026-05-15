"use client";

import { useEffect, useState } from "react";

interface ConfigData {
  appId: string;
  criadoEm: string;
  atualizadoEm: string;
}

export default function ConfiguracaoMetaPage() {
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");
  const [configExistente, setConfigExistente] = useState<ConfigData | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch("/api/configuracoes/meta");
        const data = (await res.json()) as { config: ConfigData | null };
        if (data.config) {
          setConfigExistente(data.config);
          setAppId(data.config.appId);
          setAppSecret("••••••••");
        }
      } finally {
        setCarregando(false);
      }
    }
    void carregar();
  }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    setSucesso(false);

    try {
      const res = await fetch("/api/configuracoes/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, appSecret }),
      });

      const data = (await res.json()) as { ok?: boolean; erro?: string };

      if (res.ok && data.ok) {
        setSucesso(true);
        setAppSecret("••••••••");
        setTimeout(() => setSucesso(false), 3000);
      } else {
        setErro(data.erro ?? "Erro ao salvar configuração");
      }
    } catch {
      setErro("Erro de conexão");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="p-8">
        <div className="h-6 bg-gray-100 rounded w-48 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">App Meta</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure as credenciais do seu App do Meta para renovação automática de tokens de longa duração.
        </p>
      </div>

      <div className="bg-white border border-[#e5e5e5] rounded-xl p-6">
        {configExistente && (
          <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            Configuração ativa — última atualização:{" "}
            {new Date(configExistente.atualizadoEm).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}

        <form onSubmit={(e) => void handleSalvar(e)} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App ID</label>
            <input
              type="text"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="123456789012345"
              required
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-400">
              Encontre em developers.facebook.com → Meus Apps → seu app.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chave Secreta (App Secret)</label>
            <input
              type="password"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              onFocus={() => { if (appSecret === "••••••••") setAppSecret(""); }}
              placeholder="Insira a chave secreta do app"
              required
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-400">
              Armazenada de forma criptografada. Nunca é exposta após salvar.
            </p>
          </div>

          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
              Configuração salva com sucesso.
            </div>
          )}

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-black hover:bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {salvando ? "Salvando..." : configExistente ? "Atualizar configuração" : "Salvar configuração"}
          </button>
        </form>
      </div>

      <div className="mt-6 p-4 bg-gray-50 border border-[#e5e5e5] rounded-xl text-sm text-gray-600">
        <p className="font-medium text-gray-700 mb-2">Como funciona</p>
        <ul className="space-y-1 text-xs text-gray-500 list-disc list-inside">
          <li>O cron das 4h renova automaticamente tokens que expiram em menos de 7 dias.</li>
          <li>Você também pode renovar manualmente em Contas → botão de renovação por conta.</li>
          <li>Tokens expirados ou com erro são ignorados na sincronização automática.</li>
        </ul>
      </div>
    </div>
  );
}
