import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FormulaMetrica } from "@/lib/formula";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const contaId = req.nextUrl.searchParams.get("contaId");
    if (!contaId) {
      return NextResponse.json({ erro: "contaId obrigatório" }, { status: 400 });
    }

    const metricas = await prisma.metricaPersonalizada.findMany({
      where: { contaAnuncioId: contaId, usuarioId: session.user.id },
      orderBy: { criadoEm: "asc" },
      select: { id: true, nome: true, formula: true, formato: true },
    });

    return NextResponse.json(metricas);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[metricas-personalizadas GET]", msg);
    return NextResponse.json({ erro: "Erro interno", detalhe: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { contaAnuncioId, nome, formula, formato } = body as {
      contaAnuncioId: string;
      nome: string;
      formula: FormulaMetrica;
      formato: "moeda" | "percentual" | "numero";
    };

    if (!contaAnuncioId || !nome?.trim() || !formula?.length) {
      return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
    }

    // Verifica que o gestor tem acesso à conta
    const conta = await prisma.contaAnuncio.findFirst({
      where: { id: contaAnuncioId, usuarioId: session.user.id },
    });
    if (!conta) {
      return NextResponse.json({ erro: "Conta não encontrada" }, { status: 404 });
    }

    const criada = await prisma.metricaPersonalizada.create({
      data: {
        contaAnuncioId,
        usuarioId: session.user.id,
        nome: nome.trim(),
        formula: formula as object,
        formato: formato ?? "numero",
      },
      select: { id: true, nome: true, formula: true, formato: true },
    });

    return NextResponse.json(criada, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[metricas-personalizadas POST]", msg);
    return NextResponse.json({ erro: "Erro interno", detalhe: msg }, { status: 500 });
  }
}
