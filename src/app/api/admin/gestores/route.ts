import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const sessionUser = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { perfil: true },
    });
    if (sessionUser?.perfil !== "admin") {
      return NextResponse.json({ erro: "Acesso restrito ao administrador" }, { status: 403 });
    }

    const gestores = await prisma.usuario.findMany({
      where: { tipo: "gestor", ativo: true },
      select: {
        id: true,
        nome: true,
        email: true,
        plano: true,
        contasMaximas: true,
        assinaturaAtiva: true,
        assinaturaVenceEm: true,
        stripeSubscriptionId: true,
        criadoEm: true,
        _count: { select: { contas: { where: { ativo: true, rastreamentoApenas: false } } } },
        permissoes: { select: { secao: true } },
      },
      orderBy: { criadoEm: "desc" },
    });

    return NextResponse.json(
      gestores.map((g) => ({
        id: g.id,
        nome: g.nome,
        email: g.email,
        plano: g.plano,
        contasMaximas: g.contasMaximas,
        assinaturaAtiva: g.assinaturaAtiva,
        assinaturaVenceEm: g.assinaturaVenceEm?.toISOString() ?? null,
        stripeSubscriptionId: g.stripeSubscriptionId,
        criadoEm: g.criadoEm.toISOString(),
        totalContas: g._count.contas,
        permissoes: g.permissoes.map((p) => p.secao),
      }))
    );
  } catch (err) {
    console.error("[GET /api/admin/gestores]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
