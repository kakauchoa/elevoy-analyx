import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sessaoAdmin, tokenClaudeValido } from "@/lib/claude-relatorios";

/**
 * Lista otimizações sugeridas. A rotina de segunda usa ?status=feita&desde=AAAA-MM-DD
 * para montar o "o que fizemos na semana".
 * Query: ?cliente=slug&status=pendente|feita|descartada&desde=AAAA-MM-DD
 */
export async function GET(req: Request) {
  if (!tokenClaudeValido(req) && !(await sessaoAdmin())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const cliente = url.searchParams.get("cliente");
  const status = url.searchParams.get("status");
  const desde = url.searchParams.get("desde");

  const where: Prisma.ClaudeOtimizacaoWhereInput = {};
  if (cliente) where.clienteSlug = cliente;
  if (status === "pendente" || status === "feita" || status === "descartada") where.status = status;
  if (desde && /^\d{4}-\d{2}-\d{2}$/.test(desde)) {
    const inicio = new Date(`${desde}T00:00:00.000Z`);
    // Feitas: filtra pela data em que foram marcadas. Demais: pela data em que foram sugeridas.
    if (status === "feita") where.feitaEm = { gte: inicio };
    else where.criadoEm = { gte: inicio };
  }

  try {
    const otimizacoes = await prisma.claudeOtimizacao.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      take: 300,
      select: {
        id: true,
        clienteSlug: true,
        titulo: true,
        descricao: true,
        plataforma: true,
        prioridade: true,
        status: true,
        feitaEm: true,
        criadoEm: true,
      },
    });
    return NextResponse.json({ otimizacoes });
  } catch {
    return NextResponse.json({ erro: "Erro ao buscar otimizações" }, { status: 500 });
  }
}
