import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarAdminMaster } from "@/lib/admin-master-auth";

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  if (!(await verificarAdminMaster())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  try {
    const { id: gestorId } = await params;
    const vinculos = await prisma.gestorConta.findMany({
      where: { usuarioId: gestorId },
      select: { contaAnuncioId: true },
    });

    return NextResponse.json(vinculos.map((v) => v.contaAnuncioId));
  } catch {
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  if (!(await verificarAdminMaster())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  try {
    const { id: gestorId } = await params;

    const gestor = await prisma.usuario.findFirst({
      where: { id: gestorId, tipo: "gestor", ativo: true },
      select: { id: true },
    });
    if (!gestor) return NextResponse.json({ erro: "Gestor não encontrado" }, { status: 404 });

    const body = (await req.json()) as { contaIds?: string[] };
    const contaIds = body.contaIds ?? [];

    // Valida que as contas existem
    const contasValidas = await prisma.contaAnuncio.findMany({
      where: { id: { in: contaIds }, ativo: true },
      select: { id: true },
    });
    const idsValidos = contasValidas.map((c) => c.id);

    await prisma.$transaction([
      prisma.gestorConta.deleteMany({ where: { usuarioId: gestorId } }),
      ...(idsValidos.length > 0
        ? [prisma.gestorConta.createMany({
            data: idsValidos.map((contaId) => ({ usuarioId: gestorId, contaAnuncioId: contaId })),
          })]
        : []),
    ]);

    return NextResponse.json({ ok: true, contasVinculadas: idsValidos.length });
  } catch (err) {
    console.error("[PUT /api/admin-master/usuarios/[id]/contas]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
