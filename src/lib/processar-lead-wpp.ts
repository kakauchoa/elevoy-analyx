import { proto } from "@whiskeysockets/baileys";
import { prisma } from "./prisma";
import { dispararEventoCapi } from "./meta-capi";
import { criptografar, descriptografarToken } from "./cripto";

type WAMessage = proto.IWebMessageInfo;

interface CtwaInfo {
  ctwa: string | null;
  sourceId: string | null;
  sourceType: string | null;
  sourceApp: string | null;
}

function extrairCtwaInfo(msg: WAMessage): CtwaInfo | null {
  const m = msg.message;
  if (!m) return null;

  const ctx =
    m.extendedTextMessage?.contextInfo ??
    m.imageMessage?.contextInfo ??
    m.videoMessage?.contextInfo ??
    m.documentMessage?.contextInfo ??
    m.buttonsResponseMessage?.contextInfo ??
    m.listResponseMessage?.contextInfo ??
    null;

  const ext = ctx?.externalAdReply;
  if (!ext?.ctwaClid && !ext?.sourceId) return null;

  return {
    ctwa: ext.ctwaClid ?? null,
    sourceId: ext.sourceId ?? null,
    sourceType: (ext as Record<string, unknown>).sourceType as string | null ?? null,
    sourceApp: (ext as Record<string, unknown>).sourceApp as string | null ?? null,
  };
}

function extrairTexto(msg: WAMessage): string | null {
  const m = msg.message;
  if (!m) return null;
  return m.conversation ?? m.extendedTextMessage?.text ?? null;
}

export async function processarLeadWpp(contaId: string, msg: WAMessage): Promise<void> {
  const ctwaInfo = extrairCtwaInfo(msg);
  if (!ctwaInfo) return;

  const telefoneRaw = msg.key?.remoteJid ?? "";
  const telefone = telefoneRaw.replace("@s.whatsapp.net", "").replace("@c.us", "");
  if (!telefone) return;

  const conta = await prisma.contaAnuncio.findUnique({
    where: { id: contaId },
    include: { configuracaoGtm: true },
  });
  if (!conta) return;

  const leadExistente = await prisma.leadWpp.findFirst({
    where: { contaAnuncioId: contaId, telefone },
  });
  if (leadExistente) return;

  let campanha: string | null = null;
  let publico: string | null = null;
  let anuncio: string | null = null;

  const tokenDecriptado = conta.tokenAcesso ? descriptografarToken(conta.tokenAcesso) : null;

  // Migração lazy: re-criptografa tokens em texto puro
  if (conta.tokenAcesso && !conta.tokenAcesso.includes(":")) {
    void prisma.contaAnuncio.update({
      where: { id: contaId },
      data: { tokenAcesso: criptografar(conta.tokenAcesso) },
    });
  }

  if (ctwaInfo.sourceId && tokenDecriptado) {
    try {
      const resAd = await fetch(
        `https://graph.facebook.com/v22.0/${ctwaInfo.sourceId}?fields=name,adset,campaign&access_token=${tokenDecriptado}`
      );
      const ad = (await resAd.json()) as {
        name?: string;
        adset?: { id?: string };
        campaign?: { id?: string };
      };
      anuncio = ad.name ?? null;

      if (ad.adset?.id) {
        const r = await fetch(`https://graph.facebook.com/v22.0/${ad.adset.id}?fields=name&access_token=${tokenDecriptado}`);
        const d = (await r.json()) as { name?: string };
        publico = d.name ?? null;
      }
      if (ad.campaign?.id) {
        const r = await fetch(`https://graph.facebook.com/v22.0/${ad.campaign.id}?fields=name&access_token=${tokenDecriptado}`);
        const d = (await r.json()) as { name?: string };
        campanha = d.name ?? null;
      }
    } catch {
      // falha na Meta API não impede o salvamento do lead
    }
  }

  const lead = await prisma.leadWpp.create({
    data: {
      contaAnuncioId: contaId,
      nome: msg.pushName ?? telefone,
      telefone,
      mensagem: extrairTexto(msg),
      ctwa: ctwaInfo.ctwa,
      sourceId: ctwaInfo.sourceId,
      campanha,
      publico,
      anuncio,
      origem: ctwaInfo.sourceType,
      midia: ctwaInfo.sourceApp,
      status: "ENTROU",
    },
  });

  const pixelId = conta.configuracaoGtm?.metaPixelId;
  const pageId = conta.pageIdMeta;

  if (pixelId && pageId && ctwaInfo.ctwa && tokenDecriptado) {
    const resultado = await dispararEventoCapi({
      pixelId,
      accessToken: tokenDecriptado,
      pageId,
      evento: "LeadSubmitted",
      telefone,
      ctwa: ctwaInfo.ctwa,
    });

    await prisma.leadWppHistorico.create({
      data: {
        leadId: lead.id,
        statusAntes: null,
        statusDepois: "ENTROU",
        eventoMeta: "LeadSubmitted",
        sucesso: resultado.sucesso,
        resposta: resultado.resposta,
      },
    });
  }
}
