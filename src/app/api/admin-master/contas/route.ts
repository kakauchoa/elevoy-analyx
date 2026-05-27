import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarAdminMaster } from "@/lib/admin-master-auth";

export async function GET() {
  if (!verificarAdminMaster()) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  try {
    const contas = await prisma.contaAnuncio.findMany({
      where: { ativo: true },
      select: { id: true, nomeCliente: true, accountIdMeta: true },
      orderBy: { nomeCliente: "asc" },
    });

    return NextResponse.json(contas);
  } catch (err) {
    console.error("[GET /api/admin-master/contas]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
