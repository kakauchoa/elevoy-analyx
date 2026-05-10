import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverAcesso } from "@/lib/acesso-contas";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { contaIds } = await resolverAcesso(session.user.id);

    const { searchParams } = new URL(req.url);
    const contaIdFiltro = searchParams.get("contaId");

    const filtroContas =
      contaIdFiltro && contaIds.includes(contaIdFiltro) ? [contaIdFiltro] : contaIds;

    if (filtroContas.length === 0) {
      return NextResponse.json({ acessos: [], contas: [] });
    }

    const [acessos, contas] = await Promise.all([
      prisma.acessoDashboard.findMany({
        where: { contaAnuncioId: { in: filtroContas } },
        orderBy: { acessadoEm: "desc" },
        take: 300,
        include: {
          conta: { select: { nomeCliente: true } },
        },
      }),
      prisma.contaAnuncio.findMany({
        where: { id: { in: contaIds }, ativo: true },
        select: { id: true, nomeCliente: true },
        orderBy: { nomeCliente: "asc" },
      }),
    ]);

    return NextResponse.json({
      acessos: acessos.map((a) => ({
        id: a.id,
        contaAnuncioId: a.contaAnuncioId,
        nomeCliente: a.conta.nomeCliente,
        slug: a.slug,
        pais: a.pais,
        dispositivo: a.dispositivo,
        duracaoSegundos: a.duracaoSegundos,
        acessadoEm: a.acessadoEm.toISOString(),
      })),
      contas,
    });
  } catch (erro) {
    console.error("[GET /api/acessos]", erro);
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
