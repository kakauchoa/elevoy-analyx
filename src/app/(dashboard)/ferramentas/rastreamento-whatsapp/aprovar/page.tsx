"use client";

import { useEffect, useState } from "react";

interface ClienteCrm {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  status: "pendente" | "aprovado" | "rejeitado";
  nomeCliente: string | null;
  aprovadoEm: string | null;
  criadoEm: string;
  contaAnuncioId: string | null;
}

interface ContaOpcao {
  id: string;
  nomeCliente: string;
}

interface SolicitacaoReset {
  id: string;
  clienteNome: string;
  clienteEmail: string;
  criadoEm: string;
  expiresAt: string;
}

export default function AprovarClientesPage() {
  const [clientes, setClientes] = useState<ClienteCrm[]>([]);
  const [resets, setResets] = useState<SolicitacaoReset[]>([]);
  const [contas, setContas] = useState<ContaOpcao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [contaSelecionada, setContaSelecionada] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  async function carregar() {
    const [resClientes, resResets, resContas] = await Promise.all([
      fetch("/api/rastreamento/clientes").then((r) => r.json()),
      fetch("/api/rastreamento/reset").then((r) => r.json()),
      fetch("/api/contas").then((r) => r.json()),
    ]);
    setClientes(resClientes as ClienteCrm[]);
    setResets(resResets as SolicitacaoReset[]);
    setContas(resContas as ContaOpcao[]);
    setCarregando(false);
  }

  useEffect(() => { carregar(); }, []);

  async function aprovarCliente(id: string) {
    const contaId = contaSelecionada[id];
    if (!contaId) { alert("Selecione uma conta para vincular"); return; }
    setSalvando(id);
    await fetch(`/api/rastreamento/clientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "aprovar", contaAnuncioId: contaId }),
    });
    setSalvando(null);
    carregar();
  }

  async function rejeitarCliente(id: string) {
    if (!confirm("Rejeitar este cliente?")) return;
    setSalvando(id);
    await fetch(`/api/rastreamento/clientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "rejeitar" }),
    });
    setSalvando(null);
    carregar();
  }

  async function aprovarReset(id: string) {
    setSalvando(`reset-${id}`);
    await fetch(`/api/rastreamento/reset/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "aprovar" }),
    });
    setSalvando(null);
    carregar();
  }

  async function rejeitarReset(id: string) {
    setSalvando(`reset-${id}`);
    await fetch(`/api/rastreamento/reset/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "rejeitar" }),
    });
    setSalvando(null);
    carregar();
  }

  const pendentes = clientes.filter((c) => c.status === "pendente");
  const aprovados = clientes.filter((c) => c.status === "aprovado");

  if (carregando) {
    return (
      <div className="flex flex-col h-full">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">Carregando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 overflow-auto p-8 space-y-10">

        {/* Clientes pendentes */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Novos cadastros aguardando aprovação
            {pendentes.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {pendentes.length}
              </span>
            )}
          </h2>

          {pendentes.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum cadastro pendente.</p>
          ) : (
            <div className="space-y-3">
              {pendentes.map((c) => (
                <div
                  key={c.id}
                  className="border border-[#e5e5e5] rounded-xl p-5 bg-white flex items-start gap-4"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{c.nome}</p>
                    <p className="text-sm text-gray-500">{c.email}</p>
                    {c.telefone && <p className="text-sm text-gray-400">{c.telefone}</p>}
                    <p className="text-xs text-gray-300 mt-1">
                      Cadastrado em {new Date(c.criadoEm).toLocaleString("pt-BR")}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <select
                      value={contaSelecionada[c.id] ?? ""}
                      onChange={(e) =>
                        setContaSelecionada((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                      className="text-sm border border-[#e5e5e5] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
                    >
                      <option value="">Selecione uma conta</option>
                      {contas.map((co) => (
                        <option key={co.id} value={co.id}>
                          {co.nomeCliente}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        disabled={salvando === c.id}
                        onClick={() => aprovarCliente(c.id)}
                        className="flex-1 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        Aprovar
                      </button>
                      <button
                        disabled={salvando === c.id}
                        onClick={() => rejeitarCliente(c.id)}
                        className="flex-1 px-3 py-1.5 text-sm font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        Rejeitar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Solicitações de reset de senha */}
        {resets.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Solicitações de redefinição de senha
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                {resets.length}
              </span>
            </h2>
            <div className="space-y-3">
              {resets.map((r) => (
                <div
                  key={r.id}
                  className="border border-[#e5e5e5] rounded-xl p-5 bg-white flex items-center gap-4"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{r.clienteNome}</p>
                    <p className="text-sm text-gray-500">{r.clienteEmail}</p>
                    <p className="text-xs text-gray-300 mt-1">
                      Solicitado em {new Date(r.criadoEm).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={salvando === `reset-${r.id}`}
                      onClick={() => aprovarReset(r.id)}
                      className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      Aprovar
                    </button>
                    <button
                      disabled={salvando === `reset-${r.id}`}
                      onClick={() => rejeitarReset(r.id)}
                      className="px-3 py-1.5 text-sm font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Clientes aprovados */}
        {aprovados.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Clientes com acesso ativo</h2>
            <div className="space-y-2">
              {aprovados.map((c) => (
                <div
                  key={c.id}
                  className="border border-[#e5e5e5] rounded-lg px-5 py-3 bg-white flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                    <p className="text-xs text-gray-400">{c.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 rounded-full border border-green-200">
                      Aprovado
                    </span>
                    {c.nomeCliente && (
                      <p className="text-xs text-gray-400 mt-1">{c.nomeCliente}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="px-8 py-5 border-b border-[#e5e5e5] flex items-center gap-3">
      <button
        onClick={() => window.history.back()}
        className="text-gray-400 hover:text-gray-600 text-sm"
      >
        ← Voltar
      </button>
      <div>
        <h1 className="text-xl font-bold text-gray-900">Aprovação de Clientes CRM</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie acesso dos clientes ao painel de leads</p>
      </div>
    </div>
  );
}
