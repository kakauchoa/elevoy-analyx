import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const integracao = await prisma.integracaoGoogle.findUnique({
      where: { usuarioId: session.user.id },
      select: { criadoEm: true },
    });

    return NextResponse.json({
      conectado: !!integracao,
      desde: integracao?.criadoEm ?? null,
      configurado: !!process.env.GOOGLE_CLIENT_ID,
    });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
