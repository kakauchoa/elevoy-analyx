import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const agora = new Date();

    const oportunidades = await prisma.crmOportunidade.findMany({
      where: {
        usuarioId: session.user.id,
        dataContato: { lt: agora, not: null },
      },
      include: {
        contato: true,
        negocio: true,
        etapa: { select: { id: true, nome: true, cor: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { dataContato: "asc" },
    });

    // Mantém o mesmo formato que a UI de Pendências já consome
    const pendentes = oportunidades.map((o) => ({
      id: o.id,
      nome: o.contato.nome,
      telefone: o.contato.telefone,
      empresa: o.negocio?.nome ?? null,
      dataContato: o.dataContato,
      etapa: o.etapa,
      tags: o.tags,
    }));

    return NextResponse.json(pendentes);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
