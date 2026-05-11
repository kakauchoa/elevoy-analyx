import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

async function verificarEtapa(id: string, usuarioId: string) {
  return prisma.crmEtapa.findFirst({ where: { id, usuarioId } });
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const etapa = await verificarEtapa(id, session.user.id);
    if (!etapa) return NextResponse.json({ erro: "Etapa não encontrada" }, { status: 404 });

    const body = (await req.json()) as { nome?: string; cor?: string; ordem?: number };
    const dados: { nome?: string; cor?: string; ordem?: number } = {};
    if (body.nome?.trim()) dados.nome = body.nome.trim();
    if (body.cor) dados.cor = body.cor;
    if (body.ordem !== undefined) dados.ordem = body.ordem;

    const atualizado = await prisma.crmEtapa.update({ where: { id }, data: dados });
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
    const etapa = await verificarEtapa(id, session.user.id);
    if (!etapa) return NextResponse.json({ erro: "Etapa não encontrada" }, { status: 404 });

    await prisma.crmEtapa.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
