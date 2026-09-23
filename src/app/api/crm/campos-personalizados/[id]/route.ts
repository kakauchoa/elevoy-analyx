import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const definicao = await prisma.crmCampoPersonalizadoDefinicao.findFirst({
      where: { id, usuarioId: session.user.id },
    });
    if (!definicao) return NextResponse.json({ erro: "Campo não encontrado" }, { status: 404 });

    const body = (await req.json()) as { nome?: string; opcoes?: string[]; ordem?: number };
    const dados: Record<string, string | number | string[]> = {};
    if (body.nome?.trim()) dados.nome = body.nome.trim();
    if (body.opcoes) dados.opcoes = body.opcoes;
    if (body.ordem !== undefined) dados.ordem = body.ordem;

    const atualizado = await prisma.crmCampoPersonalizadoDefinicao.update({ where: { id }, data: dados });
    return NextResponse.json(atualizado);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const definicao = await prisma.crmCampoPersonalizadoDefinicao.findFirst({
      where: { id, usuarioId: session.user.id },
    });
    if (!definicao) return NextResponse.json({ erro: "Campo não encontrado" }, { status: 404 });

    await prisma.crmCampoPersonalizadoDefinicao.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
