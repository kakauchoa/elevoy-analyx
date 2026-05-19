"use client";

import { useEffect, useState } from "react";

interface EvolutionConfig {
  evolutionApiUrl: string | null;
  evolutionApiKey: string | null;
  evolutionInstance: string | null;
  evolutionWhatsapp: string | null;
  evolutionVersion: string | null;
  atualizadoEm: string;
}

export default function ConfiguracaoEvolutionPage() {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [instance, setInstance] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [version, setVersion] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");
  const [semPermissao, setSemPermissao] = useState(false);
  const [configExistente, setConfigExistente] = useState<EvolutionConfig | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch("/api/configuracoes/evolution");
        if (res.status === 401) {
          setSemPermissao(true);
          return;
        }
        const data = (await res.json()) as Partial<EvolutionConfig>;
        if (data.atualizadoEm) {
          setConfigExistente(data as EvolutionConfig);
          setApiUrl(data.evolutionApiUrl ?? "");
          setApiKey(data.evolutionApiKey ? "••••••••" : "");
          setInstance(data.evolutionInstance ?? "");
          setWhatsapp(data.evolutionWhatsapp ?? "");
          setVersion(data.evolutionVersion ?? "");
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
      const res = await fetch("/api/configuracoes/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evolutionApiUrl: apiUrl || null,
          evolutionApiKey: apiKey === "••••••••" ? undefined : (apiKey || null),
          evolutionInstance: instance || null,
          evolutionWhatsapp: whatsapp || null,
          evolutionVersion: version || null,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; erro?: string };

      if (res.ok && data.ok) {
        setSucesso(true);
        if (apiKey && apiKey !== "••••••••") setApiKey("••••••••");
        setConfigExistente((prev) =>
          prev
            ? { ...prev, evolutionApiUrl: apiUrl, evolutionVersion: version, atualizadoEm: new Date().toISOString() }
            : null
        );
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

  if (semPermissao) {
    return (
      <div className="p-8 max-w-xl">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Acesso restrito — apenas administradores podem gerenciar as configurações da Evolution API.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Evolution API</h1>
        <p className="text-sm text-gray-500 mt-1">
          Credenciais globais da Evolution API usadas para integração WhatsApp de todas as contas.
        </p>
      </div>

      <div className="bg-white border border-[#e5e5e5] rounded-xl p-6">
        {configExistente && (
          <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            Configuração ativa — atualizado em{" "}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">URL da API</label>
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://evolution.seu-dominio.com"
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-400">Endereço do servidor Evolution API auto-hospedado.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key (Global)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onFocus={() => { if (apiKey === "••••••••") setApiKey(""); }}
              placeholder="Chave de autenticação da Evolution API"
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-400">
              Armazenada de forma criptografada. Deixe em branco para manter a chave atual.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instância padrão</label>
            <input
              type="text"
              value={instance}
              onChange={(e) => setInstance(e.target.value)}
              placeholder="nome-da-instancia"
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-400">Cada conta cria sua própria instância automaticamente.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número WhatsApp padrão</label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="5511999999999"
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Versão do WhatsApp Business
              <span className="ml-2 text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                Reconnect fix
              </span>
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="Ex: 2.3000.1023625788"
              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-400">
              Versão exata do cliente WhatsApp Web. Atualizar aqui resolve o bug de reconexão após desconexão.
            </p>
          </div>

          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{erro}</div>
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
          <li>Cada conta de anúncio cria sua própria instância na Evolution API automaticamente.</li>
          <li>O QR code é gerado na tela de configuração do Rastreamento WhatsApp por conta.</li>
          <li>Atualizar a versão do WhatsApp Business resolve o bug de reconexão após desconexão.</li>
          <li>A API Key é usada para autenticar todas as requisições à Evolution API.</li>
        </ul>
      </div>
    </div>
  );
}
