import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

async function verificarContato(id: string, usuarioId: string) {
  return prisma.crmContato.findFirst({ where: { id, usuarioId }, include: { campos: true } });
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const contato = await verificarContato(id, session.user.id);
    if (!contato) return NextResponse.json({ erro: "Contato não encontrado" }, { status: 404 });

    const body = (await req.json()) as {
      nome?: string;
      telefone?: string | null;
      empresa?: string | null;
      email?: string | null;
      notas?: string | null;
    };

    const dados: Record<string, string | null | undefined> = {};
    if (body.nome?.trim()) dados.nome = body.nome.trim();
    if ("telefone" in body) dados.telefone = body.telefone?.trim() || null;
    if ("empresa" in body) dados.empresa = body.empresa?.trim() || null;
    if ("email" in body) dados.email = body.email?.trim() || null;
    if ("notas" in body) dados.notas = body.notas?.trim() || null;

    const atualizado = await prisma.crmContato.update({
      where: { id },
      data: dados,
      include: { campos: true },
    });

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
    const contato = await verificarContato(id, session.user.id);
    if (!contato) return NextResponse.json({ erro: "Contato não encontrado" }, { status: 404 });

    await prisma.crmContato.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
