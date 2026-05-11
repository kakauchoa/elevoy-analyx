import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverAcesso } from "@/lib/acesso-contas";

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { isAdmin } = await resolverAcesso(session.user.id);
    if (!isAdmin) return NextResponse.json({ erro: "Acesso restrito ao administrador" }, { status: 403 });

    const { id } = await params;
    const permissoes = await prisma.usuarioPermissao.findMany({
      where: { usuarioId: id },
      select: { secao: true },
    });

    return NextResponse.json(permissoes.map((p) => p.secao));
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { isAdmin } = await resolverAcesso(session.user.id);
    if (!isAdmin) return NextResponse.json({ erro: "Acesso restrito ao administrador" }, { status: 403 });

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
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
