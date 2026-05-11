import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const body = (await req.json()) as { etapaId?: string };

    if (!body.etapaId) {
      return NextResponse.json({ erro: "etapaId é obrigatório" }, { status: 400 });
    }

    const [contato, etapa] = await Promise.all([
      prisma.crmContato.findFirst({ where: { id, usuarioId: session.user.id } }),
      prisma.crmEtapa.findFirst({ where: { id: body.etapaId, usuarioId: session.user.id } }),
    ]);

    if (!contato) return NextResponse.json({ erro: "Contato não encontrado" }, { status: 404 });
    if (!etapa) return NextResponse.json({ erro: "Etapa não encontrada" }, { status: 404 });

    const atualizado = await prisma.crmContato.update({
      where: { id },
      data: { etapaId: body.etapaId },
      include: { campos: true },
    });

    return NextResponse.json(atualizado);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
