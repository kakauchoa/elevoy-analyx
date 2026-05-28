import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function verificarCliente(clienteId: string, usuarioId: string) {
  return prisma.clienteAgencia.findFirst({ where: { id: clienteId, usuarioId } });
}

function serializarPagamento(p: {
  id: string; clienteId: string; valor: { toString(): string }; dataVencimento: Date;
  dataPagamento: Date | null; status: string; observacoes: string | null;
  criadoEm: Date; atualizadoEm: Date;
}) {
  return {
    ...p,
    valor: p.valor.toString(),
    dataVencimento: p.dataVencimento.toISOString().slice(0, 10),
    dataPagamento: p.dataPagamento?.toISOString().slice(0, 10) ?? null,
    criadoEm: p.criadoEm.toISOString(),
    atualizadoEm: p.atualizadoEm.toISOString(),
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  if (!await verificarCliente(id, session.user.id)) {
    return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 });
  }

  // Marca automaticamente como inadimplente se passou do vencimento sem pagar
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  await prisma.pagamentoCliente.updateMany({
    where: {
      clienteId: id,
      status: "pendente",
      dataPagamento: null,
      dataVencimento: { lt: hoje },
    },
    data: { status: "inadimplente" },
  });

  const pagamentos = await prisma.pagamentoCliente.findMany({
    where: { clienteId: id },
    orderBy: { dataVencimento: "desc" },
  });

  return NextResponse.json(pagamentos.map(serializarPagamento));
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
      valor: string;
      dataVencimento: string;
      dataPagamento?: string;
      status?: string;
      observacoes?: string;
    };

    if (!body.valor || !body.dataVencimento) {
      return NextResponse.json({ erro: "Valor e data de vencimento são obrigatórios" }, { status: 400 });
    }

    const pagamento = await prisma.pagamentoCliente.create({
      data: {
        clienteId: id,
        valor: Number(body.valor),
        dataVencimento: new Date(body.dataVencimento),
        dataPagamento: body.dataPagamento ? new Date(body.dataPagamento) : null,
        status: (body.status as "pago" | "pendente" | "inadimplente") ?? "pendente",
        observacoes: body.observacoes?.trim() || null,
      },
    });

    return NextResponse.json(serializarPagamento(pagamento));
  } catch {
    return NextResponse.json({ erro: "Erro ao registrar pagamento" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  if (!await verificarCliente(id, session.user.id)) {
    return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 });
  }

  try {
    const body = await request.json() as {
      pagamentoId: string;
      status?: string;
      dataPagamento?: string;
      valor?: string;
      observacoes?: string;
    };

    const atualizado = await prisma.pagamentoCliente.update({
      where: { id: body.pagamentoId },
      data: {
        status: body.status as "pago" | "pendente" | "inadimplente" | undefined,
        dataPagamento: body.dataPagamento ? new Date(body.dataPagamento) : undefined,
        valor: body.valor ? Number(body.valor) : undefined,
        observacoes: body.observacoes?.trim() || undefined,
      },
    });

    return NextResponse.json(serializarPagamento(atualizado));
  } catch {
    return NextResponse.json({ erro: "Erro ao atualizar pagamento" }, { status: 500 });
  }
}
