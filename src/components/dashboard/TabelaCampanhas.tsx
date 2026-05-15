"use client";

import { useEffect, useState } from "react";
import { CampanhaHierarquica, ConjuntoHierarquico, AnuncioHierarquico, InsightNumericos } from "@/types/dashboard";
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

function statusOrdem(status: string): number {
  if (status === "ACTIVE") return 0;
  if (status === "PAUSED") return 1;
  return 2;
}

function BadgeStatus({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COR[status] ?? "bg-gray-100 text-gray-500"}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function CelulaMetrica({ campo, dados }: { campo: string; dados: InsightNumericos }) {
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

const MAPA_CUSTO: Record<string, string> = {
  whatsappClicks: "whatsappCost",
  leadCount: "costPerLead",
  purchaseCount: "costPerPurchase",
  contactCount: "costPerContact",
  videoThruplay: "costPerThruplay",
};

export function TabelaCampanhas({
  campanhas,
  metricaPrincipal,
  labelMetricaPrincipal,
  labelCustoPorResultado,
}: TabelaCampanhasProps) {
  const [nivelFiltro, setNivelFiltro] = useState<NivelFiltro>("campanha");
  const [textoBusca, setTextoBusca] = useState("");
  const [mostrarPausados, setMostrarPausados] = useState(false);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  const custoCampo = MAPA_CUSTO[metricaPrincipal] ?? "custoPorResultado";

  // Auto-expansão ao mudar o nível do filtro:
  // "campanha" → colapsa tudo | "publico" → expande campanhas | "anuncio" → expande tudo
  useEffect(() => {
    if (nivelFiltro === "campanha") {
      setExpandidas(new Set());
      return;
    }
    const ids = new Set<string>();
    for (const c of campanhas) {
      ids.add(c.id); // expande campanha para mostrar conjuntos
      if (nivelFiltro === "anuncio") {
        for (const cs of c.conjuntos) {
          ids.add(cs.id); // expande conjunto para mostrar anúncios
        }
      }
    }
    setExpandidas(ids);
  }, [nivelFiltro, campanhas]);

  // Status permitidos: sempre ACTIVE; adiciona PAUSED se toggle ativo
  const statusPermitidos = mostrarPausados
    ? new Set(["ACTIVE", "PAUSED"])
    : new Set(["ACTIVE"]);

  function toggleExpandir(id: string) {
    setExpandidas((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const texto = textoBusca.toLowerCase();

  // Filtra e ordena conjuntos dentro de uma campanha
  function filtrarConjuntos(conjuntos: ConjuntoHierarquico[]): ConjuntoHierarquico[] {
    return conjuntos
      .filter((cs) => {
        if (!statusPermitidos.has(cs.status)) return false;
        if (!texto || nivelFiltro !== "publico") return true;
        return cs.nome.toLowerCase().includes(texto);
      })
      .sort((a, b) => statusOrdem(a.status) - statusOrdem(b.status));
  }

  // Filtra e ordena anúncios dentro de um conjunto
  function filtrarAnuncios(anuncios: AnuncioHierarquico[]): AnuncioHierarquico[] {
    return anuncios
      .filter((a) => {
        if (!statusPermitidos.has(a.status)) return false;
        if (!texto || nivelFiltro !== "anuncio") return true;
        return a.nome.toLowerCase().includes(texto);
      })
      .sort((a, b) => statusOrdem(a.status) - statusOrdem(b.status));
  }

  // Filtra campanhas aplicando status + busca por nível
  const campanhasFiltradas = campanhas
    .filter((c) => {
      if (!statusPermitidos.has(c.status)) return false;
      if (!texto) return true;
      if (nivelFiltro === "campanha") return c.nome.toLowerCase().includes(texto);
      if (nivelFiltro === "publico")
        return c.conjuntos.some(
          (cs) => statusPermitidos.has(cs.status) && cs.nome.toLowerCase().includes(texto)
        );
      if (nivelFiltro === "anuncio")
        return c.conjuntos.some((cs) =>
          cs.anuncios.some(
            (a) => statusPermitidos.has(a.status) && a.nome.toLowerCase().includes(texto)
          )
        );
      return true;
    })
    .sort((a, b) => statusOrdem(a.status) - statusOrdem(b.status));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Cabeçalho com filtros */}
      <div className="px-4 py-3 border-b border-gray-100 space-y-2">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide shrink-0">
            Campanhas
          </h3>

          {/* Filtro por nível */}
          <div className="flex flex-wrap gap-3 text-sm">
            {(["campanha", "publico", "anuncio"] as NivelFiltro[]).map((nivel) => (
              <label key={nivel} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="nivelFiltro"
                  checked={nivelFiltro === nivel}
                  onChange={() => setNivelFiltro(nivel)}
                  className="accent-blue-600"
                />
                <span className="text-gray-600">
                  {nivel === "publico" ? "Público" : nivel.charAt(0).toUpperCase() + nivel.slice(1)}
                </span>
              </label>
            ))}
          </div>

          {/* Campo de busca */}
          <input
            type="text"
            placeholder={`Buscar por ${nivelFiltro === "publico" ? "público" : nivelFiltro}...`}
            value={textoBusca}
            onChange={(e) => setTextoBusca(e.target.value)}
            className="sm:ml-auto text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filtro de status */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setMostrarPausados((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                mostrarPausados ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${
                  mostrarPausados ? "translate-x-4" : "translate-x-1"
                }`}
              />
            </div>
            <span className="text-sm text-gray-600">Mostrar pausados</span>
          </label>
          <span className="text-xs text-gray-400">
            ({campanhasFiltradas.length} campanha{campanhasFiltradas.length !== 1 ? "s" : ""})
          </span>
        </div>
      </div>

      {/* Tabela */}
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
                  {mostrarPausados
                    ? "Nenhuma campanha encontrada."
                    : "Nenhuma campanha ativa. Ative o toggle 'Mostrar pausados' para ver todas."}
                </td>
              </tr>
            )}

            {campanhasFiltradas.map((c) => {
              const expandida = expandidas.has(c.id);
              const conjuntosFiltrados = filtrarConjuntos(c.conjuntos);

              return [
                // Linha da campanha
                <tr
                  key={c.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    c.status !== "ACTIVE" ? "opacity-70" : ""
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => toggleExpandir(c.id)}
                      className="flex items-center gap-2 text-left font-medium text-gray-800 hover:text-blue-600 transition-colors"
                    >
                      <span className="text-gray-400 w-4 shrink-0 text-xs">
                        {expandida ? "▼" : "▶"}
                      </span>
                      <span className="truncate max-w-[200px] sm:max-w-xs">{c.nome}</span>
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <BadgeStatus status={c.status} />
                  </td>
                  <CelulaMetrica campo="spend" dados={c.metricas} />
                  <CelulaMetrica campo={metricaPrincipal} dados={c.metricas} />
                  <CelulaMetrica campo={custoCampo} dados={c.metricas} />
                  <CelulaMetrica campo="cpm" dados={c.metricas} />
                  <CelulaMetrica campo="ctr" dados={c.metricas} />
                </tr>,

                // Linhas dos conjuntos (se campanha expandida)
                ...(expandida
                  ? conjuntosFiltrados.map((cs) => {
                      const expandidoCs = expandidas.has(cs.id);
                      const anunciosFiltrados = filtrarAnuncios(cs.anuncios);

                      return [
                        <tr
                          key={cs.id}
                          className={`bg-blue-50/30 hover:bg-blue-50/60 transition-colors ${
                            cs.status !== "ACTIVE" ? "opacity-70" : ""
                          }`}
                        >
                          <td className="px-4 py-2 pl-10">
                            <button
                              onClick={() => toggleExpandir(cs.id)}
                              className="flex items-center gap-2 text-left text-gray-700 hover:text-blue-600 transition-colors"
                            >
                              <span className="text-gray-400 w-4 shrink-0 text-xs">
                                {expandidoCs ? "▼" : "▶"}
                              </span>
                              <span className="truncate max-w-[180px] sm:max-w-xs">{cs.nome}</span>
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            <BadgeStatus status={cs.status} />
                          </td>
                          <CelulaMetrica campo="spend" dados={cs.metricas} />
                          <CelulaMetrica campo={metricaPrincipal} dados={cs.metricas} />
                          <CelulaMetrica campo={custoCampo} dados={cs.metricas} />
                          <CelulaMetrica campo="cpm" dados={cs.metricas} />
                          <CelulaMetrica campo="ctr" dados={cs.metricas} />
                        </tr>,

                        // Linhas dos anúncios (se conjunto expandido)
                        ...(expandidoCs
                          ? anunciosFiltrados.map((a) => (
                              <tr
                                key={a.id}
                                className={`bg-gray-50/50 hover:bg-gray-50 transition-colors ${
                                  a.status !== "ACTIVE" ? "opacity-70" : ""
                                }`}
                              >
                                <td className="px-4 py-2 pl-16">
                                  <span className="flex items-center gap-2 text-gray-600">
                                    <span className="text-gray-300 shrink-0">•</span>
                                    <span className="truncate max-w-[160px] sm:max-w-xs">{a.nome}</span>
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <BadgeStatus status={a.status} />
                                </td>
                                <CelulaMetrica campo="spend" dados={a.metricas} />
                                <CelulaMetrica campo={metricaPrincipal} dados={a.metricas} />
                                <CelulaMetrica campo={custoCampo} dados={a.metricas} />
                                <CelulaMetrica campo="cpm" dados={a.metricas} />
                                <CelulaMetrica campo="ctr" dados={a.metricas} />
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
