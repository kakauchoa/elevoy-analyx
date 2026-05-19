import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverAcesso } from "@/lib/acesso-contas";
import { getSessionCliente } from "@/lib/cliente-crm-auth";

type Params = Promise<{ id: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const { id: contaId } = await params;

    // Aceita sessão do gestor ou do cliente CRM
    const session = await getServerSession(authOptions);
    const sessionCliente = await getSessionCliente();

    if (!session && !sessionCliente) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    if (session) {
      // Verifica que o gestor tem acesso a esta conta
      const { contaIds } = await resolverAcesso(session.user.id);
      if (!contaIds.includes(contaId)) {
        return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
      }
    }

    if (sessionCliente) {
      // Verifica que o cliente está vinculado a esta conta
      const cliente = await prisma.clienteCrm.findFirst({
        where: { id: sessionCliente.id, contaAnuncioId: contaId, status: "aprovado" },
      });
      if (!cliente) {
        return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
      }
    }

    const leads = await prisma.leadWpp.findMany({
      where: { contaAnuncioId: contaId },
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        nome: true,
        telefone: true,
        mensagem: true,
        ctwa: true,
        campanha: true,
        publico: true,
        anuncio: true,
        origem: true,
        midia: true,
        status: true,
        valor: true,
        observacoes: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    return NextResponse.json(
      leads.map((l) => ({
        ...l,
        valor: l.valor?.toString() ?? null,
        criadoEm: l.criadoEm.toISOString(),
        atualizadoEm: l.atualizadoEm.toISOString(),
      }))
    );
  } catch (err) {
    console.error("[GET /api/rastreamento/leads/[contaId]]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
