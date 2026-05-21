import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const sessionUser = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { perfil: true },
    });
    if (sessionUser?.perfil !== "admin") {
      return NextResponse.json({ erro: "Acesso restrito ao administrador" }, { status: 403 });
    }

    const gestores = await prisma.usuario.findMany({
      where: { tipo: "gestor" },
      select: {
        id: true,
        nome: true,
        email: true,
        plano: true,
        assinaturaAtiva: true,
        contasMaximas: true,
        criadoEm: true,
        _count: { select: { contas: { where: { ativo: true } } } },
      },
      orderBy: { criadoEm: "asc" },
    });

    // Agrupa novos cadastros por mês (últimos 12 meses)
    const agora = new Date();
    const meses: { mes: string; novos: number; pagantes: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const inicio = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const fim = new Date(agora.getFullYear(), agora.getMonth() - i + 1, 0, 23, 59, 59);
      const label = inicio.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

      const novos = gestores.filter(
        (g) => g.criadoEm >= inicio && g.criadoEm <= fim
      ).length;

      const pagantes = gestores.filter(
        (g) => g.criadoEm >= inicio && g.criadoEm <= fim && g.assinaturaAtiva
      ).length;

      meses.push({ mes: label, novos, pagantes });
    }

    // Acumulado de usuários por mês
    let acumulado = 0;
    const crescimento = meses.map((m) => {
      acumulado += m.novos;
      return { ...m, total: acumulado };
    });

    // MRR estimado por plano
    const PRECO: Record<string, number> = {
      basico: 49.9,
      intermediario: 149.9,
      personalizado: 49.9,
      free: 0,
    };

    const mrr = gestores
      .filter((g) => g.assinaturaAtiva)
      .reduce((acc, g) => acc + (PRECO[g.plano] ?? 0), 0);

    // Distribuição por plano
    const distPlano: Record<string, number> = { free: 0, basico: 0, intermediario: 0, personalizado: 0 };
    gestores.forEach((g) => { distPlano[g.plano] = (distPlano[g.plano] ?? 0) + 1; });

    // Lista de agências com detalhes
    const agencias = gestores.map((g) => ({
      id: g.id,
      nome: g.nome,
      email: g.email,
      plano: g.plano,
      assinaturaAtiva: g.assinaturaAtiva,
      contasMaximas: g.contasMaximas,
      totalContas: g._count.contas,
      criadoEm: g.criadoEm.toISOString(),
    }));

    return NextResponse.json({
      totais: {
        gestores: gestores.length,
        pagantes: gestores.filter((g) => g.assinaturaAtiva).length,
        mrr,
        contas: gestores.reduce((a, g) => a + g._count.contas, 0),
      },
      crescimento,
      distPlano,
      agencias,
    });
  } catch (err) {
    console.error("[GET /api/admin/metricas]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
