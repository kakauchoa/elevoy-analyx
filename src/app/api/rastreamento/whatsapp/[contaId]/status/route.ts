import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverAcesso } from "@/lib/acesso-contas";
import { getEvolutionConfig, verificarStatus } from "@/lib/evolution-api";

type Params = Promise<{ contaId: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
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
      return NextResponse.json({ state: "close", instanceName: null });
    }

    const cfg = await getEvolutionConfig();
    if (!cfg) return NextResponse.json({ state: "unknown", instanceName: conta.evolutionInstanceName });

    const state = await verificarStatus(cfg, conta.evolutionInstanceName);

    await prisma.contaAnuncio.update({
      where: { id: contaId },
      data: { evolutionStatus: state },
    });

    return NextResponse.json({ state, instanceName: conta.evolutionInstanceName });
  } catch (err) {
    console.error("[GET /api/rastreamento/whatsapp/[contaId]/status]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
