import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverAcesso } from "@/lib/acesso-contas";
import crypto from "crypto";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { contaIds } = await resolverAcesso(session.user.id);

    const contas = await prisma.contaAnuncio.findMany({
      where: { id: { in: contaIds }, ativo: true },
      select: {
        id: true,
        nomeCliente: true,
        slugCompartilhavel: true,
        pageIdMeta: true,
        webhookToken: true,
        configuracaoGtm: { select: { metaPixelId: true } },
        _count: { select: { leadsWpp: true } },
        leadsWpp: {
          select: { status: true },
          orderBy: { criadoEm: "desc" },
        },
        clientesCrm: {
          where: { status: "aprovado" },
          select: { id: true, nome: true, email: true },
        },
      },
      orderBy: { nomeCliente: "asc" },
    });

    // Gera webhookToken automático para contas que ainda não têm
    const atualizacoes = contas
      .filter((c) => !c.webhookToken)
      .map((c) =>
        prisma.contaAnuncio.update({
          where: { id: c.id },
          data: { webhookToken: crypto.randomUUID() },
        })
      );
    if (atualizacoes.length > 0) await Promise.all(atualizacoes);

    const resultado = await prisma.contaAnuncio.findMany({
      where: { id: { in: contaIds }, ativo: true },
      select: {
        id: true,
        nomeCliente: true,
        slugCompartilhavel: true,
        pageIdMeta: true,
        webhookToken: true,
        configuracaoGtm: { select: { metaPixelId: true } },
        leadsWpp: { select: { status: true } },
        clientesCrm: {
          where: { status: "aprovado" },
          select: { id: true, nome: true, email: true },
        },
      },
      orderBy: { nomeCliente: "asc" },
    });

    const serializado = resultado.map((c) => ({
      id: c.id,
      nomeCliente: c.nomeCliente,
      slugCompartilhavel: c.slugCompartilhavel,
      pageIdMeta: c.pageIdMeta,
      webhookToken: c.webhookToken,
      pixelId: c.configuracaoGtm?.metaPixelId ?? null,
      totalLeads: c.leadsWpp.length,
      contagemStatus: {
        ENTROU: c.leadsWpp.filter((l) => l.status === "ENTROU").length,
        QUALIFICADO: c.leadsWpp.filter((l) => l.status === "QUALIFICADO").length,
        PAGAMENTO: c.leadsWpp.filter((l) => l.status === "PAGAMENTO").length,
        VENDA: c.leadsWpp.filter((l) => l.status === "VENDA").length,
      },
      clienteVinculado: c.clientesCrm[0] ?? null,
    }));

    return NextResponse.json(serializado);
  } catch (err) {
    console.error("[GET /api/rastreamento/contas]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
