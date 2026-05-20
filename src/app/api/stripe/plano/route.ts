import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        plano: true,
        contasMaximas: true,
        assinaturaAtiva: true,
        assinaturaVenceEm: true,
        stripeCustomerId: true,
      },
    });

    if (!usuario) {
      return NextResponse.json({ erro: "Usuário não encontrado" }, { status: 404 });
    }

    return NextResponse.json(usuario);
  } catch {
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
