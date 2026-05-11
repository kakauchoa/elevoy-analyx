import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const contatos = await prisma.crmContato.findMany({
      where: { usuarioId: session.user.id },
      include: { campos: true },
      orderBy: { criadoEm: "asc" },
    });

    return NextResponse.json(contatos);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const body = (await req.json()) as {
      etapaId?: string;
      nome?: string;
      telefone?: string;
      empresa?: string;
      email?: string;
      notas?: string;
    };

    if (!body.etapaId || !body.nome?.trim()) {
      return NextResponse.json({ erro: "etapaId e nome são obrigatórios" }, { status: 400 });
    }

    const etapa = await prisma.crmEtapa.findFirst({
      where: { id: body.etapaId, usuarioId: session.user.id },
    });
    if (!etapa) return NextResponse.json({ erro: "Etapa não encontrada" }, { status: 404 });

    const contato = await prisma.crmContato.create({
      data: {
        etapaId: body.etapaId,
        usuarioId: session.user.id,
        nome: body.nome.trim(),
        telefone: body.telefone?.trim() || null,
        empresa: body.empresa?.trim() || null,
        email: body.email?.trim() || null,
        notas: body.notas?.trim() || null,
      },
      include: { campos: true },
    });

    return NextResponse.json(contato, { status: 201 });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
