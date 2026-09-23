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
    const negocio = await prisma.crmNegocio.findFirst({ where: { id, usuarioId: session.user.id } });
    if (!negocio) return NextResponse.json({ erro: "Negócio não encontrado" }, { status: 404 });

    const body = (await req.json()) as { nome?: string; observacoes?: string | null };
    const dados: Record<string, string | null> = {};
    if (body.nome?.trim()) dados.nome = body.nome.trim();
    if ("observacoes" in body) dados.observacoes = body.observacoes?.trim() || null;

    const atualizado = await prisma.crmNegocio.update({ where: { id }, data: dados });
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
    const negocio = await prisma.crmNegocio.findFirst({ where: { id, usuarioId: session.user.id } });
    if (!negocio) return NextResponse.json({ erro: "Negócio não encontrado" }, { status: 404 });

    await prisma.crmNegocio.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
