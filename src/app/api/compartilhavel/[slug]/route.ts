import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agregarInsights, serializarDia, gerarPeriodo } from "@/lib/agregar-insights";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const inicio = searchParams.get("inicio");
    const fim = searchParams.get("fim");

    if (!inicio || !fim) {
      return NextResponse.json(
        { erro: "Parâmetros inicio e fim são obrigatórios" },
        { status: 400 }
      );
    }

    const conta = await prisma.contaAnuncio.findUnique({
      where: { slugCompartilhavel: slug },
      select: {
        id: true,
        nomeCliente: true,
        tipoFunil: true,
        metricaPrincipal: true,
        labelMetricaPrincipal: true,
        labelCustoPorResultado: true,
        compartilhamentoAtivo: true,
        ultimaSincronizacao: true,
      },
    });

    if (!conta || !conta.compartilhamentoAtivo) {
      return NextResponse.json(
        { erro: "Dashboard não encontrado ou não disponível" },
        { status: 404 }
      );
    }

    const insights = await prisma.insightDiario.findMany({
      where: {
        contaAnuncioId: conta.id,
        nivel: "conta",
        data: {
          gte: new Date(`${inicio}T00:00:00Z`),
          lte: new Date(`${fim}T00:00:00Z`),
        },
      },
      orderBy: { data: "asc" },
    });

    const todasDatas = gerarPeriodo(inicio, fim);
    const datasNoBanco = new Set(insights.map((i) => i.data.toISOString().slice(0, 10)));
    const datasFaltando = todasDatas.filter((d) => !datasNoBanco.has(d));

    return NextResponse.json({
      conta: {
        id: conta.id,
        nomeCliente: conta.nomeCliente,
        tipoFunil: conta.tipoFunil,
        metricaPrincipal: conta.metricaPrincipal,
        labelMetricaPrincipal: conta.labelMetricaPrincipal,
        labelCustoPorResultado: conta.labelCustoPorResultado,
        ultimaSincronizacao: conta.ultimaSincronizacao?.toISOString() ?? null,
      },
      agregado: agregarInsights(insights),
      porDia: insights.map(serializarDia),
      datasNoBanco: [...datasNoBanco],
      datasFaltando,
    });
  } catch (erro) {
    console.error("[GET /api/compartilhavel/[slug]]", erro);
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
