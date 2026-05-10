import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverAcesso } from "@/lib/acesso-contas";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { contaIds } = await resolverAcesso(session.user.id);

    if (contaIds.length === 0) {
      return NextResponse.json({ clientes: [] });
    }

    const [contas, acessos] = await Promise.all([
      prisma.contaAnuncio.findMany({
        where: { id: { in: contaIds }, ativo: true },
        select: { id: true, nomeCliente: true },
        orderBy: { nomeCliente: "asc" },
      }),
      prisma.acessoDashboard.findMany({
        where: { contaAnuncioId: { in: contaIds } },
        orderBy: { acessadoEm: "desc" },
        take: 1000,
        select: {
          id: true,
          contaAnuncioId: true,
          nomeVisitante: true,
          pais: true,
          dispositivo: true,
          duracaoSegundos: true,
          acessadoEm: true,
        },
      }),
    ]);

    // Agrupa acessos por conta
    const clientes = contas.map((conta) => {
      const contaAcessos = acessos.filter((a) => a.contaAnuncioId === conta.id);
      return {
        id: conta.id,
        nomeCliente: conta.nomeCliente,
        totalAcessos: contaAcessos.length,
        ultimoAcesso: contaAcessos[0]?.acessadoEm.toISOString() ?? null,
        acessos: contaAcessos.map((a) => ({
          id: a.id,
          nomeVisitante: a.nomeVisitante,
          localizacao: a.pais,
          dispositivo: a.dispositivo,
          duracaoSegundos: a.duracaoSegundos,
          acessadoEm: a.acessadoEm.toISOString(),
        })),
      };
    });

    return NextResponse.json({ clientes });
  } catch (erro) {
    console.error("[GET /api/acessos]", erro);
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
