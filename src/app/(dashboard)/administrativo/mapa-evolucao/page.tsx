"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface EvolucaoConfig {
  metaFaturamentoMensal: string | null;
  faturamentoInicio: string | null;
  vendasInicio: number | null;
  dataInicio: string | null;
}

interface EvolucaoRegistro {
  dataRegistro: string;
  faturamento: string | null;
  vendas: number | null;
  preenchidoPor: string;
}

interface ClienteEvolucao {
  id: string;
  nome: string;
  dataEntrada: string | null;
  mapaEvolucaoConfig: EvolucaoConfig | null;
  mapaEvolucaoRegistros: EvolucaoRegistro[];
}

interface FormRegistro {
  dataRegistro: string;
  vendas: string;
  faturamento: string;
  observacoes: string;
}

interface FormConfig {
  metaFaturamentoMensal: string;
  faturamentoInicio: string;
  vendasInicio: string;
  dataInicio: string;
}

function formatarMoeda(valor: string | null) {
  if (!valor) return "—";
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcularCrescimento(inicio: string | null, atual: string | null): string {
  if (!inicio || !atual) return "";
  const ini = Number(inicio);
  const atu = Number(atual);
  if (ini === 0) return "";
  const pct = ((atu - ini) / ini) * 100;
  const sinal = pct >= 0 ? "+" : "";
  return `${sinal}${pct.toFixed(1)}%`;
}

function barraProgresso(atual: string | null, meta: string | null) {
  if (!atual || !meta || Number(meta) === 0) return 0;
  return Math.min((Number(atual) / Number(meta)) * 100, 100);
}

export default function MapaEvolucaoPage() {
  const [clientes, setClientes] = useState<ClienteEvolucao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null);
  const [abaModo, setAbaModo] = useState<"registros" | "config">("registros");
  const [formRegistro, setFormRegistro] = useState<FormRegistro>({ dataRegistro: "", vendas: "", faturamento: "", observacoes: "" });
  const [formConfig, setFormConfig] = useState<FormConfig>({ metaFaturamentoMensal: "", faturamentoInicio: "", vendasInicio: "", dataInicio: "" });
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    void fetch("/api/clientes-agencia")
      .then((r) => r.json())
      .then((d) => {
        setClientes(d as ClienteEvolucao[]);
        if ((d as ClienteEvolucao[]).length > 0) {
          setClienteSelecionado((d as ClienteEvolucao[])[0].id);
        }
      })
      .finally(() => setCarregando(false));
  }, []);

  const cliente = clientes.find((c) => c.id === clienteSelecionado) ?? null;
  const ultimoRegistro = cliente?.mapaEvolucaoRegistros[0] ?? null;

  useEffect(() => {
    if (cliente?.mapaEvolucaoConfig) {
      const cfg = cliente.mapaEvolucaoConfig;
      setFormConfig({
        metaFaturamentoMensal: cfg.metaFaturamentoMensal ?? "",
        faturamentoInicio: cfg.faturamentoInicio ?? "",
        vendasInicio: cfg.vendasInicio != null ? String(cfg.vendasInicio) : "",
        dataInicio: cfg.dataInicio ?? "",
      });
    } else {
      setFormConfig({ metaFaturamentoMensal: "", faturamentoInicio: "", vendasInicio: "", dataInicio: "" });
    }
  }, [clienteSelecionado, cliente]);

  async function salvarRegistro() {
    if (!clienteSelecionado || !formRegistro.dataRegistro) return;
    setSalvando(true);
    setMensagem("");
    try {
      const res = await fetch(`/api/clientes-agencia/${clienteSelecionado}/evolucao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "registro", ...formRegistro, preenchidoPor: "gestor" }),
      });
      if (!res.ok) throw new Error();
      const novo = await res.json() as EvolucaoRegistro;
      setClientes((prev) =>
        prev.map((c) =>
          c.id === clienteSelecionado
            ? {
                ...c,
                mapaEvolucaoRegistros: [novo, ...c.mapaEvolucaoRegistros.filter((r) => r.dataRegistro !== novo.dataRegistro)],
              }
            : c
        )
      );
      setFormRegistro({ dataRegistro: "", vendas: "", faturamento: "", observacoes: "" });
      setMensagem("Registro salvo com sucesso!");
    } catch {
      setMensagem("Erro ao salvar registro.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarConfig() {
    if (!clienteSelecionado) return;
    setSalvando(true);
    setMensagem("");
    try {
      const res = await fetch(`/api/clientes-agencia/${clienteSelecionado}/evolucao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "config", ...formConfig, observacoesConfig: "" }),
      });
      if (!res.ok) throw new Error();
      const novaConfig = await res.json() as EvolucaoConfig;
      setClientes((prev) =>
        prev.map((c) => (c.id === clienteSelecionado ? { ...c, mapaEvolucaoConfig: novaConfig } : c))
      );
      setMensagem("Configuração salva!");
    } catch {
      setMensagem("Erro ao salvar configuração.");
    } finally {
      setSalvando(false);
    }
  }

  const registrosOrdenados = [...(cliente?.mapaEvolucaoRegistros ?? [])].sort(
    (a, b) => new Date(a.dataRegistro).getTime() - new Date(b.dataRegistro).getTime()
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mapa de Evolução</h1>
          <p className="text-sm text-gray-500 mt-0.5">Metas, faturamento e crescimento dos clientes</p>
        </div>
        <Link href="/clientes" className="text-sm text-[#e85a23] font-medium hover:underline">
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
          <div className="max-w-5xl mx-auto flex flex-col gap-6">
            {/* Seletor de cliente */}
            <div className="flex gap-3 items-center flex-wrap">
              <label className="text-sm font-medium text-gray-700">Cliente:</label>
              <select
                value={clienteSelecionado ?? ""}
                onChange={(e) => setClienteSelecionado(e.target.value)}
                className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#e85a23] min-w-[200px]"
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            {cliente && (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-[#e5e5e5] rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Faturamento inicial</p>
                    <p className="text-xl font-bold text-gray-900">{formatarMoeda(cliente.mapaEvolucaoConfig?.faturamentoInicio ?? null)}</p>
                  </div>
                  <div className="bg-white border border-[#e5e5e5] rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Faturamento atual</p>
                    <p className="text-xl font-bold text-gray-900">{formatarMoeda(ultimoRegistro?.faturamento ?? null)}</p>
                    {ultimoRegistro?.faturamento && cliente.mapaEvolucaoConfig?.faturamentoInicio && (
                      <p className={`text-xs font-medium mt-0.5 ${Number(ultimoRegistro.faturamento) >= Number(cliente.mapaEvolucaoConfig.faturamentoInicio) ? "text-green-600" : "text-red-500"}`}>
                        {calcularCrescimento(cliente.mapaEvolucaoConfig.faturamentoInicio, ultimoRegistro.faturamento)}
                      </p>
                    )}
                  </div>
                  <div className="bg-white border border-[#e5e5e5] rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Meta mensal</p>
                    <p className="text-xl font-bold text-gray-900">{formatarMoeda(cliente.mapaEvolucaoConfig?.metaFaturamentoMensal ?? null)}</p>
                  </div>
                  <div className="bg-white border border-[#e5e5e5] rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Vendas mais recentes</p>
                    <p className="text-xl font-bold text-gray-900">{ultimoRegistro?.vendas ?? "—"}</p>
                    {cliente.mapaEvolucaoConfig?.vendasInicio != null && ultimoRegistro?.vendas != null && (
                      <p className={`text-xs font-medium mt-0.5 ${ultimoRegistro.vendas >= (cliente.mapaEvolucaoConfig.vendasInicio ?? 0) ? "text-green-600" : "text-red-500"}`}>
                        início: {cliente.mapaEvolucaoConfig.vendasInicio}
                      </p>
                    )}
                  </div>
                </div>

                {/* Barra de progresso para meta */}
                {cliente.mapaEvolucaoConfig?.metaFaturamentoMensal && (
                  <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold text-gray-800">Progresso em relação à meta</h2>
                      <span className="text-sm font-bold text-gray-700">
                        {barraProgresso(ultimoRegistro?.faturamento ?? null, cliente.mapaEvolucaoConfig.metaFaturamentoMensal).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#e85a23] to-orange-400 transition-all duration-500"
                        style={{ width: `${barraProgresso(ultimoRegistro?.faturamento ?? null, cliente.mapaEvolucaoConfig.metaFaturamentoMensal)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-gray-400">R$ 0</span>
                      <span className="text-[10px] text-gray-400">{formatarMoeda(cliente.mapaEvolucaoConfig.metaFaturamentoMensal)}</span>
                    </div>
                  </div>
                )}

                {/* Histórico de registros */}
                {registrosOrdenados.length > 0 && (
                  <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-gray-800 mb-4">Evolução ao longo do tempo</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#e5e5e5]">
                            <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase">Data</th>
                            <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase">Vendas</th>
                            <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase">Faturamento</th>
                            <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase">Var. Faturamento</th>
                            <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase">Preenchido por</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e5e5]">
                          {registrosOrdenados.map((r, i) => {
                            const anterior = i > 0 ? registrosOrdenados[i - 1] : null;
                            const variacaoFat = anterior ? calcularCrescimento(anterior.faturamento, r.faturamento) : "";
                            return (
                              <tr key={r.dataRegistro} className="hover:bg-gray-50">
                                <td className="py-2 text-gray-700">{new Date(r.dataRegistro + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                                <td className="py-2 text-right text-gray-700">{r.vendas ?? "—"}</td>
                                <td className="py-2 text-right text-gray-700">{formatarMoeda(r.faturamento)}</td>
                                <td className={`py-2 text-right text-xs font-medium ${variacaoFat.startsWith("+") ? "text-green-600" : variacaoFat.startsWith("-") ? "text-red-500" : "text-gray-400"}`}>
                                  {variacaoFat || "—"}
                                </td>
                                <td className="py-2 text-xs text-gray-400">{r.preenchidoPor}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Formulário de inserção */}
                <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
                  <div className="flex border-b border-[#e5e5e5]">
                    {(["registros", "config"] as const).map((a) => (
                      <button
                        key={a}
                        onClick={() => setAbaModo(a)}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${abaModo === a ? "text-[#e85a23] bg-orange-50" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        {a === "registros" ? "Novo registro" : "Configurar metas"}
                      </button>
                    ))}
                  </div>

                  <div className="p-5">
                    {abaModo === "registros" ? (
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Data do período</label>
                            <input
                              type="date"
                              value={formRegistro.dataRegistro}
                              onChange={(e) => setFormRegistro((p) => ({ ...p, dataRegistro: e.target.value }))}
                              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e85a23]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Qtd. de vendas</label>
                            <input
                              type="number"
                              min="0"
                              value={formRegistro.vendas}
                              onChange={(e) => setFormRegistro((p) => ({ ...p, vendas: e.target.value }))}
                              placeholder="0"
                              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e85a23]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Faturamento (R$)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formRegistro.faturamento}
                            onChange={(e) => setFormRegistro((p) => ({ ...p, faturamento: e.target.value }))}
                            placeholder="0,00"
                            className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e85a23]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
                          <textarea
                            value={formRegistro.observacoes}
                            onChange={(e) => setFormRegistro((p) => ({ ...p, observacoes: e.target.value }))}
                            rows={2}
                            className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e85a23] resize-none"
                          />
                        </div>
                        <button
                          onClick={() => void salvarRegistro()}
                          disabled={salvando || !formRegistro.dataRegistro}
                          className="self-end px-5 py-2 bg-[#e85a23] text-white text-sm font-medium rounded-lg hover:bg-[#d14d1e] disabled:opacity-50 transition-colors"
                        >
                          {salvando ? "Salvando..." : "Salvar registro"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Data de início (onboard)</label>
                            <input
                              type="date"
                              value={formConfig.dataInicio}
                              onChange={(e) => setFormConfig((p) => ({ ...p, dataInicio: e.target.value }))}
                              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e85a23]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Vendas no início</label>
                            <input
                              type="number"
                              min="0"
                              value={formConfig.vendasInicio}
                              onChange={(e) => setFormConfig((p) => ({ ...p, vendasInicio: e.target.value }))}
                              placeholder="0"
                              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e85a23]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Faturamento inicial (R$)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={formConfig.faturamentoInicio}
                              onChange={(e) => setFormConfig((p) => ({ ...p, faturamentoInicio: e.target.value }))}
                              placeholder="0,00"
                              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e85a23]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Meta de faturamento mensal (R$)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={formConfig.metaFaturamentoMensal}
                              onChange={(e) => setFormConfig((p) => ({ ...p, metaFaturamentoMensal: e.target.value }))}
                              placeholder="0,00"
                              className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e85a23]"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => void salvarConfig()}
                          disabled={salvando}
                          className="self-end px-5 py-2 bg-[#e85a23] text-white text-sm font-medium rounded-lg hover:bg-[#d14d1e] disabled:opacity-50 transition-colors"
                        >
                          {salvando ? "Salvando..." : "Salvar configuração"}
                        </button>
                      </div>
                    )}

                    {mensagem && (
                      <p className={`mt-3 text-sm font-medium ${mensagem.includes("Erro") ? "text-red-500" : "text-green-600"}`}>
                        {mensagem}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
