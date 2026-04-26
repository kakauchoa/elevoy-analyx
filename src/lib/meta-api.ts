import {
  MetaAnuncio,
  MetaCampanha,
  MetaConjunto,
  MetaInsightBruto,
  MetaPaginadoResponse,
} from "@/types/meta";

const API_VERSION = process.env.META_API_VERSION ?? "v18.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

/** Campos solicitados ao endpoint /insights conforme CLAUDE.md */
// Apenas valores brutos que a API retorna diretamente — métricas derivadas são calculadas localmente
export const CAMPOS_INSIGHTS = [
  "spend",
  "impressions",
  "reach",
  "clicks",
  "inline_link_clicks",
  "unique_clicks",
  "outbound_clicks",
  "video_thruplay_watched_actions",
  "video_p25_watched_actions",
  "video_p50_watched_actions",
  "video_p75_watched_actions",
  "video_p95_watched_actions",
  "video_p100_watched_actions",
  "video_avg_time_watched_actions",
  "video_play_actions",
  "actions",
  "cost_per_action_type",
  "purchase_roas",
].join(",");

/**
 * Mapeia action_type do array `actions` para o campo Prisma correspondente.
 * Apenas campos de contagem (BigInt no schema).
 */
export const MAPA_ACTIONS: Record<string, string> = {
  "onsite_conversion.messaging_conversation_started_7d": "whatsappClicks",
  "offsite_conversion.fb_pixel_lead": "leadCount",
  lead: "leadCount",
  "offsite_conversion.fb_pixel_purchase": "purchaseCount",
  purchase: "purchaseCount",
  contact: "contactCount",
  "offsite_conversion.fb_pixel_contact": "contactCount",
  post_engagement: "postEngagement",
  post_reaction: "postReactions",
  comment: "postComments",
  post: "postShares",
  like: "pageLikes",
  add_to_cart: "addToCart",
  initiate_checkout: "initiateCheckout",
  omni_add_to_cart: "addToCart",
  omni_initiated_checkout: "initiateCheckout",
  omni_purchase: "purchaseCount",
  landing_page_view: "landingPageViews",
};

/**
 * Mapeia action_type do array `cost_per_action_type` para o campo Prisma de custo.
 */
export const MAPA_COST_PER_ACTION: Record<string, string> = {
  "onsite_conversion.messaging_conversation_started_7d": "whatsappCost",
  "offsite_conversion.fb_pixel_lead": "costPerLead",
  lead: "costPerLead",
  "offsite_conversion.fb_pixel_purchase": "costPerPurchase",
  purchase: "costPerPurchase",
  contact: "costPerContact",
  "offsite_conversion.fb_pixel_contact": "costPerContact",
};

/**
 * Mapeia o nome do campo de vídeo retornado pela API para o campo Prisma.
 * Esses campos retornam arrays com um único item.
 */
export const MAPA_CAMPO_VIDEO: Record<string, string> = {
  video_thruplay_watched_actions: "videoThruplay",
  video_p25_watched_actions: "videoView25pct",
  video_p50_watched_actions: "videoView50pct",
  video_p75_watched_actions: "videoView75pct",
  video_p95_watched_actions: "videoView95pct",
  video_p100_watched_actions: "videoView100pct",
  video_avg_time_watched_actions: "videoAvgTimeWatched",
  video_play_actions: "videoPlayActions",
};

/** Busca todas as páginas de um endpoint paginado da Graph API */
async function buscarTodasPaginas<T>(urlInicial: string): Promise<T[]> {
  const todos: T[] = [];
  let proxima: string | undefined = urlInicial;

  while (proxima) {
    const res = await fetch(proxima);
    const json = (await res.json()) as MetaPaginadoResponse<T>;

    if (json.error) {
      throw new Error(`Meta API [${json.error.code}]: ${json.error.message}`);
    }

    todos.push(...json.data);
    proxima = json.paging?.next;
  }

  return todos;
}

/** Busca insights de uma conta para um período e nível específico */
export async function buscarInsights(
  accountIdMeta: string,
  token: string,
  nivel: "account" | "campaign" | "adset" | "ad",
  dataInicio: string,
  dataFim: string
): Promise<MetaInsightBruto[]> {
  const timeRange = JSON.stringify({ since: dataInicio, until: dataFim });
  const params = new URLSearchParams({
    fields: CAMPOS_INSIGHTS,
    level: nivel,
    time_increment: "1",
    time_range: timeRange,
    limit: "500",
    access_token: token,
  });

  const url = `${BASE_URL}/${accountIdMeta}/insights?${params}`;
  return buscarTodasPaginas<MetaInsightBruto>(url);
}

/** Busca todas as campanhas ativas da conta */
export async function buscarCampanhas(
  accountIdMeta: string,
  token: string
): Promise<MetaCampanha[]> {
  const params = new URLSearchParams({
    fields: "id,name,status,objective",
    limit: "500",
    access_token: token,
  });

  const url = `${BASE_URL}/${accountIdMeta}/campaigns?${params}`;
  return buscarTodasPaginas<MetaCampanha>(url);
}

/** Busca todos os conjuntos de anúncios da conta */
export async function buscarConjuntos(
  accountIdMeta: string,
  token: string
): Promise<MetaConjunto[]> {
  const params = new URLSearchParams({
    fields: "id,name,status,campaign_id",
    limit: "500",
    access_token: token,
  });

  const url = `${BASE_URL}/${accountIdMeta}/adsets?${params}`;
  return buscarTodasPaginas<MetaConjunto>(url);
}

/** Busca todos os anúncios da conta */
export async function buscarAnuncios(
  accountIdMeta: string,
  token: string
): Promise<MetaAnuncio[]> {
  const params = new URLSearchParams({
    fields: "id,name,status,adset_id",
    limit: "500",
    access_token: token,
  });

  const url = `${BASE_URL}/${accountIdMeta}/ads?${params}`;
  return buscarTodasPaginas<MetaAnuncio>(url);
}
