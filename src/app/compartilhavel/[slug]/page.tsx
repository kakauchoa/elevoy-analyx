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

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const acessoRegistrado = useRef(false);
  const inicioRef = useRef<number>(Date.now());

  function limparPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
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
        // Dados faltando — dispara sincronização e começa polling
        setSincronizando(true);
        await fetch(`/api/compartilhavel/${slug}/sincronizar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inicio, fim }),
        });

        pollingRef.current = setInterval(async () => {
          const r = await fetch(`/api/compartilhavel/${slug}?inicio=${inicio}&fim=${fim}`);
          if (!r.ok) return;
          const atualizado: DashboardData = await r.json();
          setDados(atualizado);

          if (atualizado.datasFaltando.length === 0) {
            setSincronizando(false);
            limparPolling();
            carregarCampanhas(inicio, fim);
          }
        }, 30_000);
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
      // campanhas são opcionais, não bloqueia o dashboard
    }
  }

  async function registrarAcesso() {
    if (acessoRegistrado.current) return;
    acessoRegistrado.current = true;
    await fetch(`/api/compartilhavel/${slug}/acesso`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrer: document.referrer }),
    }).catch(() => {});
  }

  useEffect(() => {
    carregarDados(periodo);
    registrarAcesso();

    // Registra duração da visita ao sair
    const registrarDuracao = () => {
      const duracao = Math.round((Date.now() - inicioRef.current) / 1000);
      navigator.sendBeacon(
        `/api/compartilhavel/${slug}/acesso`,
        JSON.stringify({ duracao })
      );
    };
    window.addEventListener("beforeunload", registrarDuracao);

    return () => {
      limparPolling();
      window.removeEventListener("beforeunload", registrarDuracao);
    };
  }, []);

  useEffect(() => {
    if (!carregando) {
      carregarDados(periodo);
    }
  }, [periodo]);

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

  const config = dados
    ? CONFIGURACOES_FUNIL[dados.conta.tipoFunil as TipoFunil]
    : null;

  const isGestor = session?.user?.tipo === "gestor";
  const { inicio, fim } = calcularPeriodo(periodo);

  return (
    <div className="min-h-screen bg-gray-50">
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
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
          <FiltrosPeriodo selecionado={periodo} onChange={setPeriodo} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Estado de carregamento inicial */}
        {carregando && !dados && (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        )}

        {/* Dados faltando — exibe sincronização */}
        {sincronizando && dados && dados.datasFaltando.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin shrink-0" />
            <p className="text-sm text-amber-700">
              Sincronizando dados do período ({dados.datasFaltando.length} dia{dados.datasFaltando.length > 1 ? "s" : ""} faltando).
              A página atualiza automaticamente a cada 30 segundos.
            </p>
          </div>
        )}

        {/* Dashboard completo sem dados (após sync tentado) */}
        {!carregando && dados && dados.datasFaltando.length > 0 && dados.porDia.length === 0 && sincronizando && (
          <LoadingSync />
        )}

        {/* Conteúdo principal */}
        {dados && config && dados.porDia.length > 0 && (
          <>
            {/* Botão de relatório (apenas gestor) */}
            {isGestor && (
              <div className="flex justify-end">
                <BotaoRelatorio contaId={dados.conta.id} inicio={inicio} fim={fim} />
              </div>
            )}

            {/* Métricas em destaque */}
            <section>
              <MetricasDestaque
                metricas={config.metricasDestaque}
                dados={dados.agregado}
                labelMetricaPrincipal={dados.conta.labelMetricaPrincipal}
                labelCustoPorResultado={dados.conta.labelCustoPorResultado}
              />
            </section>

            {/* Métricas secundárias */}
            <section>
              <MetricasSecundarias metricas={config.submetricas} dados={dados.agregado} />
            </section>

            {/* Gráfico */}
            <section>
              <GraficoMetricas
                porDia={dados.porDia}
                metricasDisponiveis={config.metricasGrafico}
              />
            </section>

            {/* Tabela de campanhas */}
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

        {/* Sem dados e não sincronizando */}
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
