import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obterTokenGlobal } from "@/lib/token-global";
import { sincronizarContaAnuncio } from "@/services/meta-insights.service";

type Params = Promise<{ id: string }>;

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

async function limparDadosConta(contaId: string) {
  const campanhas = await prisma.campanha.findMany({
    where: { contaAnuncioId: contaId },
    select: { id: true },
  });
  const campanhaIds = campanhas.map((c) => c.id);

  const conjuntos = campanhaIds.length
    ? await prisma.conjuntoAnuncio.findMany({
        where: { campanhaId: { in: campanhaIds } },
        select: { id: true },
      })
    : [];
  const conjuntoIds = conjuntos.map((c) => c.id);

  await prisma.$transaction([
    ...(conjuntoIds.length
      ? [prisma.anuncio.deleteMany({ where: { conjuntoId: { in: conjuntoIds } } })]
      : []),
    ...(campanhaIds.length
      ? [prisma.conjuntoAnuncio.deleteMany({ where: { campanhaId: { in: campanhaIds } } })]
      : []),
    prisma.campanha.deleteMany({ where: { contaAnuncioId: contaId } }),
    prisma.insightDiario.deleteMany({ where: { contaAnuncioId: contaId } }),
  ]);
}

export async function POST(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const conta = await prisma.contaAnuncio.findFirst({
      where: { id, usuarioId: session.user.id, ativo: true },
      select: { id: true, accountIdMeta: true, dataEntrada: true },
    });

    if (!conta) {
      return NextResponse.json({ erro: "Conta não encontrada" }, { status: 404 });
    }

    let tokenAcesso: string;
    try {
      tokenAcesso = await obterTokenGlobal();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Token Meta não configurado";
      return NextResponse.json({ erro: msg }, { status: 503 });
    }

    // Limpa todos os dados antes de reprocessar
    await limparDadosConta(conta.id);

    await prisma.contaAnuncio.update({
      where: { id: conta.id },
      data: { ultimaSincronizacao: null, saldoAtual: null, saldoAtualizadoEm: null },
    });

    const dataInicio = conta.dataEntrada
      ? conta.dataEntrada.toISOString().slice(0, 10)
      : hoje();
    const dataFim = hoje();

    // Dispara em background para não bloquear a resposta
    sincronizarContaAnuncio({
      contaAnuncioId: conta.id,
      accountIdMeta: conta.accountIdMeta,
      tokenAcesso,
      dataInicio,
      dataFim,
    }).catch((erro: unknown) => {
      console.error(`[reprocessar] conta=${conta.id}`, erro);
    });

    return NextResponse.json({ iniciado: true, dataInicio, dataFim });
  } catch (erro) {
    console.error("[POST /api/contas/[id]/reprocessar]", erro);
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
