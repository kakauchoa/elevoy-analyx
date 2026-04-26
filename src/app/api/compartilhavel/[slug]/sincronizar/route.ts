import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { descriptografar } from "@/lib/cripto";
import { sincronizarContaAnuncio } from "@/services/meta-insights.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = (await req.json()) as { inicio?: string; fim?: string };

    if (!body.inicio || !body.fim) {
      return NextResponse.json(
        { erro: "Parâmetros inicio e fim são obrigatórios" },
        { status: 400 }
      );
    }

    const conta = await prisma.contaAnuncio.findUnique({
      where: { slugCompartilhavel: slug },
      select: {
        id: true,
        accountIdMeta: true,
        tokenAcesso: true,
        compartilhamentoAtivo: true,
        ultimaSincronizacao: true,
        ativo: true,
      },
    });

    if (!conta || !conta.compartilhamentoAtivo || !conta.ativo) {
      return NextResponse.json(
        { erro: "Dashboard não encontrado ou não disponível" },
        { status: 404 }
      );
    }

    // Rate limit: impede nova sincronização se a última foi há menos de 5 minutos
    if (conta.ultimaSincronizacao) {
      const diffMs = Date.now() - conta.ultimaSincronizacao.getTime();
      if (diffMs < 5 * 60 * 1000) {
        return NextResponse.json({ iniciado: false, motivo: "sincronização_recente" });
      }
    }

    const tokenAcesso = descriptografar(conta.tokenAcesso);

    // Dispara sincronização em background sem aguardar
    sincronizarContaAnuncio({
      contaAnuncioId: conta.id,
      accountIdMeta: conta.accountIdMeta,
      tokenAcesso,
      dataInicio: body.inicio,
      dataFim: body.fim,
    }).catch((erro: unknown) => {
      console.error(`[sincronizar público] slug=${slug}`, erro);
    });

    return NextResponse.json({ iniciado: true });
  } catch (erro) {
    console.error("[POST /api/compartilhavel/[slug]/sincronizar]", erro);
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
