import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const tags = await prisma.crmTag.findMany({
      where: { usuarioId: session.user.id },
      orderBy: { criadoEm: "asc" },
    });

    return NextResponse.json(tags);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const body = (await req.json()) as { nome?: string; cor?: string };
    if (!body.nome?.trim()) return NextResponse.json({ erro: "Nome é obrigatório" }, { status: 400 });

    const tag = await prisma.crmTag.create({
      data: {
        usuarioId: session.user.id,
        nome: body.nome.trim(),
        cor: body.cor ?? "#6366f1",
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
