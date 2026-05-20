import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverAcesso } from "@/lib/acesso-contas";

type Params = Promise<{ contaId: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { contaId } = await params;
    const { contaIds } = await resolverAcesso(session.user.id);
    if (!contaIds.includes(contaId)) {
      return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
    }

    const conta = await prisma.contaAnuncio.findUnique({
      where: { id: contaId },
      select: {
        id: true,
        nomeCliente: true,
        slugCompartilhavel: true,
        pageIdMeta: true,
        webhookToken: true,
        evolutionInstanceName: true,
        evolutionStatus: true,
        configuracaoGtm: { select: { metaPixelId: true } },
        clientesCrm: {
          select: { id: true, nome: true, email: true, telefone: true, status: true },
        },
      },
    });

    if (!conta) return NextResponse.json({ erro: "Conta não encontrada" }, { status: 404 });

    return NextResponse.json({
      ...conta,
      pixelId: conta.configuracaoGtm?.metaPixelId ?? null,
      cliente: conta.clientesCrm[0] ?? null,
    });
  } catch (err) {
    console.error("[GET /api/rastreamento/configurar/[contaId]]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { contaId } = await params;
    const { contaIds } = await resolverAcesso(session.user.id);
    if (!contaIds.includes(contaId)) {
      return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
    }

    const body = (await req.json()) as {
      pageIdMeta?: string | null;
      pixelId?: string | null;
    };

    await prisma.contaAnuncio.update({
      where: { id: contaId },
      data: { pageIdMeta: body.pageIdMeta ?? undefined },
    });

    if (body.pixelId !== undefined) {
      await prisma.configuracaoGtm.upsert({
        where: { contaAnuncioId: contaId },
        create: {
          contaAnuncioId: contaId,
          metaPixelId: body.pixelId,
          ativo: false,
        },
        update: { metaPixelId: body.pixelId },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/rastreamento/configurar/[contaId]]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
