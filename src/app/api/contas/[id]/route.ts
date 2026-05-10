import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CONFIGURACOES_FUNIL, TipoFunil } from "@/lib/metricas";
import { criptografar } from "@/lib/cripto";

type Params = Promise<{ id: string }>;

type DadosAtualizacao = {
  compartilhamentoAtivo?: boolean;
  nomeCliente?: string;
  slugCompartilhavel?: string;
  accountIdMeta?: string;
  tokenAcesso?: string;
  tokenExpiraEm?: Date;
  tokenStatus?: "ok" | "expirando" | "expirado" | "erro";
  tipoFunil?: TipoFunil;
  metricaPrincipal?: string;
  labelMetricaPrincipal?: string;
  labelCustoPorResultado?: string;
};

async function verificarProprietario(id: string, usuarioId: string) {
  return prisma.contaAnuncio.findFirst({
    where: { id, usuarioId, ativo: true },
  });
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
      tokenAcesso?: string;
      tipoFunil?: TipoFunil;
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
      dados.accountIdMeta = body.accountIdMeta;
    }

    // Token só é recriptografado quando um novo valor é enviado explicitamente
    if (body.tokenAcesso) {
      dados.tokenAcesso = criptografar(body.tokenAcesso);
      dados.tokenExpiraEm = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      dados.tokenStatus = "ok";
    }

    if (body.tipoFunil) {
      const config = CONFIGURACOES_FUNIL[body.tipoFunil];
      dados.tipoFunil = body.tipoFunil;
      dados.metricaPrincipal = config.metricaPrincipal;
      dados.labelMetricaPrincipal = config.labelMetricaPrincipal;
      dados.labelCustoPorResultado = config.labelCustoPorResultado;
    }

    const atualizado = await prisma.contaAnuncio.update({
      where: { id },
      data: dados,
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
        criadoEm: true,
      },
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

    // Soft delete: preserva histórico de insights e acessos
    await prisma.contaAnuncio.update({
      where: { id },
      data: { ativo: false },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
