import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverAcesso } from "@/lib/acesso-contas";

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const body = (await req.json()) as {
      acao: "aprovar" | "rejeitar" | "desvincular";
      contaAnuncioId?: string;
    };

    if (body.acao === "aprovar") {
      if (!body.contaAnuncioId) {
        return NextResponse.json(
          { erro: "Informe a conta de anúncio para vincular" },
          { status: 400 }
        );
      }

      // Verifica que o gestor tem acesso à conta informada
      const conta = await prisma.contaAnuncio.findFirst({
        where: { id: body.contaAnuncioId, usuarioId: session.user.id, ativo: true },
      });
      if (!conta) {
        return NextResponse.json({ erro: "Conta não encontrada" }, { status: 404 });
      }

      await prisma.clienteCrm.update({
        where: { id },
        data: {
          status: "aprovado",
          contaAnuncioId: body.contaAnuncioId,
          aprovadoEm: new Date(),
          aprovadoPorId: session.user.id,
        },
      });

      return NextResponse.json({ ok: true });
    }

    if (body.acao === "rejeitar") {
      await prisma.clienteCrm.update({
        where: { id },
        data: { status: "rejeitado" },
      });
      return NextResponse.json({ ok: true });
    }

    if (body.acao === "desvincular") {
      // Remove vínculo com conta mas mantém o cliente aprovado
      await prisma.clienteCrm.update({
        where: { id },
        data: { contaAnuncioId: null, aprovadoPorId: null, aprovadoEm: null, status: "pendente" },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ erro: "Ação inválida" }, { status: 400 });
  } catch (err) {
    console.error("[PATCH /api/rastreamento/clientes/[id]]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;

    // Verifica que o gestor tem acesso à conta vinculada ao cliente
    const cliente = await prisma.clienteCrm.findUnique({ where: { id } });
    if (!cliente) return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 });

    if (cliente.contaAnuncioId) {
      const { contaIds } = await resolverAcesso(session.user.id);
      if (!contaIds.includes(cliente.contaAnuncioId)) {
        return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
      }
    }

    await prisma.clienteCrm.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/rastreamento/clientes/[id]]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
