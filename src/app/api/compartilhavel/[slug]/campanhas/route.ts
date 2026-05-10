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

    // Busca hierarquia completa de entidades sincronizadas
    const campanhas = await prisma.campanha.findMany({
      where: { contaAnuncioId: conta.id },
      include: {
        conjuntos: {
          include: { anuncios: true },
        },
      },
      orderBy: { nome: "asc" },
    });

    // Coleta todos os Meta IDs de cada nível para filtrar os insights exatamente
    const campanhaMetaIds = campanhas.map((c) => c.campanhaIdMeta);
    const conjuntoMetaIds = campanhas.flatMap((c) =>
      c.conjuntos.map((cs) => cs.adsetIdMeta)
    );
    const anuncioMetaIds = campanhas.flatMap((c) =>
      c.conjuntos.flatMap((cs) => cs.anuncios.map((a) => a.anuncioIdMeta))
    );

    // Parâmetros de período compartilhados
    const filtroBase = {
      contaAnuncioId: conta.id,
      data: { gte: dataInicio, lte: dataFim },
    };

    // Busca insights por nível filtrando explicitamente pelos referenciaMetaId do nível correto.
    // A coluna referencia_meta_id guarda o Meta ID do objeto (campaign_id, adset_id, ad_id)
    // conforme salvo pelo meta-insights.service.ts.
    const [insightsCampanha, insightsConjunto, insightsAnuncio] = await Promise.all([
      campanhaMetaIds.length > 0
        ? prisma.insightDiario.findMany({
            where: {
              ...filtroBase,
              nivel: "campanha",
              referenciaMetaId: { in: campanhaMetaIds },
            },
          })
        : Promise.resolve([]),

      conjuntoMetaIds.length > 0
        ? prisma.insightDiario.findMany({
            where: {
              ...filtroBase,
              nivel: "conjunto",
              referenciaMetaId: { in: conjuntoMetaIds },
            },
          })
        : Promise.resolve([]),

      anuncioMetaIds.length > 0
        ? prisma.insightDiario.findMany({
            where: {
              ...filtroBase,
              nivel: "anuncio",
              referenciaMetaId: { in: anuncioMetaIds },
            },
          })
        : Promise.resolve([]),
    ]);

    // Agrupa por referenciaMetaId para lookup O(1) ao montar a hierarquia
    function agruparPorMetaId<T extends { referenciaMetaId: string }>(
      lista: T[]
    ): Map<string, T[]> {
      const mapa = new Map<string, T[]>();
      for (const item of lista) {
        const arr = mapa.get(item.referenciaMetaId) ?? [];
        arr.push(item);
        mapa.set(item.referenciaMetaId, arr);
      }
      return mapa;
    }

    const porCampanha = agruparPorMetaId(insightsCampanha);
    const porConjunto = agruparPorMetaId(insightsConjunto);
    const porAnuncio = agruparPorMetaId(insightsAnuncio);

    const resultado: CampanhaHierarquica[] = campanhas.map((c) => ({
      id: c.id,
      campanhaIdMeta: c.campanhaIdMeta,
      nome: c.nome,
      status: c.status,
      // Lookup: referencia_meta_id = campanha_id_meta (Meta campaign ID)
      metricas: agregarInsights(porCampanha.get(c.campanhaIdMeta) ?? []),
      conjuntos: c.conjuntos.map((cs) => ({
        id: cs.id,
        adsetIdMeta: cs.adsetIdMeta,
        nome: cs.nome,
        status: cs.status,
        // Lookup: referencia_meta_id = adset_id_meta (Meta adset ID)
        metricas: agregarInsights(porConjunto.get(cs.adsetIdMeta) ?? []),
        anuncios: cs.anuncios.map((a) => ({
          id: a.id,
          anuncioIdMeta: a.anuncioIdMeta,
          nome: a.nome,
          status: a.status,
          // Lookup: referencia_meta_id = anuncio_id_meta (Meta ad ID)
          metricas: agregarInsights(porAnuncio.get(a.anuncioIdMeta) ?? []),
        })),
      })),
    }));

    // Inclui contagens de debug para facilitar diagnóstico
    return NextResponse.json({
      campanhas: resultado,
      _debug: {
        insightsCampanha: insightsCampanha.length,
        insightsConjunto: insightsConjunto.length,
        insightsAnuncio: insightsAnuncio.length,
        campanhasComDados: resultado.filter((c) => c.metricas.spend > 0).length,
      },
    });
  } catch (erro) {
    console.error("[GET /api/compartilhavel/[slug]/campanhas]", erro);
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
