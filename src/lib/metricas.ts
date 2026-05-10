export type TipoFunil =
  | "whatsapp"
  | "landing_page_lead"
  | "landing_page_contato"
  | "ecommerce"
  | "conteudo"
  | "ecommerce_conteudo"
  | "outro";

export interface ConfiguracaoFunil {
  metricaPrincipal: string;
  labelMetricaPrincipal: string;
  labelCustoPorResultado: string;
  metricasDestaque: string[];
  submetricas: string[];
  metricasGrafico: string[];
}

export const CONFIGURACOES_FUNIL: Record<TipoFunil, ConfiguracaoFunil> = {
  whatsapp: {
    metricaPrincipal: "whatsappClicks",
    labelMetricaPrincipal: "Conversas no WhatsApp",
    labelCustoPorResultado: "Custo por Conversa",
    metricasDestaque: ["spend", "whatsappClicks", "whatsappCost", "cpm", "ctr", "taxaConversaWhatsapp"],
    submetricas: ["impressions", "reach", "inlineLinkClicks", "whatsappClicks", "outboundClicks", "frequency"],
    metricasGrafico: ["spend", "whatsappClicks", "whatsappCost", "cpm", "ctr", "reach", "impressions"],
  },
  landing_page_lead: {
    metricaPrincipal: "leadCount",
    labelMetricaPrincipal: "Leads",
    labelCustoPorResultado: "Custo por Lead",
    metricasDestaque: ["spend", "leadCount", "costPerLead", "cpm", "ctr", "taxaConversaoLead"],
    submetricas: ["impressions", "reach", "inlineLinkClicks", "landingPageViews", "landingPageViewRate", "frequency"],
    metricasGrafico: ["spend", "leadCount", "costPerLead", "cpm", "ctr", "landingPageViews", "reach"],
  },
  landing_page_contato: {
    metricaPrincipal: "contactCount",
    labelMetricaPrincipal: "Contatos",
    labelCustoPorResultado: "Custo por Contato",
    metricasDestaque: ["spend", "contactCount", "costPerContact", "cpm", "ctr", "taxaConversaoContato"],
    submetricas: ["impressions", "reach", "inlineLinkClicks", "landingPageViews", "landingPageViewRate", "frequency"],
    metricasGrafico: ["spend", "contactCount", "costPerContact", "cpm", "ctr", "landingPageViews"],
  },
  ecommerce: {
    metricaPrincipal: "purchaseCount",
    labelMetricaPrincipal: "Compras",
    labelCustoPorResultado: "Custo por Compra",
    metricasDestaque: ["spend", "purchaseCount", "costPerPurchase", "purchaseRoas", "ctr", "taxaConversaoCompra"],
    submetricas: ["impressions", "reach", "inlineLinkClicks", "addToCart", "initiateCheckout", "purchaseValue", "frequency"],
    metricasGrafico: ["spend", "purchaseCount", "purchaseRoas", "cpm", "ctr", "addToCart", "costPerPurchase"],
  },
  conteudo: {
    metricaPrincipal: "videoThruplay",
    labelMetricaPrincipal: "ThruPlays",
    labelCustoPorResultado: "Custo por ThruPlay",
    metricasDestaque: ["spend", "videoThruplay", "costPerThruplay", "videoView3s", "cpm", "taxaConversaoThruplay"],
    submetricas: ["impressions", "reach", "videoView25pct", "videoView50pct", "videoView100pct", "videoAvgTimeWatched", "ctr"],
    metricasGrafico: ["spend", "videoThruplay", "videoView3s", "videoView100pct", "cpm", "ctr"],
  },
  ecommerce_conteudo: {
    metricaPrincipal: "purchaseCount",
    labelMetricaPrincipal: "Compras",
    labelCustoPorResultado: "Custo por Compra",
    metricasDestaque: ["spend", "purchaseCount", "purchaseRoas", "videoThruplay", "cpm", "taxaConversaoCompra"],
    submetricas: ["impressions", "reach", "videoView3s", "addToCart", "purchaseValue", "frequency", "initiateCheckout"],
    metricasGrafico: ["spend", "purchaseCount", "purchaseRoas", "videoThruplay", "cpm", "ctr"],
  },
  outro: {
    metricaPrincipal: "resultadoPrincipal",
    labelMetricaPrincipal: "Resultado",
    labelCustoPorResultado: "Custo por Resultado",
    metricasDestaque: ["spend", "resultadoPrincipal", "custoPorResultado", "cpm", "ctr", "taxaConversao"],
    submetricas: ["impressions", "reach", "inlineLinkClicks", "frequency", "cpc", "uniqueCtr"],
    metricasGrafico: ["spend", "resultadoPrincipal", "custoPorResultado", "cpm", "ctr"],
  },
};

export const LABELS_FUNIL: Record<TipoFunil, string> = {
  whatsapp: "WhatsApp",
  landing_page_lead: "Landing Page — Lead",
  landing_page_contato: "Landing Page — Contato",
  ecommerce: "E-commerce",
  conteudo: "Conteúdo / Vídeo",
  ecommerce_conteudo: "E-commerce + Conteúdo",
  outro: "Outro",
};

export const LABELS_METRICAS: Record<string, string> = {
  spend: "Valor Gasto",
  impressions: "Impressões",
  reach: "Alcance",
  clicks: "Cliques Totais",
  inlineLinkClicks: "Cliques no Link",
  uniqueClicks: "Cliques Únicos",
  outboundClicks: "Cliques de Saída",
  landingPageViews: "Views da LP",
  cpm: "CPM",
  ctr: "CTR",
  cpc: "CPC",
  cpp: "CPP",
  frequency: "Frequência",
  uniqueCtr: "CTR Único",
  outboundCtr: "CTR de Saída",
  landingPageViewRate: "Taxa de LP",
  whatsappClicks: "Mensagens Iniciadas",
  whatsappCost: "Custo por Conversa",
  leadCount: "Leads",
  costPerLead: "Custo por Lead",
  purchaseCount: "Compras",
  purchaseValue: "Valor de Compras",
  purchaseRoas: "ROAS",
  costPerPurchase: "Custo por Compra",
  addToCart: "Adições ao Carrinho",
  initiateCheckout: "Início de Checkout",
  contactCount: "Contatos",
  costPerContact: "Custo por Contato",
  postEngagement: "Engajamentos",
  postReactions: "Reações",
  postComments: "Comentários",
  postShares: "Compartilhamentos",
  pageLikes: "Curtidas na Página",
  videoView3s: "Views 3s",
  videoView10s: "Views 10s",
  videoView25pct: "Views 25%",
  videoView50pct: "Views 50%",
  videoView75pct: "Views 75%",
  videoView95pct: "Views 95%",
  videoView100pct: "Views 100%",
  videoAvgTimeWatched: "Tempo Médio",
  videoPlayActions: "Plays",
  videoThruplay: "ThruPlays",
  costPerThruplay: "Custo por ThruPlay",
  resultadoPrincipal: "Resultado",
  custoPorResultado: "Custo por Resultado",
  // Taxas de conversão por funil
  taxaConversaWhatsapp: "Taxa de Conversa",
  taxaConversaoLead: "Taxa de Lead",
  taxaConversaoContato: "Taxa de Contato",
  taxaConversaoCompra: "Taxa de Compra",
  taxaConversaoThruplay: "Taxa de ThruPlay",
  taxaConversao: "Taxa de Conversão",
};

const METRICAS_MONETARIAS = new Set([
  "spend", "cpm", "cpc", "cpp", "whatsappCost", "costPerLead",
  "costPerPurchase", "costPerContact", "costPerThruplay", "custoPorResultado", "purchaseValue",
]);

const METRICAS_PERCENTUAIS = new Set([
  "ctr", "uniqueCtr", "outboundCtr", "landingPageViewRate",
  "taxaConversaWhatsapp", "taxaConversaoLead", "taxaConversaoContato",
  "taxaConversaoCompra", "taxaConversaoThruplay", "taxaConversao",
]);

export function formatarMetrica(campo: string, valor: number): string {
  if (METRICAS_MONETARIAS.has(campo)) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  if (METRICAS_PERCENTUAIS.has(campo)) {
    return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  }
  if (campo === "purchaseRoas") {
    return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
  }
  if (campo === "frequency") {
    return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (campo === "videoAvgTimeWatched") {
    const mins = Math.floor(valor / 60);
    const secs = Math.floor(valor % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  return Math.round(valor).toLocaleString("pt-BR");
}

export function isMetricaMonetaria(campo: string): boolean {
  return METRICAS_MONETARIAS.has(campo);
}
