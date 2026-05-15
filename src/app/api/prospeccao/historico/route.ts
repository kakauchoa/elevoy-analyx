import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const registros = await prisma.historicoPesquisaGmn.findMany({
    where: { usuarioId: session.user.id },
    orderBy: { pesquisadoEm: "desc" },
  });

  const cidades = [...new Set(registros.map((r) => r.cidade))];
  const nichos = [...new Set(registros.map((r) => r.nicho))];

  return NextResponse.json({ cidades, nichos });
}
