import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispararEventoCapi } from "@/lib/meta-capi";
import { descriptografarToken } from "@/lib/cripto";

type Params = Promise<{ token: string }>;

interface CorpoEvolution {
  body?: {
    chatName?: string;
    phone?: string;
    connectedPhone?: string;
    participantPhone?: string;
    text?: { message?: string };
    externalAdReply?: {
      ctwaClid?: string;
      sourceId?: string;
      sourceApp?: string;
      sourceType?: string;
    };
  };
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const { token } = await params;
    const payload = (await req.json()) as CorpoEvolution;
    const body = payload.body ?? {};

    const ctwa = body.externalAdReply?.ctwaClid;
    const sourceId = body.externalAdReply?.sourceId;

    // Ignora mensagens que não vieram de anúncios
    if (!ctwa && !sourceId) {
      return NextResponse.json({ ignorado: true });
    }

    const conta = await prisma.contaAnuncio.findFirst({
      where: { webhookToken: token, ativo: true },
      include: { configuracaoGtm: true },
    });

    if (!conta) {
      return NextResponse.json({ erro: "Conta não encontrada" }, { status: 404 });
    }

    // Extrai telefone do corpo
    const telefoneRaw =
      body.participantPhone ?? body.phone ?? body.connectedPhone ?? "";
    const telefone = telefoneRaw.includes("@")
      ? telefoneRaw.split("@")[0]
      : telefoneRaw;

    if (!telefone) {
      return NextResponse.json({ ignorado: true, motivo: "sem telefone" });
    }

    // Verifica se este telefone já existe na conta (primeira mensagem apenas)
    const leadExistente = await prisma.leadWpp.findFirst({
      where: { contaAnuncioId: conta.id, telefone },
    });

    if (leadExistente) {
      return NextResponse.json({ ignorado: true, motivo: "lead já existe" });
    }

    // Busca UTMs na Meta API se tiver sourceId e token de acesso
    let campanha: string | null = null;
    let publico: string | null = null;
    let anuncio: string | null = null;

    const tokenDecriptado = conta.tokenAcesso ? descriptografarToken(conta.tokenAcesso) : null;

    if (sourceId && tokenDecriptado) {
      try {
        const resAd = await fetch(
          `https://graph.facebook.com/v22.0/${sourceId}?fields=name,adset,campaign&access_token=${tokenDecriptado}`
        );
        const ad = (await resAd.json()) as {
          name?: string;
          adset?: { id?: string; name?: string };
          campaign?: { id?: string; name?: string };
        };
        anuncio = ad.name ?? null;

        if (ad.adset?.id) {
          const resAdset = await fetch(
            `https://graph.facebook.com/v22.0/${ad.adset.id}?fields=name&access_token=${tokenDecriptado}`
          );
          const adset = (await resAdset.json()) as { name?: string };
          publico = adset.name ?? null;
        }

        if (ad.campaign?.id) {
          const resCampaign = await fetch(
            `https://graph.facebook.com/v22.0/${ad.campaign.id}?fields=name&access_token=${tokenDecriptado}`
          );
          const campaign = (await resCampaign.json()) as { name?: string };
          campanha = campaign.name ?? null;
        }
      } catch {
        // falha na Meta API não impede o salvamento do lead
      }
    }

    // Salva o lead
    const lead = await prisma.leadWpp.create({
      data: {
        contaAnuncioId: conta.id,
        nome: body.chatName ?? telefone,
        telefone,
        mensagem: body.text?.message ?? null,
        ctwa: ctwa ?? null,
        sourceId: sourceId ?? null,
        campanha,
        publico,
        anuncio,
        origem: body.externalAdReply?.sourceType ?? null,
        midia: body.externalAdReply?.sourceApp ?? null,
        status: "ENTROU",
      },
    });

    // Dispara LeadSubmitted se tiver pixel + pageId + ctwa
    const pixelId = conta.configuracaoGtm?.metaPixelId;
    const pageId = conta.pageIdMeta;

    if (pixelId && pageId && ctwa && tokenDecriptado) {
      const resultado = await dispararEventoCapi({
        pixelId,
        accessToken: tokenDecriptado,
        pageId,
        evento: "LeadSubmitted",
        telefone,
        ctwa,
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

    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch (err) {
    console.error("[webhook rastreamento]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
