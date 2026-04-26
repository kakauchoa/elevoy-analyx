import { TipoFunil } from "@/lib/metricas";

export interface ContaAnuncio {
  id: string;
  nomeCliente: string;
  slugCompartilhavel: string;
  accountIdMeta: string;
  tipoFunil: TipoFunil;
  metricaPrincipal: string;
  labelMetricaPrincipal: string;
  labelCustoPorResultado: string;
  compartilhamentoAtivo: boolean;
  ultimaSincronizacao: string | null;
  criadoEm: string;
}
