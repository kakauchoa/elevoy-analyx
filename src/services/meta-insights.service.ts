import { prisma } from "@/lib/prisma";
import {
  buscarAnuncios,
  buscarCampanhas,
  buscarConjuntos,
  buscarInsights,
  MAPA_ACTIONS,
  MAPA_CAMPO_VIDEO,
  MAPA_COST_PER_ACTION,
} from "@/lib/meta-api";
import { MetaActionValue, MetaInsightBruto } from "@/types/meta";

export interface ResultadoSincronizacao {
  sincronizados: number;
  erros: string[];
}

/**
 * Campos decimais do schema — usam parseFloat em vez de BigInt.
 * BigInt é usado para todos os outros campos numéricos de contagem.
 */
const CAMPOS_DECIMAL = new Set([
  "whatsappCost",
  "costPerLead",
  "costPerPurchase",
  "costPerContact",
  "purchaseRoas",
  "videoAvgTimeWatched",
  "costPerThruplay",
]);

/** Extrai o primeiro valor de um array de ações por action_type */
function extrairValorAction(
  arr: MetaActionValue[] | undefined,
  actionType: string
): string | undefined {
  return arr?.find((a) => a.action_type === actionType)?.value;
}

/** Divisão segura — retorna null se o divisor for zero ou indefinido */
function div(numerador: bigint | number | undefined, divisor: bigint | number | undefined): number | null {
  if (numerador === undefined || divisor === undefined) return null;
  const d = Number(divisor);
  if (d === 0) return null;
  return Number(numerador) / d;
}

/**
 * Converte um registro bruto da Graph API para os campos do schema Prisma.
 * Campos BigInt recebem BigInt(); campos Decimal recebem parseFloat().
 * Métricas derivadas (cpm, ctr, cpc, etc.) são calculadas localmente.
 */
function transformarInsight(record: MetaInsightBruto): Record<string, bigint | number | string | null> {
  const dados: Record<string, bigint | number | string | null> = {};

  // Campos brutos diretos (string → número)
  const numericos: Record<string, "bigint" | "float"> = {
    impressions: "bigint",
    reach: "bigint",
    clicks: "bigint",
    inline_link_clicks: "bigint",
    unique_clicks: "bigint",
    spend: "float",
  };

  const mapaCampoNomePrisma: Record<string, string> = {
    inline_link_clicks: "inlineLinkClicks",
    unique_clicks: "uniqueClicks",
  };

  for (const [campo, tipo] of Object.entries(numericos)) {
    const valor = record[campo as keyof MetaInsightBruto] as string | undefined;
    if (valor === undefined || valor === null) continue;

    const prismaField = mapaCampoNomePrisma[campo] ?? campo;
    dados[prismaField] = tipo === "bigint" ? BigInt(valor) : parseFloat(valor);
  }

  // outbound_clicks — array com action_type "outbound_click"
  const outboundClicksVal = extrairValorAction(record.outbound_clicks, "outbound_click");
  if (outboundClicksVal) dados.outboundClicks = BigInt(outboundClicksVal);

  // actions → mapeamento via MAPA_ACTIONS para campos de contagem
  for (const action of record.actions ?? []) {
    const campo = MAPA_ACTIONS[action.action_type];
    if (!campo) continue;

    // Soma caso action_type diferente mapeie para o mesmo campo (ex: lead + fb_pixel_lead)
    const atual = dados[campo];
    const novo = BigInt(action.value);
    dados[campo] = atual !== undefined ? (atual as bigint) + novo : novo;
  }

  // cost_per_action_type → mapeamento via MAPA_COST_PER_ACTION
  for (const custo of record.cost_per_action_type ?? []) {
    const campo = MAPA_COST_PER_ACTION[custo.action_type];
    if (!campo) continue;
    if (dados[campo] === undefined) {
      dados[campo] = parseFloat(custo.value);
    }
  }

  // purchase_roas — extrai o primeiro tipo de compra encontrado
  const tiposCompra = [
    "offsite_conversion.fb_pixel_purchase",
    "purchase",
    "omni_purchase",
  ];
  for (const tipo of tiposCompra) {
    const roas = extrairValorAction(record.purchase_roas, tipo);
    if (roas) {
      dados.purchaseRoas = parseFloat(roas);
      break;
    }
  }

  // Campos de vídeo — cada campo da API retorna array com um único item
  for (const [campoApi, camposPrisma] of Object.entries(MAPA_CAMPO_VIDEO)) {
    const arr = record[campoApi as keyof MetaInsightBruto] as MetaActionValue[] | undefined;
    const item = arr?.[0];
    if (!item) continue;

    const ehDecimal = CAMPOS_DECIMAL.has(camposPrisma);
    dados[camposPrisma] = ehDecimal ? parseFloat(item.value) : BigInt(item.value);
  }

  // Vídeos de 3s vêm pelo actions com action_type "video_view"
  const view3s = extrairValorAction(record.actions, "video_view");
  if (view3s) dados.videoView3s = BigInt(view3s);

  // Vídeos de 10s vêm pelo actions com action_type específico
  const view10s = extrairValorAction(record.actions, "video_10_sec_watched_actions");
  if (view10s) dados.videoView10s = BigInt(view10s);

  // --- Métricas derivadas (calculadas localmente, nunca solicitadas à API) ---
  const spend = dados.spend as number | undefined;
  const impressions = dados.impressions as bigint | undefined;
  const reach = dados.reach as bigint | undefined;
  const clicks = dados.clicks as bigint | undefined;
  const uniqueClicks = dados.uniqueClicks as bigint | undefined;
  const outboundClicks = dados.outboundClicks as bigint | undefined;
  const landingPageViews = dados.landingPageViews as bigint | undefined;
  const resultadoPrincipal = dados.resultadoPrincipal as bigint | undefined;

  const cpm = div(spend !== undefined ? spend * 1000 : undefined, impressions);
  if (cpm !== null) dados.cpm = parseFloat(cpm.toFixed(4));

  const cpc = div(spend, clicks);
  if (cpc !== null) dados.cpc = parseFloat(cpc.toFixed(4));

  const ctr = div(clicks !== undefined ? Number(clicks) * 100 : undefined, impressions);
  if (ctr !== null) dados.ctr = parseFloat(ctr.toFixed(6));

  const cpp = div(spend !== undefined ? spend * 1000 : undefined, reach);
  if (cpp !== null) dados.cpp = parseFloat(cpp.toFixed(4));

  const frequency = div(impressions, reach);
  if (frequency !== null) dados.frequency = parseFloat(frequency.toFixed(4));

  const uniqueCtr = div(uniqueClicks !== undefined ? Number(uniqueClicks) * 100 : undefined, impressions);
  if (uniqueCtr !== null) dados.uniqueCtr = parseFloat(uniqueCtr.toFixed(6));

  const outboundCtr = div(outboundClicks !== undefined ? Number(outboundClicks) * 100 : undefined, impressions);
  if (outboundCtr !== null) dados.outboundCtr = parseFloat(outboundCtr.toFixed(6));

  const landingPageViewRate = div(landingPageViews !== undefined ? Number(landingPageViews) * 100 : undefined, clicks);
  if (landingPageViewRate !== null) dados.landingPageViewRate = parseFloat(landingPageViewRate.toFixed(6));

  const custoPorResultado = div(spend, resultadoPrincipal);
  if (custoPorResultado !== null) dados.custoPorResultado = parseFloat(custoPorResultado.toFixed(4));

  return dados;
}

/** Upsert de campanhas no banco, retorna mapa metaId → id interno */
async function sincronizarCampanhas(
  accountIdMeta: string,
  token: string,
  contaAnuncioId: string
): Promise<Map<string, string>> {
  const campanhas = await buscarCampanhas(accountIdMeta, token);
  const mapa = new Map<string, string>();

  for (const c of campanhas) {
    const registro = await prisma.campanha.upsert({
      where: { campanhaIdMeta: c.id },
      create: {
        contaAnuncioId,
        campanhaIdMeta: c.id,
        nome: c.name,
        status: c.status,
        objetivo: c.objective ?? null,
      },
      update: {
        nome: c.name,
        status: c.status,
        objetivo: c.objective ?? null,
      },
      select: { id: true },
    });
    mapa.set(c.id, registro.id);
  }

  return mapa;
}

/** Upsert de conjuntos de anúncio, retorna mapa metaId → id interno */
async function sincronizarConjuntos(
  accountIdMeta: string,
  token: string,
  contaAnuncioId: string,
  mapaIdCampanha: Map<string, string>
): Promise<Map<string, string>> {
  const conjuntos = await buscarConjuntos(accountIdMeta, token);
  const mapa = new Map<string, string>();

  for (const c of conjuntos) {
    const campanhaId = mapaIdCampanha.get(c.campaign_id);
    // Ignora conjuntos cujas campanhas não foram sincronizadas
    if (!campanhaId) continue;

    const registro = await prisma.conjuntoAnuncio.upsert({
      where: { adsetIdMeta: c.id },
      create: { campanhaId, adsetIdMeta: c.id, nome: c.name, status: c.status },
      update: { nome: c.name, status: c.status },
      select: { id: true },
    });
    mapa.set(c.id, registro.id);
  }

  return mapa;
}

/** Upsert de anúncios, retorna mapa metaId → id interno */
async function sincronizarAnuncios(
  accountIdMeta: string,
  token: string,
  mapaIdConjunto: Map<string, string>
): Promise<Map<string, string>> {
  const anuncios = await buscarAnuncios(accountIdMeta, token);
  const mapa = new Map<string, string>();

  for (const a of anuncios) {
    const conjuntoId = mapaIdConjunto.get(a.adset_id);
    if (!conjuntoId) continue;

    const registro = await prisma.anuncio.upsert({
      where: { anuncioIdMeta: a.id },
      create: { conjuntoId, anuncioIdMeta: a.id, nome: a.name, status: a.status },
      update: { nome: a.name, status: a.status },
      select: { id: true },
    });
    mapa.set(a.id, registro.id);
  }

  return mapa;
}

/** Sincroniza insights de um único nível e retorna contadores */
async function sincronizarInsightsNivel(params: {
  nivel: "conta" | "campanha" | "conjunto" | "anuncio";
  nivelMeta: "account" | "campaign" | "adset" | "ad";
  accountIdMeta: string;
  token: string;
  contaAnuncioId: string;
  dataInicio: string;
  dataFim: string;
  mapaIdInterno: Map<string, string> | null;
}): Promise<ResultadoSincronizacao> {
  const { nivel, nivelMeta, accountIdMeta, token, contaAnuncioId, dataInicio, dataFim, mapaIdInterno } =
    params;

  const registros = await buscarInsights(accountIdMeta, token, nivelMeta, dataInicio, dataFim);

  let sincronizados = 0;
  const erros: string[] = [];

  for (const registro of registros) {
    try {
      const metaId =
        nivel === "conta"
          ? accountIdMeta
          : nivel === "campanha"
          ? (registro.campaign_id ?? "")
          : nivel === "conjunto"
          ? (registro.adset_id ?? "")
          : (registro.ad_id ?? "");

      if (!metaId) continue;

      // referenciaId é o UUID interno do objeto relacionado (null para conta)
      const referenciaId = nivel === "conta" ? null : (mapaIdInterno?.get(metaId) ?? null);

      const dataInsight = new Date(`${registro.date_start}T00:00:00.000Z`);
      const dadosMetricas = transformarInsight(registro);

      await prisma.insightDiario.upsert({
        where: {
          contaAnuncioId_nivel_referenciaMetaId_data: {
            contaAnuncioId,
            nivel,
            referenciaMetaId: metaId,
            data: dataInsight,
          },
        },
        create: {
          contaAnuncioId,
          nivel,
          referenciaId,
          referenciaMetaId: metaId,
          data: dataInsight,
          sincronizadoEm: new Date(),
          ...dadosMetricas,
        },
        update: {
          referenciaId,
          sincronizadoEm: new Date(),
          ...dadosMetricas,
        },
      });

      sincronizados++;
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : String(erro);
      erros.push(`[${nivel}] ${registro.date_start}: ${msg}`);
      console.error(`[meta-insights] Erro ao salvar ${nivel} ${registro.date_start}:`, erro);
    }
  }

  return { sincronizados, erros };
}

/**
 * Ponto de entrada principal do serviço.
 * Sincroniza uma conta de anúncio completa: entidades + insights em todos os níveis.
 */
export async function sincronizarContaAnuncio(params: {
  contaAnuncioId: string;
  accountIdMeta: string;
  tokenAcesso: string;
  dataInicio: string;
  dataFim: string;
}): Promise<ResultadoSincronizacao> {
  const { contaAnuncioId, accountIdMeta, tokenAcesso, dataInicio, dataFim } = params;

  let sincronizados = 0;
  const erros: string[] = [];

  // Sincroniza entidades primeiro para ter os IDs internos disponíveis nos insights
  const mapaIdCampanha = await sincronizarCampanhas(accountIdMeta, tokenAcesso, contaAnuncioId);
  const mapaIdConjunto = await sincronizarConjuntos(accountIdMeta, tokenAcesso, contaAnuncioId, mapaIdCampanha);
  const mapaIdAnuncio = await sincronizarAnuncios(accountIdMeta, tokenAcesso, mapaIdConjunto);

  const niveis: Array<{
    nivel: "conta" | "campanha" | "conjunto" | "anuncio";
    nivelMeta: "account" | "campaign" | "adset" | "ad";
    mapa: Map<string, string> | null;
  }> = [
    { nivel: "conta",    nivelMeta: "account",  mapa: null },
    { nivel: "campanha", nivelMeta: "campaign", mapa: mapaIdCampanha },
    { nivel: "conjunto", nivelMeta: "adset",    mapa: mapaIdConjunto },
    { nivel: "anuncio",  nivelMeta: "ad",       mapa: mapaIdAnuncio },
  ];

  for (const { nivel, nivelMeta, mapa } of niveis) {
    const resultado = await sincronizarInsightsNivel({
      nivel,
      nivelMeta,
      accountIdMeta,
      token: tokenAcesso,
      contaAnuncioId,
      dataInicio,
      dataFim,
      mapaIdInterno: mapa,
    });

    sincronizados += resultado.sincronizados;
    erros.push(...resultado.erros);
  }

  // Atualiza timestamp da última sincronização bem-sucedida (mesmo com erros parciais)
  await prisma.contaAnuncio.update({
    where: { id: contaAnuncioId },
    data: { ultimaSincronizacao: new Date() },
  });

  return { sincronizados, erros };
}
