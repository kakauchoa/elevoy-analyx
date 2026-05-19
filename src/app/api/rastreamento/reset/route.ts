import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const pendentes = await prisma.solicitacaoResetCrm.findMany({
      where: { status: "pendente", expiresAt: { gt: new Date() } },
      orderBy: { criadoEm: "desc" },
      include: {
        cliente: { select: { nome: true, email: true } },
      },
    });

    return NextResponse.json(
      pendentes.map((s) => ({
        id: s.id,
        clienteNome: s.cliente.nome,
        clienteEmail: s.cliente.email,
        criadoEm: s.criadoEm.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error("[GET /api/rastreamento/reset]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
