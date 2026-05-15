import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function garantirEtapaLeads(usuarioId: string) {
  const leads = await prisma.crmEtapa.findFirst({ where: { usuarioId, fixo: true } });
  if (!leads) {
    await prisma.crmEtapa.create({
      data: { usuarioId, nome: "Leads", cor: "#6366f1", ordem: 0, fixo: true },
    });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    await garantirEtapaLeads(session.user.id);

    const etapas = await prisma.crmEtapa.findMany({
      where: { usuarioId: session.user.id },
      include: {
        contatos: {
          include: { campos: true, tags: { include: { tag: true } } },
          orderBy: { criadoEm: "asc" },
        },
      },
      orderBy: { ordem: "asc" },
    });

    return NextResponse.json(etapas);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const body = (await req.json()) as { nome?: string; cor?: string };
    const { nome, cor } = body;

    if (!nome?.trim()) {
      return NextResponse.json({ erro: "Nome é obrigatório" }, { status: 400 });
    }

    const ultima = await prisma.crmEtapa.findFirst({
      where: { usuarioId: session.user.id },
      orderBy: { ordem: "desc" },
      select: { ordem: true },
    });

    const etapa = await prisma.crmEtapa.create({
      data: {
        usuarioId: session.user.id,
        nome: nome.trim(),
        cor: cor ?? "#6366f1",
        ordem: (ultima?.ordem ?? 0) + 1,
        fixo: false,
      },
      include: { contatos: { include: { campos: true, tags: { include: { tag: true } } } } },
    });

    return NextResponse.json(etapa, { status: 201 });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
