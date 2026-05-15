import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CONFIGURACOES_FUNIL, TipoFunil } from "@/lib/metricas";

type Params = Promise<{ id: string }>;

type DadosAtualizacao = {
  compartilhamentoAtivo?: boolean;
  nomeCliente?: string;
  slugCompartilhavel?: string;
  accountIdMeta?: string;
  tipoFunil?: TipoFunil;
  metricaPrincipal?: string;
  labelMetricaPrincipal?: string;
  labelCustoPorResultado?: string;
  dataEntrada?: Date | null;
  tipoPagamento?: "cartao" | "boleto";
  orcamentoMensal?: number | null;
  ultimaSincronizacao?: null;
  saldoAtual?: null;
  saldoAtualizadoEm?: null;
};

const SELECT_CONTA = {
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
  dataEntrada: true,
  tipoPagamento: true,
  orcamentoMensal: true,
  saldoAtual: true,
  saldoAtualizadoEm: true,
  criadoEm: true,
} as const;

async function verificarProprietario(id: string, usuarioId: string) {
  return prisma.contaAnuncio.findFirst({
    where: { id, usuarioId, ativo: true },
  });
}

/** Remove todos os dados históricos de uma conta (insights + hierarquia Meta). */
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

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const conta = await verificarProprietario(id, session.user.id);
    if (!conta) {
      return NextResponse.json({ erro: "Conta não encontrada" }, { status: 404 });
    }

    const body = await req.json() as {
      compartilhamentoAtivo?: boolean;
      nomeCliente?: string;
      slugCompartilhavel?: string;
      accountIdMeta?: string;
      tipoFunil?: TipoFunil;
      dataEntrada?: string | null;
      tipoPagamento?: "cartao" | "boleto";
      orcamentoMensal?: number | null;
    };

    const dados: DadosAtualizacao = {};

    if (body.compartilhamentoAtivo !== undefined) {
      dados.compartilhamentoAtivo = body.compartilhamentoAtivo;
    }

    if (body.nomeCliente) dados.nomeCliente = body.nomeCliente;

    if (body.slugCompartilhavel) {
      const slugExistente = await prisma.contaAnuncio.findFirst({
        where: { slugCompartilhavel: body.slugCompartilhavel, id: { not: id } },
      });
      if (slugExistente) {
        return NextResponse.json({ erro: "Este slug já está em uso" }, { status: 400 });
      }
      dados.slugCompartilhavel = body.slugCompartilhavel;
    }

    if (body.accountIdMeta) {
      if (!/^act_\d+$/.test(body.accountIdMeta)) {
        return NextResponse.json(
          { erro: "Account ID inválido. Use o formato act_123456" },
          { status: 400 }
        );
      }
      // ID de conta mudou → todos os dados históricos são inválidos para o novo ID
      if (body.accountIdMeta !== conta.accountIdMeta) {
        await limparDadosConta(id);
        dados.ultimaSincronizacao = null;
        dados.saldoAtual = null;
        dados.saldoAtualizadoEm = null;
      }
      dados.accountIdMeta = body.accountIdMeta;
    }

    if (body.tipoFunil) {
      const config = CONFIGURACOES_FUNIL[body.tipoFunil];
      dados.tipoFunil = body.tipoFunil;
      dados.metricaPrincipal = config.metricaPrincipal;
      dados.labelMetricaPrincipal = config.labelMetricaPrincipal;
      dados.labelCustoPorResultado = config.labelCustoPorResultado;
    }

    if ("dataEntrada" in body) dados.dataEntrada = body.dataEntrada ? new Date(body.dataEntrada) : null;
    if (body.tipoPagamento) dados.tipoPagamento = body.tipoPagamento;
    if (body.orcamentoMensal !== undefined) dados.orcamentoMensal = body.orcamentoMensal;

    const atualizado = await prisma.contaAnuncio.update({
      where: { id },
      data: dados,
      select: SELECT_CONTA,
    });

    return NextResponse.json(atualizado);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const conta = await verificarProprietario(id, session.user.id);
    if (!conta) {
      return NextResponse.json({ erro: "Conta não encontrada" }, { status: 404 });
    }

    // Apaga todos os dados associados antes de deletar a conta
    await limparDadosConta(id);

    await prisma.$transaction([
      prisma.acessoDashboard.deleteMany({ where: { contaAnuncioId: id } }),
      prisma.relatorioGerado.deleteMany({ where: { contaAnuncioId: id } }),
      prisma.configuracaoGtm.deleteMany({ where: { contaAnuncioId: id } }),
      prisma.notificacaoSaldo.deleteMany({ where: { contaAnuncioId: id } }),
      prisma.gestorConta.deleteMany({ where: { contaAnuncioId: id } }),
      prisma.contaAnuncio.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
