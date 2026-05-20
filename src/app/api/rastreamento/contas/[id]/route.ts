import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverAcesso } from "@/lib/acesso-contas";

type Params = Promise<{ id: string }>;

/** Ativa ou desativa rastreamentoAtivo de uma conta */
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const { contaIds } = await resolverAcesso(session.user.id);
    if (!contaIds.includes(id)) {
      return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
    }

    const body = (await req.json()) as { rastreamentoAtivo: boolean };
    await prisma.contaAnuncio.update({
      where: { id },
      data: { rastreamentoAtivo: body.rastreamentoAtivo },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/rastreamento/contas/[id]]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
