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

  const servicos = await prisma.servicoCliente.findMany({
    where: { clienteId: id, ativo: true },
    orderBy: { criadoEm: "asc" },
  });

  return NextResponse.json(servicos.map((s) => ({ ...s, valorMensal: s.valorMensal.toString(), criadoEm: s.criadoEm.toISOString() })));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  if (!await verificarCliente(id, session.user.id)) {
    return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 });
  }

  try {
    const body = await request.json() as { nome: string; valorMensal: string };
    if (!body.nome?.trim()) return NextResponse.json({ erro: "Nome obrigatório" }, { status: 400 });

    const servico = await prisma.servicoCliente.create({
      data: {
        clienteId: id,
        nome: body.nome.trim(),
        valorMensal: Number(body.valorMensal) || 0,
      },
    });

    return NextResponse.json({ ...servico, valorMensal: servico.valorMensal.toString(), criadoEm: servico.criadoEm.toISOString() });
  } catch {
    return NextResponse.json({ erro: "Erro ao criar serviço" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  if (!await verificarCliente(id, session.user.id)) {
    return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 });
  }

  const { servicoId } = await request.json() as { servicoId: string };
  await prisma.servicoCliente.update({ where: { id: servicoId }, data: { ativo: false } });

  return NextResponse.json({ ok: true });
}
