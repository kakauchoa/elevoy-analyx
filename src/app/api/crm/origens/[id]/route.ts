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
    const origem = await prisma.crmOrigem.findFirst({ where: { id, usuarioId: session.user.id } });
    if (!origem) return NextResponse.json({ erro: "Origem não encontrada" }, { status: 404 });

    const body = (await req.json()) as { nome?: string; aprovado?: boolean };
    const dados: Record<string, string | boolean> = {};
    if (body.nome?.trim()) dados.nome = body.nome.trim();
    if (typeof body.aprovado === "boolean") dados.aprovado = body.aprovado;

    const atualizada = await prisma.crmOrigem.update({ where: { id }, data: dados });
    return NextResponse.json(atualizada);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const origem = await prisma.crmOrigem.findFirst({ where: { id, usuarioId: session.user.id } });
    if (!origem) return NextResponse.json({ erro: "Origem não encontrada" }, { status: 404 });

    await prisma.crmOrigem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
