import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverAcesso } from "@/lib/acesso-contas";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { contaIds } = await resolverAcesso(session.user.id);

    const clientes = await prisma.clienteCrm.findMany({
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        status: true,
        aprovadoEm: true,
        criadoEm: true,
        contaAnuncioId: true,
        conta: { select: { nomeCliente: true } },
      },
    });

    const contasSet = new Set(contaIds);

    return NextResponse.json(
      clientes.map((c) => ({
        ...c,
        contaAnuncioId: c.contaAnuncioId,
        nomeCliente: c.conta?.nomeCliente ?? null,
        aprovadoEm: c.aprovadoEm?.toISOString() ?? null,
        criadoEm: c.criadoEm.toISOString(),
        contaDoGestor: c.contaAnuncioId ? contasSet.has(c.contaAnuncioId) : false,
      }))
    );
  } catch (err) {
    console.error("[GET /api/rastreamento/clientes]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
