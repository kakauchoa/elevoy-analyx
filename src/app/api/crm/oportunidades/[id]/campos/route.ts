import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id: oportunidadeId } = await params;
    const oportunidade = await prisma.crmOportunidade.findFirst({
      where: { id: oportunidadeId, usuarioId: session.user.id },
      select: { id: true },
    });
    if (!oportunidade) return NextResponse.json({ erro: "Oportunidade não encontrada" }, { status: 404 });

    const body = (await req.json()) as { definicaoId?: string; valor?: string };
    if (!body.definicaoId || !body.valor?.trim()) {
      return NextResponse.json({ erro: "definicaoId e valor são obrigatórios" }, { status: 400 });
    }

    const definicao = await prisma.crmCampoPersonalizadoDefinicao.findFirst({
      where: { id: body.definicaoId, usuarioId: session.user.id },
    });
    if (!definicao) return NextResponse.json({ erro: "Campo personalizado não encontrado" }, { status: 404 });

    const valor = await prisma.crmCampoPersonalizadoValor.upsert({
      where: { definicaoId_oportunidadeId: { definicaoId: body.definicaoId, oportunidadeId } },
      create: { definicaoId: body.definicaoId, oportunidadeId, valor: body.valor.trim() },
      update: { valor: body.valor.trim() },
      include: { definicao: true },
    });

    return NextResponse.json(valor, { status: 201 });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id: oportunidadeId } = await params;
    const oportunidade = await prisma.crmOportunidade.findFirst({
      where: { id: oportunidadeId, usuarioId: session.user.id },
      select: { id: true },
    });
    if (!oportunidade) return NextResponse.json({ erro: "Oportunidade não encontrada" }, { status: 404 });

    const body = (await req.json()) as { definicaoId?: string };
    if (!body.definicaoId) return NextResponse.json({ erro: "definicaoId é obrigatório" }, { status: 400 });

    await prisma.crmCampoPersonalizadoValor.deleteMany({
      where: { definicaoId: body.definicaoId, oportunidadeId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
