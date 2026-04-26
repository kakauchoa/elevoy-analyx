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

export interface InsightNumericos {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  inlineLinkClicks: number;
  uniqueClicks: number;
  outboundClicks: number;
  landingPageViews: number;
  cpm: number;
  ctr: number;
  cpc: number;
  cpp: number;
  frequency: number;
  uniqueCtr: number;
  outboundCtr: number;
  landingPageViewRate: number;
  whatsappClicks: number;
  whatsappCost: number;
  leadCount: number;
  costPerLead: number;
  purchaseCount: number;
  purchaseValue: number;
  purchaseRoas: number;
  costPerPurchase: number;
  addToCart: number;
  initiateCheckout: number;
  contactCount: number;
  costPerContact: number;
  postEngagement: number;
  postReactions: number;
  postComments: number;
  postShares: number;
  pageLikes: number;
  videoView3s: number;
  videoView10s: number;
  videoView25pct: number;
  videoView50pct: number;
  videoView75pct: number;
  videoView95pct: number;
  videoView100pct: number;
  videoAvgTimeWatched: number;
  videoPlayActions: number;
  videoThruplay: number;
  costPerThruplay: number;
  resultadoPrincipal: number;
  custoPorResultado: number;
  // Taxas de conversão por funil (calculadas, não armazenadas no BD)
  taxaConversaWhatsapp: number;
  taxaConversaoLead: number;
  taxaConversaoContato: number;
  taxaConversaoCompra: number;
  taxaConversaoThruplay: number;
  taxaConversao: number;
}

export interface InsightDiarioSerializado extends InsightNumericos {
  data: string;
}

export type InsightAgregado = InsightNumericos;

export interface DashboardData {
  conta: {
    id: string;
    nomeCliente: string;
    tipoFunil: TipoFunil;
    metricaPrincipal: string;
    labelMetricaPrincipal: string;
    labelCustoPorResultado: string;
    ultimaSincronizacao: string | null;
  };
  agregado: InsightAgregado;
  porDia: InsightDiarioSerializado[];
  datasNoBanco: string[];
  datasFaltando: string[];
}

export interface AnuncioHierarquico {
  id: string;
  anuncioIdMeta: string;
  nome: string;
  status: string;
  metricas: InsightNumericos;
}

export interface ConjuntoHierarquico {
  id: string;
  adsetIdMeta: string;
  nome: string;
  status: string;
  metricas: InsightNumericos;
  anuncios: AnuncioHierarquico[];
}

export interface CampanhaHierarquica {
  id: string;
  campanhaIdMeta: string;
  nome: string;
  status: string;
  metricas: InsightNumericos;
  conjuntos: ConjuntoHierarquico[];
}
