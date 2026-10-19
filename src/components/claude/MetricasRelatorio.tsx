// Chips de métricas enviados pela rotina em relatorio.metricas.principais:
// [{ nome: "CPL", valor: "R$ 12,40", variacao: -8.5, melhorQuando: "menor" }]

interface MetricaChip {
  nome: string;
  valor: string;
  variacao: number | null;
  melhorQuando: "maior" | "menor";
}

export function lerMetricas(metricas: unknown): MetricaChip[] {
  if (!metricas || typeof metricas !== "object") return [];
  const principais = (metricas as { principais?: unknown }).principais;
  if (!Array.isArray(principais)) return [];

  const chips: MetricaChip[] = [];
  for (const item of principais.slice(0, 8)) {
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;
    if (typeof m.nome !== "string" || (typeof m.valor !== "string" && typeof m.valor !== "number")) continue;
    chips.push({
      nome: m.nome,
      valor: String(m.valor),
      variacao: typeof m.variacao === "number" && Number.isFinite(m.variacao) ? m.variacao : null,
      melhorQuando: m.melhorQuando === "menor" ? "menor" : "maior",
    });
  }
  return chips;
}

export function MetricasRelatorio({ metricas, compacto = false }: { metricas: unknown; compacto?: boolean }) {
  const chips = lerMetricas(metricas);
  if (!chips.length) return null;

  return (
    <div className={`grid gap-2 ${compacto ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
      {chips.map((c) => {
        const bom = c.variacao === null || c.variacao === 0
          ? null
          : c.melhorQuando === "maior" ? c.variacao > 0 : c.variacao < 0;
        const cor = bom === null ? "text-gray-400" : bom ? "text-green-600" : "text-red-600";
        const seta = c.variacao === null || c.variacao === 0 ? "" : c.variacao > 0 ? "▲" : "▼";
        return (
          <div key={c.nome} className="bg-gray-50 rounded-lg px-3 py-2 min-w-0">
            <p className="text-[11px] text-gray-500 truncate">{c.nome}</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{c.valor}</p>
            {c.variacao !== null && (
              <p className={`text-[11px] font-medium ${cor}`}>
                {seta} {Math.abs(c.variacao).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs 7d ant.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
