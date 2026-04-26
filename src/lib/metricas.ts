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
    metricaPrincipal: "whatsapp_clicks",
    labelMetricaPrincipal: "Conversas no WhatsApp",
    labelCustoPorResultado: "Custo por Conversa",
    metricasDestaque: ["spend", "whatsapp_clicks", "whatsapp_cost", "cpm", "ctr", "unique_ctr"],
    submetricas: ["impressions", "reach", "clicks", "outbound_clicks", "frequency"],
    metricasGrafico: ["spend", "whatsapp_clicks", "whatsapp_cost", "cpm", "ctr", "reach", "impressions"],
  },
  landing_page_lead: {
    metricaPrincipal: "lead_count",
    labelMetricaPrincipal: "Leads",
    labelCustoPorResultado: "Custo por Lead",
    metricasDestaque: ["spend", "lead_count", "cost_per_lead", "cpm", "ctr", "landing_page_view_rate"],
    submetricas: ["impressions", "reach", "clicks", "landing_page_views", "frequency"],
    metricasGrafico: ["spend", "lead_count", "cost_per_lead", "cpm", "ctr", "landing_page_views", "reach"],
  },
  landing_page_contato: {
    metricaPrincipal: "contact_count",
    labelMetricaPrincipal: "Contatos",
    labelCustoPorResultado: "Custo por Contato",
    metricasDestaque: ["spend", "contact_count", "cost_per_contact", "cpm", "ctr", "landing_page_view_rate"],
    submetricas: ["impressions", "reach", "clicks", "landing_page_views", "frequency"],
    metricasGrafico: ["spend", "contact_count", "cost_per_contact", "cpm", "ctr", "landing_page_views"],
  },
  ecommerce: {
    metricaPrincipal: "purchase_count",
    labelMetricaPrincipal: "Compras",
    labelCustoPorResultado: "Custo por Compra",
    metricasDestaque: ["spend", "purchase_count", "cost_per_purchase", "purchase_roas", "ctr", "cpm"],
    submetricas: ["impressions", "reach", "clicks", "add_to_cart", "initiate_checkout", "purchase_value"],
    metricasGrafico: ["spend", "purchase_count", "purchase_roas", "cpm", "ctr", "add_to_cart", "cost_per_purchase"],
  },
  conteudo: {
    metricaPrincipal: "video_thruplay",
    labelMetricaPrincipal: "ThruPlays",
    labelCustoPorResultado: "Custo por ThruPlay",
    metricasDestaque: ["spend", "video_thruplay", "cost_per_thruplay", "video_view_3s", "cpm", "ctr"],
    submetricas: ["impressions", "reach", "video_view_25pct", "video_view_50pct", "video_view_100pct", "video_avg_time_watched"],
    metricasGrafico: ["spend", "video_thruplay", "video_view_3s", "video_view_100pct", "cpm", "ctr"],
  },
  ecommerce_conteudo: {
    metricaPrincipal: "purchase_count",
    labelMetricaPrincipal: "Compras",
    labelCustoPorResultado: "Custo por Compra",
    metricasDestaque: ["spend", "purchase_count", "purchase_roas", "video_thruplay", "cpm", "ctr"],
    submetricas: ["impressions", "reach", "video_view_3s", "add_to_cart", "purchase_value", "frequency"],
    metricasGrafico: ["spend", "purchase_count", "purchase_roas", "video_thruplay", "cpm", "ctr"],
  },
  outro: {
    metricaPrincipal: "resultado_principal",
    labelMetricaPrincipal: "Resultado",
    labelCustoPorResultado: "Custo por Resultado",
    metricasDestaque: ["spend", "resultado_principal", "custo_por_resultado", "cpm", "ctr", "impressions"],
    submetricas: ["reach", "clicks", "frequency", "cpc"],
    metricasGrafico: ["spend", "resultado_principal", "custo_por_resultado", "cpm", "ctr"],
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
