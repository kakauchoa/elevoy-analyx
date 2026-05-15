import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const notificacoes = await prisma.notificacaoSaldo.findMany({
      orderBy: { criadoEm: "desc" },
      take: 50,
      include: {
        conta: { select: { nomeCliente: true } },
      },
    });

    return NextResponse.json(notificacoes);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const body = (await req.json()) as { ids?: string[]; todos?: boolean };

    if (body.todos) {
      await prisma.notificacaoSaldo.updateMany({ where: { lida: false }, data: { lida: true } });
    } else if (body.ids?.length) {
      await prisma.notificacaoSaldo.updateMany({
        where: { id: { in: body.ids } },
        data: { lida: true },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
