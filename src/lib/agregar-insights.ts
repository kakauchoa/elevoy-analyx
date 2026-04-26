import type { InsightDiario } from "@prisma/client";
import type { InsightNumericos, InsightDiarioSerializado } from "@/types/dashboard";

function n(v: bigint | null | undefined): number {
  return v != null ? Number(v) : 0;
}

function f(v: { toNumber: () => number } | null | undefined): number {
  return v != null ? v.toNumber() : 0;
}

/** Converte um InsightDiario do Prisma para tipos serializáveis (sem BigInt/Decimal) */
export function serializarDia(i: InsightDiario): InsightDiarioSerializado {
  return {
    data: i.data.toISOString().slice(0, 10),
    spend: f(i.spend),
    impressions: n(i.impressions),
    reach: n(i.reach),
    clicks: n(i.clicks),
    inlineLinkClicks: n(i.inlineLinkClicks),
    uniqueClicks: n(i.uniqueClicks),
    outboundClicks: n(i.outboundClicks),
    landingPageViews: n(i.landingPageViews),
    cpm: f(i.cpm),
    ctr: f(i.ctr),
    cpc: f(i.cpc),
    cpp: f(i.cpp),
    frequency: f(i.frequency),
    uniqueCtr: f(i.uniqueCtr),
    outboundCtr: f(i.outboundCtr),
    landingPageViewRate: f(i.landingPageViewRate),
    whatsappClicks: n(i.whatsappClicks),
    whatsappCost: f(i.whatsappCost),
    leadCount: n(i.leadCount),
    costPerLead: f(i.costPerLead),
    purchaseCount: n(i.purchaseCount),
    purchaseValue: f(i.purchaseValue),
    purchaseRoas: f(i.purchaseRoas),
    costPerPurchase: f(i.costPerPurchase),
    addToCart: n(i.addToCart),
    initiateCheckout: n(i.initiateCheckout),
    contactCount: n(i.contactCount),
    costPerContact: f(i.costPerContact),
    postEngagement: n(i.postEngagement),
    postReactions: n(i.postReactions),
    postComments: n(i.postComments),
    postShares: n(i.postShares),
    pageLikes: n(i.pageLikes),
    videoView3s: n(i.videoView3s),
    videoView10s: n(i.videoView10s),
    videoView25pct: n(i.videoView25pct),
    videoView50pct: n(i.videoView50pct),
    videoView75pct: n(i.videoView75pct),
    videoView95pct: n(i.videoView95pct),
    videoView100pct: n(i.videoView100pct),
    videoAvgTimeWatched: f(i.videoAvgTimeWatched),
    videoPlayActions: n(i.videoPlayActions),
    videoThruplay: n(i.videoThruplay),
    costPerThruplay: f(i.costPerThruplay),
    resultadoPrincipal: n(i.resultadoPrincipal),
    custoPorResultado: f(i.custoPorResultado),
  };
}

/** Agrega lista de insights em um único objeto com derivados recalculados */
export function agregarInsights(insights: InsightDiario[]): InsightNumericos {
  let spend = 0, impressions = 0, reach = 0, clicks = 0;
  let inlineLinkClicks = 0, uniqueClicks = 0, outboundClicks = 0, landingPageViews = 0;
  let whatsappClicks = 0, leadCount = 0, purchaseCount = 0, purchaseValue = 0;
  let addToCart = 0, initiateCheckout = 0, contactCount = 0;
  let postEngagement = 0, postReactions = 0, postComments = 0, postShares = 0, pageLikes = 0;
  let videoView3s = 0, videoView10s = 0, videoView25pct = 0, videoView50pct = 0;
  let videoView75pct = 0, videoView95pct = 0, videoView100pct = 0;
  let videoPlayActions = 0, videoThruplay = 0;
  let videoAvgSum = 0, videoAvgCount = 0;
  let resultadoPrincipal = 0;

  for (const i of insights) {
    spend += f(i.spend);
    impressions += n(i.impressions);
    reach += n(i.reach);
    clicks += n(i.clicks);
    inlineLinkClicks += n(i.inlineLinkClicks);
    uniqueClicks += n(i.uniqueClicks);
    outboundClicks += n(i.outboundClicks);
    landingPageViews += n(i.landingPageViews);
    whatsappClicks += n(i.whatsappClicks);
    leadCount += n(i.leadCount);
    purchaseCount += n(i.purchaseCount);
    purchaseValue += f(i.purchaseValue);
    addToCart += n(i.addToCart);
    initiateCheckout += n(i.initiateCheckout);
    contactCount += n(i.contactCount);
    postEngagement += n(i.postEngagement);
    postReactions += n(i.postReactions);
    postComments += n(i.postComments);
    postShares += n(i.postShares);
    pageLikes += n(i.pageLikes);
    videoView3s += n(i.videoView3s);
    videoView10s += n(i.videoView10s);
    videoView25pct += n(i.videoView25pct);
    videoView50pct += n(i.videoView50pct);
    videoView75pct += n(i.videoView75pct);
    videoView95pct += n(i.videoView95pct);
    videoView100pct += n(i.videoView100pct);
    videoPlayActions += n(i.videoPlayActions);
    videoThruplay += n(i.videoThruplay);
    resultadoPrincipal += n(i.resultadoPrincipal);
    if (i.videoAvgTimeWatched) {
      videoAvgSum += i.videoAvgTimeWatched.toNumber();
      videoAvgCount++;
    }
  }

  const cpm = impressions > 0 ? (spend * 1000) / impressions : 0;
  const ctr = impressions > 0 ? (clicks * 100) / impressions : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpp = reach > 0 ? (spend * 1000) / reach : 0;
  const frequency = reach > 0 ? impressions / reach : 0;
  const uniqueCtr = impressions > 0 ? (uniqueClicks * 100) / impressions : 0;
  const outboundCtr = impressions > 0 ? (outboundClicks * 100) / impressions : 0;
  const landingPageViewRate = clicks > 0 ? (landingPageViews * 100) / clicks : 0;
  const whatsappCost = whatsappClicks > 0 ? spend / whatsappClicks : 0;
  const costPerLead = leadCount > 0 ? spend / leadCount : 0;
  const costPerPurchase = purchaseCount > 0 ? spend / purchaseCount : 0;
  const purchaseRoas = spend > 0 ? purchaseValue / spend : 0;
  const costPerContact = contactCount > 0 ? spend / contactCount : 0;
  const costPerThruplay = videoThruplay > 0 ? spend / videoThruplay : 0;
  const videoAvgTimeWatched = videoAvgCount > 0 ? videoAvgSum / videoAvgCount : 0;
  const custoPorResultado = resultadoPrincipal > 0 ? spend / resultadoPrincipal : 0;

  return {
    spend, impressions, reach, clicks, inlineLinkClicks, uniqueClicks,
    outboundClicks, landingPageViews, cpm, ctr, cpc, cpp, frequency,
    uniqueCtr, outboundCtr, landingPageViewRate,
    whatsappClicks, whatsappCost, leadCount, costPerLead,
    purchaseCount, purchaseValue, purchaseRoas, costPerPurchase,
    addToCart, initiateCheckout, contactCount, costPerContact,
    postEngagement, postReactions, postComments, postShares, pageLikes,
    videoView3s, videoView10s, videoView25pct, videoView50pct,
    videoView75pct, videoView95pct, videoView100pct, videoAvgTimeWatched,
    videoPlayActions, videoThruplay, costPerThruplay,
    resultadoPrincipal, custoPorResultado,
  };
}

/** Gera todas as datas YYYY-MM-DD entre inicio e fim (inclusive) */
export function gerarPeriodo(inicio: string, fim: string): string[] {
  const datas: string[] = [];
  const d = new Date(`${inicio}T00:00:00Z`);
  const f2 = new Date(`${fim}T00:00:00Z`);
  while (d <= f2) {
    datas.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return datas;
}
