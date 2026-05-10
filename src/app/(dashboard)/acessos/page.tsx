"use client";

import { useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface AcessoItem {
  id: string;
  nomeVisitante: string | null;
  localizacao: string | null;
  dispositivo: "desktop" | "mobile" | "tablet" | "desconhecido";
  duracaoSegundos: number | null;
  acessadoEm: string;
}

interface ClienteCard {
  id: string;
  nomeCliente: string;
  totalAcessos: number;
  ultimoAcesso: string | null;
  acessos: AcessoItem[];
}

interface ApiResponse {
  clientes: ClienteCard[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatarDuracao(segundos: number | null): string {
  if (!segundos) return "—";
  if (segundos < 60) return `${segundos}s`;
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarUltimoAcesso(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const LABEL_DISPOSITIVO: Record<AcessoItem["dispositivo"], string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  desconhecido: "—",
};

// ── Chevron ────────────────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-150 shrink-0 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Card de cliente ────────────────────────────────────────────────────────

function CardCliente({ cliente }: { cliente: ClienteCard }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
      {/* Header do card — clicável */}
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{cliente.nomeCliente}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Último acesso: {formatarUltimoAcesso(cliente.ultimoAcesso)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {cliente.totalAcessos} acesso{cliente.totalAcessos !== 1 ? "s" : ""}
          </span>
          <Chevron open={aberto} />
        </div>
      </button>

      {/* Tabela de acessos */}
      {aberto && (
        <>
          {cliente.acessos.length === 0 ? (
            <div className="px-5 py-6 border-t border-[#e5e5e5] text-center">
              <p className="text-sm text-gray-400">Nenhum acesso registrado.</p>
            </div>
          ) : (
            <div className="border-t border-[#e5e5e5] overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#e5e5e5]">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Visitante
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Data
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Localização
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Dispositivo
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Duração
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cliente.acessos.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-[#e5e5e5] last:border-0 hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {a.nomeVisitante ?? <span className="text-gray-400 font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatarData(a.acessadoEm)}</td>
                      <td className="px-4 py-3 text-gray-500">{a.localizacao ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{LABEL_DISPOSITIVO[a.dispositivo]}</td>
                      <td className="px-4 py-3 text-gray-500">{formatarDuracao(a.duracaoSegundos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────

export default function AcessosPage() {
  const [clientes, setClientes] = useState<ClienteCard[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/acessos")
      .then(async (r) => {
        const data: ApiResponse = await r.json();
        setClientes(data.clientes ?? []);
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  const totalAcessos = clientes.reduce((acc, c) => acc + c.totalAcessos, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Acessos</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Histórico de acessos aos dashboards compartilháveis
        </p>
      </div>

      {carregando && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-white border border-[#e5e5e5] rounded-xl animate-pulse"
            />
          ))}
        </div>
      )}

      {!carregando && clientes.length === 0 && (
        <div className="bg-white border border-[#e5e5e5] rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum acesso registrado ainda.</p>
        </div>
      )}

      {!carregando && clientes.length > 0 && (
        <>
          <p className="text-xs text-gray-400">
            {totalAcessos} acesso{totalAcessos !== 1 ? "s" : ""} em {clientes.length} cliente{clientes.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {clientes.map((c) => (
              <CardCliente key={c.id} cliente={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
