"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Avaliacao = "otimo" | "bom" | "regular" | "ruim" | "pessimo";

interface MapaAvaliacao {
  desempenhoCampanhas: Avaliacao | null;
  relacionamento: Avaliacao | null;
  preenchidoGestorEm: string | null;
  preenchidoClienteEm: string | null;
}

interface MapaEvolucaoConfig {
  metaFaturamentoMensal: string | null;
  faturamentoInicio: string | null;
  vendasInicio: number | null;
}

interface MapaEvolucaoRegistro {
  dataRegistro: string;
  faturamento: string | null;
  vendas: number | null;
}

interface Cliente {
  id: string;
  nome: string;
  contas: { id: string; nomeCliente: string; tipoFunil: string; slugCompartilhavel: string }[];
  mapaAvaliacao: MapaAvaliacao | null;
  mapaEvolucaoConfig: MapaEvolucaoConfig | null;
  mapaEvolucaoRegistros: MapaEvolucaoRegistro[];
}

const OPCOES_AVALIACAO: { valor: Avaliacao; label: string; cor: string; bg: string }[] = [
  { valor: "otimo", label: "Ótimo", cor: "text-green-700", bg: "bg-green-50 border-green-200" },
  { valor: "bom", label: "Bom", cor: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  { valor: "regular", label: "Regular", cor: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  { valor: "ruim", label: "Ruim", cor: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  { valor: "pessimo", label: "Péssimo", cor: "text-red-700", bg: "bg-red-50 border-red-200" },
];

function badgeAvaliacao(valor: Avaliacao | null) {
  if (!valor) return <span className="text-xs text-gray-400">—</span>;
  const op = OPCOES_AVALIACAO.find((o) => o.valor === valor);
  if (!op) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${op.bg} ${op.cor}`}>
      {op.label}
    </span>
  );
}

function calcularEvolucao(config: MapaEvolucaoConfig | null, registros: MapaEvolucaoRegistro[]): string {
  if (!config || registros.length === 0) return "sem dados";
  const metaNum = config.metaFaturamentoMensal ? Number(config.metaFaturamentoMensal) : null;
  const ultimo = registros[0];
  const fatAtual = ultimo.faturamento ? Number(ultimo.faturamento) : null;
  const fatInicio = config.faturamentoInicio ? Number(config.faturamentoInicio) : null;

  if (!fatAtual || !fatInicio || fatInicio === 0) return "sem dados";

  const crescimento = ((fatAtual - fatInicio) / fatInicio) * 100;
  if (metaNum && fatAtual >= metaNum) return "meta atingida";
  if (crescimento >= 20) return "crescendo";
  if (crescimento >= 0) return "estável";
  return "queda";
}

const COR_EVOLUCAO: Record<string, string> = {
  "meta atingida": "text-green-700 bg-green-50 border-green-200",
  crescendo: "text-blue-700 bg-blue-50 border-blue-200",
  estável: "text-yellow-700 bg-yellow-50 border-yellow-200",
  queda: "text-red-700 bg-red-50 border-red-200",
  "sem dados": "text-gray-400 bg-gray-50 border-gray-200",
};

interface DropdownAvaliacaoProps {
  valor: Avaliacao | null;
  onChange: (v: Avaliacao) => void;
}

function DropdownAvaliacao({ valor, onChange }: DropdownAvaliacaoProps) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    if (aberto) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aberto]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
      >
        {badgeAvaliacao(valor)}
        {!valor && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-50 border-gray-200 text-gray-500">
            Definir
          </span>
        )}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 ml-0.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {aberto && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-[#e5e5e5] rounded-xl shadow-lg overflow-hidden min-w-[130px]">
          {OPCOES_AVALIACAO.map((op) => (
            <button
              key={op.valor}
              onClick={() => { onChange(op.valor); setAberto(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${valor === op.valor ? "font-semibold" : ""}`}
            >
              <span className={`w-2 h-2 rounded-full ${op.valor === "otimo" ? "bg-green-500" : op.valor === "bom" ? "bg-blue-500" : op.valor === "regular" ? "bg-yellow-500" : op.valor === "ruim" ? "bg-orange-500" : "bg-red-500"}`} />
              <span className={op.cor}>{op.label}</span>
              {valor === op.valor && (
                <svg className="ml-auto w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MapaClientePage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void fetch("/api/clientes-agencia")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setClientes(Array.isArray(d) ? d as Cliente[] : []))
      .catch(() => setClientes([]))
      .finally(() => setCarregando(false));
  }, []);

  async function salvarAvaliacao(clienteId: string, campo: "desempenhoCampanhas" | "relacionamento", valor: Avaliacao) {
    setSalvando((prev) => ({ ...prev, [clienteId]: true }));
    try {
      await fetch(`/api/clientes-agencia/${clienteId}/mapa`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: valor, preenchidoPor: "gestor" }),
      });
      setClientes((prev) =>
        prev.map((c) =>
          c.id === clienteId
            ? {
                ...c,
                mapaAvaliacao: {
                  ...(c.mapaAvaliacao ?? { desempenhoCampanhas: null, relacionamento: null, preenchidoGestorEm: null, preenchidoClienteEm: null }),
                  [campo]: valor,
                  preenchidoGestorEm: new Date().toISOString(),
                },
              }
            : c
        )
      );
    } finally {
      setSalvando((prev) => ({ ...prev, [clienteId]: false }));
    }
  }

  function formatarData(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mapa do Cliente</h1>
          <p className="text-sm text-gray-500 mt-0.5">Desempenho, relacionamento e evolução por cliente</p>
        </div>
        <Link
          href="/clientes"
          className="text-sm text-[#e85a23] font-medium hover:underline"
        >
          Ver todos os clientes →
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {carregando ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">Carregando...</div>
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <p className="text-sm text-gray-400">Nenhum cliente cadastrado ainda.</p>
            <Link href="/clientes" className="text-sm font-medium text-[#e85a23] hover:underline">
              Cadastrar primeiro cliente →
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-[#e5e5e5]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Desempenho de Campanhas</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Relacionamento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Evolução</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Preench. Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Preench. Gestor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]">
                  {clientes.map((c) => {
                    const evolucao = calcularEvolucao(c.mapaEvolucaoConfig, c.mapaEvolucaoRegistros);
                    return (
                      <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${salvando[c.id] ? "opacity-60" : ""}`}>
                        <td className="px-4 py-3">
                          <Link href={`/clientes/${c.id}`} className="font-medium text-gray-900 hover:text-[#e85a23] transition-colors">
                            {c.nome}
                          </Link>
                          <p className="text-xs text-gray-400 mt-0.5">{c.contas.length} conta{c.contas.length !== 1 ? "s" : ""}</p>
                        </td>
                        <td className="px-4 py-3">
                          <DropdownAvaliacao
                            valor={c.mapaAvaliacao?.desempenhoCampanhas ?? null}
                            onChange={(v) => void salvarAvaliacao(c.id, "desempenhoCampanhas", v)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <DropdownAvaliacao
                            valor={c.mapaAvaliacao?.relacionamento ?? null}
                            onChange={(v) => void salvarAvaliacao(c.id, "relacionamento", v)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${COR_EVOLUCAO[evolucao] ?? COR_EVOLUCAO["sem dados"]}`}>
                            {evolucao.charAt(0).toUpperCase() + evolucao.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {formatarData(c.mapaAvaliacao?.preenchidoClienteEm ?? null)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {formatarData(c.mapaAvaliacao?.preenchidoGestorEm ?? null)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
