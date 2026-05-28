import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function verificarCliente(clienteId: string, usuarioId: string) {
  return prisma.clienteAgencia.findFirst({ where: { id: clienteId, usuarioId } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  if (!await verificarCliente(id, session.user.id)) {
    return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 });
  }

  const [config, registros] = await Promise.all([
    prisma.mapaEvolucaoConfig.findUnique({ where: { clienteId: id } }),
    prisma.mapaEvolucaoRegistro.findMany({
      where: { clienteId: id },
      orderBy: { dataRegistro: "asc" },
    }),
  ]);

  return NextResponse.json({
    config: config
      ? {
          ...config,
          metaFaturamentoMensal: config.metaFaturamentoMensal?.toString() ?? null,
          faturamentoInicio: config.faturamentoInicio?.toString() ?? null,
          dataInicio: config.dataInicio?.toISOString().slice(0, 10) ?? null,
          criadoEm: config.criadoEm.toISOString(),
          atualizadoEm: config.atualizadoEm.toISOString(),
        }
      : null,
    registros: registros.map((r) => ({
      ...r,
      faturamento: r.faturamento?.toString() ?? null,
      dataRegistro: r.dataRegistro.toISOString().slice(0, 10),
      criadoEm: r.criadoEm.toISOString(),
    })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  if (!await verificarCliente(id, session.user.id)) {
    return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 });
  }

  try {
    const body = await request.json() as {
      tipo: "config" | "registro";
      // config
      metaFaturamentoMensal?: string;
      faturamentoInicio?: string;
      vendasInicio?: number;
      dataInicio?: string;
      observacoesConfig?: string;
      // registro
      dataRegistro?: string;
      vendas?: number;
      faturamento?: string;
      observacoes?: string;
      preenchidoPor?: string;
    };

    if (body.tipo === "config") {
      const config = await prisma.mapaEvolucaoConfig.upsert({
        where: { clienteId: id },
        update: {
          metaFaturamentoMensal: body.metaFaturamentoMensal ? Number(body.metaFaturamentoMensal) : null,
          faturamentoInicio: body.faturamentoInicio ? Number(body.faturamentoInicio) : null,
          vendasInicio: body.vendasInicio ?? null,
          dataInicio: body.dataInicio ? new Date(body.dataInicio) : null,
          observacoes: body.observacoesConfig?.trim() || null,
        },
        create: {
          clienteId: id,
          metaFaturamentoMensal: body.metaFaturamentoMensal ? Number(body.metaFaturamentoMensal) : null,
          faturamentoInicio: body.faturamentoInicio ? Number(body.faturamentoInicio) : null,
          vendasInicio: body.vendasInicio ?? null,
          dataInicio: body.dataInicio ? new Date(body.dataInicio) : null,
          observacoes: body.observacoesConfig?.trim() || null,
        },
      });

      return NextResponse.json({
        ...config,
        metaFaturamentoMensal: config.metaFaturamentoMensal?.toString() ?? null,
        faturamentoInicio: config.faturamentoInicio?.toString() ?? null,
        dataInicio: config.dataInicio?.toISOString().slice(0, 10) ?? null,
        criadoEm: config.criadoEm.toISOString(),
        atualizadoEm: config.atualizadoEm.toISOString(),
      });
    }

    // tipo === "registro"
    if (!body.dataRegistro) {
      return NextResponse.json({ erro: "Data do registro é obrigatória" }, { status: 400 });
    }

    const registro = await prisma.mapaEvolucaoRegistro.upsert({
      where: { clienteId_dataRegistro: { clienteId: id, dataRegistro: new Date(body.dataRegistro) } },
      update: {
        vendas: body.vendas ?? null,
        faturamento: body.faturamento ? Number(body.faturamento) : null,
        observacoes: body.observacoes?.trim() || null,
        preenchidoPor: body.preenchidoPor ?? "gestor",
      },
      create: {
        clienteId: id,
        dataRegistro: new Date(body.dataRegistro),
        vendas: body.vendas ?? null,
        faturamento: body.faturamento ? Number(body.faturamento) : null,
        observacoes: body.observacoes?.trim() || null,
        preenchidoPor: body.preenchidoPor ?? "gestor",
      },
    });

    return NextResponse.json({
      ...registro,
      faturamento: registro.faturamento?.toString() ?? null,
      dataRegistro: registro.dataRegistro.toISOString().slice(0, 10),
      criadoEm: registro.criadoEm.toISOString(),
    });
  } catch {
    return NextResponse.json({ erro: "Erro ao salvar dados de evolução" }, { status: 500 });
  }
}
