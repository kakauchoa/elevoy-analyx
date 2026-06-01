"use client";

import { useState } from "react";
import {
  TokenFormula,
  FormatoMetrica,
  MetricaPersonalizadaClient,
  avaliarFormula,
  formatarFormulaTexto,
} from "@/lib/formula";
import { LABELS_METRICAS, METRICAS_POR_CATEGORIA } from "@/lib/metricas";

interface Props {
  contaAnuncioId: string;
  exemploDia: Record<string, number>;
  onCriada: (metrica: MetricaPersonalizadaClient) => void;
  onFechar: () => void;
}

const OPERADORES = ["+", "-", "*", "/"] as const;

const FORMATO_OPCOES: { valor: FormatoMetrica; label: string }[] = [
  { valor: "numero", label: "Número" },
  { valor: "moeda", label: "Moeda (R$)" },
  { valor: "percentual", label: "Porcentagem (%)" },
];

export function ModalMetricaPersonalizada({
  contaAnuncioId,
  exemploDia,
  onCriada,
  onFechar,
}: Props) {
  const [nome, setNome] = useState("");
  const [formato, setFormato] = useState<FormatoMetrica>("numero");
  const [tokens, setTokens] = useState<TokenFormula[]>([]);
  const [numeroInput, setNumeroInput] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(
    Object.keys(METRICAS_POR_CATEGORIA)[0]
  );

  const ultimoTipo = tokens.length > 0 ? tokens[tokens.length - 1].tipo : null;
  // Operadores só após métrica ou número; métricas/números só após operador ou no início
  const esperandoOperando = ultimoTipo === null || ultimoTipo === "operador";
  const esperandoOperador = ultimoTipo === "metrica" || ultimoTipo === "numero";

  function adicionarMetrica(campo: string) {
    if (!esperandoOperando) return;
    setTokens((p) => [...p, { tipo: "metrica", campo }]);
  }

  function adicionarOperador(op: "+" | "-" | "*" | "/") {
    if (!esperandoOperador) return;
    setTokens((p) => [...p, { tipo: "operador", op }]);
  }

  function adicionarNumero() {
    if (!esperandoOperando) return;
    const v = parseFloat(numeroInput.replace(",", "."));
    if (isNaN(v)) return;
    setTokens((p) => [...p, { tipo: "numero", valor: v }]);
    setNumeroInput("");
  }

  function removerUltimo() {
    setTokens((p) => p.slice(0, -1));
  }

  function limpar() {
    setTokens([]);
  }

  const formulaTexto = formatarFormulaTexto(tokens, LABELS_METRICAS);
  const previewValor = tokens.length > 0 ? avaliarFormula(tokens, exemploDia) : null;

  function formatarPreview(valor: number): string {
    if (formato === "moeda") {
      return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    if (formato === "percentual") {
      return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    }
    return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }

  async function salvar() {
    setErro(null);
    if (!nome.trim()) { setErro("Dê um nome para a métrica."); return; }
    if (tokens.length === 0) { setErro("Crie a fórmula."); return; }
    if (esperandoOperando) { setErro("Fórmula incompleta — falta um valor no final."); return; }

    setSalvando(true);
    try {
      const res = await fetch("/api/metricas-personalizadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contaAnuncioId, nome: nome.trim(), formula: tokens, formato }),
      });
      if (!res.ok) {
        const j = await res.json();
        setErro(j.erro ?? "Erro ao salvar.");
        return;
      }
      const criada: MetricaPersonalizadaClient = await res.json();
      onCriada(criada);
      onFechar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Nova métrica personalizada</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Nome e formato */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome da métrica</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Taxa de clique no link"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Formato</label>
              <select
                value={formato}
                onChange={(e) => setFormato(e.target.value as FormatoMetrica)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
              >
                {FORMATO_OPCOES.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview da fórmula */}
          <div className="bg-gray-50 rounded-xl p-3 min-h-[52px] flex items-center justify-between gap-3">
            <div className="flex-1">
              {tokens.length === 0 ? (
                <span className="text-sm text-gray-400">Selecione métricas e operadores abaixo...</span>
              ) : (
                <div className="flex flex-wrap gap-1.5 items-center">
                  {tokens.map((t, i) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.tipo === "operador"
                          ? "bg-gray-200 text-gray-600 font-bold"
                          : t.tipo === "numero"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-black text-white"
                      }`}
                    >
                      {t.tipo === "metrica"
                        ? (LABELS_METRICAS[t.campo] ?? t.campo)
                        : t.tipo === "numero"
                        ? t.valor
                        : t.op}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {previewValor !== null && (
              <span className="shrink-0 text-sm font-semibold text-gray-700">
                = {formatarPreview(previewValor)}
              </span>
            )}
          </div>

          {/* Operadores */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium w-20 shrink-0">Operadores</span>
            <div className="flex gap-2">
              {OPERADORES.map((op) => (
                <button
                  key={op}
                  onClick={() => adicionarOperador(op)}
                  disabled={!esperandoOperador}
                  className="w-9 h-9 rounded-lg border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {op}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <input
                value={numeroInput}
                onChange={(e) => setNumeroInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") adicionarNumero(); }}
                placeholder="100"
                disabled={!esperandoOperando}
                className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-40"
              />
              <button
                onClick={adicionarNumero}
                disabled={!esperandoOperando || !numeroInput}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                + Número
              </button>
            </div>
          </div>

          {/* Seletor de métricas por categoria */}
          <div>
            <div className="flex gap-2 mb-2 flex-wrap">
              {Object.keys(METRICAS_POR_CATEGORIA).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoriaSelecionada(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    categoriaSelecionada === cat
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {METRICAS_POR_CATEGORIA[categoriaSelecionada].map((campo) => (
                <button
                  key={campo}
                  onClick={() => adicionarMetrica(campo)}
                  disabled={!esperandoOperando}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs text-gray-700 hover:bg-black hover:text-white hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {LABELS_METRICAS[campo] ?? campo}
                </button>
              ))}
            </div>
          </div>

          {/* Ações da fórmula */}
          <div className="flex gap-2">
            <button
              onClick={removerUltimo}
              disabled={tokens.length === 0}
              className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30"
            >
              Desfazer último
            </button>
            <button
              onClick={limpar}
              disabled={tokens.length === 0}
              className="text-xs text-red-400 hover:text-red-600 disabled:opacity-30"
            >
              Limpar tudo
            </button>
          </div>

          {erro && <p className="text-xs text-red-500">{erro}</p>}
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onFechar}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
          >
            {salvando ? "Salvando..." : "Salvar métrica"}
          </button>
        </div>
      </div>
    </div>
  );
}
