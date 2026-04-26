"use client";

export type TipoPeriodo =
  | "hoje"
  | "ontem"
  | "ultimos7dias"
  | "ultimos30dias"
  | "esteMes"
  | "esteTrimestre"
  | "esteAno";

export interface Periodo {
  inicio: string;
  fim: string;
}

const OPCOES: { value: TipoPeriodo; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "ontem", label: "Ontem" },
  { value: "ultimos7dias", label: "Últimos 7 dias" },
  { value: "ultimos30dias", label: "Últimos 30 dias" },
  { value: "esteMes", label: "Este mês" },
  { value: "esteTrimestre", label: "Este trimestre" },
  { value: "esteAno", label: "Este ano" },
];

function dataLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function calcularPeriodo(tipo: TipoPeriodo): Periodo {
  const hoje = new Date();

  switch (tipo) {
    case "hoje": {
      const s = dataLocal(hoje);
      return { inicio: s, fim: s };
    }
    case "ontem": {
      const d = new Date(hoje);
      d.setDate(d.getDate() - 1);
      const s = dataLocal(d);
      return { inicio: s, fim: s };
    }
    case "ultimos7dias": {
      const d = new Date(hoje);
      d.setDate(d.getDate() - 6);
      return { inicio: dataLocal(d), fim: dataLocal(hoje) };
    }
    case "ultimos30dias": {
      const d = new Date(hoje);
      d.setDate(d.getDate() - 29);
      return { inicio: dataLocal(d), fim: dataLocal(hoje) };
    }
    case "esteMes": {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { inicio: dataLocal(d), fim: dataLocal(hoje) };
    }
    case "esteTrimestre": {
      const mesInicio = Math.floor(hoje.getMonth() / 3) * 3;
      const d = new Date(hoje.getFullYear(), mesInicio, 1);
      return { inicio: dataLocal(d), fim: dataLocal(hoje) };
    }
    case "esteAno": {
      const d = new Date(hoje.getFullYear(), 0, 1);
      return { inicio: dataLocal(d), fim: dataLocal(hoje) };
    }
  }
}

interface FiltrosPeriodoProps {
  selecionado: TipoPeriodo;
  onChange: (tipo: TipoPeriodo) => void;
}

export function FiltrosPeriodo({ selecionado, onChange }: FiltrosPeriodoProps) {
  return (
    <select
      value={selecionado}
      onChange={(e) => onChange(e.target.value as TipoPeriodo)}
      className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
    >
      {OPCOES.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
