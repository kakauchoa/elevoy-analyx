import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cidade = searchParams.get("cidade") ?? "";
    const nicho = searchParams.get("nicho") ?? "";
    const busca = searchParams.get("busca") ?? "";
    const de = searchParams.get("de");
    const ate = searchParams.get("ate");

    const resultados = await prisma.prospeccaoGmn.findMany({
      where: {
        usuarioId: session.user.id,
        ...(cidade ? { cidade: { contains: cidade } } : {}),
        ...(nicho ? { nicho: { contains: nicho } } : {}),
        ...(busca ? {
          OR: [
            { nome: { contains: busca } },
            { telefone: { contains: busca } },
            { site: { contains: busca } },
          ],
        } : {}),
        ...(de || ate ? {
          extraidoEm: {
            ...(de ? { gte: new Date(de) } : {}),
            ...(ate ? { lte: new Date(`${ate}T23:59:59`) } : {}),
          },
        } : {}),
      },
      orderBy: { extraidoEm: "desc" },
    });

    return NextResponse.json(resultados);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
