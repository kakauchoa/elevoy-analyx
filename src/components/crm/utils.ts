import type { CrmOportunidade } from "./types";

export function telefoneSemFormatacao(tel: string): string {
  return tel.replace(/\D/g, "");
}

export function estaAtrasado(dataContato: string | null): boolean {
  if (!dataContato) return false;
  return new Date(dataContato) < new Date();
}

export function formatarData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Ordena oportunidades: atrasadas primeiro (mais antiga primeiro), depois futuras, depois sem data
export function ordenarOportunidades(oportunidades: CrmOportunidade[]): CrmOportunidade[] {
  const agora = new Date();
  const comData = oportunidades.filter((o) => o.dataContato !== null);
  const semData = oportunidades.filter((o) => o.dataContato === null);

  const atrasadas = comData
    .filter((o) => new Date(o.dataContato!) < agora)
    .sort((a, b) => new Date(a.dataContato!).getTime() - new Date(b.dataContato!).getTime());

  const futuras = comData
    .filter((o) => new Date(o.dataContato!) >= agora)
    .sort((a, b) => new Date(a.dataContato!).getTime() - new Date(b.dataContato!).getTime());

  return [...atrasadas, ...futuras, ...semData];
}
