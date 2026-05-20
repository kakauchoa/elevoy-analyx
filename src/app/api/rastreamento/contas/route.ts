import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverAcesso } from "@/lib/acesso-contas";
import crypto from "crypto";

/** Lista contas com rastreamentoAtivo=true do gestor */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { contaIds } = await resolverAcesso(session.user.id);

    // Gera webhookTokens ausentes
    const semToken = await prisma.contaAnuncio.findMany({
      where: { id: { in: contaIds }, ativo: true, webhookToken: null },
      select: { id: true },
    });
    if (semToken.length > 0) {
      await Promise.all(
        semToken.map((c) =>
          prisma.contaAnuncio.update({
            where: { id: c.id },
            data: { webhookToken: crypto.randomUUID() },
          })
        )
      );
    }

    const contas = await prisma.contaAnuncio.findMany({
      where: { id: { in: contaIds }, ativo: true, rastreamentoAtivo: true },
      select: {
        id: true,
        nomeCliente: true,
        slugCompartilhavel: true,
        pageIdMeta: true,
        webhookToken: true,
        evolutionStatus: true,
        configuracaoGtm: { select: { metaPixelId: true } },
        leadsWpp: { select: { status: true } },
        clientesCrm: {
          where: { status: "aprovado" },
          select: { id: true, nome: true, email: true, telefone: true },
        },
      },
      orderBy: { nomeCliente: "asc" },
    });

    return NextResponse.json(
      contas.map((c) => ({
        id: c.id,
        nomeCliente: c.nomeCliente,
        slugCompartilhavel: c.slugCompartilhavel,
        pageIdMeta: c.pageIdMeta,
        webhookToken: c.webhookToken,
        evolutionStatus: c.evolutionStatus,
        pixelId: c.configuracaoGtm?.metaPixelId ?? null,
        totalLeads: c.leadsWpp.length,
        contagemStatus: {
          ENTROU:     c.leadsWpp.filter((l) => l.status === "ENTROU").length,
          QUALIFICADO: c.leadsWpp.filter((l) => l.status === "QUALIFICADO").length,
          PAGAMENTO:  c.leadsWpp.filter((l) => l.status === "PAGAMENTO").length,
          VENDA:      c.leadsWpp.filter((l) => l.status === "VENDA").length,
        },
        clienteVinculado: c.clientesCrm[0] ?? null,
      }))
    );
  } catch (err) {
    console.error("[GET /api/rastreamento/contas]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

/** Lista todas as contas do gestor (para modal de adição) */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { contaIds } = await resolverAcesso(session.user.id);

    const contas = await prisma.contaAnuncio.findMany({
      where: { id: { in: contaIds }, ativo: true },
      select: { id: true, nomeCliente: true, rastreamentoAtivo: true },
      orderBy: { nomeCliente: "asc" },
    });

    return NextResponse.json(contas);
  } catch (err) {
    console.error("[POST /api/rastreamento/contas]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
