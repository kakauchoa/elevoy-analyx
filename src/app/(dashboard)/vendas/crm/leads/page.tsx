"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CrmEtapa, CrmOrigem } from "@/components/crm/types";
import { formatarData } from "@/components/crm/utils";

interface LeadLista {
  id: string;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  mensagem: string | null;
  canal: string | null;
  campanha: string | null;
  convertidoEm: string | null;
  criadoEm: string;
  origem: CrmOrigem | null;
  oportunidade: { id: string; titulo: string } | null;
}

function ModalConverter({ lead, etapas, onClose, onConvertido }: {
  lead: LeadLista;
  etapas: CrmEtapa[];
  onClose: () => void;
  onConvertido: (leadId: string) => void;
}) {
  const [etapaId, setEtapaId] = useState(etapas.find((e) => e.fixo)?.id ?? etapas[0]?.id ?? "");
  const [titulo, setTitulo] = useState(lead.nome ?? "");
  const [empresa, setEmpresa] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  async function converter() {
    if (!etapaId) { setErro("Selecione uma etapa"); return; }
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}/converter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapaId, titulo: titulo || undefined, empresa: empresa || undefined }),
      });
      const data = (await res.json()) as { id?: string; erro?: string };
      if (!res.ok) { setErro(data.erro ?? "Erro ao converter"); return; }
      onConvertido(lead.id);
      router.push("/vendas/crm");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Converter lead em oportunidade</h2>
        {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Título da oportunidade</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Empresa (opcional)</label>
          <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Etapa do pipeline</label>
          <select value={etapaId} onChange={(e) => setEtapaId(e.target.value)} className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
            {etapas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-700 border border-[#e5e5e5] rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={() => void converter()} disabled={salvando} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-900 disabled:opacity-50">
            {salvando ? "Convertendo..." : "Converter"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadLista[]>([]);
  const [etapas, setEtapas] = useState<CrmEtapa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [leadConvertendo, setLeadConvertendo] = useState<LeadLista | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [resLeads, resEtapas] = await Promise.all([
      fetch("/api/crm/leads"),
      fetch("/api/crm/etapas"),
    ]);
    if (resLeads.ok) setLeads((await resLeads.json()) as LeadLista[]);
    if (resEtapas.ok) setEtapas((await resEtapas.json()) as CrmEtapa[]);
    setCarregando(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function excluir(id: string) {
    await fetch(`/api/crm/leads/${id}`, { method: "DELETE" });
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5]">
        <h1 className="text-xl font-bold text-gray-900">Leads</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Entradas brutas de qualquer canal (WhatsApp, formulários, manual). Converta em oportunidade para entrar no pipeline.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {carregando ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : leads.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum lead recebido ainda.</p>
        ) : (
          <div className="border border-[#e5e5e5] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Nome</th>
                  <th className="text-left px-4 py-2.5 font-medium">Telefone</th>
                  <th className="text-left px-4 py-2.5 font-medium">Origem</th>
                  <th className="text-left px-4 py-2.5 font-medium">Canal</th>
                  <th className="text-left px-4 py-2.5 font-medium">Recebido em</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{l.nome ?? "Sem nome"}</td>
                    <td className="px-4 py-2.5 text-gray-600">{l.telefone ?? "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600">{l.origem?.nome ?? "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600">{l.canal ?? "manual"}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{formatarData(l.criadoEm)}</td>
                    <td className="px-4 py-2.5">
                      {l.convertidoEm ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Convertido</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Pendente</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right space-x-2">
                      {!l.convertidoEm && (
                        <button onClick={() => setLeadConvertendo(l)} className="text-xs text-gray-900 font-medium hover:underline">
                          Converter
                        </button>
                      )}
                      <button onClick={() => void excluir(l.id)} className="text-xs text-red-500 hover:text-red-700">
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {leadConvertendo && (
        <ModalConverter
          lead={leadConvertendo}
          etapas={etapas}
          onClose={() => setLeadConvertendo(null)}
          onConvertido={(id) => {
            setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, convertidoEm: new Date().toISOString() } : l)));
            setLeadConvertendo(null);
          }}
        />
      )}
    </div>
  );
}
