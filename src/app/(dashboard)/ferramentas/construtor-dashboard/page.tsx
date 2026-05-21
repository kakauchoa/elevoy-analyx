"use client";

import { useEffect, useRef, useState } from "react";

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

type ContaSimples = {
  id: string;
  nomeCliente: string;
  slugCompartilhavel: string;
};

export default function ConstrutorDashboardPage() {
  const [contas, setContas] = useState<ContaSimples[]>([]);
  const [contaSelecionada, setContaSelecionada] = useState<string>("");
  const [layout, setLayout] = useState<Layout | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    buscarContas();
  }, []);

  useEffect(() => {
    if (contaSelecionada) buscarLayout(contaSelecionada);
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
        // Fallback para layout padrão se API falhar (ex: tabela ainda não migrada)
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
  }

  function onDragEnd() {
    dragIndex.current = null;
  }

  const contaNome = contas.find((c) => c.id === contaSelecionada)?.nomeCliente ?? "";
  const slugConta = contas.find((c) => c.id === contaSelecionada)?.slugCompartilhavel ?? "";

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5] flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Construtor de Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Personalize o layout do dashboard para cada cliente
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
                  Arraste os cards para reordenar as seções. Use o toggle para ativar ou desativar cada widget no dashboard do cliente.
                </p>

                <div className="flex flex-col gap-2.5">
                  {layout.widgets.map((widget, i) => {
                    const info = INFO_WIDGET[widget.tipo];
                    return (
                      <div
                        key={widget.tipo}
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

                        {/* Toggle */}
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
