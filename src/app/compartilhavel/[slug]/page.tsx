"use client";

import { use, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { LoadingSync } from "@/components/layout/LoadingSync";
import { FiltrosPeriodo, TipoPeriodo, calcularPeriodo } from "@/components/dashboard/FiltrosPeriodo";
import { MetricasDestaque } from "@/components/dashboard/MetricasDestaque";
import { MetricasSecundarias } from "@/components/dashboard/MetricasSecundarias";
import { GraficoMetricas } from "@/components/dashboard/GraficoMetricas";
import { TabelaCampanhas } from "@/components/dashboard/TabelaCampanhas";
import { BotaoRelatorio } from "@/components/dashboard/BotaoRelatorio";
import { CONFIGURACOES_FUNIL, TipoFunil } from "@/lib/metricas";
import type { DashboardData, CampanhaHierarquica } from "@/types/dashboard";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function DashboardCompartilhavel({ params }: PageProps) {
  const { slug } = use(params);
  const { data: session } = useSession();

  const [periodo, setPeriodo] = useState<TipoPeriodo>("ultimos7dias");
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [campanhas, setCampanhas] = useState<CampanhaHierarquica[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [verificandoManual, setVerificandoManual] = useState(false);

  // Identificação do visitante
  const [nomeIdentificado, setNomeIdentificado] = useState<string | null>(null);
  const [checandoIdentidade, setChecandoIdentidade] = useState(true);
  const [nomeInput, setNomeInput] = useState("");

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acessoRegistrado = useRef(false);
  const inicioRef = useRef<number>(Date.now());
  // Garante que a sincronização é disparada apenas UMA vez por período
  const sincronizacaoDisparada = useRef<boolean>(false);

  function limparPolling() {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }

  async function verificarSincronizacao(inicio: string, fim: string) {
    const r = await fetch(`/api/compartilhavel/${slug}?inicio=${inicio}&fim=${fim}`);
    if (!r.ok) return;
    const atualizado: DashboardData = await r.json();
    setDados(atualizado);
    if (atualizado.datasFaltando.length === 0) {
      setSincronizando(false);
      limparPolling();
      await carregarCampanhas(inicio, fim);
    }
  }

  async function verificarAgora() {
    const { inicio, fim } = calcularPeriodo(periodo);
    setVerificandoManual(true);
    try { await verificarSincronizacao(inicio, fim); }
    finally { setVerificandoManual(false); }
  }

  async function carregarDados(tipo: TipoPeriodo) {
    const { inicio, fim } = calcularPeriodo(tipo);
    setCarregando(true);
    setSincronizando(false);
    limparPolling();

    try {
      const res = await fetch(`/api/compartilhavel/${slug}?inicio=${inicio}&fim=${fim}`);
      if (res.status === 404) {
        setErro("Dashboard não encontrado ou não está disponível.");
        setCarregando(false);
        return;
      }
      if (!res.ok) throw new Error("Erro ao carregar dados");

      const json: DashboardData = await res.json();
      setDados(json);

      if (json.datasFaltando.length > 0) {
        setSincronizando(true);
        // Dispara a sincronização apenas uma vez por período — impede loop em re-renders
        if (!sincronizacaoDisparada.current) {
          sincronizacaoDisparada.current = true;
          await fetch(`/api/compartilhavel/${slug}/sincronizar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inicio, fim }),
          });
        }
        pollingRef.current = setInterval(() => { verificarSincronizacao(inicio, fim); }, 10_000);
        // Após 3 min, para o polling e mostra o que houver
        timeoutRef.current = setTimeout(() => { limparPolling(); setSincronizando(false); }, 3 * 60 * 1000);
      } else {
        carregarCampanhas(inicio, fim);
      }
    } catch {
      setErro("Erro ao carregar dados do dashboard.");
    } finally {
      setCarregando(false);
    }
  }

  async function carregarCampanhas(inicio: string, fim: string) {
    try {
      const res = await fetch(`/api/compartilhavel/${slug}/campanhas?inicio=${inicio}&fim=${fim}`);
      if (!res.ok) return;
      const json: { campanhas: CampanhaHierarquica[] } = await res.json();
      setCampanhas(json.campanhas);
    } catch {
      // campanhas são opcionais
    }
  }

  async function registrarAcesso(nome: string) {
    if (acessoRegistrado.current) return;
    acessoRegistrado.current = true;
    await fetch(`/api/compartilhavel/${slug}/acesso`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrer: document.referrer, nome }),
    }).catch(() => {});
  }

  function confirmarIdentidade() {
    const nome = nomeInput.trim();
    if (!nome) return;
    localStorage.setItem(`visitante_nome_${slug}`, nome);
    setNomeIdentificado(nome);
    registrarAcesso(nome);
  }

  // Carrega dados sempre; verifica identidade no localStorage
  useEffect(() => {
    carregarDados(periodo);

    const salvo = localStorage.getItem(`visitante_nome_${slug}`);
    if (salvo) {
      setNomeIdentificado(salvo);
      registrarAcesso(salvo);
    }
    setChecandoIdentidade(false);

    const registrarDuracao = () => {
      const duracao = Math.round((Date.now() - inicioRef.current) / 1000);
      navigator.sendBeacon(
        `/api/compartilhavel/${slug}/acesso`,
        JSON.stringify({ duracao })
      );
    };
    window.addEventListener("beforeunload", registrarDuracao);
    return () => { limparPolling(); window.removeEventListener("beforeunload", registrarDuracao); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const periodoIniciado = useRef(false);
  useEffect(() => {
    if (!periodoIniciado.current) { periodoIniciado.current = true; return; }
    sincronizacaoDisparada.current = false; // novo período permite nova sincronização
    carregarDados(periodo);
  }, [periodo]); // eslint-disable-line react-hooks/exhaustive-deps

  if (erro) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">{erro}</p>
          <p className="mt-2 text-sm text-gray-400">Verifique o link ou entre em contato com o gestor.</p>
        </div>
      </div>
    );
  }

  const config = dados ? CONFIGURACOES_FUNIL[dados.conta.tipoFunil as TipoFunil] : null;
  const isGestor = session?.user?.tipo === "gestor";
  const { inicio, fim } = calcularPeriodo(periodo);

  // Modal de identificação (não mostra enquanto verifica localStorage)
  const mostrarModal = !checandoIdentidade && !nomeIdentificado;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modal de identificação */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
            {dados?.conta.nomeCliente && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Dashboard de {dados.conta.nomeCliente}
              </p>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900">Como você se chama?</h2>
              <p className="text-sm text-gray-500 mt-1">
                Seu nome será salvo para que não precisemos perguntar novamente.
              </p>
            </div>
            <div>
              <input
                type="text"
                value={nomeInput}
                onChange={(e) => setNomeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") confirmarIdentidade(); }}
                placeholder="Ex: João Silva"
                autoFocus
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <button
              onClick={confirmarIdentidade}
              disabled={!nomeInput.trim()}
              className="w-full bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-900 disabled:opacity-40 transition-colors"
            >
              Acessar dashboard
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            {dados ? (
              <h1 className="text-xl font-bold text-gray-900">{dados.conta.nomeCliente}</h1>
            ) : (
              <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
            )}
            {dados?.conta.ultimaSincronizacao && (
              <p className="text-xs text-gray-400 mt-0.5">
                Atualizado em{" "}
                {new Date(dados.conta.ultimaSincronizacao).toLocaleString("pt-BR", {
                  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            )}
          </div>
          <FiltrosPeriodo selecionado={periodo} onChange={setPeriodo} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {carregando && !dados && (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        )}

        {sincronizando && dados && dados.porDia.length === 0 && (
          <LoadingSync onAtualizar={verificarAgora} verificando={verificandoManual} />
        )}

        {sincronizando && dados && dados.porDia.length > 0 && dados.datasFaltando.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin shrink-0" />
              <p className="text-sm text-amber-700">
                Sincronizando {dados.datasFaltando.length} dia{dados.datasFaltando.length !== 1 ? "s" : ""} ainda sem dados.
              </p>
            </div>
            <button
              onClick={verificarAgora}
              disabled={verificandoManual}
              className="shrink-0 text-xs font-medium text-amber-700 underline underline-offset-2 disabled:opacity-50"
            >
              {verificandoManual ? "Verificando..." : "Atualizar agora"}
            </button>
          </div>
        )}

        {dados && config && dados.porDia.length > 0 && (
          <>
            {isGestor && (
              <div className="flex justify-end">
                <BotaoRelatorio contaId={dados.conta.id} inicio={inicio} fim={fim} />
              </div>
            )}
            <section>
              <MetricasDestaque
                metricas={config.metricasDestaque}
                dados={dados.agregado}
                labelMetricaPrincipal={dados.conta.labelMetricaPrincipal}
                labelCustoPorResultado={dados.conta.labelCustoPorResultado}
              />
            </section>
            <section>
              <MetricasSecundarias metricas={config.submetricas} dados={dados.agregado} />
            </section>
            <section>
              <GraficoMetricas porDia={dados.porDia} metricasDisponiveis={config.metricasGrafico} />
            </section>
            {campanhas.length > 0 && (
              <section>
                <TabelaCampanhas
                  campanhas={campanhas}
                  metricaPrincipal={dados.conta.metricaPrincipal}
                  labelMetricaPrincipal={dados.conta.labelMetricaPrincipal}
                  labelCustoPorResultado={dados.conta.labelCustoPorResultado}
                />
              </section>
            )}
          </>
        )}

        {!carregando && dados && dados.porDia.length === 0 && !sincronizando && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-gray-500">Nenhum dado encontrado para o período selecionado.</p>
            <p className="text-sm text-gray-400 mt-1">
              Tente selecionar um período diferente ou aguarde a próxima sincronização.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
