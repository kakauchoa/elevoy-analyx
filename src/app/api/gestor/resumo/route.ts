import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { agregarInsights } from "@/lib/agregar-insights";
import { verificarAcessoConta } from "@/lib/acesso-contas";
import type { InsightNumericos } from "@/types/dashboard";
import type { InsightDiario } from "@prisma/client";

function hojeStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function subDias(base: string, n: number): string {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function filtrar(insights: InsightDiario[], inicio: string, fim: string): InsightNumericos | null {
  const lista = insights.filter((i) => {
    const data = i.data.toISOString().slice(0, 10);
    return data >= inicio && data <= fim;
  });
  return lista.length > 0 ? agregarInsights(lista) : null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.tipo !== "gestor") {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const contaId = req.nextUrl.searchParams.get("contaId");
    if (!contaId) {
      return NextResponse.json({ erro: "contaId é obrigatório" }, { status: 400 });
    }

    const temAcesso = await verificarAcessoConta(session.user.id, contaId);
    if (!temAcesso) {
      return NextResponse.json({ erro: "Conta não encontrada" }, { status: 404 });
    }

    const conta = await prisma.contaAnuncio.findFirst({
      where: { id: contaId, ativo: true },
      select: {
        id: true,
        nomeCliente: true,
        slugCompartilhavel: true,
        tipoFunil: true,
        metricaPrincipal: true,
        labelMetricaPrincipal: true,
        labelCustoPorResultado: true,
        ultimaSincronizacao: true,
      },
    });

    if (!conta) {
      return NextResponse.json({ erro: "Conta não encontrada" }, { status: 404 });
    }

    const hoje = hojeStr();
    const ontem = subDias(hoje, 1);
    const ha7dias = subDias(hoje, 6);
    const ha30dias = subDias(hoje, 29);

    // Busca única cobrindo os 30 dias — filtragem por período feita em memória
    const insights = await prisma.insightDiario.findMany({
      where: {
        contaAnuncioId: conta.id,
        nivel: "conta",
        data: {
          gte: new Date(`${ha30dias}T00:00:00Z`),
          lte: new Date(`${hoje}T23:59:59Z`),
        },
      },
    });

    return NextResponse.json({
      conta: {
        ...conta,
        ultimaSincronizacao: conta.ultimaSincronizacao?.toISOString() ?? null,
      },
      hoje: filtrar(insights, hoje, hoje),
      ontem: filtrar(insights, ontem, ontem),
      ultimos7dias: filtrar(insights, ha7dias, hoje),
      ultimos30dias: filtrar(insights, ha30dias, hoje),
    });
  } catch (erro) {
    console.error("[GET /api/gestor/resumo]", erro);
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
