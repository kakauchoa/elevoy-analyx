import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverAcesso } from "@/lib/acesso-contas";
import { getEvolutionConfig, desconectarInstancia } from "@/lib/evolution-api";

type Params = Promise<{ contaId: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { contaId } = await params;
    const { contaIds } = await resolverAcesso(session.user.id);
    if (!contaIds.includes(contaId)) {
      return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
    }

    const conta = await prisma.contaAnuncio.findUnique({ where: { id: contaId } });
    if (!conta?.evolutionInstanceName) {
      return NextResponse.json({ ok: true });
    }

    const cfg = await getEvolutionConfig();
    if (cfg) await desconectarInstancia(cfg, conta.evolutionInstanceName);

    await prisma.contaAnuncio.update({
      where: { id: contaId },
      data: { evolutionStatus: "close" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/rastreamento/whatsapp/[contaId]/desconectar]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
