"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CONFIGURACOES_FUNIL,
  LABELS_FUNIL,
  LABELS_METRICAS,
  formatarMetrica,
  TipoFunil,
} from "@/lib/metricas";
import type { ContaAnuncio, InsightNumericos } from "@/types/dashboard";

// ── Types ──────────────────────────────────────────────────────────────────

type PeriodoFiltro = "ultimos7dias" | "ultimos30dias";

interface ResumoResponse {
  conta: {
    id: string;
    nomeCliente: string;
    slugCompartilhavel: string;
    tipoFunil: TipoFunil;
    labelMetricaPrincipal: string;
    labelCustoPorResultado: string;
    ultimaSincronizacao: string | null;
    tipoPagamento: "cartao" | "boleto";
    saldoAtual: string | null;
    saldoAtualizadoEm: string | null;
  };
  hoje: InsightNumericos | null;
  ontem: InsightNumericos | null;
  ultimos7dias: InsightNumericos | null;
  ultimos30dias: InsightNumericos | null;
}

// ── Constants ──────────────────────────────────────────────────────────────

const CUSTO_CAMPO: Record<TipoFunil, string> = {
  whatsapp: "whatsappCost",
  landing_page_lead: "costPerLead",
  landing_page_contato: "costPerContact",
  ecommerce: "costPerPurchase",
  conteudo: "costPerThruplay",
  ecommerce_conteudo: "costPerPurchase",
  outro: "custoPorResultado",
};

const MENOR_MELHOR = new Set([
  "cpm", "whatsappCost", "costPerLead", "costPerPurchase",
  "costPerContact", "costPerThruplay", "custoPorResultado",
]);

const MAIOR_MELHOR = new Set([
  "ctr", "whatsappClicks", "leadCount", "purchaseCount",
  "contactCount", "videoThruplay", "resultadoPrincipal",
]);

// ── Helpers ────────────────────────────────────────────────────────────────

function hojeStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function ontemStr(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function valorStr(dados: InsightNumericos | null, campo: string): string {
  if (!dados) return "—";
  const valor = dados[campo as keyof InsightNumericos] as number;
  if (valor === undefined) return "—";
  return formatarMetrica(campo, valor);
}

function Seta({ campo, hoje, ontem }: {
  campo: string;
  hoje: InsightNumericos | null;
  ontem: InsightNumericos | null;
}) {
  if (!hoje || !ontem) return null;
  const a = hoje[campo as keyof InsightNumericos] as number;
  const b = ontem[campo as keyof InsightNumericos] as number;
  if (!b || b === 0 || a === undefined) return null;
  const delta = a - b;
  if (Math.abs(delta / b) < 0.005) return null;
  const subiu = delta > 0;
  const melhorou = MENOR_MELHOR.has(campo) ? !subiu : MAIOR_MELHOR.has(campo) ? subiu : null;
  if (melhorou === null) return null;
  return (
    <span className={`text-[11px] font-semibold ${melhorou ? "text-green-600" : "text-red-500"}`}>
      {subiu ? "↑" : "↓"}
    </span>
  );
}

// ── Saldo badge ────────────────────────────────────────────────────────────

function BadgeSaldo({ saldo, atualizadoEm, tipoPagamento }: {
  saldo: string | null;
  atualizadoEm: string | null;
  tipoPagamento: "cartao" | "boleto";
}) {
  if (!saldo) return null;
  const valor = Number(saldo);

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-[#e5e5e5] rounded-lg">
      <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="text-right">
        <span className="text-xs font-semibold text-gray-800">
          {tipoPagamento === "boleto" ? "Saldo: " : "Conta: "}
          R$ {valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        {atualizadoEm && (
          <span className="text-[10px] text-gray-400 ml-1.5">
            {new Date(atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}

// ── CardConta ──────────────────────────────────────────────────────────────

function CardConta({ conta }: { conta: ContaAnuncio }) {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("ultimos7dias");
  const [resumo, setResumo] = useState<ResumoResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const jaSincronizou = useRef(false);

  const tipoFunil = conta.tipoFunil as TipoFunil;
  const config = CONFIGURACOES_FUNIL[tipoFunil];
  const custoCampo = CUSTO_CAMPO[tipoFunil];
  const campos = ["spend", config.metricaPrincipal, custoCampo, "cpm", "ctr"];

  const carregarResumo = useCallback(async () => {
    try {
      const res = await fetch(`/api/gestor/resumo?contaId=${conta.id}`);
      if (res.ok) {
        const data = (await res.json()) as ResumoResponse;
        setResumo(data);
        return data;
      }
    } catch {
      // ignora
    }
    return null;
  }, [conta.id]);

  // Valida e atualiza hoje + ontem + saldo contra a API do Meta
  const sincronizarTudo = useCallback(async () => {
    if (sincronizando) return;
    setSincronizando(true);
    try {
      // Sincroniza hoje e ontem em um único range + atualiza saldo em paralelo
      await Promise.all([
        fetch("/api/meta/sincronizar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contaAnuncioId: conta.id,
            dataInicio: ontemStr(),
            dataFim: hojeStr(),
          }),
        }),
        fetch(`/api/contas/${conta.id}/saldo`, { method: "POST" }),
      ]);
      await carregarResumo();
    } catch {
      // ignora
    } finally {
      setSincronizando(false);
    }
  }, [conta.id, carregarResumo, sincronizando]);

  useEffect(() => {
    setCarregando(true);
    carregarResumo().then((data) => {
      setCarregando(false);
      if (!data) return;

      // Para boleto: sempre atualiza saldo ao carregar (valor muda conforme gasto)
      if (conta.tipoPagamento === "boleto") {
        void fetch(`/api/contas/${conta.id}/saldo`, { method: "POST" })
          .then(() => carregarResumo());
      }

      // Valida dados de insights contra a API do Meta (uma vez por sessão)
      if (!jaSincronizou.current) {
        jaSincronizou.current = true;
        void sincronizarTudo();
      }
    }).catch(() => setCarregando(false));
  }, [conta.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const periodoLabel = periodo === "ultimos7dias" ? "Últ. 7 dias" : "Últ. 30 dias";
  const periodoDados = periodo === "ultimos7dias" ? resumo?.ultimos7dias : resumo?.ultimos30dias;

  const linhas: Array<{ label: string; dados: InsightNumericos | null; mostrarSeta: boolean; carregandoLinha?: boolean }> = [
    { label: "Hoje",       dados: resumo?.hoje ?? null,  mostrarSeta: true,  carregandoLinha: sincronizando },
    { label: "Ontem",      dados: resumo?.ontem ?? null, mostrarSeta: false, carregandoLinha: sincronizando },
    { label: periodoLabel, dados: periodoDados ?? null,  mostrarSeta: false },
  ];

  return (
    <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <h2 className="text-base font-semibold text-gray-900 truncate">{conta.nomeCliente}</h2>
          <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-black text-white">
            {LABELS_FUNIL[tipoFunil]}
          </span>
          <BadgeSaldo
            saldo={resumo?.conta.saldoAtual ?? conta.saldoAtual}
            atualizadoEm={resumo?.conta.saldoAtualizadoEm ?? conta.saldoAtualizadoEm}
            tipoPagamento={conta.tipoPagamento}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Botão atualizar dados */}
          <button
            onClick={() => void sincronizarTudo()}
            disabled={sincronizando || carregando}
            title="Validar dados contra o Meta Ads"
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
          >
            <svg
              className={`w-4 h-4 ${sincronizando ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as PeriodoFiltro)}
            className="text-xs border border-[#e5e5e5] rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ultimos7dias">Últimos 7 dias</option>
            <option value="ultimos30dias">Últimos 30 dias</option>
          </select>
          <Link
            href={`/compartilhavel/${conta.slugCompartilhavel}`}
            target="_blank"
            className="text-xs font-medium text-gray-700 border border-[#e5e5e5] rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            Dashboard completo →
          </Link>
        </div>
      </div>

      {/* Tabela de métricas */}
      <div className="border-t border-gray-100 overflow-x-auto">
        <div className="grid grid-cols-[72px_1fr_1fr_1fr_1fr_1fr] min-w-[580px] px-5 py-2 bg-gray-50 border-b border-gray-100">
          <div />
          {campos.map((campo) => (
            <div key={campo} className="text-[11px] font-semibold text-gray-500 text-right uppercase tracking-wide">
              {LABELS_METRICAS[campo] ?? campo}
            </div>
          ))}
        </div>

        {carregando ? (
          <div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid grid-cols-[72px_1fr_1fr_1fr_1fr_1fr] min-w-[580px] px-5 py-3 border-b border-gray-50 last:border-0">
                <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
                {campos.map((c) => (
                  <div key={c} className="flex justify-end">
                    <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          linhas.map(({ label, dados, mostrarSeta, carregandoLinha }) => (
            <div
              key={label}
              className="grid grid-cols-[72px_1fr_1fr_1fr_1fr_1fr] min-w-[580px] px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
            >
              <div className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                {label}
                {carregandoLinha && (
                  <svg className="w-3 h-3 animate-spin text-gray-300" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
              </div>
              {campos.map((campo) => (
                <div
                  key={campo}
                  className="text-sm text-gray-800 font-medium text-right flex items-center justify-end gap-1"
                >
                  {mostrarSeta && (
                    <Seta campo={campo} hoje={resumo?.hoje ?? null} ontem={resumo?.ontem ?? null} />
                  )}
                  <span className={carregandoLinha ? "text-gray-300" : ""}>
                    {valorStr(dados, campo)}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Rodapé */}
      {(resumo?.conta.ultimaSincronizacao || sincronizando) && (
        <div className="px-5 py-2 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {sincronizando
              ? "Validando dados com o Meta Ads..."
              : resumo?.conta.ultimaSincronizacao
              ? `Atualizado em ${new Date(resumo.conta.ultimaSincronizacao).toLocaleString("pt-BR", {
                  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                })}`
              : ""}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────

export default function DashboardPage() {
  const [contas, setContas] = useState<ContaAnuncio[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/contas")
      .then((r) => r.json())
      .then((data: ContaAnuncio[]) => setContas(Array.isArray(data) ? data : []))
      .catch(() => setContas([]))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral das suas contas de anúncio</p>
        </div>
        <Link
          href="/contas"
          className="text-sm font-medium text-white bg-black rounded-lg px-3 py-2 hover:bg-gray-900 transition-colors"
        >
          + Adicionar conta
        </Link>
      </div>

      {carregando && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-52 bg-white border border-[#e5e5e5] rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!carregando && contas.length === 0 && (
        <div className="bg-white border border-[#e5e5e5] rounded-xl p-12 text-center">
          <p className="text-gray-500">Nenhuma conta adicionada ainda.</p>
          <Link href="/contas" className="mt-3 inline-block text-sm text-gray-900 hover:underline">
            Adicionar primeira conta →
          </Link>
        </div>
      )}

      {!carregando && contas.length > 0 && (
        <div className="space-y-5">
          {contas.map((conta) => (
            <CardConta key={conta.id} conta={conta} />
          ))}
        </div>
      )}
    </div>
  );
}
