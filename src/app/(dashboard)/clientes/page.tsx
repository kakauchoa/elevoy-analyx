"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Conta {
  id: string;
  nomeCliente: string;
  tipoFunil: string;
  slugCompartilhavel: string;
  rastreamentoApenas: boolean;
}

interface Servico {
  id: string;
  nome: string;
  valorMensal: string;
}

interface Pagamento {
  id: string;
  valor: string;
  dataVencimento: string;
  status: "pago" | "pendente" | "inadimplente";
}

interface Cliente {
  id: string;
  nome: string;
  cnpj: string | null;
  nomeSocio: string | null;
  telefone: string | null;
  email: string | null;
  dataEntrada: string | null;
  indicadoPor: { id: string; nome: string } | null;
  contas: Conta[];
  servicos: Servico[];
  pagamentos: Pagamento[];
}

interface ContaSemCliente {
  id: string;
  nomeCliente: string;
  tipoFunil: string;
  slugCompartilhavel: string;
  rastreamentoApenas: boolean;
}

interface FormCampos {
  nome: string;
  cnpj: string;
  nomeSocio: string;
  telefone: string;
  email: string;
  dataEntrada: string;
  indicadoPorId: string;
  observacoes: string;
}

const LABEL_FUNIL: Record<string, string> = {
  whatsapp: "WhatsApp",
  landing_page_lead: "Lead",
  landing_page_contato: "Contato",
  ecommerce: "E-commerce",
  conteudo: "Conteúdo",
  ecommerce_conteudo: "E-com + Conteúdo",
  outro: "Outro",
};

const STATUS_COR: Record<string, string> = {
  pago: "bg-green-50 text-green-700 border-green-200",
  pendente: "bg-yellow-50 text-yellow-700 border-yellow-200",
  inadimplente: "bg-red-50 text-red-700 border-red-200",
};

function statusPagamento(pagamentos: Pagamento[]) {
  if (pagamentos.length === 0) return null;
  const ultimo = pagamentos[0];
  return ultimo;
}

function valorTotalServicos(servicos: Servico[]) {
  return servicos.reduce((acc, s) => acc + Number(s.valorMensal), 0);
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [contasSemCliente, setContasSemCliente] = useState<ContaSemCliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [contaOrfaId, setContaOrfaId] = useState<string | null>(null);
  const [form, setForm] = useState<FormCampos>({
    nome: "", cnpj: "", nomeSocio: "", telefone: "", email: "", dataEntrada: "", indicadoPorId: "", observacoes: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/clientes-agencia");
      if (!res.ok) { setClientes([]); setContasSemCliente([]); return; }
      const data = await res.json() as { clientes: Cliente[]; contasSemCliente: ContaSemCliente[] };
      setClientes(Array.isArray(data.clientes) ? data.clientes : []);
      setContasSemCliente(Array.isArray(data.contasSemCliente) ? data.contasSemCliente : []);
    } catch {
      setClientes([]);
      setContasSemCliente([]);
    } finally {
      setCarregando(false);
    }
  }

  function abrirModalOrfa(conta: ContaSemCliente) {
    setContaOrfaId(conta.id);
    setForm({ nome: conta.nomeCliente, cnpj: "", nomeSocio: "", telefone: "", email: "", dataEntrada: "", indicadoPorId: "", observacoes: "" });
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setContaOrfaId(null);
    setErro("");
    setForm({ nome: "", cnpj: "", nomeSocio: "", telefone: "", email: "", dataEntrada: "", indicadoPorId: "", observacoes: "" });
  }

  async function criarCliente(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!form.nome.trim()) { setErro("Nome é obrigatório"); return; }
    setSalvando(true);
    try {
      const res = await fetch("/api/clientes-agencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, contaAnuncioId: contaOrfaId ?? undefined }),
      });
      if (!res.ok) {
        const err = await res.json() as { erro?: string };
        setErro(err.erro ?? "Erro ao cadastrar cliente.");
        return;
      }
      const novo = await res.json() as Cliente;
      setClientes((prev) => [novo, ...prev]);
      if (contaOrfaId) {
        setContasSemCliente((prev) => prev.filter((c) => c.id !== contaOrfaId));
      }
      fecharModal();
    } catch {
      setErro("Erro ao cadastrar cliente.");
    } finally {
      setSalvando(false);
    }
  }

  const clientesFiltrados = clientes.filter((c) =>
    !busca || c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.nomeSocio?.toLowerCase().includes(busca.toLowerCase()) ||
    c.cnpj?.includes(busca)
  );

  const totalMRR = clientes.reduce((acc, c) => acc + valorTotalServicos(c.servicos), 0);
  const inadimplentes = clientes.filter((c) => statusPagamento(c.pagamentos)?.status === "inadimplente").length;
  const totalContas = clientes.reduce((a, c) => a + c.contas.length, 0) + contasSemCliente.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 border-b border-[#e5e5e5] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Perfis completos dos seus clientes</p>
        </div>
        <button
          onClick={() => { setContaOrfaId(null); setModalAberto(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#e85a23] text-white text-sm font-medium rounded-lg hover:bg-[#d14d1e] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo cliente
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total de clientes", valor: clientes.length, cor: "text-gray-900" },
            { label: "Contas de anúncio", valor: totalContas, cor: "text-blue-700" },
            { label: "MRR de serviços", valor: `R$ ${totalMRR.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, cor: "text-green-700" },
            { label: "Inadimplentes", valor: inadimplentes, cor: inadimplentes > 0 ? "text-red-600" : "text-gray-900" },
          ].map((k) => (
            <div key={k.label} className="bg-white border border-[#e5e5e5] rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.cor}`}>{k.valor}</p>
            </div>
          ))}
        </div>

        {/* Busca */}
        <div className="mb-5">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, sócio ou CNPJ..."
            className="w-full max-w-md border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]"
          />
        </div>

        {/* Contas de anúncio sem perfil de cliente */}
        {!busca && contasSemCliente.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Contas sem perfil — clique para completar o cadastro
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {contasSemCliente.map((conta) => (
                <button
                  key={conta.id}
                  onClick={() => abrirModalOrfa(conta)}
                  className="text-left bg-white border border-dashed border-[#e5e5e5] rounded-xl p-4 hover:border-[#e85a23] hover:shadow-sm transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{conta.nomeCliente}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{LABEL_FUNIL[conta.tipoFunil] ?? conta.tipoFunil}{conta.rastreamentoApenas ? " · Rastreamento" : ""}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-[#e85a23] whitespace-nowrap">Completar →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {carregando ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">Carregando...</div>
        ) : clientesFiltrados.length === 0 && contasSemCliente.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <p className="text-sm text-gray-400">{busca ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}</p>
            {!busca && (
              <button onClick={() => setModalAberto(true)} className="text-sm font-medium text-[#e85a23] hover:underline">
                Cadastrar primeiro cliente →
              </button>
            )}
          </div>
        ) : clientesFiltrados.length === 0 ? null : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clientesFiltrados.map((c) => {
              const ult = statusPagamento(c.pagamentos);
              const mrr = valorTotalServicos(c.servicos);
              return (
                <Link
                  key={c.id}
                  href={`/clientes/${c.id}`}
                  className="bg-white border border-[#e5e5e5] rounded-xl p-5 hover:border-[#e85a23] hover:shadow-sm transition-all flex flex-col gap-4"
                >
                  {/* Nome e status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{c.nome}</p>
                      {c.nomeSocio && <p className="text-xs text-gray-500 truncate">{c.nomeSocio}</p>}
                      {c.cnpj && <p className="text-xs text-gray-400">{c.cnpj}</p>}
                    </div>
                    {ult && (
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COR[ult.status]}`}>
                        {ult.status === "pago" ? "Em dia" : ult.status === "pendente" ? "Pendente" : "Inadimplente"}
                      </span>
                    )}
                  </div>

                  {/* Contas */}
                  {c.contas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {c.contas.map((conta) => (
                        <span key={conta.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {conta.rastreamentoApenas ? "Rastr." : "Dashboard"} · {LABEL_FUNIL[conta.tipoFunil] ?? conta.tipoFunil}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Rodapé */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#e5e5e5]">
                    <div className="text-xs text-gray-500">
                      {c.dataEntrada ? (
                        <span>Desde {new Date(c.dataEntrada + "T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</span>
                      ) : (
                        <span className="text-gray-300">Sem data de entrada</span>
                      )}
                    </div>
                    {mrr > 0 && (
                      <span className="text-xs font-semibold text-green-700">
                        R$ {mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de novo cliente */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e5]">
              <h2 className="text-base font-bold text-gray-900">
                {contaOrfaId ? "Completar cadastro do cliente" : "Novo cliente"}
              </h2>
              <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => void criarCliente(e)} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nome do cliente *</label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]"
                    placeholder="Ex: Loja do João"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={form.cnpj}
                    onChange={(e) => setForm((p) => ({ ...p, cnpj: e.target.value }))}
                    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]"
                    placeholder="00.000.000/0001-00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nome do sócio</label>
                  <input
                    type="text"
                    value={form.nomeSocio}
                    onChange={(e) => setForm((p) => ({ ...p, nomeSocio: e.target.value }))}
                    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]"
                    placeholder="João Silva"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={form.telefone}
                    onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))}
                    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]"
                    placeholder="joao@empresa.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data de entrada</label>
                  <input
                    type="date"
                    value={form.dataEntrada}
                    onChange={(e) => setForm((p) => ({ ...p, dataEntrada: e.target.value }))}
                    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Indicado por</label>
                  <select
                    value={form.indicadoPorId}
                    onChange={(e) => setForm((p) => ({ ...p, indicadoPorId: e.target.value }))}
                    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#e85a23]"
                  >
                    <option value="">Nenhum</option>
                    {clientes.map((cl) => (
                      <option key={cl.id} value={cl.id}>{cl.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    value={form.observacoes}
                    onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
                    rows={2}
                    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23] resize-none"
                  />
                </div>
              </div>

              {erro && <p className="text-sm text-red-500">{erro}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 bg-[#e85a23] text-white text-sm font-medium rounded-lg hover:bg-[#d14d1e] disabled:opacity-50 transition-colors"
                >
                  {salvando ? "Salvando..." : "Criar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
