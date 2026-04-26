"use client";

import { useState } from "react";
import { CampanhaHierarquica, InsightNumericos } from "@/types/dashboard";
import { formatarMetrica } from "@/lib/metricas";

type NivelFiltro = "campanha" | "publico" | "anuncio";

const STATUS_COR: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
  DELETED: "bg-red-100 text-red-500",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  ARCHIVED: "Arquivado",
  DELETED: "Excluído",
};

function BadgeStatus({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COR[status] ?? "bg-gray-100 text-gray-500"}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function CelulaMetrica({
  campo,
  dados,
  label,
}: {
  campo: string;
  dados: InsightNumericos;
  label: string;
}) {
  const valor = (dados as unknown as Record<string, number>)[campo] ?? 0;
  return (
    <td className="px-3 py-2 text-right text-sm text-gray-700 whitespace-nowrap">
      {valor > 0 ? formatarMetrica(campo, valor) : "—"}
    </td>
  );
}

interface TabelaCampanhasProps {
  campanhas: CampanhaHierarquica[];
  metricaPrincipal: string;
  labelMetricaPrincipal: string;
  labelCustoPorResultado: string;
}

export function TabelaCampanhas({
  campanhas,
  metricaPrincipal,
  labelMetricaPrincipal,
  labelCustoPorResultado,
}: TabelaCampanhasProps) {
  const [nivelFiltro, setNivelFiltro] = useState<NivelFiltro>("campanha");
  const [textoBusca, setTextoBusca] = useState("");
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  function toggleExpandir(id: string) {
    setExpandidas((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const texto = textoBusca.toLowerCase();

  const campanhasFiltradas = campanhas.filter((c) => {
    if (!texto) return true;
    if (nivelFiltro === "campanha") return c.nome.toLowerCase().includes(texto);
    if (nivelFiltro === "publico")
      return c.conjuntos.some((cs) => cs.nome.toLowerCase().includes(texto));
    if (nivelFiltro === "anuncio")
      return c.conjuntos.some((cs) =>
        cs.anuncios.some((a) => a.nome.toLowerCase().includes(texto))
      );
    return true;
  });

  const custoCampo =
    metricaPrincipal === "whatsappClicks" ? "whatsappCost" :
    metricaPrincipal === "leadCount" ? "costPerLead" :
    metricaPrincipal === "purchaseCount" ? "costPerPurchase" :
    metricaPrincipal === "contactCount" ? "costPerContact" :
    metricaPrincipal === "videoThruplay" ? "costPerThruplay" :
    "custoPorResultado";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide shrink-0">
          Campanhas
        </h3>
        <div className="flex flex-wrap gap-2 text-sm">
          {(["campanha", "publico", "anuncio"] as NivelFiltro[]).map((nivel) => (
            <label key={nivel} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="nivelFiltro"
                checked={nivelFiltro === nivel}
                onChange={() => setNivelFiltro(nivel)}
                className="accent-blue-600"
              />
              <span className="text-gray-600 capitalize">
                {nivel === "publico" ? "Público" : nivel.charAt(0).toUpperCase() + nivel.slice(1)}
              </span>
            </label>
          ))}
        </div>
        <input
          type="text"
          placeholder={`Buscar por ${nivelFiltro === "publico" ? "público" : nivelFiltro}...`}
          value={textoBusca}
          onChange={(e) => setTextoBusca(e.target.value)}
          className="sm:ml-auto text-sm border border-gray-300 rounded-lg px-3 py-1.5 w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-2 text-left font-medium">Nome</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Gasto</th>
              <th className="px-3 py-2 text-right font-medium">{labelMetricaPrincipal}</th>
              <th className="px-3 py-2 text-right font-medium">{labelCustoPorResultado}</th>
              <th className="px-3 py-2 text-right font-medium">CPM</th>
              <th className="px-3 py-2 text-right font-medium">CTR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campanhasFiltradas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Nenhuma campanha encontrada.
                </td>
              </tr>
            )}
            {campanhasFiltradas.map((c) => {
              const expandida = expandidas.has(c.id);
              const conjuntosFiltrados = texto && nivelFiltro !== "campanha"
                ? c.conjuntos.filter((cs) =>
                    nivelFiltro === "publico"
                      ? cs.nome.toLowerCase().includes(texto)
                      : cs.anuncios.some((a) => a.nome.toLowerCase().includes(texto))
                  )
                : c.conjuntos;

              return [
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => toggleExpandir(c.id)}
                      className="flex items-center gap-2 text-left font-medium text-gray-800 hover:text-blue-600 transition-colors"
                    >
                      <span className="text-gray-400 w-4 shrink-0">
                        {expandida ? "▼" : "▶"}
                      </span>
                      <span className="truncate max-w-[200px] sm:max-w-xs">{c.nome}</span>
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <BadgeStatus status={c.status} />
                  </td>
                  <CelulaMetrica campo="spend" dados={c.metricas} label="Gasto" />
                  <CelulaMetrica campo={metricaPrincipal} dados={c.metricas} label={labelMetricaPrincipal} />
                  <CelulaMetrica campo={custoCampo} dados={c.metricas} label={labelCustoPorResultado} />
                  <CelulaMetrica campo="cpm" dados={c.metricas} label="CPM" />
                  <CelulaMetrica campo="ctr" dados={c.metricas} label="CTR" />
                </tr>,
                ...(expandida
                  ? conjuntosFiltrados.map((cs) => {
                      const expandidoCs = expandidas.has(cs.id);
                      const anunciosFiltrados = texto && nivelFiltro === "anuncio"
                        ? cs.anuncios.filter((a) => a.nome.toLowerCase().includes(texto))
                        : cs.anuncios;

                      return [
                        <tr key={cs.id} className="bg-blue-50/30 hover:bg-blue-50/60 transition-colors">
                          <td className="px-4 py-2 pl-10">
                            <button
                              onClick={() => toggleExpandir(cs.id)}
                              className="flex items-center gap-2 text-left text-gray-700 hover:text-blue-600 transition-colors"
                            >
                              <span className="text-gray-400 w-4 shrink-0">
                                {expandidoCs ? "▼" : "▶"}
                              </span>
                              <span className="truncate max-w-[180px] sm:max-w-xs">{cs.nome}</span>
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            <BadgeStatus status={cs.status} />
                          </td>
                          <CelulaMetrica campo="spend" dados={cs.metricas} label="Gasto" />
                          <CelulaMetrica campo={metricaPrincipal} dados={cs.metricas} label={labelMetricaPrincipal} />
                          <CelulaMetrica campo={custoCampo} dados={cs.metricas} label={labelCustoPorResultado} />
                          <CelulaMetrica campo="cpm" dados={cs.metricas} label="CPM" />
                          <CelulaMetrica campo="ctr" dados={cs.metricas} label="CTR" />
                        </tr>,
                        ...(expandidoCs
                          ? anunciosFiltrados.map((a) => (
                              <tr key={a.id} className="bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2 pl-16">
                                  <span className="flex items-center gap-2 text-gray-600">
                                    <span className="text-gray-300">•</span>
                                    <span className="truncate max-w-[160px] sm:max-w-xs">{a.nome}</span>
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <BadgeStatus status={a.status} />
                                </td>
                                <CelulaMetrica campo="spend" dados={a.metricas} label="Gasto" />
                                <CelulaMetrica campo={metricaPrincipal} dados={a.metricas} label={labelMetricaPrincipal} />
                                <CelulaMetrica campo={custoCampo} dados={a.metricas} label={labelCustoPorResultado} />
                                <CelulaMetrica campo="cpm" dados={a.metricas} label="CPM" />
                                <CelulaMetrica campo="ctr" dados={a.metricas} label="CTR" />
                              </tr>
                            ))
                          : []),
                      ];
                    })
                  : []),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
