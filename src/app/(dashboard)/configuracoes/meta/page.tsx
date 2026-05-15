"use client";

import { useEffect, useState } from "react";

interface ConfigData {
  appId: string;
  tokenExpiraEm: string | null;
  tokenStatus: "ok" | "expirando" | "expirado" | "erro" | null;
  criadoEm: string;
  atualizadoEm: string;
}

const BADGE_TOKEN: Record<string, { label: string; cls: string }> = {
  ok:        { label: "Token ativo",     cls: "bg-green-50 text-green-700 border-green-200" },
  expirando: { label: "Expirando em breve", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  expirado:  { label: "Token expirado",  cls: "bg-red-50 text-red-700 border-red-200" },
  erro:      { label: "Erro no token",   cls: "bg-red-50 text-red-700 border-red-200" },
};

export default function ConfiguracaoMetaPage() {
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [tokenAcesso, setTokenAcesso] = useState("");
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
          if (data.config.tokenStatus) setTokenAcesso("••••••••");
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
        body: JSON.stringify({ appId, appSecret, tokenAcesso }),
      });

      const data = (await res.json()) as { ok?: boolean; erro?: string };

      if (res.ok && data.ok) {
        setSucesso(true);
        setAppSecret("••••••••");
        if (tokenAcesso && tokenAcesso !== "••••••••") {
          setTokenAcesso("••••••••");
          setConfigExistente((prev) => prev ? { ...prev, tokenStatus: "ok", tokenExpiraEm: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() } : prev);
        }
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

  const badgeToken = configExistente?.tokenStatus ? BADGE_TOKEN[configExistente.tokenStatus] : null;

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">App Meta</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure as credenciais do App Meta e o token de acesso global usado em todas as sincronizações.
        </p>
      </div>

      <div className="bg-white border border-[#e5e5e5] rounded-xl p-6">
        {configExistente && (
          <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center justify-between gap-3">
            <span>
              Configuração ativa — atualizado em{" "}
              {new Date(configExistente.atualizadoEm).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
            {badgeToken && (
              <span className={`shrink-0 text-[11px] font-medium border px-2 py-0.5 rounded-full ${badgeToken.cls}`}>
                {badgeToken.label}
              </span>
            )}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token de acesso global
              {configExistente?.tokenExpiraEm && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  expira em {new Date(configExistente.tokenExpiraEm).toLocaleDateString("pt-BR")}
                </span>
              )}
            </label>
            <input
              type="password"
              value={tokenAcesso}
              onChange={(e) => setTokenAcesso(e.target.value)}
              onFocus={() => { if (tokenAcesso === "••••••••") setTokenAcesso(""); }}
              placeholder="EAAxxxxxxxxxx..."
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-400">
              Token de longa duração da Graph API. Válido para todas as contas de anúncio. Deixe em branco para manter o token atual.
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
          <li>O token global é usado em todas as contas — não é necessário configurar por conta.</li>
          <li>Use um token de longa duração (60 dias) gerado pela Graph API Explorer.</li>
          <li>O cron das 4h renova automaticamente o token quando estiver expirando.</li>
          <li>O App ID e App Secret são necessários para a renovação automática do token.</li>
        </ul>
      </div>
    </div>
  );
}
