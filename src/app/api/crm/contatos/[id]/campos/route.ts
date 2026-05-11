import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const contato = await prisma.crmContato.findFirst({
      where: { id, usuarioId: session.user.id },
      select: { id: true },
    });
    if (!contato) return NextResponse.json({ erro: "Contato não encontrado" }, { status: 404 });

    const campos = await prisma.crmCampoCustomizado.findMany({
      where: { contatoId: id },
    });

    return NextResponse.json(campos);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const contato = await prisma.crmContato.findFirst({
      where: { id, usuarioId: session.user.id },
      select: { id: true },
    });
    if (!contato) return NextResponse.json({ erro: "Contato não encontrado" }, { status: 404 });

    const body = (await req.json()) as { chave?: string; valor?: string };
    if (!body.chave?.trim() || !body.valor?.trim()) {
      return NextResponse.json({ erro: "Chave e valor são obrigatórios" }, { status: 400 });
    }

    const campo = await prisma.crmCampoCustomizado.create({
      data: {
        contatoId: id,
        chave: body.chave.trim(),
        valor: body.valor.trim(),
      },
    });

    return NextResponse.json(campo, { status: 201 });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const contato = await prisma.crmContato.findFirst({
      where: { id, usuarioId: session.user.id },
      select: { id: true },
    });
    if (!contato) return NextResponse.json({ erro: "Contato não encontrado" }, { status: 404 });

    const body = (await req.json()) as { campoId?: string };
    if (!body.campoId) return NextResponse.json({ erro: "campoId é obrigatório" }, { status: 400 });

    await prisma.crmCampoCustomizado.deleteMany({
      where: { id: body.campoId, contatoId: id },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
