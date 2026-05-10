"use client";

import { useEffect, useState } from "react";

interface AcessoItem {
  id: string;
  contaAnuncioId: string;
  nomeCliente: string;
  slug: string;
  pais: string | null;
  dispositivo: "desktop" | "mobile" | "tablet" | "desconhecido";
  duracaoSegundos: number | null;
  acessadoEm: string;
}

interface ContaSimples {
  id: string;
  nomeCliente: string;
}

interface ApiResponse {
  acessos: AcessoItem[];
  contas: ContaSimples[];
}

function formatarDuracao(segundos: number | null): string {
  if (!segundos) return "—";
  if (segundos < 60) return `${segundos}s`;
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

const LABEL_DISPOSITIVO: Record<AcessoItem["dispositivo"], string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  desconhecido: "—",
};

export default function AcessosPage() {
  const [acessos, setAcessos] = useState<AcessoItem[]>([]);
  const [contas, setContas] = useState<ContaSimples[]>([]);
  const [contaFiltro, setContaFiltro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const url = contaFiltro ? `/api/acessos?contaId=${contaFiltro}` : "/api/acessos";
    setCarregando(true);
    fetch(url)
      .then(async (r) => {
        const data: ApiResponse = await r.json();
        setAcessos(data.acessos ?? []);
        if (data.contas?.length) setContas(data.contas);
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, [contaFiltro]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Acessos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Histórico de acessos aos dashboards compartilháveis
          </p>
        </div>

        {contas.length > 1 && (
          <select
            value={contaFiltro}
            onChange={(e) => setContaFiltro(e.target.value)}
            className="text-sm border border-[#e5e5e5] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">Todas as contas</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nomeCliente}
              </option>
            ))}
          </select>
        )}
      </div>

      {carregando && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-12 bg-white border border-[#e5e5e5] rounded-xl animate-pulse"
            />
          ))}
        </div>
      )}

      {!carregando && acessos.length === 0 && (
        <div className="bg-white border border-[#e5e5e5] rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum acesso registrado ainda.</p>
        </div>
      )}

      {!carregando && acessos.length > 0 && (
        <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#e5e5e5]">
            <p className="text-xs text-gray-400 font-medium">
              {acessos.length} acesso{acessos.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-gray-50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Data
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Dispositivo
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    País
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Duração
                  </th>
                </tr>
              </thead>
              <tbody>
                {acessos.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-[#e5e5e5] last:border-0 hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{a.nomeCliente}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(a.acessadoEm).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {LABEL_DISPOSITIVO[a.dispositivo]}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{a.pais ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatarDuracao(a.duracaoSegundos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
