import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  // Busca os dados principais do cliente
  let cliente;
  try {
    cliente = await prisma.clienteAgencia.findFirst({
      where: { id, usuarioId: session.user.id },
      include: {
        contas: {
          select: {
            id: true,
            nomeCliente: true,
            tipoFunil: true,
            slugCompartilhavel: true,
            rastreamentoApenas: true,
            compartilhamentoAtivo: true,
            ultimaSincronizacao: true,
          },
        },
        servicos: { where: { ativo: true }, orderBy: { criadoEm: "asc" } },
        pagamentos: { orderBy: { dataVencimento: "desc" } },
        indicadoPor: { select: { id: true, nome: true } },
        indicacoes: { select: { id: true, nome: true } },
      },
    });
  } catch {
    return NextResponse.json({ erro: "Erro ao buscar cliente" }, { status: 500 });
  }

  if (!cliente) return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 });

  // Busca os dados de mapa separadamente — tabelas podem não existir no banco ainda
  let mapaAvaliacao = null;
  let mapaEvolucaoConfig = null;
  let mapaEvolucaoRegistros: {
    id: string; clienteId: string; dataRegistro: Date; vendas: number | null;
    faturamento: { toString(): string } | null; observacoes: string | null;
    preenchidoPor: string; criadoEm: Date;
  }[] = [];

  try {
    const comMapa = await prisma.clienteAgencia.findFirst({
      where: { id },
      include: {
        mapaAvaliacao: true,
        mapaEvolucaoConfig: true,
        mapaEvolucaoRegistros: { orderBy: { dataRegistro: "desc" } },
      },
    });
    if (comMapa) {
      mapaAvaliacao = comMapa.mapaAvaliacao;
      mapaEvolucaoConfig = comMapa.mapaEvolucaoConfig;
      mapaEvolucaoRegistros = comMapa.mapaEvolucaoRegistros;
    }
  } catch {
    // Tabelas de mapa ainda não existem no banco
  }

  return NextResponse.json({
    ...cliente,
    dataEntrada: cliente.dataEntrada?.toISOString().slice(0, 10) ?? null,
    criadoEm: cliente.criadoEm.toISOString(),
    atualizadoEm: cliente.atualizadoEm.toISOString(),
    contas: cliente.contas.map((c) => ({
      ...c,
      ultimaSincronizacao: c.ultimaSincronizacao?.toISOString() ?? null,
    })),
    servicos: cliente.servicos.map((s) => ({
      ...s,
      valorMensal: s.valorMensal.toString(),
      criadoEm: s.criadoEm.toISOString(),
    })),
    pagamentos: cliente.pagamentos.map((p) => ({
      ...p,
      valor: p.valor.toString(),
      dataVencimento: p.dataVencimento.toISOString().slice(0, 10),
      dataPagamento: p.dataPagamento?.toISOString().slice(0, 10) ?? null,
      criadoEm: p.criadoEm.toISOString(),
      atualizadoEm: p.atualizadoEm.toISOString(),
    })),
    mapaAvaliacao,
    mapaEvolucaoConfig: mapaEvolucaoConfig
      ? {
          ...mapaEvolucaoConfig,
          metaFaturamentoMensal: mapaEvolucaoConfig.metaFaturamentoMensal?.toString() ?? null,
          faturamentoInicio: mapaEvolucaoConfig.faturamentoInicio?.toString() ?? null,
          dataInicio: mapaEvolucaoConfig.dataInicio?.toISOString().slice(0, 10) ?? null,
          criadoEm: mapaEvolucaoConfig.criadoEm.toISOString(),
          atualizadoEm: mapaEvolucaoConfig.atualizadoEm.toISOString(),
        }
      : null,
    mapaEvolucaoRegistros: mapaEvolucaoRegistros.map((r) => ({
      ...r,
      faturamento: r.faturamento?.toString() ?? null,
      dataRegistro: r.dataRegistro.toISOString().slice(0, 10),
      criadoEm: r.criadoEm.toISOString(),
    })),
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const existente = await prisma.clienteAgencia.findFirst({ where: { id, usuarioId: session.user.id } });
  if (!existente) return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 });

  try {
    const body = await request.json() as {
      nome?: string;
      cnpj?: string;
      nomeSocio?: string;
      telefone?: string;
      email?: string;
      dataEntrada?: string;
      indicadoPorId?: string;
      observacoes?: string;
    };

    const atualizado = await prisma.clienteAgencia.update({
      where: { id },
      data: {
        nome: body.nome?.trim() ?? existente.nome,
        cnpj: body.cnpj?.trim() || null,
        nomeSocio: body.nomeSocio?.trim() || null,
        telefone: body.telefone?.trim() || null,
        email: body.email?.trim() || null,
        dataEntrada: body.dataEntrada ? new Date(body.dataEntrada) : null,
        indicadoPorId: body.indicadoPorId || null,
        observacoes: body.observacoes?.trim() || null,
      },
    });

    return NextResponse.json({
      ...atualizado,
      dataEntrada: atualizado.dataEntrada?.toISOString().slice(0, 10) ?? null,
      criadoEm: atualizado.criadoEm.toISOString(),
      atualizadoEm: atualizado.atualizadoEm.toISOString(),
    });
  } catch {
    return NextResponse.json({ erro: "Erro ao atualizar cliente" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const existente = await prisma.clienteAgencia.findFirst({ where: { id, usuarioId: session.user.id } });
  if (!existente) return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 });

  await prisma.clienteAgencia.update({ where: { id }, data: { ativo: false } });

  return NextResponse.json({ ok: true });
}
