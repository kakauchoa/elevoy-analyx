import { NextResponse } from "next/server";
import type { ClaudeStatusOtimizacao } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sessaoAdmin } from "@/lib/claude-relatorios";

const STATUS_VALIDOS: ClaudeStatusOtimizacao[] = ["pendente", "feita", "descartada"];

/** Marca uma otimização como feita, descartada ou volta para pendente (admin logado). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await sessaoAdmin())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  let status: ClaudeStatusOtimizacao;
  try {
    const corpo = (await req.json()) as { status?: unknown };
    if (!STATUS_VALIDOS.includes(corpo.status as ClaudeStatusOtimizacao)) {
      return NextResponse.json({ erro: "status inválido" }, { status: 400 });
    }
    status = corpo.status as ClaudeStatusOtimizacao;
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  try {
    const atualizada = await prisma.claudeOtimizacao.update({
      where: { id },
      data: { status, feitaEm: status === "feita" ? new Date() : null },
      select: { id: true, status: true, feitaEm: true },
    });
    return NextResponse.json(atualizada);
  } catch {
    return NextResponse.json({ erro: "Otimização não encontrada" }, { status: 404 });
  }
}
