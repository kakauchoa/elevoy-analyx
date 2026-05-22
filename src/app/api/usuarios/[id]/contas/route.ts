import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverAcesso } from "@/lib/acesso-contas";

type Params = Promise<{ id: string }>;

// Retorna os IDs das contas vinculadas ao gestor via gestor_contas
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { isAdmin } = await resolverAcesso(session.user.id);
    if (!isAdmin) return NextResponse.json({ erro: "Acesso restrito ao administrador" }, { status: 403 });

    const { id: gestorId } = await params;

    const vinculos = await prisma.gestorConta.findMany({
      where: { usuarioId: gestorId },
      select: { contaAnuncioId: true },
    });

    return NextResponse.json(vinculos.map((v) => v.contaAnuncioId));
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

// Substitui todos os vínculos gestor_contas de um gestor para as contas deste admin
export async function PUT(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { isAdmin, contaIds: adminContaIds } = await resolverAcesso(session.user.id);
    if (!isAdmin) return NextResponse.json({ erro: "Acesso restrito ao administrador" }, { status: 403 });

    const { id: gestorId } = await params;

    // Admin não pode modificar seus próprios vínculos por esta rota
    if (gestorId === session.user.id) {
      return NextResponse.json({ erro: "Não é possível editar os próprios acessos" }, { status: 400 });
    }

    const gestor = await prisma.usuario.findFirst({
      where: { id: gestorId, tipo: "gestor", ativo: true },
      select: { id: true },
    });
    if (!gestor) return NextResponse.json({ erro: "Gestor não encontrado" }, { status: 404 });

    const body = await req.json() as { contaIds?: string[] };
    const contaIdsSelecionadas = (body.contaIds ?? []).filter((id) =>
      adminContaIds.includes(id)
    );

    // Remove vínculos antigos para contas deste admin e recria com a seleção atual
    await prisma.$transaction([
      prisma.gestorConta.deleteMany({
        where: { usuarioId: gestorId, contaAnuncioId: { in: adminContaIds } },
      }),
      ...(contaIdsSelecionadas.length > 0
        ? [
            prisma.gestorConta.createMany({
              data: contaIdsSelecionadas.map((contaId) => ({
                usuarioId: gestorId,
                contaAnuncioId: contaId,
              })),
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ ok: true, contasVinculadas: contaIdsSelecionadas.length });
  } catch (erro) {
    console.error("[PUT /api/usuarios/[id]/contas]", erro);
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
