import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarAdminMaster } from "@/lib/admin-master-auth";

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  if (!(await verificarAdminMaster())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const permissoes = await prisma.usuarioPermissao.findMany({
      where: { usuarioId: id },
      select: { secao: true },
    });

    return NextResponse.json(permissoes.map((p) => p.secao));
  } catch {
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  if (!(await verificarAdminMaster())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await req.json()) as { secoes?: string[] };
    const secoes = body.secoes ?? [];

    await prisma.$transaction([
      prisma.usuarioPermissao.deleteMany({ where: { usuarioId: id } }),
      ...secoes.map((secao) =>
        prisma.usuarioPermissao.create({ data: { usuarioId: id, secao } })
      ),
    ]);

    return NextResponse.json({ ok: true, secoes });
  } catch {
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
