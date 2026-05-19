import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const { acao } = (await req.json()) as { acao: "aprovar" | "rejeitar" };

    if (acao === "aprovar") {
      await prisma.solicitacaoResetCrm.update({
        where: { id },
        data: { status: "aprovado", aprovadoEm: new Date() },
      });
      return NextResponse.json({ ok: true });
    }

    if (acao === "rejeitar") {
      await prisma.solicitacaoResetCrm.update({
        where: { id },
        data: { status: "rejeitado" },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ erro: "Ação inválida" }, { status: 400 });
  } catch (err) {
    console.error("[PATCH /api/rastreamento/reset/[id]]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
