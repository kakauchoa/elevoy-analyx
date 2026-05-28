import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const cliente = await prisma.clienteAgencia.findFirst({ where: { id, usuarioId: session.user.id } });
  if (!cliente) return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 });

  try {
    const body = await request.json() as {
      desempenhoCampanhas?: string;
      relacionamento?: string;
      preenchidoPor?: "gestor" | "cliente";
    };

    type Avaliacao = "otimo" | "bom" | "regular" | "ruim" | "pessimo";

    const agora = new Date();
    const data: Record<string, unknown> = {};

    if (body.desempenhoCampanhas !== undefined) {
      data.desempenhoCampanhas = body.desempenhoCampanhas as Avaliacao;
    }
    if (body.relacionamento !== undefined) {
      data.relacionamento = body.relacionamento as Avaliacao;
    }
    if (body.preenchidoPor === "gestor") {
      data.preenchidoGestorEm = agora;
    } else if (body.preenchidoPor === "cliente") {
      data.preenchidoClienteEm = agora;
    }

    const avaliacao = await prisma.mapaAvaliacaoCliente.upsert({
      where: { clienteId: id },
      update: data,
      create: { clienteId: id, ...data },
    });

    return NextResponse.json({
      ...avaliacao,
      atualizadoEm: avaliacao.atualizadoEm.toISOString(),
      preenchidoGestorEm: avaliacao.preenchidoGestorEm?.toISOString() ?? null,
      preenchidoClienteEm: avaliacao.preenchidoClienteEm?.toISOString() ?? null,
    });
  } catch {
    return NextResponse.json({ erro: "Erro ao salvar avaliação" }, { status: 500 });
  }
}
