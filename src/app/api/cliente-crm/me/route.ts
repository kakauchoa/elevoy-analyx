import { NextResponse } from "next/server";
import { getSessionCliente } from "@/lib/cliente-crm-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSessionCliente();
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const cliente = await prisma.clienteCrm.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        status: true,
        contaAnuncioId: true,
        conta: { select: { slugCompartilhavel: true, nomeCliente: true } },
      },
    });

    if (!cliente) return NextResponse.json({ erro: "Não encontrado" }, { status: 404 });

    return NextResponse.json(cliente);
  } catch (err) {
    console.error("[GET /api/cliente-crm/me]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
