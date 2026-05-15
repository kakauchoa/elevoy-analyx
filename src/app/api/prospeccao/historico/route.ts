import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const historico = await prisma.historicoPesquisaGmn.findMany({
    where: { usuarioId: session.user.id },
    orderBy: { pesquisadoEm: "desc" },
  });

  // Agrupa por (cidade, nicho), mantém a data mais recente por grupo
  const mapaGrupos = new Map<string, { cidade: string; nicho: string; ultimaBusca: Date }>();
  for (const h of historico) {
    const key = `${h.cidade}||${h.nicho}`;
    if (!mapaGrupos.has(key)) {
      mapaGrupos.set(key, { cidade: h.cidade, nicho: h.nicho, ultimaBusca: h.pesquisadoEm });
    }
  }

  const grupos = [...mapaGrupos.values()];

  // Busca contagens em paralelo
  const cards = await Promise.all(
    grupos.map(async (g) => {
      const totalResultados = await prisma.prospeccaoGmn.count({
        where: { usuarioId: session.user.id, cidade: g.cidade, nicho: g.nicho },
      });
      return {
        cidade: g.cidade,
        nicho: g.nicho,
        ultimaBusca: g.ultimaBusca.toISOString(),
        totalResultados,
      };
    })
  );

  return NextResponse.json(cards);
}
