import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id: contatoId } = await params;
    const contato = await prisma.crmContato.findFirst({ where: { id: contatoId, usuarioId: session.user.id } });
    if (!contato) return NextResponse.json({ erro: "Contato não encontrado" }, { status: 404 });

    const body = (await req.json()) as { tagId?: string };
    if (!body.tagId) return NextResponse.json({ erro: "tagId é obrigatório" }, { status: 400 });

    const tag = await prisma.crmTag.findFirst({ where: { id: body.tagId, usuarioId: session.user.id } });
    if (!tag) return NextResponse.json({ erro: "Tag não encontrada" }, { status: 404 });

    const vinculo = await prisma.crmContatoTag.upsert({
      where: { contatoId_tagId: { contatoId, tagId: body.tagId } },
      create: { contatoId, tagId: body.tagId },
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

    const { id: contatoId } = await params;
    const contato = await prisma.crmContato.findFirst({ where: { id: contatoId, usuarioId: session.user.id } });
    if (!contato) return NextResponse.json({ erro: "Contato não encontrado" }, { status: 404 });

    const body = (await req.json()) as { tagId?: string };
    if (!body.tagId) return NextResponse.json({ erro: "tagId é obrigatório" }, { status: 400 });

    await prisma.crmContatoTag.deleteMany({ where: { contatoId, tagId: body.tagId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
