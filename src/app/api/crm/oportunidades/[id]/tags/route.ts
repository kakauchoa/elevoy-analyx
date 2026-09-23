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
    });
    if (!oportunidade) return NextResponse.json({ erro: "Oportunidade não encontrada" }, { status: 404 });

    const body = (await req.json()) as { tagId?: string };
    if (!body.tagId) return NextResponse.json({ erro: "tagId é obrigatório" }, { status: 400 });

    const tag = await prisma.crmTag.findFirst({ where: { id: body.tagId, usuarioId: session.user.id } });
    if (!tag) return NextResponse.json({ erro: "Tag não encontrada" }, { status: 404 });

    const vinculo = await prisma.crmOportunidadeTag.upsert({
      where: { oportunidadeId_tagId: { oportunidadeId, tagId: body.tagId } },
      create: { oportunidadeId, tagId: body.tagId },
      update: {},
      include: { tag: true },
    });

    return NextResponse.json(vinculo, { status: 201 });
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
    });
    if (!oportunidade) return NextResponse.json({ erro: "Oportunidade não encontrada" }, { status: 404 });

    const body = (await req.json()) as { tagId?: string };
    if (!body.tagId) return NextResponse.json({ erro: "tagId é obrigatório" }, { status: 400 });

    await prisma.crmOportunidadeTag.deleteMany({ where: { oportunidadeId, tagId: body.tagId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
