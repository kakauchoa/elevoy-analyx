"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "pendente" | "feita" | "descartada";

interface Props {
  id: string;
  titulo: string;
  descricao: string;
  plataforma: string;
  prioridadeLabel: string;
  prioridadeClasse: string;
  status: Status;
  data: string;
}

export function OtimizacaoItem(props: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(props.status);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function mudar(novo: Status) {
    setSalvando(true);
    setErro("");
    try {
      const resp = await fetch(`/api/claude/otimizacoes/${props.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novo }),
      });
      if (!resp.ok) throw new Error();
      setStatus(novo);
      router.refresh();
    } catch {
      setErro("Não foi possível salvar. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  const riscado = status !== "pendente";

  return (
    <div className={`border border-[#e5e5e5] rounded-xl p-4 ${riscado ? "bg-gray-50" : "bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${props.prioridadeClasse}`}>
              {props.prioridadeLabel}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 uppercase">
              {props.plataforma}
            </span>
            <span className="text-[11px] text-gray-400">{props.data}</span>
          </div>
          <p className={`text-sm font-semibold ${riscado ? "text-gray-400 line-through" : "text-gray-900"}`}>
            {props.titulo}
          </p>
          <p className={`text-sm mt-1 ${riscado ? "text-gray-400" : "text-gray-600"}`}>{props.descricao}</p>
          {erro && <p className="text-xs text-red-600 mt-2">{erro}</p>}
        </div>

        <div className="flex shrink-0 gap-1.5">
          {status === "pendente" ? (
            <>
              <button
                onClick={() => mudar("feita")}
                disabled={salvando}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#e85a23] text-white hover:bg-[#d14d1e] disabled:opacity-50"
              >
                Feito
              </button>
              <button
                onClick={() => mudar("descartada")}
                disabled={salvando}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#e5e5e5] text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Descartar
              </button>
            </>
          ) : (
            <button
              onClick={() => mudar("pendente")}
              disabled={salvando}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#e5e5e5] text-gray-500 hover:bg-white disabled:opacity-50"
            >
              {status === "feita" ? "✓ Feito · desfazer" : "Descartada · desfazer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
