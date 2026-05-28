"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Conta {
  id: string;
  nomeCliente: string;
  tipoFunil: string;
  slugCompartilhavel: string;
  rastreamentoApenas: boolean;
  compartilhamentoAtivo: boolean;
  ultimaSincronizacao: string | null;
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
  dataPagamento: string | null;
  status: "pago" | "pendente" | "inadimplente";
  observacoes: string | null;
}

interface ClienteDetalhe {
  id: string;
  nome: string;
  cnpj: string | null;
  nomeSocio: string | null;
  telefone: string | null;
  email: string | null;
  dataEntrada: string | null;
  observacoes: string | null;
  indicadoPor: { id: string; nome: string } | null;
  indicacoes: { id: string; nome: string }[];
  contas: Conta[];
  servicos: Servico[];
  pagamentos: Pagamento[];
}

const LABEL_FUNIL: Record<string, string> = {
  whatsapp: "WhatsApp",
  landing_page_lead: "LP Lead",
  landing_page_contato: "LP Contato",
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

const STATUS_LABEL: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  inadimplente: "Inadimplente",
};

type Aba = "visao" | "pagamentos" | "servicos";

export default function ClienteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [cliente, setCliente] = useState<ClienteDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<Aba>("visao");

  // Edição dos dados
  const [editando, setEditando] = useState(false);
  const [formEdicao, setFormEdicao] = useState({ nome: "", cnpj: "", nomeSocio: "", telefone: "", email: "", dataEntrada: "", observacoes: "" });
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Serviços
  const [novoServico, setNovoServico] = useState({ nome: "", valorMensal: "" });
  const [adicionandoServico, setAdicionandoServico] = useState(false);

  // Pagamentos
  const [novoPagamento, setNovoPagamento] = useState({ valor: "", dataVencimento: "", dataPagamento: "", observacoes: "" });
  const [adicionandoPagamento, setAdicionandoPagamento] = useState(false);
  const [atualizandoPagamento, setAtualizandoPagamento] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/clientes-agencia/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setCliente(d as ClienteDetalhe);
        const c = d as ClienteDetalhe;
        setFormEdicao({
          nome: c.nome,
          cnpj: c.cnpj ?? "",
          nomeSocio: c.nomeSocio ?? "",
          telefone: c.telefone ?? "",
          email: c.email ?? "",
          dataEntrada: c.dataEntrada ?? "",
          observacoes: c.observacoes ?? "",
        });
      })
      .finally(() => setCarregando(false));
  }, [id]);

  async function salvarEdicao() {
    if (!cliente) return;
    setSalvandoEdicao(true);
    try {
      const res = await fetch(`/api/clientes-agencia/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formEdicao),
      });
      const atualizado = await res.json() as ClienteDetalhe;
      setCliente((prev) => prev ? { ...prev, ...atualizado } : prev);
      setEditando(false);
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function adicionarServico(e: React.FormEvent) {
    e.preventDefault();
    if (!novoServico.nome.trim()) return;
    setAdicionandoServico(true);
    try {
      const res = await fetch(`/api/clientes-agencia/${id}/servicos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoServico),
      });
      const criado = await res.json() as Servico;
      setCliente((prev) => prev ? { ...prev, servicos: [...prev.servicos, criado] } : prev);
      setNovoServico({ nome: "", valorMensal: "" });
    } finally {
      setAdicionandoServico(false);
    }
  }

  async function removerServico(servicoId: string) {
    await fetch(`/api/clientes-agencia/${id}/servicos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ servicoId }),
    });
    setCliente((prev) => prev ? { ...prev, servicos: prev.servicos.filter((s) => s.id !== servicoId) } : prev);
  }

  async function adicionarPagamento(e: React.FormEvent) {
    e.preventDefault();
    if (!novoPagamento.valor || !novoPagamento.dataVencimento) return;
    setAtualizandoPagamento("novo");
    try {
      const res = await fetch(`/api/clientes-agencia/${id}/pagamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...novoPagamento, status: novoPagamento.dataPagamento ? "pago" : "pendente" }),
      });
      const criado = await res.json() as Pagamento;
      setCliente((prev) => prev ? { ...prev, pagamentos: [criado, ...prev.pagamentos] } : prev);
      setNovoPagamento({ valor: "", dataVencimento: "", dataPagamento: "", observacoes: "" });
      setAdicionandoPagamento(false);
    } finally {
      setAtualizandoPagamento(null);
    }
  }

  async function alterarStatusPagamento(pagamentoId: string, novoStatus: "pago" | "pendente" | "inadimplente", dataPagamento?: string) {
    setAtualizandoPagamento(pagamentoId);
    try {
      const res = await fetch(`/api/clientes-agencia/${id}/pagamentos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagamentoId, status: novoStatus, dataPagamento: dataPagamento || null }),
      });
      const atualizado = await res.json() as Pagamento;
      setCliente((prev) => prev ? { ...prev, pagamentos: prev.pagamentos.map((p) => p.id === pagamentoId ? atualizado : p) } : prev);
    } finally {
      setAtualizandoPagamento(null);
    }
  }

  async function excluirCliente() {
    if (!confirm(`Deseja arquivar o cliente "${cliente?.nome}"?`)) return;
    await fetch(`/api/clientes-agencia/${id}`, { method: "DELETE" });
    router.push("/clientes");
  }

  if (carregando) return <div className="flex items-center justify-center h-full text-sm text-gray-400">Carregando...</div>;
  if (!cliente) return <div className="flex items-center justify-center h-full text-sm text-red-500">Cliente não encontrado.</div>;

  const mrr = cliente.servicos.reduce((a, s) => a + Number(s.valorMensal), 0);
  const ultimoPagamento = cliente.pagamentos[0] ?? null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 border-b border-[#e5e5e5]">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/clientes" className="hover:text-gray-700 transition-colors">Clientes</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{cliente.nome}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{cliente.nome}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {cliente.nomeSocio && <span className="text-sm text-gray-500">{cliente.nomeSocio}</span>}
              {cliente.cnpj && <span className="text-xs text-gray-400 font-mono">{cliente.cnpj}</span>}
              {ultimoPagamento && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COR[ultimoPagamento.status]}`}>
                  {STATUS_LABEL[ultimoPagamento.status]}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditando(true)}
              className="px-3 py-1.5 border border-[#e5e5e5] text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              Editar
            </button>
            <button
              onClick={() => void excluirCliente()}
              className="px-3 py-1.5 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors"
            >
              Arquivar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-5 mt-4">
          {(["visao", "pagamentos", "servicos"] as Aba[]).map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${aba === a ? "border-[#e85a23] text-[#e85a23]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {a === "visao" ? "Visão geral" : a === "pagamentos" ? "Pagamentos" : "Serviços"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">

        {/* ── Visão geral ── */}
        {aba === "visao" && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Contas de anúncio", valor: cliente.contas.length },
                { label: "Serviços ativos", valor: cliente.servicos.length },
                { label: "MRR", valor: mrr > 0 ? `R$ ${mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—" },
                { label: "Indicações feitas", valor: cliente.indicacoes.length },
              ].map((k) => (
                <div key={k.label} className="bg-white border border-[#e5e5e5] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{k.valor}</p>
                </div>
              ))}
            </div>

            {/* Dados do cliente */}
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">Dados cadastrais</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: "Telefone", valor: cliente.telefone },
                  { label: "E-mail", valor: cliente.email },
                  { label: "Data de entrada", valor: cliente.dataEntrada ? new Date(cliente.dataEntrada + "T12:00:00").toLocaleDateString("pt-BR") : null },
                  { label: "Indicado por", valor: cliente.indicadoPor?.nome ?? null },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-gray-800 font-medium mt-0.5">{item.valor ?? <span className="text-gray-400 font-normal">—</span>}</p>
                  </div>
                ))}
                {cliente.observacoes && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Observações</p>
                    <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">{cliente.observacoes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contas vinculadas */}
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">Contas vinculadas</h2>
              {cliente.contas.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma conta vinculada ainda. Vincule ao editar uma conta de anúncio.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {cliente.contas.map((conta) => (
                    <div key={conta.id} className="flex items-center justify-between p-3 border border-[#e5e5e5] rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{conta.nomeCliente}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{LABEL_FUNIL[conta.tipoFunil] ?? conta.tipoFunil}</span>
                          {conta.rastreamentoApenas && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Rastreamento</span>
                          )}
                          {conta.ultimaSincronizacao && (
                            <span className="text-xs text-gray-400">
                              Sync: {new Date(conta.ultimaSincronizacao).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                      {conta.compartilhamentoAtivo && (
                        <Link
                          href={`/compartilhavel/${conta.slugCompartilhavel}`}
                          target="_blank"
                          className="text-xs text-[#e85a23] font-medium hover:underline"
                        >
                          Ver dashboard →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Indicações */}
            {cliente.indicacoes.length > 0 && (
              <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">Clientes indicados por {cliente.nome}</h2>
                <div className="flex flex-col gap-2">
                  {cliente.indicacoes.map((ind) => (
                    <Link key={ind.id} href={`/clientes/${ind.id}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#e85a23] transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      {ind.nome}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Pagamentos ── */}
        {aba === "pagamentos" && (
          <div className="max-w-3xl mx-auto flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Histórico de pagamentos</h2>
              <button
                onClick={() => setAdicionandoPagamento(true)}
                className="flex items-center gap-1.5 text-sm text-[#e85a23] font-medium hover:underline"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Registrar pagamento
              </button>
            </div>

            {adicionandoPagamento && (
              <form onSubmit={(e) => void adicionarPagamento(e)} className="bg-white border border-[#e85a23] rounded-xl p-5 flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-gray-800">Novo pagamento</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Valor (R$) *</label>
                    <input type="number" step="0.01" min="0" value={novoPagamento.valor} onChange={(e) => setNovoPagamento((p) => ({ ...p, valor: e.target.value }))}
                      className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]" placeholder="0,00" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Vencimento *</label>
                    <input type="date" value={novoPagamento.dataVencimento} onChange={(e) => setNovoPagamento((p) => ({ ...p, dataVencimento: e.target.value }))}
                      className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Data do pagamento (se já pago)</label>
                    <input type="date" value={novoPagamento.dataPagamento} onChange={(e) => setNovoPagamento((p) => ({ ...p, dataPagamento: e.target.value }))}
                      className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
                    <input type="text" value={novoPagamento.observacoes} onChange={(e) => setNovoPagamento((p) => ({ ...p, observacoes: e.target.value }))}
                      className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]" />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setAdicionandoPagamento(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                  <button type="submit" disabled={atualizandoPagamento === "novo"} className="px-4 py-2 bg-[#e85a23] text-white text-sm font-medium rounded-lg hover:bg-[#d14d1e] disabled:opacity-50 transition-colors">
                    {atualizandoPagamento === "novo" ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </form>
            )}

            {cliente.pagamentos.length === 0 ? (
              <div className="bg-white border border-[#e5e5e5] rounded-xl p-8 text-center text-gray-400 text-sm">
                Nenhum pagamento registrado ainda.
              </div>
            ) : (
              <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-[#e5e5e5]">
                    <tr>
                      {["Vencimento", "Valor", "Pago em", "Status", "Ações"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e5]">
                    {cliente.pagamentos.map((p) => (
                      <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${atualizandoPagamento === p.id ? "opacity-60" : ""}`}>
                        <td className="px-4 py-3 text-gray-700">
                          {new Date(p.dataVencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          R$ {Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {p.dataPagamento ? new Date(p.dataPagamento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COR[p.status]}`}>
                            {STATUS_LABEL[p.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {p.status !== "pago" && (
                              <button
                                onClick={() => void alterarStatusPagamento(p.id, "pago", new Date().toISOString().slice(0, 10))}
                                className="text-xs text-green-600 font-medium hover:underline"
                              >
                                Marcar pago
                              </button>
                            )}
                            {p.status === "pago" && (
                              <button
                                onClick={() => void alterarStatusPagamento(p.id, "pendente")}
                                className="text-xs text-gray-500 hover:underline"
                              >
                                Reverter
                              </button>
                            )}
                            {p.status === "pendente" && (
                              <button
                                onClick={() => void alterarStatusPagamento(p.id, "inadimplente")}
                                className="text-xs text-red-500 hover:underline"
                              >
                                Inadimplente
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Serviços ── */}
        {aba === "servicos" && (
          <div className="max-w-2xl mx-auto flex flex-col gap-5">
            <h2 className="text-sm font-semibold text-gray-800">Serviços contratados</h2>

            <form onSubmit={(e) => void adicionarServico(e)} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome do serviço</label>
                <input
                  type="text"
                  value={novoServico.nome}
                  onChange={(e) => setNovoServico((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Gestão de Tráfego"
                  className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]"
                />
              </div>
              <div className="w-36">
                <label className="block text-xs font-medium text-gray-700 mb-1">Valor mensal (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={novoServico.valorMensal}
                  onChange={(e) => setNovoServico((p) => ({ ...p, valorMensal: e.target.value }))}
                  placeholder="0,00"
                  className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]"
                />
              </div>
              <button
                type="submit"
                disabled={adicionandoServico || !novoServico.nome.trim()}
                className="px-4 py-2 bg-[#e85a23] text-white text-sm font-medium rounded-lg hover:bg-[#d14d1e] disabled:opacity-50 transition-colors"
              >
                {adicionandoServico ? "..." : "Adicionar"}
              </button>
            </form>

            {cliente.servicos.length === 0 ? (
              <div className="bg-white border border-[#e5e5e5] rounded-xl p-8 text-center text-gray-400 text-sm">
                Nenhum serviço cadastrado.
              </div>
            ) : (
              <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-[#e5e5e5]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Serviço</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Valor mensal</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e5]">
                    {cliente.servicos.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900 font-medium">{s.nome}</td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          R$ {Number(s.valorMensal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => void removerServico(s.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700">Total MRR</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                        R$ {cliente.servicos.reduce((a, s) => a + Number(s.valorMensal), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de edição */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e5]">
              <h2 className="text-base font-bold text-gray-900">Editar cliente</h2>
              <button onClick={() => setEditando(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                  <input type="text" value={formEdicao.nome} onChange={(e) => setFormEdicao((p) => ({ ...p, nome: e.target.value }))}
                    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CNPJ</label>
                  <input type="text" value={formEdicao.cnpj} onChange={(e) => setFormEdicao((p) => ({ ...p, cnpj: e.target.value }))}
                    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sócio</label>
                  <input type="text" value={formEdicao.nomeSocio} onChange={(e) => setFormEdicao((p) => ({ ...p, nomeSocio: e.target.value }))}
                    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Telefone</label>
                  <input type="text" value={formEdicao.telefone} onChange={(e) => setFormEdicao((p) => ({ ...p, telefone: e.target.value }))}
                    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">E-mail</label>
                  <input type="email" value={formEdicao.email} onChange={(e) => setFormEdicao((p) => ({ ...p, email: e.target.value }))}
                    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data de entrada</label>
                  <input type="date" value={formEdicao.dataEntrada} onChange={(e) => setFormEdicao((p) => ({ ...p, dataEntrada: e.target.value }))}
                    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23]" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
                  <textarea value={formEdicao.observacoes} onChange={(e) => setFormEdicao((p) => ({ ...p, observacoes: e.target.value }))}
                    rows={3} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23] resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditando(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                <button onClick={() => void salvarEdicao()} disabled={salvandoEdicao}
                  className="px-5 py-2 bg-[#e85a23] text-white text-sm font-medium rounded-lg hover:bg-[#d14d1e] disabled:opacity-50 transition-colors">
                  {salvandoEdicao ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
