import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agregarInsights } from "@/lib/agregar-insights";
import type { CampanhaHierarquica } from "@/types/dashboard";

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
      select: { id: true, compartilhamentoAtivo: true },
    });

    if (!conta || !conta.compartilhamentoAtivo) {
      return NextResponse.json(
        { erro: "Dashboard não encontrado ou não disponível" },
        { status: 404 }
      );
    }

    const dataInicio = new Date(`${inicio}T00:00:00Z`);
    const dataFim = new Date(`${fim}T00:00:00Z`);

    // Busca hierarquia completa
    const campanhas = await prisma.campanha.findMany({
      where: { contaAnuncioId: conta.id },
      include: {
        conjuntos: {
          include: { anuncios: true },
        },
      },
      orderBy: { nome: "asc" },
    });

    // Busca todos os insights do período de uma vez (mais eficiente que N queries)
    const [insightsCampanha, insightsConjunto, insightsAnuncio] = await Promise.all([
      prisma.insightDiario.findMany({
        where: { contaAnuncioId: conta.id, nivel: "campanha", data: { gte: dataInicio, lte: dataFim } },
      }),
      prisma.insightDiario.findMany({
        where: { contaAnuncioId: conta.id, nivel: "conjunto", data: { gte: dataInicio, lte: dataFim } },
      }),
      prisma.insightDiario.findMany({
        where: { contaAnuncioId: conta.id, nivel: "anuncio", data: { gte: dataInicio, lte: dataFim } },
      }),
    ]);

    // Agrupa insights por referenciaMetaId para lookup rápido
    const insightsPorCampanha = new Map<string, typeof insightsCampanha>();
    for (const i of insightsCampanha) {
      const arr = insightsPorCampanha.get(i.referenciaMetaId) ?? [];
      arr.push(i);
      insightsPorCampanha.set(i.referenciaMetaId, arr);
    }

    const insightsPorConjunto = new Map<string, typeof insightsConjunto>();
    for (const i of insightsConjunto) {
      const arr = insightsPorConjunto.get(i.referenciaMetaId) ?? [];
      arr.push(i);
      insightsPorConjunto.set(i.referenciaMetaId, arr);
    }

    const insightsPorAnuncio = new Map<string, typeof insightsAnuncio>();
    for (const i of insightsAnuncio) {
      const arr = insightsPorAnuncio.get(i.referenciaMetaId) ?? [];
      arr.push(i);
      insightsPorAnuncio.set(i.referenciaMetaId, arr);
    }

    const resultado: CampanhaHierarquica[] = campanhas.map((c) => ({
      id: c.id,
      campanhaIdMeta: c.campanhaIdMeta,
      nome: c.nome,
      status: c.status,
      metricas: agregarInsights(insightsPorCampanha.get(c.campanhaIdMeta) ?? []),
      conjuntos: c.conjuntos.map((cs) => ({
        id: cs.id,
        adsetIdMeta: cs.adsetIdMeta,
        nome: cs.nome,
        status: cs.status,
        metricas: agregarInsights(insightsPorConjunto.get(cs.adsetIdMeta) ?? []),
        anuncios: cs.anuncios.map((a) => ({
          id: a.id,
          anuncioIdMeta: a.anuncioIdMeta,
          nome: a.nome,
          status: a.status,
          metricas: agregarInsights(insightsPorAnuncio.get(a.anuncioIdMeta) ?? []),
        })),
      })),
    }));

    return NextResponse.json({ campanhas: resultado });
  } catch (erro) {
    console.error("[GET /api/compartilhavel/[slug]/campanhas]", erro);
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
