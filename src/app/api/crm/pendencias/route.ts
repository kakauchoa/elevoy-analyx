import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const agora = new Date();

    const contatos = await prisma.crmContato.findMany({
      where: {
        usuarioId: session.user.id,
        dataContato: { lt: agora, not: null },
      },
      include: {
        etapa: { select: { id: true, nome: true, cor: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { dataContato: "asc" },
    });

    return NextResponse.json(contatos);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
