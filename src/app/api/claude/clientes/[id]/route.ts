import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessaoAdmin, tokenClaudeValido } from "@/lib/claude-relatorios";
import { serializarCliente, validarCliente } from "@/lib/claude-clientes";

type Contexto = { params: Promise<{ id: string }> };

/** Aceita o id interno ou o slug do cliente. */
async function buscar(idOuSlug: string) {
  return prisma.claudeCliente.findFirst({ where: { OR: [{ id: idOuSlug }, { slug: idOuSlug }] } });
}

export async function GET(req: Request, { params }: Contexto) {
  if (!tokenClaudeValido(req) && !(await sessaoAdmin())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const cliente = await buscar(id);
    if (!cliente) return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 });
    return NextResponse.json(serializarCliente(cliente));
  } catch {
    return NextResponse.json({ erro: "Erro ao buscar cliente" }, { status: 500 });
  }
}

/** Atualiza a ficha inteira. O slug não muda, porque liga o cliente ao histórico de relatórios. */
export async function PATCH(req: Request, { params }: Contexto) {
  if (!(await sessaoAdmin())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const validacao = validarCliente(corpo);
  if (!validacao.ok) return NextResponse.json({ erro: validacao.erro }, { status: 400 });
  const { slug: _slugIgnorado, ...dados } = validacao.dados;
  void _slugIgnorado;

  try {
    const atual = await buscar(id);
    if (!atual) return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 });
    const atualizado = await prisma.claudeCliente.update({ where: { id: atual.id }, data: dados });
    return NextResponse.json(serializarCliente(atualizado));
  } catch {
    return NextResponse.json({ erro: "Erro ao salvar cliente" }, { status: 500 });
  }
}

/** Exclui o cadastro. Os relatórios já gerados continuam no histórico. */
export async function DELETE(_req: Request, { params }: Contexto) {
  if (!(await sessaoAdmin())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const atual = await buscar(id);
    if (!atual) return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 });
    await prisma.claudeCliente.delete({ where: { id: atual.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro ao excluir cliente" }, { status: 500 });
  }
}
