import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sessaoAdmin, tokenClaudeValido, validarRelatorio } from "@/lib/claude-relatorios";

/**
 * Recebe um relatório gerado pela rotina agendada do Claude.
 * Auth: Authorization: Bearer <CLAUDE_RELATORIOS_TOKEN>.
 * Idempotente por (cliente, tipo, data): se a rotina rodar de novo no mesmo dia, o relatório
 * é atualizado e as otimizações ainda pendentes são trocadas pelas novas. As já marcadas
 * como feitas ou descartadas ficam preservadas.
 */
export async function POST(req: Request) {
  if (!tokenClaudeValido(req)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const validacao = validarRelatorio(corpo);
  if (!validacao.ok) {
    return NextResponse.json({ erro: validacao.erro }, { status: 400 });
  }
  const r = validacao.dados;

  const metricas = r.metricas ? (r.metricas as Prisma.InputJsonValue) : Prisma.JsonNull;
  const pedidosCliente = r.pedidosCliente.length ? (r.pedidosCliente as Prisma.InputJsonValue) : Prisma.JsonNull;

  try {
    const relatorio = await prisma.$transaction(async (tx) => {
      const salvo = await tx.claudeRelatorio.upsert({
        where: {
          clienteSlug_tipo_dataReferencia: {
            clienteSlug: r.clienteSlug,
            tipo: r.tipo,
            dataReferencia: r.dataReferencia,
          },
        },
        create: {
          clienteSlug: r.clienteSlug,
          clienteNome: r.clienteNome,
          tipo: r.tipo,
          dataReferencia: r.dataReferencia,
          tendencia: r.tendencia,
          resumo: r.resumo,
          conteudo: r.conteudo,
          metricas,
          pedidosCliente,
        },
        update: {
          clienteNome: r.clienteNome,
          tendencia: r.tendencia,
          resumo: r.resumo,
          conteudo: r.conteudo,
          metricas,
          pedidosCliente,
        },
      });

      await tx.claudeOtimizacao.deleteMany({
        where: { relatorioId: salvo.id, status: "pendente" },
      });

      if (r.otimizacoes.length) {
        await tx.claudeOtimizacao.createMany({
          data: r.otimizacoes.map((o) => ({
            relatorioId: salvo.id,
            clienteSlug: r.clienteSlug,
            titulo: o.titulo,
            descricao: o.descricao,
            plataforma: o.plataforma,
            prioridade: o.prioridade,
          })),
        });
      }

      return salvo;
    });

    return NextResponse.json({ ok: true, id: relatorio.id, otimizacoes: r.otimizacoes.length });
  } catch (erro) {
    console.error("[claude/relatorios] erro ao salvar", erro);
    return NextResponse.json({ erro: "Erro ao salvar relatório" }, { status: 500 });
  }
}

/**
 * Lista relatórios recentes. Usado pela rotina semanal (token) para ler o que saiu nos dias
 * anteriores, ou pelo admin logado.
 * Query: ?cliente=slug&tipo=diario&desde=AAAA-MM-DD&limite=30
 */
export async function GET(req: Request) {
  if (!tokenClaudeValido(req) && !(await sessaoAdmin())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const cliente = url.searchParams.get("cliente");
  const tipo = url.searchParams.get("tipo");
  const desde = url.searchParams.get("desde");
  const limite = Math.min(Number(url.searchParams.get("limite")) || 30, 200);

  const where: Prisma.ClaudeRelatorioWhereInput = {};
  if (cliente) where.clienteSlug = cliente;
  if (tipo === "diario" || tipo === "semanal") where.tipo = tipo;
  if (desde && /^\d{4}-\d{2}-\d{2}$/.test(desde)) {
    where.dataReferencia = { gte: new Date(`${desde}T00:00:00.000Z`) };
  }

  try {
    const relatorios = await prisma.claudeRelatorio.findMany({
      where,
      orderBy: { dataReferencia: "desc" },
      take: limite,
      select: {
        id: true,
        clienteSlug: true,
        clienteNome: true,
        tipo: true,
        dataReferencia: true,
        tendencia: true,
        resumo: true,
        metricas: true,
        pedidosCliente: true,
      },
    });
    return NextResponse.json({ relatorios });
  } catch {
    return NextResponse.json({ erro: "Erro ao buscar relatórios" }, { status: 500 });
  }
}
