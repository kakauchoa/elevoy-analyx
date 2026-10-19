import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sessaoAdmin, tokenClaudeValido } from "@/lib/claude-relatorios";
import { serializarCliente, validarCliente } from "@/lib/claude-clientes";

/**
 * Lista os clientes da aba Claude com todo o contexto (contas, briefing, links, mapa).
 * A rotina diária chama com token: GET /api/claude/clientes?status=ativo
 */
export async function GET(req: Request) {
  if (!tokenClaudeValido(req) && !(await sessaoAdmin())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const status = new URL(req.url).searchParams.get("status");
  const where: Prisma.ClaudeClienteWhereInput = {};
  if (status === "ativo" || status === "pausado" || status === "encerrado") where.status = status;

  try {
    const [clientes, ultimos] = await Promise.all([
      prisma.claudeCliente.findMany({ where, orderBy: { nome: "asc" } }),
      prisma.claudeRelatorio.groupBy({ by: ["clienteSlug"], _max: { dataReferencia: true } }),
    ]);
    const ultimoPorSlug = new Map(ultimos.map((u) => [u.clienteSlug, u._max.dataReferencia]));

    return NextResponse.json({
      clientes: clientes.map((c) => ({
        ...serializarCliente(c),
        ultimoRelatorio: ultimoPorSlug.get(c.slug)?.toISOString().slice(0, 10) ?? null,
      })),
    });
  } catch {
    return NextResponse.json({ erro: "Erro ao buscar clientes" }, { status: 500 });
  }
}

/** Cria um cliente (admin logado). */
export async function POST(req: Request) {
  if (!(await sessaoAdmin())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const validacao = validarCliente(corpo);
  if (!validacao.ok) return NextResponse.json({ erro: validacao.erro }, { status: 400 });

  try {
    const criado = await prisma.claudeCliente.create({ data: validacao.dados });
    return NextResponse.json(serializarCliente(criado), { status: 201 });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return NextResponse.json({ erro: "Já existe um cliente com esse nome. Use outro nome ou edite o existente." }, { status: 409 });
    }
    return NextResponse.json({ erro: "Erro ao criar cliente" }, { status: 500 });
  }
}
