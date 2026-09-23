import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const origens = await prisma.crmOrigem.findMany({
      where: { usuarioId: session.user.id },
      orderBy: [{ aprovado: "asc" }, { nome: "asc" }],
    });

    return NextResponse.json(origens);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const body = (await req.json()) as { nome?: string };
    if (!body.nome?.trim()) {
      return NextResponse.json({ erro: "Nome é obrigatório" }, { status: 400 });
    }

    const origem = await prisma.crmOrigem.create({
      data: { usuarioId: session.user.id, nome: body.nome.trim(), aprovado: true },
    });

    return NextResponse.json(origem, { status: 201 });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
