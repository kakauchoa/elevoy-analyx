import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const clientes = await prisma.clienteAgencia.findMany({
    where: { usuarioId: session.user.id, ativo: true },
    include: {
      contas: { select: { id: true, nomeCliente: true, tipoFunil: true, slugCompartilhavel: true, rastreamentoApenas: true } },
      servicos: { where: { ativo: true } },
      pagamentos: { orderBy: { dataVencimento: "desc" }, take: 1 },
      indicadoPor: { select: { id: true, nome: true } },
      mapaAvaliacao: true,
    },
    orderBy: { nome: "asc" },
  });

  return NextResponse.json(
    clientes.map((c) => ({
      ...c,
      dataEntrada: c.dataEntrada?.toISOString().slice(0, 10) ?? null,
      criadoEm: c.criadoEm.toISOString(),
      atualizadoEm: c.atualizadoEm.toISOString(),
      pagamentos: c.pagamentos.map((p) => ({
        ...p,
        valor: p.valor.toString(),
        dataVencimento: p.dataVencimento.toISOString().slice(0, 10),
        dataPagamento: p.dataPagamento?.toISOString().slice(0, 10) ?? null,
        criadoEm: p.criadoEm.toISOString(),
        atualizadoEm: p.atualizadoEm.toISOString(),
      })),
      servicos: c.servicos.map((s) => ({
        ...s,
        valorMensal: s.valorMensal.toString(),
        criadoEm: s.criadoEm.toISOString(),
      })),
    }))
  );
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const body = await request.json() as {
      nome: string;
      cnpj?: string;
      nomeSocio?: string;
      telefone?: string;
      email?: string;
      dataEntrada?: string;
      indicadoPorId?: string;
      observacoes?: string;
    };

    if (!body.nome?.trim()) {
      return NextResponse.json({ erro: "Nome é obrigatório" }, { status: 400 });
    }

    const cliente = await prisma.clienteAgencia.create({
      data: {
        usuarioId: session.user.id,
        nome: body.nome.trim(),
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
      ...cliente,
      dataEntrada: cliente.dataEntrada?.toISOString().slice(0, 10) ?? null,
      criadoEm: cliente.criadoEm.toISOString(),
      atualizadoEm: cliente.atualizadoEm.toISOString(),
    });
  } catch {
    return NextResponse.json({ erro: "Erro ao criar cliente" }, { status: 500 });
  }
}
