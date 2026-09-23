import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TIPOS_VALIDOS = ["texto", "numero", "data", "select"];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const definicoes = await prisma.crmCampoPersonalizadoDefinicao.findMany({
      where: { usuarioId: session.user.id },
      orderBy: { ordem: "asc" },
    });

    return NextResponse.json(definicoes);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const body = (await req.json()) as {
      nome?: string;
      tipo?: string;
      opcoes?: string[];
    };

    if (!body.nome?.trim()) {
      return NextResponse.json({ erro: "Nome é obrigatório" }, { status: 400 });
    }
    if (!body.tipo || !TIPOS_VALIDOS.includes(body.tipo)) {
      return NextResponse.json({ erro: "Tipo inválido" }, { status: 400 });
    }
    if (body.tipo === "select" && (!body.opcoes || body.opcoes.length === 0)) {
      return NextResponse.json({ erro: "Campos do tipo select precisam de opções" }, { status: 400 });
    }

    const ultima = await prisma.crmCampoPersonalizadoDefinicao.findFirst({
      where: { usuarioId: session.user.id },
      orderBy: { ordem: "desc" },
      select: { ordem: true },
    });

    const definicao = await prisma.crmCampoPersonalizadoDefinicao.create({
      data: {
        usuarioId: session.user.id,
        nome: body.nome.trim(),
        tipo: body.tipo,
        opcoes: body.tipo === "select" ? body.opcoes : undefined,
        ordem: (ultima?.ordem ?? -1) + 1,
      },
    });

    return NextResponse.json(definicao, { status: 201 });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
