"use client";

import { useEffect, useRef, useState } from "react";
import { CONFIGURACOES_FUNIL, LABELS_METRICAS, type TipoFunil } from "@/lib/metricas";

type WidgetTipo =
  | "metricas_destaque"
  | "metricas_secundarias"
  | "grafico"
  | "tabela_campanhas"
  | "funil_leads";

interface Widget {
  tipo: WidgetTipo;
  ativo: boolean;
  config?: Record<string, unknown>;
}

interface Layout {
  widgets: Widget[];
}

const INFO_WIDGET: Record<WidgetTipo, { titulo: string; descricao: string; icone: string }> = {
  metricas_destaque: {
    titulo: "Métricas em destaque",
    descricao: "Cards com os KPIs principais do funil (gasto, resultado, custo/resultado, CPM, CTR)",
    icone: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  metricas_secundarias: {
    titulo: "Métricas secundárias",
    descricao: "Linha de métricas de suporte: impressões, alcance, cliques, frequência",
    icone: "M4 6h16M4 10h16M4 14h16M4 18h16",
  },
  grafico: {
    titulo: "Gráfico de evolução",
    descricao: "Gráfico de linha dia a dia com seleção de métricas customizável",
    icone: "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z",
  },
  tabela_campanhas: {
    titulo: "Tabela de campanhas",
    descricao: "Hierarquia expansível: campanhas → públicos → anúncios com métricas inline",
    icone: "M3 10h18M3 14h18M10 4v16M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z",
  },
  funil_leads: {
    titulo: "Funil de leads",
    descricao: "Visualização do funil de conversão: impressões → cliques → leads → vendas",
    icone: "M4 4h16M6 8h12M8 12h8M10 16h4M11 20h2",
  },
};

// Retorna as métricas configuráveis por tipo de widget e funil
function metricasDoWidget(tipo: WidgetTipo, funil: TipoFunil): string[] {
  const cfg = CONFIGURACOES_FUNIL[funil];
  if (tipo === "metricas_destaque") return cfg.metricasDestaque;
  if (tipo === "metricas_secundarias") return cfg.submetricas;
  if (tipo === "grafico") return cfg.metricasGrafico;
  return [];
}

type ContaSimples = {
  id: string;
  nomeCliente: string;
  slugCompartilhavel: string;
  tipoFunil: TipoFunil;
};

// ── Painel de configuração de métricas do widget ──────────────────────────────

function ConfigPanel({
  widget,
  tipoFunil,
  onChange,
}: {
  widget: Widget;
  tipoFunil: TipoFunil;
  onChange: (novaConfig: Record<string, unknown>) => void;
}) {
  const todasMetricas = metricasDoWidget(widget.tipo, tipoFunil);

  if (todasMetricas.length === 0) {
    return (
      <div className="mt-2 mb-1 ml-12 mr-4 bg-gray-50 border border-[#e5e5e5] rounded-xl px-4 py-3">
        <p className="text-xs text-gray-400">Este widget não tem métricas configuráveis.</p>
      </div>
    );
  }

  const selecionadas: string[] =
    Array.isArray(widget.config?.metricas)
      ? (widget.config.metricas as string[])
      : todasMetricas;

  function toggle(chave: string) {
    const atual = new Set(selecionadas);
    atual.has(chave) ? atual.delete(chave) : atual.add(chave);
    // Mantém a ordem original do funil
    const novas = todasMetricas.filter((m) => atual.has(m));
    onChange({ ...widget.config, metricas: novas });
  }

  function resetar() {
    onChange({ ...widget.config, metricas: todasMetricas });
  }

  const tudoAtivo = selecionadas.length === todasMetricas.length;

  return (
    <div className="mt-2 mb-1 ml-12 mr-4 bg-gray-50 border border-[#e5e5e5] rounded-xl px-4 py-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
          Métricas visíveis
        </p>
        {!tudoAtivo && (
          <button
            onClick={resetar}
            className="text-[10px] text-blue-600 hover:underline"
          >
            Restaurar padrão
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {todasMetricas.map((chave) => {
          const ativa = selecionadas.includes(chave);
          return (
            <button
              key={chave}
              onClick={() => toggle(chave)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                ativa
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-500 border-[#e5e5e5] hover:border-gray-400"
              }`}
            >
              {LABELS_METRICAS[chave] ?? chave}
            </button>
          );
        })}
      </div>
      {selecionadas.length === 0 && (
        <p className="text-[11px] text-amber-600">Selecione pelo menos uma métrica.</p>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ConstrutorDashboardPage() {
  const [contas, setContas] = useState<ContaSimples[]>([]);
  const [contaSelecionada, setContaSelecionada] = useState<string>("");
  const [layout, setLayout] = useState<Layout | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [configAberta, setConfigAberta] = useState<number | null>(null);

  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    buscarContas();
  }, []);

  useEffect(() => {
    if (contaSelecionada) {
      setConfigAberta(null);
      buscarLayout(contaSelecionada);
    }
  }, [contaSelecionada]);

  async function buscarContas() {
    const res = await fetch("/api/contas");
    if (res.ok) {
      const dados = (await res.json()) as ContaSimples[];
      setContas(dados);
      if (dados.length > 0) setContaSelecionada(dados[0].id);
    }
  }

  const LAYOUT_PADRAO: Layout = {
    widgets: [
      { tipo: "metricas_destaque", ativo: true },
      { tipo: "metricas_secundarias", ativo: true },
      { tipo: "grafico", ativo: true },
      { tipo: "tabela_campanhas", ativo: true },
      { tipo: "funil_leads", ativo: false },
    ],
  };

  async function buscarLayout(contaId: string) {
    setCarregando(true);
    try {
      const res = await fetch(`/api/dashboard-config/${contaId}`);
      if (res.ok) {
        setLayout((await res.json()) as Layout);
      } else {
        setLayout(LAYOUT_PADRAO);
      }
    } catch {
      setLayout(LAYOUT_PADRAO);
    } finally {
      setCarregando(false);
    }
  }

  async function salvarLayout() {
    if (!contaSelecionada || !layout) return;
    setSalvando(true);
    setMensagem(null);
    try {
      const res = await fetch(`/api/dashboard-config/${contaSelecionada}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layout),
      });
      setMensagem(res.ok ? { tipo: "ok", texto: "Layout salvo!" } : { tipo: "erro", texto: "Erro ao salvar." });
    } finally {
      setSalvando(false);
      setTimeout(() => setMensagem(null), 3000);
    }
  }

  function toggleWidget(index: number) {
    if (!layout) return;
    const widgets = [...layout.widgets];
    widgets[index] = { ...widgets[index], ativo: !widgets[index].ativo };
    setLayout({ ...layout, widgets });
  }

  function atualizarConfig(index: number, novaConfig: Record<string, unknown>) {
    if (!layout) return;
    const widgets = [...layout.widgets];
    widgets[index] = { ...widgets[index], config: novaConfig };
    setLayout({ ...layout, widgets });
  }

  function onDragStart(index: number) {
    dragIndex.current = index;
  }

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === index) return;
    const widgets = [...(layout?.widgets ?? [])];
    const [item] = widgets.splice(dragIndex.current, 1);
    widgets.splice(index, 0, item);
    dragIndex.current = index;
    setLayout({ widgets });
    if (configAberta !== null) {
      if (configAberta === dragIndex.current) setConfigAberta(index);
      else setConfigAberta(null);
    }
  }

  function onDragEnd() {
    dragIndex.current = null;
  }

  const contaSelecionadaObj = contas.find((c) => c.id === contaSelecionada);
  const contaNome = contaSelecionadaObj?.nomeCliente ?? "";
  const slugConta = contaSelecionadaObj?.slugCompartilhavel ?? "";
  const tipoFunil: TipoFunil = contaSelecionadaObj?.tipoFunil ?? "outro";

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5] flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Construtor de Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Personalize o layout e as métricas do dashboard para cada cliente
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {mensagem && (
            <span
              className={`text-sm font-medium ${
                mensagem.tipo === "ok" ? "text-green-600" : "text-red-600"
              }`}
            >
              {mensagem.texto}
            </span>
          )}
          {slugConta && (
            <a
              href={`/compartilhavel/${slugConta}`}
              target="_blank"
              className="text-sm text-gray-600 border border-[#e5e5e5] rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              Visualizar
            </a>
          )}
          <button
            onClick={salvarLayout}
            disabled={salvando || !layout}
            className="bg-black hover:bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar layout"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {contas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <p className="text-gray-500 text-sm">Nenhuma conta cadastrada ainda.</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto flex flex-col gap-6">
            {/* Seletor de conta */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Cliente</label>
              <select
                value={contaSelecionada}
                onChange={(e) => setContaSelecionada(e.target.value)}
                className="border border-[#e5e5e5] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black transition-shadow"
              >
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nomeCliente}
                  </option>
                ))}
              </select>
            </div>

            {carregando ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
              </div>
            ) : layout ? (
              <>
                <p className="text-xs text-gray-500 bg-gray-50 border border-[#e5e5e5] rounded-xl px-4 py-3">
                  Arraste os cards para reordenar. Clique em{" "}
                  <span className="font-mono text-gray-700">⚙</span> para editar as métricas visíveis em cada seção.
                </p>

                <div className="flex flex-col gap-1">
                  {layout.widgets.map((widget, i) => {
                    const info = INFO_WIDGET[widget.tipo];
                    const configEstabelerta = configAberta === i;
                    const temConfig = metricasDoWidget(widget.tipo, tipoFunil).length > 0;

                    return (
                      <div key={widget.tipo}>
                        <div
                          draggable
                          onDragStart={() => onDragStart(i)}
                          onDragOver={(e) => onDragOver(e, i)}
                          onDragEnd={onDragEnd}
                          className={`group border rounded-xl px-4 py-3.5 flex items-center gap-4 cursor-grab active:cursor-grabbing transition-all select-none ${
                            widget.ativo
                              ? "border-[#e5e5e5] bg-white shadow-sm"
                              : "border-dashed border-gray-200 bg-gray-50/50 opacity-55"
                          }`}
                        >
                          {/* Drag handle */}
                          <div className="text-gray-300 group-hover:text-gray-400 transition-colors shrink-0">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="9" cy="5" r="1.5" />
                              <circle cx="15" cy="5" r="1.5" />
                              <circle cx="9" cy="12" r="1.5" />
                              <circle cx="15" cy="12" r="1.5" />
                              <circle cx="9" cy="19" r="1.5" />
                              <circle cx="15" cy="19" r="1.5" />
                            </svg>
                          </div>

                          {/* Ícone */}
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={info.icone} />
                            </svg>
                          </div>

                          {/* Texto */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{info.titulo}</p>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{info.descricao}</p>
                          </div>

                          {/* Ordem */}
                          <span className="text-xs text-gray-300 tabular-nums shrink-0 w-5 text-right">
                            {i + 1}
                          </span>

                          {/* Botão de configuração de métricas */}
                          {temConfig && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfigAberta(configEstabelerta ? null : i);
                              }}
                              className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                                configEstabelerta
                                  ? "bg-black text-white"
                                  : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                              }`}
                              title="Editar métricas visíveis"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                          )}

                          {/* Toggle ativo/inativo */}
                          <button
                            type="button"
                            onClick={() => toggleWidget(i)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              widget.ativo ? "bg-black" : "bg-gray-200"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                widget.ativo ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Painel de configuração inline */}
                        {configEstabelerta && (
                          <ConfigPanel
                            widget={widget}
                            tipoFunil={tipoFunil}
                            onChange={(novaConfig) => atualizarConfig(i, novaConfig)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Resumo ativo */}
                <div className="border border-[#e5e5e5] rounded-xl px-5 py-4 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Seções visíveis — {contaNome}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {layout.widgets
                      .filter((w) => w.ativo)
                      .map((w, i) => (
                        <span
                          key={w.tipo}
                          className="text-xs bg-white border border-[#e5e5e5] rounded-full px-3 py-1 text-gray-700"
                        >
                          {i + 1}. {INFO_WIDGET[w.tipo].titulo}
                        </span>
                      ))}
                    {layout.widgets.filter((w) => w.ativo).length === 0 && (
                      <span className="text-xs text-gray-400">Nenhum widget ativo</span>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
