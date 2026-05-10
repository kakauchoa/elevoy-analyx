"use client";

import { useEffect, useState } from "react";
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
  };
  hoje: InsightNumericos | null;
  ontem: InsightNumericos | null;
  ultimos7dias: InsightNumericos | null;
  ultimos30dias: InsightNumericos | null;
}

// ── Constants ──────────────────────────────────────────────────────────────

// Campo de custo por resultado para cada funil (menos = melhor)
const CUSTO_CAMPO: Record<TipoFunil, string> = {
  whatsapp: "whatsappCost",
  landing_page_lead: "costPerLead",
  landing_page_contato: "costPerContact",
  ecommerce: "costPerPurchase",
  conteudo: "costPerThruplay",
  ecommerce_conteudo: "costPerPurchase",
  outro: "custoPorResultado",
};

// Métricas onde menor valor = melhor resultado (seta para baixo = verde)
const MENOR_MELHOR = new Set([
  "cpm", "whatsappCost", "costPerLead", "costPerPurchase",
  "costPerContact", "costPerThruplay", "custoPorResultado",
]);

// Métricas onde maior valor = melhor resultado (seta para cima = verde)
const MAIOR_MELHOR = new Set([
  "ctr", "whatsappClicks", "leadCount", "purchaseCount",
  "contactCount", "videoThruplay", "resultadoPrincipal",
]);

const COR_FUNIL: Record<TipoFunil, string> = {
  whatsapp: "bg-green-100 text-green-700",
  landing_page_lead: "bg-blue-100 text-blue-700",
  landing_page_contato: "bg-cyan-100 text-cyan-700",
  ecommerce: "bg-purple-100 text-purple-700",
  conteudo: "bg-orange-100 text-orange-700",
  ecommerce_conteudo: "bg-violet-100 text-violet-700",
  outro: "bg-gray-100 text-gray-600",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function valorStr(dados: InsightNumericos | null, campo: string): string {
  if (!dados) return "—";
  const valor = dados[campo as keyof InsightNumericos] as number;
  if (valor === undefined) return "—";
  return formatarMetrica(campo, valor);
}

// ── Seta de tendência ──────────────────────────────────────────────────────

function Seta({
  campo,
  hoje,
  ontem,
}: {
  campo: string;
  hoje: InsightNumericos | null;
  ontem: InsightNumericos | null;
}) {
  if (!hoje || !ontem) return null;

  const a = hoje[campo as keyof InsightNumericos] as number;
  const b = ontem[campo as keyof InsightNumericos] as number;

  if (!b || b === 0 || a === undefined) return null;

  const delta = a - b;
  if (Math.abs(delta / b) < 0.005) return null; // diferença menor que 0,5% — ignora

  const subiu = delta > 0;
  const melhorou = MENOR_MELHOR.has(campo) ? !subiu : MAIOR_MELHOR.has(campo) ? subiu : null;

  if (melhorou === null) return null; // spend e outros neutros sem seta colorida

  return (
    <span className={`text-[11px] font-semibold ${melhorou ? "text-green-600" : "text-red-500"}`}>
      {subiu ? "↑" : "↓"}
    </span>
  );
}

// ── CardConta ──────────────────────────────────────────────────────────────

function CardConta({ conta }: { conta: ContaAnuncio }) {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("ultimos7dias");
  const [resumo, setResumo] = useState<ResumoResponse | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch(`/api/gestor/resumo?contaId=${conta.id}`)
      .then((r) => r.json())
      .then((data: ResumoResponse) => setResumo(data))
      .catch(() => setResumo(null))
      .finally(() => setCarregando(false));
  }, [conta.id]);

  const tipoFunil = conta.tipoFunil as TipoFunil;
  const config = CONFIGURACOES_FUNIL[tipoFunil];
  const custoCampo = CUSTO_CAMPO[tipoFunil];

  // 5 colunas fixas: Valor Gasto | Resultado | Custo/Resultado | CPM | CTR
  const campos = ["spend", config.metricaPrincipal, custoCampo, "cpm", "ctr"];

  const periodoLabel = periodo === "ultimos7dias" ? "Últ. 7 dias" : "Últ. 30 dias";
  const periodoDados = periodo === "ultimos7dias" ? resumo?.ultimos7dias : resumo?.ultimos30dias;

  const linhas: Array<{ label: string; dados: InsightNumericos | null; mostrarSeta: boolean }> = [
    { label: "Hoje",       dados: resumo?.hoje   ?? null, mostrarSeta: true  },
    { label: "Ontem",      dados: resumo?.ontem  ?? null, mostrarSeta: false },
    { label: periodoLabel, dados: periodoDados   ?? null, mostrarSeta: false },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Cabeçalho do card */}
      <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-base font-semibold text-gray-900 truncate">{conta.nomeCliente}</h2>
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${COR_FUNIL[tipoFunil]}`}>
            {LABELS_FUNIL[tipoFunil]}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as PeriodoFiltro)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ultimos7dias">Últimos 7 dias</option>
            <option value="ultimos30dias">Últimos 30 dias</option>
          </select>
          <Link
            href={`/compartilhavel/${conta.slugCompartilhavel}`}
            target="_blank"
            className="text-xs font-medium text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            Ver dashboard completo →
          </Link>
        </div>
      </div>

      {/* Tabela de métricas */}
      <div className="border-t border-gray-100 overflow-x-auto">
        {/* Cabeçalhos das colunas */}
        <div className="grid grid-cols-[72px_1fr_1fr_1fr_1fr_1fr] min-w-[580px] px-5 py-2 bg-gray-50 border-b border-gray-100">
          <div />
          {campos.map((campo) => (
            <div key={campo} className="text-[11px] font-semibold text-gray-500 text-right uppercase tracking-wide">
              {LABELS_METRICAS[campo] ?? campo}
            </div>
          ))}
        </div>

        {carregando ? (
          <div className="space-y-0">
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
          linhas.map(({ label, dados, mostrarSeta }) => (
            <div
              key={label}
              className="grid grid-cols-[72px_1fr_1fr_1fr_1fr_1fr] min-w-[580px] px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
            >
              <div className="text-xs font-semibold text-gray-400 flex items-center">{label}</div>
              {campos.map((campo) => (
                <div
                  key={campo}
                  className="text-sm text-gray-800 font-medium text-right flex items-center justify-end gap-1"
                >
                  {mostrarSeta && (
                    <Seta campo={campo} hoje={resumo?.hoje ?? null} ontem={resumo?.ontem ?? null} />
                  )}
                  <span>{valorStr(dados, campo)}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Rodapé com última sincronização */}
      {resumo?.conta.ultimaSincronizacao && (
        <div className="px-5 py-2 border-t border-gray-100 bg-gray-50/60">
          <p className="text-xs text-gray-400">
            Sincronizado em{" "}
            {new Date(resumo.conta.ultimaSincronizacao).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
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
      .then((data: ContaAnuncio[]) => setContas(data))
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
          className="text-sm font-medium text-blue-600 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition-colors"
        >
          + Adicionar conta
        </Link>
      </div>

      {/* Skeletons de carregamento */}
      {carregando && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-52 bg-white border border-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Estado vazio */}
      {!carregando && contas.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500">Nenhuma conta adicionada ainda.</p>
          <Link href="/contas" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Adicionar primeira conta →
          </Link>
        </div>
      )}

      {/* Cards das contas */}
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
