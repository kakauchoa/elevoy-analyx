"use client";

import { useCallback, useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Tab = "whatsapp" | "cliente" | "configuracao";
type WaState = "open" | "close" | "connecting" | "unknown";

interface ContaConfig {
  id: string;
  nomeCliente: string;
  pageIdMeta: string | null;
  pixelId: string | null;
  webhookToken: string | null;
  evolutionInstanceName: string | null;
  evolutionStatus: string | null;
  cliente: {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
    status: string;
  } | null;
}

interface ClienteOpcao {
  id: string;
  nome: string;
  email: string;
  status: string;
  contaAnuncioId: string | null;
}

export default function ConfigurarRastreamentoPage({
  params,
}: {
  params: Promise<{ contaId: string }>;
}) {
  const { contaId } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("whatsapp");
  const [conta, setConta] = useState<ContaConfig | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(() => {
    fetch(`/api/rastreamento/configurar/${contaId}`)
      .then((r) => r.json())
      .then((d: ContaConfig) => setConta(d))
      .finally(() => setCarregando(false));
  }, [contaId]);

  useEffect(() => { carregar(); }, [carregar]);

  if (carregando || !conta) {
    return (
      <div className="flex flex-col h-full">
        <HeaderBack />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">Carregando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5] flex items-center gap-3">
        <button
          onClick={() => router.push("/ferramentas/rastreamento-whatsapp")}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Voltar
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{conta.nomeCliente}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configuração de Rastreamento WhatsApp</p>
        </div>
        <div className="ml-auto">
          <StatusBadge state={(conta.evolutionStatus as WaState) ?? "close"} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e5e5e5] px-8">
        {(
          [
            { key: "whatsapp", label: "WhatsApp" },
            { key: "cliente", label: "Cliente CRM" },
            { key: "configuracao", label: "Configuração" },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-8">
        {tab === "whatsapp" && (
          <TabWhatsApp conta={conta} onAtualizar={carregar} />
        )}
        {tab === "cliente" && (
          <TabCliente conta={conta} onAtualizar={carregar} />
        )}
        {tab === "configuracao" && (
          <TabConfiguracao conta={conta} onAtualizar={carregar} />
        )}
      </div>
    </div>
  );
}

// ── Tab WhatsApp ─────────────────────────────────────────────────────────────

function TabWhatsApp({
  conta,
  onAtualizar,
}: {
  conta: ContaConfig;
  onAtualizar: () => void;
}) {
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [estado, setEstado] = useState<WaState>(
    (conta.evolutionStatus as WaState) ?? "close"
  );
  const [conectando, setConectando] = useState(false);
  const [recriando, setRecriando] = useState(false);
  const [erro, setErro] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pararPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  const iniciarPolling = useCallback(() => {
    pararPolling();
    pollingRef.current = setInterval(async () => {
      const res = await fetch(`/api/rastreamento/whatsapp/${conta.id}/qr`);
      const data = (await res.json()) as { base64: string | null; state: WaState };
      setQrBase64(data.base64);
      setEstado(data.state);
      if (data.state === "open") {
        pararPolling();
        onAtualizar();
      }
    }, 5000);
  }, [conta.id, onAtualizar]);

  useEffect(() => {
    return () => pararPolling();
  }, []);

  async function conectar() {
    setConectando(true);
    setErro("");
    try {
      const res = await fetch(`/api/rastreamento/whatsapp/${conta.id}/conectar`, {
        method: "POST",
      });
      const data = (await res.json()) as { base64: string | null; state: WaState; erro?: string };
      if (!res.ok) { setErro(data.erro ?? "Erro ao conectar"); return; }
      setQrBase64(data.base64);
      setEstado(data.state);
      if (data.state !== "open") iniciarPolling();
    } finally {
      setConectando(false);
    }
  }

  async function desconectar() {
    if (!confirm("Desconectar o WhatsApp desta conta?")) return;
    await fetch(`/api/rastreamento/whatsapp/${conta.id}/desconectar`, { method: "POST" });
    setEstado("close");
    setQrBase64(null);
    pararPolling();
    onAtualizar();
  }

  async function recriarInstancia() {
    if (
      !confirm(
        "Isso vai apagar a instância atual e criar uma nova — use apenas se o QR não aparecer após desconexão."
      )
    )
      return;
    setRecriando(true);
    setErro("");
    try {
      const res = await fetch(`/api/rastreamento/whatsapp/${conta.id}/recriar`, {
        method: "POST",
      });
      const data = (await res.json()) as { base64: string | null; state: WaState; erro?: string };
      if (!res.ok) { setErro(data.erro ?? "Erro ao recriar"); return; }
      setQrBase64(data.base64);
      setEstado(data.state);
      if (data.state !== "open") iniciarPolling();
    } finally {
      setRecriando(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Conexão WhatsApp</h2>
        <p className="text-sm text-gray-500">
          Conecte o número do cliente à Evolution API para receber os leads automaticamente.
        </p>
      </div>

      {/* Status atual */}
      <div className="border border-[#e5e5e5] rounded-xl p-5 bg-white flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Status da conexão</p>
          {conta.evolutionInstanceName && (
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{conta.evolutionInstanceName}</p>
          )}
        </div>
        <StatusBadge state={estado} />
      </div>

      {/* QR Code */}
      {qrBase64 && estado !== "open" && (
        <div className="border border-[#e5e5e5] rounded-xl p-6 bg-white flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-gray-700">Escaneie o QR code com o WhatsApp</p>
          <Image
            src={qrBase64}
            alt="QR Code WhatsApp"
            width={220}
            height={220}
            className="rounded-lg"
            unoptimized
          />
          <p className="text-xs text-gray-400">Aguardando conexão… (atualiza automaticamente)</p>
        </div>
      )}

      {estado === "open" && (
        <div className="border border-green-200 bg-green-50 rounded-xl p-5">
          <p className="text-sm font-semibold text-green-700">WhatsApp conectado</p>
          <p className="text-xs text-green-600 mt-0.5">
            Os leads chegando via anúncio serão capturados automaticamente.
          </p>
        </div>
      )}

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-3">
        {estado !== "open" && (
          <button
            disabled={conectando}
            onClick={conectar}
            className="px-4 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {conectando ? "Conectando…" : qrBase64 ? "Atualizar QR" : "Conectar WhatsApp"}
          </button>
        )}

        {estado === "open" && (
          <button
            onClick={desconectar}
            className="px-4 py-2.5 text-sm font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            Desconectar
          </button>
        )}

        <button
          disabled={recriando}
          onClick={recriarInstancia}
          className="px-4 py-2.5 text-sm font-medium border border-[#e5e5e5] text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          title="Use quando o QR não aparecer após reconexão (problema de versão do WhatsApp)"
        >
          {recriando ? "Recriando…" : "Recriar instância"}
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Se o QR não aparecer após desconexão, use "Recriar instância" — isso resolve o problema de versão do WhatsApp.
      </p>
    </div>
  );
}

// ── Tab Cliente CRM ──────────────────────────────────────────────────────────

function TabCliente({
  conta,
  onAtualizar,
}: {
  conta: ContaConfig;
  onAtualizar: () => void;
}) {
  const [clientes, setClientes] = useState<ClienteOpcao[]>([]);
  const [busca, setBusca] = useState("");
  const [vinculando, setVinculando] = useState(false);
  const [desvinculando, setDesvinculando] = useState(false);
  const [mostrarBusca, setMostrarBusca] = useState(false);

  useEffect(() => {
    if (mostrarBusca) {
      fetch("/api/rastreamento/clientes")
        .then((r) => r.json())
        .then((lista: ClienteOpcao[]) =>
          setClientes(lista.filter((c) => c.status === "aprovado" || c.status === "pendente"))
        );
    }
  }, [mostrarBusca]);

  async function vincularCliente(clienteId: string) {
    setVinculando(true);
    await fetch(`/api/rastreamento/clientes/${clienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "aprovar", contaAnuncioId: conta.id }),
    });
    setVinculando(false);
    setMostrarBusca(false);
    onAtualizar();
  }

  async function desvincularCliente() {
    if (!conta.cliente) return;
    if (!confirm("Desvincular este cliente da conta?")) return;
    setDesvinculando(true);
    await fetch(`/api/rastreamento/clientes/${conta.cliente.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "desvincular" }),
    });
    setDesvinculando(false);
    onAtualizar();
  }

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.email.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Cliente vinculado</h2>
        <p className="text-sm text-gray-500">
          O cliente vinculado tem acesso ao CRM desta conta em{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">
            /crm-cliente/{conta.id}
          </code>
        </p>
      </div>

      {conta.cliente ? (
        <div className="border border-[#e5e5e5] rounded-xl p-5 bg-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-gray-900">{conta.cliente.nome}</p>
              <p className="text-sm text-gray-500 mt-0.5">{conta.cliente.email}</p>
              {conta.cliente.telefone && (
                <p className="text-sm text-gray-400">{conta.cliente.telefone}</p>
              )}
              <span
                className={`inline-block mt-2 px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                  conta.cliente.status === "aprovado"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {conta.cliente.status === "aprovado" ? "Aprovado" : "Pendente"}
              </span>
            </div>
            <button
              disabled={desvinculando}
              onClick={desvincularCliente}
              className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              Desvincular
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-[#f0f0f0]">
            <p className="text-xs text-gray-400 mb-2">Link de acesso do cliente:</p>
            <LinkCopiavel
              label="Portal do cliente"
              href={`${typeof window !== "undefined" ? window.location.origin : ""}/crm-cliente/login`}
            />
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-[#e5e5e5] rounded-xl p-6 text-center bg-gray-50">
          <p className="text-sm text-gray-500 mb-3">Nenhum cliente vinculado a esta conta</p>
          <button
            onClick={() => setMostrarBusca(true)}
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Vincular cliente existente
          </button>
        </div>
      )}

      {/* Busca de clientes */}
      {mostrarBusca && (
        <div className="border border-[#e5e5e5] rounded-xl p-5 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Selecionar cliente</p>
            <button
              onClick={() => setMostrarBusca(false)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <input
            type="text"
            placeholder="Buscar por nome ou email…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {clientesFiltrados.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">Nenhum cliente encontrado</p>
            ) : (
              clientesFiltrados.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between border border-[#f0f0f0] rounded-lg px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                    <p className="text-xs text-gray-400">{c.email}</p>
                  </div>
                  <button
                    disabled={vinculando}
                    onClick={() => vincularCliente(c.id)}
                    className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
                  >
                    Vincular
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="border-t border-[#f0f0f0] pt-5">
        <p className="text-sm font-medium text-gray-700 mb-2">Aprovação de novos cadastros</p>
        <p className="text-sm text-gray-500 mb-3">
          Quando um cliente se cadastrar em <code className="text-xs bg-gray-100 px-1 rounded">/crm-cliente/registro</code>, ele aparece aqui aguardando aprovação.
        </p>
        <button
          onClick={() => (window.location.href = "/ferramentas/rastreamento-whatsapp/aprovar")}
          className="text-sm text-blue-600 hover:underline"
        >
          Ver todos os clientes pendentes →
        </button>
      </div>
    </div>
  );
}

// ── Tab Configuração ─────────────────────────────────────────────────────────

function TabConfiguracao({
  conta,
  onAtualizar,
}: {
  conta: ContaConfig;
  onAtualizar: () => void;
}) {
  const [pixelId, setPixelId] = useState(conta.pixelId ?? "");
  const [pageId, setPageId] = useState(conta.pageIdMeta ?? "");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const webhookUrl =
    typeof window !== "undefined" && conta.webhookToken
      ? `${window.location.origin}/api/rastreamento/webhook/${conta.webhookToken}`
      : null;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    await fetch(`/api/rastreamento/configurar/${conta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageIdMeta: pageId || null, pixelId: pixelId || null }),
    });
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
    onAtualizar();
  }

  async function copiarWebhook() {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Webhook URL */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">URL do Webhook</h2>
        <p className="text-sm text-gray-500 mb-3">
          Cole esta URL na Evolution API como destino dos eventos da instância.
        </p>
        {webhookUrl ? (
          <div className="flex items-center gap-2 border border-[#e5e5e5] rounded-lg px-3 py-2.5 bg-gray-50">
            <code className="flex-1 text-xs text-gray-600 break-all">{webhookUrl}</code>
            <button
              onClick={copiarWebhook}
              className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              {copiado ? "Copiado!" : "Copiar"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Recarregue a página para gerar o webhook.</p>
        )}
      </div>

      {/* Pixel e Page ID */}
      <form onSubmit={salvar} className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Meta CAPI</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pixel ID
          </label>
          <input
            type="text"
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value)}
            placeholder="123456789"
            className="w-full px-3 py-2.5 text-sm border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID da Página Meta{" "}
            <span className="text-xs text-gray-400">(necessário para eventos WhatsApp CAPI)</span>
          </label>
          <input
            type="text"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            placeholder="ID da página do Facebook"
            className="w-full px-3 py-2.5 text-sm border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <button
          type="submit"
          disabled={salvando}
          className="px-4 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {salvo ? "Salvo!" : salvando ? "Salvando…" : "Salvar configuração"}
        </button>
      </form>
    </div>
  );
}

// ── Componentes auxiliares ───────────────────────────────────────────────────

function StatusBadge({ state }: { state: WaState }) {
  const map: Record<WaState, { label: string; className: string }> = {
    open: { label: "Conectado", className: "bg-green-50 text-green-700 border-green-200" },
    connecting: { label: "Conectando…", className: "bg-amber-50 text-amber-700 border-amber-200" },
    close: { label: "Desconectado", className: "bg-gray-100 text-gray-500 border-gray-200" },
    unknown: { label: "Desconhecido", className: "bg-gray-100 text-gray-400 border-gray-200" },
  };
  const { label, className } = map[state] ?? map.unknown;
  return (
    <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border ${className}`}>
      {label}
    </span>
  );
}

function LinkCopiavel({ label, href }: { label: string; href: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    await navigator.clipboard.writeText(href);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }
  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-[#e5e5e5] rounded-lg px-3 py-2">
      <span className="text-xs text-gray-400">{label}:</span>
      <code className="flex-1 text-xs text-gray-600 truncate">{href}</code>
      <button onClick={copiar} className="text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0">
        {copiado ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

function HeaderBack() {
  return (
    <div className="px-8 py-5 border-b border-[#e5e5e5]">
      <h1 className="text-xl font-bold text-gray-900">Configuração</h1>
    </div>
  );
}
