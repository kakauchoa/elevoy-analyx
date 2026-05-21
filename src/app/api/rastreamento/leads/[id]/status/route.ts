import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCliente } from "@/lib/cliente-crm-auth";
import { dispararEventoCapi, EventoCapi } from "@/lib/meta-capi";
import { StatusLeadWpp } from "@prisma/client";
import { criptografar, descriptografarToken } from "@/lib/cripto";

type Params = Promise<{ id: string }>;

const MAPA_EVENTO: Partial<Record<StatusLeadWpp, EventoCapi>> = {
  QUALIFICADO: "QualifiedLead",
  PAGAMENTO: "InitiateCheckout",
  VENDA: "Purchase",
};

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const sessionCliente = await getSessionCliente();

    if (!sessionCliente) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const body = (await req.json()) as { status: StatusLeadWpp; valor?: number };
    const novoStatus = body.status;

    const statuses: StatusLeadWpp[] = ["ENTROU", "QUALIFICADO", "PAGAMENTO", "VENDA"];
    if (!statuses.includes(novoStatus)) {
      return NextResponse.json({ erro: "Status inválido" }, { status: 400 });
    }

    // Verifica que o cliente tem acesso a este lead
    const lead = await prisma.leadWpp.findFirst({
      where: { id },
      include: {
        conta: {
          include: { configuracaoGtm: true },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
    }

    const cliente = await prisma.clienteCrm.findFirst({
      where: {
        id: sessionCliente.id,
        contaAnuncioId: lead.contaAnuncioId,
        status: "aprovado",
      },
    });

    if (!cliente) {
      return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
    }

    const statusAntes = lead.status;

    await prisma.leadWpp.update({
      where: { id },
      data: {
        status: novoStatus,
        ...(novoStatus === "VENDA" && body.valor !== undefined
          ? { valor: body.valor }
          : {}),
      },
    });

    // Dispara evento CAPI correspondente ao novo status
    const eventoNome = MAPA_EVENTO[novoStatus];
    const pixelId = lead.conta.configuracaoGtm?.metaPixelId;
    const pageId = lead.conta.pageIdMeta;
    const accessToken = lead.conta.tokenAcesso
      ? descriptografarToken(lead.conta.tokenAcesso)
      : null;

    // Migração lazy: re-criptografa tokens em texto puro
    if (lead.conta.tokenAcesso && !lead.conta.tokenAcesso.includes(":")) {
      void prisma.contaAnuncio.update({
        where: { id: lead.contaAnuncioId },
        data: { tokenAcesso: criptografar(lead.conta.tokenAcesso) },
      });
    }

    if (eventoNome && pixelId && pageId && accessToken && lead.ctwa) {
      const resultado = await dispararEventoCapi({
        pixelId,
        accessToken,
        pageId,
        evento: eventoNome,
        telefone: lead.telefone,
        ctwa: lead.ctwa,
        valor: body.valor,
      });

      await prisma.leadWppHistorico.create({
        data: {
          leadId: id,
          statusAntes,
          statusDepois: novoStatus,
          eventoMeta: eventoNome,
          sucesso: resultado.sucesso,
          resposta: resultado.resposta,
        },
      });
    } else {
      await prisma.leadWppHistorico.create({
        data: {
          leadId: id,
          statusAntes,
          statusDepois: novoStatus,
          eventoMeta: eventoNome ?? null,
          sucesso: true,
          resposta: "Evento não disparado (sem pixel/pageId/ctwa)",
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/rastreamento/leads/[id]/status]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
