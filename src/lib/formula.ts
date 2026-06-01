export type TokenFormula =
  | { tipo: "metrica"; campo: string }
  | { tipo: "numero"; valor: number }
  | { tipo: "operador"; op: "+" | "-" | "*" | "/" };

export type FormulaMetrica = TokenFormula[];

export type FormatoMetrica = "moeda" | "percentual" | "numero";

export interface MetricaPersonalizadaClient {
  id: string;
  nome: string;
  formula: FormulaMetrica;
  formato: FormatoMetrica;
}

// Avalia a fórmula com precedência de operadores (* e / antes de + e -)
export function avaliarFormula(
  tokens: FormulaMetrica,
  dados: Record<string, number>
): number {
  if (tokens.length === 0) return 0;

  const flat: (number | string)[] = tokens.map((t) => {
    if (t.tipo === "metrica") return dados[t.campo] ?? 0;
    if (t.tipo === "numero") return t.valor;
    return t.op;
  });

  // Primeira passagem: * e /
  let i = 0;
  const pass1: (number | string)[] = [];
  while (i < flat.length) {
    const v = flat[i];
    if (typeof v === "string" && (v === "*" || v === "/")) {
      const left = pass1.pop() as number;
      const right = flat[i + 1] as number;
      pass1.push(v === "*" ? left * right : right === 0 ? 0 : left / right);
      i += 2;
    } else {
      pass1.push(v);
      i++;
    }
  }

  // Segunda passagem: + e -
  let result = pass1[0] as number;
  for (let j = 1; j < pass1.length; j += 2) {
    const op = pass1[j] as string;
    const val = pass1[j + 1] as number;
    result = op === "+" ? result + val : result - val;
  }

  return isNaN(result) || !isFinite(result) ? 0 : result;
}

export function formatarFormulaTexto(
  tokens: FormulaMetrica,
  labels: Record<string, string>
): string {
  return tokens
    .map((t) => {
      if (t.tipo === "metrica") return labels[t.campo] ?? t.campo;
      if (t.tipo === "numero") return String(t.valor);
      return t.op;
    })
    .join(" ");
}
