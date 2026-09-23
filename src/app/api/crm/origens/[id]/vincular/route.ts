import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

// Vincula uma origem pendente a uma origem já existente: reatribui em lote
// leads/oportunidades para o destino e remove a origem pendente.
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id: origemPendenteId } = await params;
    const body = (await req.json()) as { destinoId?: string };
    if (!body.destinoId) return NextResponse.json({ erro: "destinoId é obrigatório" }, { status: 400 });

    const [pendente, destino] = await Promise.all([
      prisma.crmOrigem.findFirst({ where: { id: origemPendenteId, usuarioId: session.user.id } }),
      prisma.crmOrigem.findFirst({ where: { id: body.destinoId, usuarioId: session.user.id } }),
    ]);
    if (!pendente) return NextResponse.json({ erro: "Origem pendente não encontrada" }, { status: 404 });
    if (!destino) return NextResponse.json({ erro: "Origem de destino não encontrada" }, { status: 404 });

    await prisma.$transaction([
      prisma.crmLead.updateMany({ where: { origemId: origemPendenteId }, data: { origemId: destino.id } }),
      prisma.crmOportunidade.updateMany({ where: { origemId: origemPendenteId }, data: { origemId: destino.id } }),
      prisma.crmOrigem.delete({ where: { id: origemPendenteId } }),
    ]);

    return NextResponse.json({ ok: true, destino });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
