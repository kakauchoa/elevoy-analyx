"use client";

import { useCallback, useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface EvolutionConfig {
  id?: string;
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
  evolutionInstance?: string;
  evolutionWhatsapp?: string;
}

interface ContaResumida {
  id: string;
  nomeCliente: string;
  accountIdMeta: string;
  tipoPagamento: "cartao" | "boleto";
  orcamentoMensal: string | null;
  tokenStatus: string;
}

interface Notificacao {
  id: string;
  tipo: string;
  mensagem: string;
  lida: boolean;
  criadoEm: string;
  conta: { nomeCliente: string };
}

// ── Section headers ────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-gray-900 mb-4">{children}</h2>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[#e5e5e5] rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

// ── Evolution config form ──────────────────────────────────────────────────

function SecaoEvolution() {
  const [form, setForm] = useState<EvolutionConfig>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    fetch("/api/configuracoes/evolution")
      .then((r) => r.json())
      .then((d: EvolutionConfig) => setForm(d))
      .catch(() => undefined)
      .finally(() => setCarregando(false));
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMsg(null);
    try {
      const res = await fetch("/api/configuracoes/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMsg({ tipo: "ok", texto: "Configuração salva com sucesso." });
      } else {
        setMsg({ tipo: "erro", texto: "Erro ao salvar. Tente novamente." });
      }
    } catch {
      setMsg({ tipo: "erro", texto: "Erro de conexão." });
    } finally {
      setSalvando(false);
    }
  }

  function campo(
    label: string,
    key: keyof EvolutionConfig,
    placeholder: string,
    tipo = "text"
  ) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        <input
          type={tipo}
          value={(form[key] as string) ?? ""}
          onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
          placeholder={placeholder}
          className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black transition-shadow"
        />
      </div>
    );
  }

  if (carregando) {
    return (
      <Card>
        <div className="h-40 animate-pulse bg-gray-100 rounded-lg" />
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle>Evolution API — WhatsApp</SectionTitle>
      <p className="text-xs text-gray-500 mb-4">
        Configure sua instância do Evolution API para receber alertas de saldo e erros de cartão por WhatsApp.
      </p>
      <form onSubmit={salvar} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campo("URL base da API", "evolutionApiUrl", "https://evolution.seudominio.com")}
          {campo("API Key", "evolutionApiKey", "sua-api-key-aqui", "password")}
          {campo("Nome da instância", "evolutionInstance", "minha-instancia")}
          {campo("WhatsApp para alertas", "evolutionWhatsapp", "5511999999999")}
        </div>

        {msg && (
          <p
            className={`text-sm px-3 py-2 rounded-lg ${
              msg.tipo === "ok"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {msg.texto}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={salvando}
            className="px-5 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-900 disabled:bg-gray-400 transition-colors"
          >
            {salvando ? "Salvando..." : "Salvar configuração"}
          </button>
        </div>
      </form>
    </Card>
  );
}

// ── Monitored accounts ─────────────────────────────────────────────────────

function SecaoContas() {
  const [contas, setContas] = useState<ContaResumida[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/contas")
      .then((r) => r.json())
      .then((d: ContaResumida[]) => setContas(Array.isArray(d) ? d : []))
      .catch(() => undefined)
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) {
    return (
      <Card>
        <div className="h-32 animate-pulse bg-gray-100 rounded-lg" />
      </Card>
    );
  }

  const boleto = contas.filter((c) => c.tipoPagamento === "boleto");
  const cartao = contas.filter((c) => c.tipoPagamento === "cartao");

  return (
    <Card>
      <SectionTitle>Contas monitoradas</SectionTitle>
      {contas.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma conta cadastrada.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {boleto.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Boleto pré-pago ({boleto.length})
              </p>
              <div className="divide-y divide-[#f0f0f0]">
                {boleto.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.nomeCliente}</p>
                      <p className="text-xs text-gray-400">{c.accountIdMeta}</p>
                    </div>
                    <div className="text-right">
                      {c.orcamentoMensal ? (
                        <span className="text-sm font-semibold text-gray-800">
                          R$ {Number(c.orcamentoMensal).toFixed(2).replace(".", ",")}
                          <span className="text-xs font-normal text-gray-400">/mês</span>
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          Sem orçamento definido
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cartao.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Cartão de crédito ({cartao.length})
              </p>
              <div className="divide-y divide-[#f0f0f0]">
                {cartao.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.nomeCliente}</p>
                      <p className="text-xs text-gray-400">{c.accountIdMeta}</p>
                    </div>
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      Monitorando status
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Manual trigger ─────────────────────────────────────────────────────────

function SecaoVerificar() {
  const [rodando, setRodando] = useState(false);
  const [resultado, setResultado] = useState<{
    ok?: boolean;
    processadas?: number;
    alertas?: number;
    erros?: number;
    erro?: string;
  } | null>(null);

  async function verificarAgora() {
    setRodando(true);
    setResultado(null);
    try {
      const cronSecret = "";
      const res = await fetch("/api/jobs/verificar-saldo", {
        method: "POST",
        headers: { "x-cron-secret": cronSecret },
      });
      const dados = (await res.json()) as typeof resultado;
      setResultado(dados);
    } catch {
      setResultado({ erro: "Erro de conexão." });
    } finally {
      setRodando(false);
    }
  }

  return (
    <Card>
      <SectionTitle>Verificar saldo agora</SectionTitle>
      <p className="text-xs text-gray-500 mb-4">
        Aciona a verificação manual de todas as contas. Em produção, configure um cron na VPS para
        rodar às 9h, 13h e 17h:
      </p>
      <div className="bg-gray-50 border border-[#e5e5e5] rounded-lg px-4 py-3 mb-4 font-mono text-xs text-gray-600 select-all">
        {`0 9,13,17 * * * curl -s -X POST https://seudominio.com/api/jobs/verificar-saldo -H "x-cron-secret: $CRON_SECRET"`}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={verificarAgora}
          disabled={rodando}
          className="flex items-center gap-2 px-5 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-900 disabled:bg-gray-400 transition-colors"
        >
          {rodando ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Verificando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Verificar agora
            </>
          )}
        </button>

        {resultado && (
          <div
            className={`text-sm px-3 py-2 rounded-lg ${
              resultado.erro
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-green-50 text-green-700 border border-green-200"
            }`}
          >
            {resultado.erro
              ? resultado.erro
              : `${resultado.processadas} conta(s) verificada(s) · ${resultado.alertas} alerta(s) · ${resultado.erros} erro(s)`}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Notifications list ─────────────────────────────────────────────────────

function SecaoNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/notificacoes");
      if (res.ok) setNotificacoes((await res.json()) as Notificacao[]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function marcarTodasLidas() {
    await fetch("/api/notificacoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todos: true }),
    });
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
  }

  async function marcarLida(id: string) {
    await fetch("/api/notificacoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
  }

  const naolidas = notificacoes.filter((n) => !n.lida).length;

  const ICONE: Record<string, string> = {
    saldo_baixo: "⚠️",
    cartao_erro: "🚨",
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>
          Alertas recentes{naolidas > 0 && (
            <span className="ml-2 text-xs font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">
              {naolidas}
            </span>
          )}
        </SectionTitle>
        {naolidas > 0 && (
          <button
            onClick={marcarTodasLidas}
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {carregando ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : notificacoes.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">Nenhum alerta</p>
          <p className="text-xs text-gray-400 mt-0.5">Todas as contas estão saudáveis.</p>
        </div>
      ) : (
        <div className="divide-y divide-[#f0f0f0]">
          {notificacoes.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 py-3 ${!n.lida ? "bg-amber-50 -mx-5 px-5 first:rounded-t-xl last:rounded-b-xl" : ""}`}
            >
              <span className="text-lg shrink-0 mt-0.5">{ICONE[n.tipo] ?? "📢"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-900">{n.conta.nomeCliente}</span>
                  {!n.lida && (
                    <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                      Novo
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-line line-clamp-2">
                  {n.mensagem}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {new Date(n.criadoEm).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {!n.lida && (
                <button
                  onClick={() => marcarLida(n.id)}
                  className="shrink-0 text-xs text-gray-400 hover:text-gray-700 transition-colors mt-1"
                  title="Marcar como lida"
                >
                  ✓
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function FerramentasPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-5 border-b border-[#e5e5e5]">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ferramentas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Verificador de saldo Meta Ads + alertas por WhatsApp
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">
          <SecaoEvolution />
          <SecaoContas />
          <SecaoVerificar />
          <SecaoNotificacoes />
        </div>
      </div>
    </div>
  );
}
