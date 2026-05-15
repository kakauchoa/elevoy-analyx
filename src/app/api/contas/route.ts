import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CONFIGURACOES_FUNIL, TipoFunil } from "@/lib/metricas";
import { criptografar } from "@/lib/cripto";
import { resolverAcesso } from "@/lib/acesso-contas";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const { contaIds } = await resolverAcesso(session.user.id);

    const contas = await prisma.contaAnuncio.findMany({
      where: { id: { in: contaIds }, ativo: true },
      select: {
        id: true,
        nomeCliente: true,
        slugCompartilhavel: true,
        accountIdMeta: true,
        tipoFunil: true,
        metricaPrincipal: true,
        labelMetricaPrincipal: true,
        labelCustoPorResultado: true,
        compartilhamentoAtivo: true,
        ultimaSincronizacao: true,
        tokenExpiraEm: true,
        tokenStatus: true,
        tipoPagamento: true,
        orcamentoMensal: true,
        criadoEm: true,
      },
      orderBy: { criadoEm: "desc" },
    });

    return NextResponse.json(contas);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json() as {
      nomeCliente?: string;
      slugCompartilhavel?: string;
      accountIdMeta?: string;
      tokenAcesso?: string;
      tipoFunil?: TipoFunil;
      tipoPagamento?: "cartao" | "boleto";
      orcamentoMensal?: number | null;
    };

    const { nomeCliente, slugCompartilhavel, accountIdMeta, tokenAcesso, tipoFunil } = body;

    if (!nomeCliente || !slugCompartilhavel || !accountIdMeta || !tokenAcesso || !tipoFunil) {
      return NextResponse.json({ erro: "Todos os campos são obrigatórios" }, { status: 400 });
    }

    if (!/^act_\d+$/.test(accountIdMeta)) {
      return NextResponse.json(
        { erro: "Account ID inválido. Use o formato act_123456" },
        { status: 400 }
      );
    }

    const slugExistente = await prisma.contaAnuncio.findUnique({
      where: { slugCompartilhavel },
    });
    if (slugExistente) {
      return NextResponse.json({ erro: "Este slug já está em uso" }, { status: 400 });
    }

    // Busca metadados do funil automaticamente para evitar inconsistência
    const config = CONFIGURACOES_FUNIL[tipoFunil];

    const conta = await prisma.contaAnuncio.create({
      data: {
        usuarioId: session.user.id,
        nomeCliente,
        slugCompartilhavel,
        accountIdMeta,
        tokenAcesso: criptografar(tokenAcesso),
        tipoFunil,
        metricaPrincipal: config.metricaPrincipal,
        labelMetricaPrincipal: config.labelMetricaPrincipal,
        labelCustoPorResultado: config.labelCustoPorResultado,
        tokenExpiraEm: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        tokenStatus: "ok",
        tipoPagamento: body.tipoPagamento ?? "cartao",
        orcamentoMensal: body.orcamentoMensal ?? null,
      },
      select: {
        id: true,
        nomeCliente: true,
        slugCompartilhavel: true,
        accountIdMeta: true,
        tipoFunil: true,
        metricaPrincipal: true,
        labelMetricaPrincipal: true,
        labelCustoPorResultado: true,
        compartilhamentoAtivo: true,
        ultimaSincronizacao: true,
        tokenExpiraEm: true,
        tokenStatus: true,
        tipoPagamento: true,
        orcamentoMensal: true,
        criadoEm: true,
      },
    });

    return NextResponse.json(conta, { status: 201 });
  } catch (erro) {
    console.error("[POST /api/contas]", erro);
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
